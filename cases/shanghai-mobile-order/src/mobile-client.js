import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

// =============================================================================
// 步骤 1：固定配置，并在 VMP 执行前保存 Node 原生 fetch
// =============================================================================

const ORIGIN = 'https://www.sh.10086.cn';
const API_PATH = '/emall/server/cardQuery/card.query.yx';

/** 查询干跑命令的默认美团渠道；下单时由配置层传入对应渠道。 */
export const DEFAULT_MERCHANT_CONFIG = Object.freeze({
    tcId: '2025026046',
    channel: 'TF_SDCLzx_mh_mt',
    xparam: 'xopid_10057117_xorgid_909340',
});

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// 业务请求密钥和响应密钥分别使用两把 RSA 公钥。
const BUSINESS_PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQClopJXiZU+n349GBCLh6ttv2GEicxGC8s/UXsrtanfNFst0Il0K1lufeZh8lLopRrOezq44KMxk1m507q4Ny0Q1pdtBgQ4u3Uf++Kwv7YyobJ9JR1KUL7RnGCeXHzVP1L+Oo9z3Tg+7KDay0t+1gpO5gEyprxrlc6+tzAhUKWYcwIDAQAB';
const RESPONSE_PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCSMM0fPuoAZHDQ7WlafejTUosDWwkc0fKDL4cOkmmMEijkeqKR9/Dxl1COv+f0MbCR8i7L4PrPS3LLa5No+hK1jpK6/5lKGRKitCFy6qfNbwnwZ7hbcmiDXFbjfudIeRi5qazZL1w9lzJIEM7ytUMmMjng5Ri2Fp7UlbfVLn50qQIDAQAB';
const BUSINESS_IV = Buffer.from('0123456789ABEDEF');
const RESPONSE_KEY_CHARS = 'ABCDEFGHIJKLMNOPQISTUVWKYZabcdefghijklmnopqistuvwkyz1234567890';

// VMP 运行时可能包装 globalThis.fetch，所以必须提前保存原生函数。
const nativeFetch = globalThis.fetch.bind(globalThis);

function normalizeMerchantConfig(config = DEFAULT_MERCHANT_CONFIG) {
    const tcId = String(config.tcId || '').trim();
    const channel = String(config.channel || '').trim();
    const xparam = String(config.xparam || '').trim();
    if (!tcId || !channel || !xparam) {
        throw new TypeError('merchantConfig 必须包含 tcId、channel 和 xparam');
    }

    const generatedPageUrl = (
        `${ORIGIN}/emall/static/h5/card/card_list.html`
        + `?id=${encodeURIComponent(tcId)}`
        + `&xparam=${encodeURIComponent(xparam)}`
        + `&channel=${encodeURIComponent(channel)}`
    );
    const pageUrl = new URL(config.pageUrl || generatedPageUrl);
    if (
        pageUrl.origin !== ORIGIN
        || pageUrl.pathname !== '/emall/static/h5/card/card_list.html'
        || pageUrl.searchParams.get('id') !== tcId
        || pageUrl.searchParams.get('xparam') !== xparam
        || pageUrl.searchParams.get('channel') !== channel
    ) {
        throw new TypeError('merchantConfig.pageUrl 必须与 tcId/channel/xparam 一致且属于上海移动号卡页面');
    }

    return Object.freeze({ tcId, channel, xparam, pageUrl: pageUrl.href });
}

// =============================================================================
// 步骤 2：实现 HTTP 与 Cookie 基础设施
// =============================================================================

/** 取得响应中的全部 Set-Cookie。Node 20+ 的 Headers 提供 getSetCookie()。 */
function getSetCookieHeaders(headers) {
    if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
    const value = headers.get('set-cookie');
    return value ? [value] : [];
}

/**
 * 简单 Cookie jar。
 *
 * 这里只处理当前单域名、单进程查询需要的 name/value。真正发送业务请求时，
 * buildApiCookieHeader() 会额外模拟浏览器的 Cookie Path 过滤规则。
 */
class CookieJar {
    constructor() {
        this.cookies = new Map();
    }

    set(cookieText) {
        const pair = String(cookieText).split(';', 1)[0];
        const separator = pair.indexOf('=');
        if (separator <= 0) return;
        this.cookies.set(
            pair.slice(0, separator).trim(),
            pair.slice(separator + 1).trim(),
        );
    }

    merge(setCookieHeaders) {
        for (const header of setCookieHeaders || []) this.set(header);
    }

    get(name) {
        const value = this.cookies.get(name);
        if (value === undefined) return null;
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    toHeader(filter = () => true) {
        return Array.from(this.cookies)
            .filter(([name, value]) => filter(name, value))
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    /** 让 VMP 通过 document.cookie 读写同一个内存 Cookie jar。 */
    installOnDocument(targetDocument) {
        Object.defineProperty(targetDocument, 'cookie', {
            configurable: true,
            get: () => this.toHeader(),
            set: (cookieText) => this.set(cookieText),
        });
    }
}

/** GET 文本资源，并把 Set-Cookie 交还给调用方。 */
async function fetchText(url, headers) {
    const response = await nativeFetch(url, { method: 'GET', headers });
    if (!response.ok) {
        throw new Error(`GET ${url} failed: HTTP ${response.status}`);
    }
    return {
        text: await response.text(),
        setCookies: getSetCookieHeaders(response.headers),
    };
}

/** POST VMP 最终密文；响应可能是普通 JSON，也可能是待解密字符串。 */
async function postEncrypted(url, body, headers) {
    const response = await nativeFetch(url, {
        method: 'POST',
        headers,
        body: String(body),
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    responseHeaders['set-cookie'] = getSetCookieHeaders(response.headers);

    const rawBody = await response.text();
    let data = rawBody;
    if (responseHeaders['content-type']?.includes('application/json')) {
        try {
            data = JSON.parse(rawBody);
        } catch {
            // ds-encrypt=true 时，application/json body 仍然可能是裸 Base64 密文。
        }
    }

    return {
        status: response.status,
        url: response.url,
        headers: responseHeaders,
        rawBody,
        data,
    };
}

// =============================================================================
// 步骤 3：每次运行都从页面提取当前 $_ts 和 VMP
// =============================================================================

async function loadLiveChallenge(pageUrl, options = {}) {
    const cookieJar = options.cookieJar || new CookieJar();

    // 3.1 获取号卡页面和静态站点的初始 Cookie。
    const pageHeaders = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent': USER_AGENT,
    };
    if (options.pageCookieHeader) pageHeaders.Cookie = options.pageCookieHeader;
    if (options.referer) pageHeaders.Referer = options.referer;
    const page = await fetchText(pageUrl, pageHeaders);
    cookieJar.merge(page.setCookies);

    // 3.2 找到 r="m" 的内联 $_ts 和外部 VMP 脚本。
    const scripts = Array.from(page.text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi));
    const inlineScript = scripts.find((match) => (
        /\br=['"]m['"]/i.test(match[1])
        && !/\bsrc=/i.test(match[1])
        && match[2].includes('$_ts')
    ));
    const externalScript = scripts.find((match) => (
        /\br=['"]m['"]/i.test(match[1])
        && /\bsrc=['"][^'"]+\.js/i.test(match[1])
    ));
    const srcMatch = externalScript?.[1].match(/\bsrc=['"]([^'"]+)['"]/i);

    if (!inlineScript || !srcMatch) {
        throw new Error('页面中未找到当前瑞数 $_ts 或 VMP 脚本');
    }

    // 3.3 携带页面 Cookie 下载当前 VMP，而不是读取本地缓存文件。
    const scriptUrl = new URL(srcMatch[1], pageUrl).href;
    const vmp = await fetchText(scriptUrl, {
        Accept: '*/*',
        Referer: pageUrl,
        'User-Agent': USER_AGENT,
        Cookie: cookieJar.toHeader(),
    });
    cookieJar.merge(vmp.setCookies);

    // 页面公共脚本在第一个业务请求前写入的固定标记。
    cookieJar.set('asgtag=96337da90123456789');

    return {
        cookieJar,
        inlineCode: inlineScript[2],
        vmpCode: vmp.text,
        scriptUrl,
    };
}

// =============================================================================
// 步骤 4：在 browser-env.js 中执行 VMP，并截获它改写后的请求
// =============================================================================

/**
 * VMP 会包装 XHR。这里先替换底层方法，让它只记录最终参数、不真正发网络请求。
 * VMP 加载后会包在这些方法外面，所以 capture.take() 得到的是 VMP 最终产物。
 */
function installXhrCapture(debug = false) {
    let lastRequest = null;
    const xhrPrototype = XMLHttpRequest.prototype;

    xhrPrototype.open = function open(method, url, async = true) {
        this.__captureMethod = method;
        this.__captureUrl = url;
        this.__captureAsync = async;
        this.__captureHeaders = {};
        this.readyState = XMLHttpRequest.OPENED;
    };

    xhrPrototype.setRequestHeader = function setRequestHeader(name, value) {
        this.__captureHeaders[name] = String(value);
    };

    xhrPrototype.send = function send(body) {
        lastRequest = {
            xhr: this,
            method: this.__captureMethod,
            url: this.__captureUrl,
            headers: { ...this.__captureHeaders },
            body,
        };
    };

    return {
        reset() {
            lastRequest = null;
        },
        take() {
            return lastRequest;
        },
        /**
         * 真实 fetch 完成后，把 DONE/load/loadend 回放给被 VMP 包装的 XHR。
         * 如果只截获 send 而从不结束请求，VMP 的内部状态会逐次累积，
         * 连续编码多个初始化接口时可能偶发失败。
         */
        complete(response) {
            const xhr = lastRequest?.xhr;
            if (!xhr) return;
            try {
                xhr.status = response.status;
                xhr.statusText = response.status === 200 ? 'OK' : '';
                xhr.responseURL = response.url;
                xhr.responseText = response.rawBody;
                xhr.response = response.rawBody;
                xhr._responseHeaders = response.headers;
                xhr._setReadyState(XMLHttpRequest.DONE);
                xhr._dispatchProgress('load');
                xhr._dispatchProgress('loadend');
            } catch (error) {
                if (debug) console.warn('  XHR lifecycle replay failed:', error.message);
            }
        },
    };
}

/** 标记一段同步调用来自 VMP，只跟踪该作用域内创建的 timer。 */
function runInVmpScope(callback) {
    globalThis.__beginVmpTimerScope?.();
    try {
        return callback();
    } finally {
        globalThis.__endVmpTimerScope?.();
    }
}

async function initializeVmp(challenge, pageUrl, debug = false) {
    // browser-env.js 创建 window/document/navigator/XMLHttpRequest 等浏览器对象。
    const { configurePageUrl } = await import('./browser-env.js');
    configurePageUrl(pageUrl);
    globalThis.__VMP_TIMER_DEBUG__ = debug;
    challenge.cookieJar.installOnDocument(document);

    // 必须先安装底层捕获器，再执行 VMP 包装代码。
    const xhrCapture = installXhrCapture(debug);
    runInVmpScope(() => {
        vm.runInThisContext(challenge.inlineCode, { filename: 'live-ts.js' });
        vm.runInThisContext(challenge.vmpCode, {
            filename: new URL(challenge.scriptUrl).pathname,
        });
    });

    // VMP 初始化存在异步任务；过早发送会直接透传业务密文。
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!challenge.cookieJar.get('FdYa3ZMVY6R0P')) {
        throw new Error('VMP 未生成 FdYa3ZMVY6R0P Cookie');
    }

    return xhrCapture;
}

// =============================================================================
// 步骤 5：复现商城业务 AES/RSA 和响应解密
// =============================================================================

export function generateSessionId(length = 16, radix = 16) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let value = '';
    for (let index = 0; index < length; index += 1) {
        value += chars[Math.floor(Math.random() * radix)];
    }
    return `${value}_1`;
}

/** 页面使用的 7 位随机数 + 1 位校验码算法。 */
function generateBusinessKey() {
    const checkCodes = [3, 6, 9, 2, 4, 1, 5, 7, 8, 0];
    let value = String(Math.floor(Math.random() * 10000000));
    while (value.length < 7) value += '1';
    const sum = Array.from(value, Number).reduce((total, digit) => total + digit, 0);
    return `${value}${checkCodes[sum % 10]}`;
}

function toPem(publicKey) {
    const lines = publicKey.match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function rsaEncrypt(value, publicKey) {
    return crypto.publicEncrypt(
        {
            key: toPem(publicKey),
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(value),
    ).toString('base64');
}

/** 8 位 key 重复 3 次组成 24 字节 AES-192-CBC key。 */
function encryptBusinessBody(data, key) {
    const cipher = crypto.createCipheriv(
        'aes-192-cbc',
        Buffer.from(key.repeat(3)),
        BUSINESS_IV,
    );
    return Buffer.concat([
        cipher.update(JSON.stringify(data), 'utf8'),
        cipher.final(),
    ]).toString('base64');
}

/**
 * 每次请求生成独立的 16 字符响应 key：
 * - RSA 密文写入 DsEncryptSign；
 * - ds-encrypt=true 时用同一个 key 做 AES-128-ECB 解密。
 */
function createResponseEncryption() {
    let key = '';
    for (let index = 0; index < 16; index += 1) {
        key += RESPONSE_KEY_CHARS[Math.floor(Math.random() * RESPONSE_KEY_CHARS.length)];
    }

    return {
        header: encodeURIComponent(rsaEncrypt(key, RESPONSE_PUBLIC_KEY)),
        decrypt(value) {
            const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key), null);
            return Buffer.concat([
                decipher.update(String(value), 'base64'),
                decipher.final(),
            ]).toString('utf8');
        },
    };
}

function buildQueryData(sessionId, merchantConfig) {
    return {
        all: '1',
        birthday: '',
        commemoration: '',
        cardType: 3,
        cardTypeChama: '',
        car: '',
        lucky: '',
        jx: '',
        hd: '',
        ab: '',
        cn: '',
        yc: '',
        ad: '',
        cd: '',
        tcId: merchantConfig.tcId,
        searchInitType: 0,
        sessionId,
        template: '1',
    };
}

// =============================================================================
// 步骤 6：按页面顺序初始化会话，再发送最终号码查询
// =============================================================================

/**
 * 模拟浏览器 Cookie Path：静态目录 Cookie 不能发到 /emall/server；
 * 首包也不能预带尚未由服务端正式下发的业务 key。
 */
function buildApiCookieHeader(cookieJar, hasServerBusinessKey) {
    return cookieJar.toHeader((name) => (
        name !== 'yp_A_emall_static'
        && !name.startsWith('enable_FdYa3ZMVY6R0')
        && (hasServerBusinessKey || name !== 'mall2022ajaxrandomcode')
    ));
}

/** 将业务密文和完整请求头交给 VMP，取得外层加密后的请求。 */
function encodeWithVmp(context, apiPath, businessBody, headers) {
    return runInVmpScope(() => {
        globalThis.__beginVmpRequestCompatibility?.();
        try {
            context.xhrCapture.reset();
            const xhr = new XMLHttpRequest();

            // 必须使用相对路径，完整 URL 不会进入同一条 VMP 加密分支。
            xhr.open('POST', apiPath, true);
            for (const [name, value] of Object.entries(headers)) {
                xhr.setRequestHeader(name, value);
            }
            xhr.send(businessBody);

            const encryptedRequest = context.xhrCapture.take();
            if (
                !encryptedRequest
                || !encryptedRequest.url.includes('?')
                || encryptedRequest.body === businessBody
            ) {
                throw new Error('VMP 请求加密未触发');
            }
            return encryptedRequest;
        } finally {
            globalThis.__endVmpRequestCompatibility?.();
        }
    });
}

async function sendEncryptedRequest(context, apiPath, data, options = {}) {
    const { label = apiPath, quiet = false, skipHttp = false } = options;

    // 6.1 页面拦截器总会补日志字段；WT.plat 为空时不会补 touchid。
    const wireData = {
        ...data,
        goodsIdLog: '',
        goodsNameLog: '',
    };

    // 6.2 生成业务 AES body、RSA key header 和响应解密 header。
    const existingBusinessKey = context.cookieJar.get('mall2022ajaxrandomcode');
    const businessKey = existingBusinessKey || generateBusinessKey();
    const businessPublicKey = context.cookieJar.get('mall2022publicKey')
        || BUSINESS_PUBLIC_KEY;
    const responseEncryption = createResponseEncryption();
    const businessBody = encryptBusinessBody(wireData, businessKey);

    // 请求头必须先设置到 XHR，再由 VMP 统一处理。
    const vmpInputHeaders = {
        Accept: 'application/json, text/plain, */*',
        // 商城封装会在业务 AES 加密前显式覆盖 Axios 的默认值。
        'Content-Type': 'application/json;charset=utf-8',
        ajaxrandomcode: rsaEncrypt(businessKey, businessPublicKey),
        publicKey: businessPublicKey,
        vueKey: '1',
        forwardApp: 'E05',
        channel: context.merchantConfig.channel,
        crc: 'e26bf661',
        DsEncryptSign: responseEncryption.header,
        xparam: context.merchantConfig.xparam,
        goodsIdLog: '',
        goodsNameLog: '',
    };
    const encryptedRequest = encodeWithVmp(
        context,
        apiPath,
        businessBody,
        vmpInputHeaders,
    );

    context.requestNumber += 1;
    if (context.debug || (context.logEncrypted && !quiet)) {
        const encryptedUrl = new URL(encryptedRequest.url, ORIGIN);
        const queryKey = encryptedUrl.searchParams.keys().next().value;
        const bodyKey = String(encryptedRequest.body).split('=', 1)[0];
        console.log(
            `  encrypted #${context.requestNumber} [${label}] `
            + `query=${queryKey}, body=${bodyKey}, `
            + `bytes=${Buffer.byteLength(encryptedRequest.body)}`,
        );
    }

    if (skipHttp) return null;

    // 6.3 用提前保存的 Node 原生 fetch 发送 VMP 最终密文。
    const encryptedUrl = new URL(encryptedRequest.url, ORIGIN).href;
    const cookieHeader = buildApiCookieHeader(context.cookieJar, Boolean(existingBusinessKey));
    const requestHeaders = {
        ...encryptedRequest.headers,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        Origin: ORIGIN,
        Pragma: 'no-cache',
        Referer: context.referer || context.merchantConfig.pageUrl,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': USER_AGENT,
        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        Cookie: cookieHeader,
    };
    const response = await postEncrypted(encryptedUrl, encryptedRequest.body, requestHeaders);

    // 6.4 服务端每次都可能轮换 JSESSIONID、业务 key 或其他 Cookie。
    context.cookieJar.merge(response.headers['set-cookie']);
    runInVmpScope(() => context.xhrCapture.complete(response));

    // 6.5 回放 XHR 完成事件后，再根据响应头做 AES-128-ECB 解密。
    let responseData = response.data;
    if (response.headers['ds-encrypt'] === 'true' && typeof responseData === 'string') {
        responseData = JSON.parse(responseEncryption.decrypt(responseData));
    }

    if (context.debug) {
        console.log(`  ${label}: HTTP ${response.status}, respCode=${responseData?.respCode}`);
        const cookieNames = response.headers['set-cookie']
            .map((value) => String(value).split('=', 1)[0]);
        console.log('  Set-Cookie names:', cookieNames);
    }

    return {
        status: response.status,
        data: responseData,
        headers: response.headers,
        rawBody: response.rawBody,
    };
}

function buildInitializationRequests(sessionId, merchantConfig) {
    const { pageUrl, tcId } = merchantConfig;
    return [
        {
            path: '/emall/server/cardOrder/first.enterprise.check',
            label: 'first.enterprise.check',
            data: { tcId },
        },
        {
            path: '/emall/server/authorize/check',
            label: 'authorize.check',
            // 页面会保留这些显式 null；省略它们会改变后端鉴权分支。
            data: {
                code: null,
                token: null,
                chanId: null,
                mossToken: null,
                smartLink: null,
                ssoToken: null,
                serviceId: null,
                opportunityNum: null,
                customCode: null,
                loginBusType: 1,
                loginBusId: tcId,
            },
        },
        {
            path: '/emall/server/common/verifyLink',
            label: 'verifyLink',
            data: { linkUrl: pageUrl },
        },
        {
            path: '/emall/server/cardContractQuery/card.init',
            label: 'card.init',
            data: {
                tcId,
                urlId: null,
                pageType: '1',
                template: '1',
                sessionId,
                url: pageUrl,
            },
        },
        {
            path: '/emall/server/cardOrder/card.initauth',
            label: 'card.initauth',
            data: { tcId },
        },
        {
            path: '/emall/server/cardQuery/card.query.condition',
            label: 'card.query.condition',
            data: { tcId },
        },
    ];
}

// =============================================================================
// 步骤 7：将加密传输封装为可复用的纯 Node client
// =============================================================================

let activeClient = null;

/** 初始化接口的成功码主要是 0000，同时兼容旧接口的 0。 */
function isSuccessfulResponse(data) {
    const code = String(data?.respCode ?? '');
    return code === '0000' || code === '0';
}

/**
 * 一个 client 对应一个渠道的 Cookie/VMP/商城会话。
 *
 * browser-env.js 使用 Node 全局对象模拟浏览器，所以同一进程不允许并发创建多个
 * client。placeOrder 会在 finally 中关闭它，上游只需要串行调用。
 */
class ShanghaiMobileClient {
    static async create(merchantConfig = DEFAULT_MERCHANT_CONFIG, options = {}) {
        if (activeClient) {
            throw new Error('当前进程已有活动的 ShanghaiMobileClient，请串行使用并先调用 close()');
        }

        const normalizedConfig = normalizeMerchantConfig(merchantConfig);
        const debug = options.debug === true;
        const logEncrypted = options.logEncrypted === true;
        // 创建期间先占位，避免两个并发 create() 同时污染全局 XHR。
        activeClient = { creating: true };

        try {
            const challenge = await loadLiveChallenge(normalizedConfig.pageUrl);
            const xhrCapture = await initializeVmp(
                challenge,
                normalizedConfig.pageUrl,
                debug,
            );
            const client = new ShanghaiMobileClient({
                cookieJar: challenge.cookieJar,
                xhrCapture,
                merchantConfig: normalizedConfig,
                requestNumber: 0,
                debug,
                logEncrypted,
            });
            activeClient = client;
            return client;
        } catch (error) {
            activeClient = null;
            globalThis.__clearVmpTimers?.();
            throw error;
        }
    }

    constructor(context) {
        this.context = context;
        this.sessionId = null;
        this.closed = false;
        this.state = 'new';
        this.requestQueue = Promise.resolve();
    }

    /** 依次调用页面的 6 个初始化接口，后续请求必须复用该会话。 */
    async initializeSession(sessionId = generateSessionId()) {
        this.#assertOpen();
        if (this.state !== 'new') throw new Error(`client 当前状态 ${this.state}，不能重复初始化会话`);
        this.state = 'initializing';

        try {
            for (const item of buildInitializationRequests(
                sessionId,
                this.context.merchantConfig,
            )) {
                const result = await this.#enqueueRequest(item.path, item.data, {
                    label: item.label,
                    quiet: true,
                });
                if (result.status < 200 || result.status >= 300) {
                    throw new Error(`${item.label} 初始化失败：HTTP ${result.status}`);
                }
                if (!isSuccessfulResponse(result.data)) {
                    throw new Error(`${item.label} 初始化失败：${JSON.stringify(result.data)}`);
                }
            }

            this.sessionId = sessionId;
            this.state = 'ready';
            return sessionId;
        } catch (error) {
            this.state = 'failed';
            throw error;
        }
    }

    /** 发送一个业务 JSON；AES/RSA、VMP、Cookie 轮换和响应解密都在内部完成。 */
    async request(apiPath, data, options = {}) {
        this.#assertOpen();
        if (this.state === 'initializing') {
            throw new Error('client 正在初始化会话，不允许插入业务请求');
        }
        if (this.state !== 'ready' && options.skipHttp !== true) {
            throw new Error(`client 当前状态 ${this.state}，请先调用 initializeSession()`);
        }
        return this.#enqueueRequest(apiPath, data, options);
    }

    /** step4 后切换到确认页挑战；step5 必须使用它生成的新 VMP 上下文。 */
    async prepareOrderConfirmation(orderId) {
        this.#assertOpen();
        if (this.state !== 'ready') {
            throw new Error(`client 当前状态 ${this.state}，不能打开订单确认页`);
        }
        const confirmationUrl = new URL(
            `/emall/static/h5/card/card_orderconfirm.html?orderId=${encodeURIComponent(orderId)}`,
            ORIGIN,
        ).href;
        const pageCookieHeader = this.context.cookieJar.toHeader((name) => (
            !name.startsWith('FdYa3ZMVY6R0')
            && !name.startsWith('enable_FdYa3ZMVY6R0')
            && !name.startsWith('yp_A_emall_')
            && !name.startsWith('ras_')
            && !name.startsWith('al_')
            && !name.startsWith('ssl_')
        ));

        // 浏览器导航会创建新的页面 JS 上下文。先清理列表页 VMP 的定时器，
        // 再用同一个业务 Cookie jar 执行确认页实时挑战并重装 XHR 捕获器。
        globalThis.__clearVmpTimers?.();
        const challenge = await loadLiveChallenge(confirmationUrl, {
            cookieJar: this.context.cookieJar,
            pageCookieHeader,
            referer: this.context.merchantConfig.pageUrl,
        });
        this.context.xhrCapture = await initializeVmp(
            challenge,
            confirmationUrl,
            this.context.debug,
        );
        this.context.referer = confirmationUrl;
        return confirmationUrl;
    }

    #enqueueRequest(apiPath, data, options) {
        const pending = this.requestQueue.then(() => {
            this.#assertOpen();
            return sendEncryptedRequest(this.context, apiPath, data, options);
        });
        // 失败不能阻塞后续任务；调用者仍会收到 pending 的原始异常。
        this.requestQueue = pending.catch(() => {});
        return pending;
    }

    /** 清理 VMP 的轮询定时器，释放当前进程的 client 占用。 */
    async close() {
        if (this.closed) return;
        this.closed = true;
        // 等待已在输送的请求结束；尚未开始的排队请求会因 closed 被拒绝。
        await this.requestQueue;
        globalThis.__clearVmpTimers?.();
        if (activeClient === this) activeClient = null;
    }

    #assertOpen() {
        if (this.closed) throw new Error('ShanghaiMobileClient 已关闭');
    }
}

export async function createShanghaiMobileClient(merchantConfig, options) {
    return ShanghaiMobileClient.create(merchantConfig, options);
}

// =============================================================================
// 步骤 8：保留原来的号码查询 CLI，import 本文件时不会自动请求
// =============================================================================

async function runQueryCli() {
    const debug = process.argv.includes('--debug');
    const dryRun = process.argv.includes('--dry-run');
    let client;

    try {
        console.log('[1/5] 获取实时 $_ts、VMP 并创建纯 Node 加密 client...');
        client = await createShanghaiMobileClient(DEFAULT_MERCHANT_CONFIG, {
            debug,
            logEncrypted: true,
        });
        console.log('[2/5] VMP Cookie: generated');

        const sessionId = generateSessionId();
        if (dryRun) {
            console.log('[3/5] 只生成查询密文，不发送业务 HTTP 请求...');
            await client.request(
                API_PATH,
                buildQueryData(sessionId, client.context.merchantConfig),
                { label: 'card.query.yx', skipHttp: true },
            );
            console.log('Dry run: encryption completed.');
            return;
        }

        console.log('[3/5] 按页面顺序初始化商城会话...');
        await client.initializeSession(sessionId);
        console.log(`  Session bootstrap: completed (${sessionId})`);

        console.log('[4/5] 查询可用号码列表...');
        const result = await client.request(
            API_PATH,
            buildQueryData(sessionId, client.context.merchantConfig),
            { label: 'card.query.yx' },
        );

        console.log('[5/5] 查询完成');
        console.log('Status:', result.status);
        console.log('Response:', JSON.stringify(result.data, null, 2));
        if (!isSuccessfulResponse(result.data)) process.exitCode = 1;
    } finally {
        await client?.close?.();
    }
}

const isDirectExecution = process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
    runQueryCli().catch((error) => {
        const debug = process.argv.includes('--debug');
        console.error('Error:', debug ? error.stack : error.message);
        process.exitCode = 1;
    });
}
