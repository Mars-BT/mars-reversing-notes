// ============================================================================
// 瑞数6 补环境 —— 药监总局（NMPA）
//
// 运行链路（demo.js 的顺序）：
//   1) env.js —— 本文件，先把 Node 伪装成浏览器
//   2) enc.js —— 页面里的内联脚本，设置 $_ts.nsd / $_ts.cd
//   3) dec.js —— 瑞数主文件：虚拟机解密出代码 → 计算并写入 document.cookie
//   4) 浏览器里还有第三段内联脚本 _$i7();（dec.js 之后执行），它负责第二阶段。
//      Node 里没有这行，所以 demo.js 末尾需要补上 window._$i7()，否则只会拿到 T cookie。
//
// 关键点：
//   - document 必须被 Proxy 包过（瑞数写 cookie 靠 set 陷阱落值）；
//   - document.cookie 用存取器维护"累加"语义（S / T 两个 cookie 是分两次写的）；
//   - 瑞数会遍历 DOM（tagName/nodeName/nodeType/childNodes 都要有），
//     节点属性缺失会直接抛 "toLowerCase called on null or undefined"。
// ============================================================================

// 想看虚拟机访问了哪些属性：RS_DEBUG=1 node demo.js（日志会很啰嗦）
var DEBUG = process.env.RS_DEBUG === '1';

function get_enviroment(proxy_array) {
    for (var i = 0; i < proxy_array.length; i++) {
        handler = '{\n' +
            '   get: function(target, property, receiver) {\n' +
            '       if (typeof __RS_DEBUG !== "undefined" && __RS_DEBUG) {\n' +
            '           console.log("方法:", "get    ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '       }\n' +
            '        return target[property];\n' +
            '     },\n' +
            '     set: function(target, property, value, receiver)  {\n' +
            '       if (typeof __RS_DEBUG !== "undefined" && __RS_DEBUG) {\n' +
            '           console.log("方法:", "set   ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '       }\n' +
            '       return Reflect.set(...arguments);\n' +
            '    }\n' +
            '}'
        eval('try{\n' + proxy_array[i] + ';\n'
            + proxy_array[i] + '=new Proxy(' + proxy_array[i] + ', ' + handler + ')}catch (e) {\n' + proxy_array[i] + '={};\n'
            + proxy_array[i] + '=new Proxy(' + proxy_array[i] + ', ' + handler + ')}')
    }
}

globalThis.__RS_DEBUG = DEBUG;

var PAGE_URL = 'https://www.nmpa.gov.cn/xxgk/ggtg/index_2.html';
// 页面里那个 <meta id="..." content="..." r='m'>，瑞数会读它。
// id 是固定的，但 content 每次请求都会变 —— demo.py 会把当次挑战页里的值写进
// meta.json，这里优先读它；读不到才用下面的默认值（直接跑 demo.js 时走这条）。
var META_ID = '13JnD7t9MzWf';
var META_CONTENT = 'lsdFzLNJDix5ev8TCEFFztxy0mcYXV9fVE131dXoMulrJrjBYQn9wil_rDXeHuL60g7zOPgtmqOeE6DAkfLrIYQpOiZsR1cy';
try {
    var __meta = JSON.parse(require('fs').readFileSync(__dirname + '/meta.json', 'utf8'));
    if (__meta.id) META_ID = __meta.id;
    if (__meta.content) META_CONTENT = __meta.content;
} catch (e) { }
// 与 demo.py 请求头里的 UA 保持一致（瑞数会读 navigator.userAgent）
var UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// 最小 DOM：瑞数会做 DOM 遍历和标签统计，节点该有的字段都得给
// ---------------------------------------------------------------------------
function __link(parent) {
    parent.firstChild = parent.childNodes[0] || null;
    parent.lastChild = parent.childNodes[parent.childNodes.length - 1] || null;
    for (var i = 0; i < parent.childNodes.length; i++) {
        var c = parent.childNodes[i];
        c.parentNode = parent;
        c.nextSibling = parent.childNodes[i + 1] || null;
        c.previousSibling = parent.childNodes[i - 1] || null;
    }
}

function __node(tagName, nodeType) {
    return {
        tagName: tagName,        // 真实 DOM 里是大写，如 'DIV'
        nodeName: tagName,
        nodeType: nodeType,      // 1 = 元素，9 = 文档
        localName: String(tagName).toLowerCase(),
        childNodes: [],
        parentNode: null,
        firstChild: null,
        lastChild: null,
        nextSibling: null,
        previousSibling: null,
        attributes: {},
        innerHTML: '',
        outerHTML: '',
        textContent: '',
        innerText: '',
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(this.attributes, name) ? String(this.attributes[name]) : null;
        },
        setAttribute: function (name, v) { this.attributes[name] = v; },
        hasAttribute: function (name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
        getElementsByTagName: function () { return []; },
        getElementsByClassName: function () { return []; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        appendChild: function (child) {
            if (child === null || typeof child !== 'object') return child;
            this.childNodes.push(child);
            __link(this);
            return child;
        },
        insertBefore: function (child) {
            if (child === null || typeof child !== 'object') return child;
            this.childNodes.unshift(child);
            __link(this);
            return child;
        },
        removeChild: function (child) {
            var i = this.childNodes.indexOf(child);
            if (i >= 0) { this.childNodes.splice(i, 1); __link(this); }
            return child;
        },
        hasChildNodes: function () { return this.childNodes.length > 0; },
        cloneNode: function () { return this; },
        addEventListener: function () { },
        removeEventListener: function () { },
        dispatchEvent: function () { return true; },
    };
}

htmlEl = __node('HTML', 1);
headEl = __node('HEAD', 1);
bodyEl = __node('BODY', 1);
metaEl = __node('META', 1);
metaEl.attributes = { id: META_ID, content: META_CONTENT, r: 'm' };

htmlEl.appendChild(headEl);
htmlEl.appendChild(bodyEl);
headEl.appendChild(metaEl);

// document.createElement('div') 返回的对象（瑞数会往上调 getElementsByTagName）
div = __node('DIV', 1);

proxy_array = ['window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'canvas', 'UA_InputId', 'body', 'CanvasRenderingContext2D', 'b', 'a', 'input', 'button', 'script', 'span', 'documentElement', 'a', 'experimental', 'webgl', 'WEBGL_debug_renderer_info', 'submit', 'UNMASKED_VENDOR_WEBGL', 'button1', 'button2', 'div', 'head', 'meta', 'html']

window = global;
window.top = window;
window.self = window;
window.window = window;
window.name = '';

// 瑞数会注册事件监听；补环境里让它们成为空实现即可（不会被真正触发）
window.addEventListener = function () { };
window.removeEventListener = function () { };
setTimeout = function () { };
setInterval = function () { };
clearTimeout = function () { };
clearInterval = function () { };

get_enviroment(['div'])

document = {
    nodeName: '#document',
    nodeType: 9,
    // 真实浏览器里 document.tagName 是 undefined，保持一致
    tagName: undefined,
    documentElement: htmlEl,
    head: headEl,
    body: bodyEl,
    childNodes: [htmlEl],
    createElement: function (tag) {
        if (String(tag).toLowerCase() === 'div') return div;
        return __node(String(tag).toUpperCase(), 1);
    },
    createElementNS: function () { return this.createElement(arguments[1]); },
    createTextNode: function (text) { var n = __node('#text', 3); n.textContent = String(text); return n; },
    getElementById: function (id) {
        return String(id) === META_ID ? metaEl : null;
    },
    getElementsByTagName: function (tag) {
        var want = String(tag).toLowerCase();
        if (want === '*' || want === 'meta') return want === 'meta' ? [metaEl] : [htmlEl, headEl, bodyEl, metaEl];
        return [];
    },
    getElementsByClassName: function () { return []; },
    querySelector: function () { return metaEl; },
    querySelectorAll: function () { return []; },
    addEventListener: function () { },
    removeEventListener: function () { },
    appendChild: function (child) { return child; },
    removeChild: function (child) { return child; },
    createDocumentFragment: function () { return __node('#document-fragment', 11); },
    write: function () { },
    writeln: function () { },
    open: function () { },
    close: function () { },
    referrer: '',
    title: '',
    readyState: 'complete',
    compatMode: 'CSS1Compat',
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    contentType: 'text/html',
    URL: PAGE_URL,
    documentURI: PAGE_URL,
    domain: 'www.nmpa.gov.cn',
    hidden: false,
    visibilityState: 'visible',
}

htmlEl.parentNode = document;

// document.cookie 在真实浏览器里是"累加"的：瑞数会先写一个、再写一个，
// 如果按普通属性赋值（后写覆盖前写）就只剩最后一个，所以用存取器维护一个 jar。
// 读的时候只返回 name=value 对（和浏览器一致，不带 path/expires 等属性）。
var __cookieJar = []
Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: function () {
        return __cookieJar.map(function (c) {
            return c.split(';')[0].trim()
        }).join('; ')
    },
    set: function (v) {
        __cookieJar.push(String(v))
    }
})

navigator = {
    userAgent: UA,
    appName: 'Netscape',
    appVersion: UA.replace('Mozilla/', ''),
    platform: 'MacIntel',
    language: 'zh-CN',
    languages: ['zh-CN', 'zh'],
    product: 'Gecko',
    productSub: '20030107',
    vendor: 'Google Inc.',
    vendorSub: '',
    cookieEnabled: true,
    doNotTrack: null,
    onLine: true,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    webdriver: false,
    plugins: [],
    mimeTypes: [],
    javaEnabled: function () { return false; },
}

location = {
    "ancestorOrigins": {},
    "href": PAGE_URL,
    "origin": "https://www.nmpa.gov.cn",
    "protocol": "https:",
    "host": "www.nmpa.gov.cn",
    "hostname": "www.nmpa.gov.cn",
    "port": "",
    "pathname": "/xxgk/ggtg/index_2.html",
    "search": "",
    "hash": "",
    "toString": function () { return PAGE_URL }
}

screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1055,
    colorDepth: 24,
    pixelDepth: 24,
}

history = { length: 1, state: null, scrollRestoration: 'auto' }

localStorage = {
    _d: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null },
    setItem: function (k, v) { this._d[k] = String(v) },
    removeItem: function (k) { delete this._d[k] },
    clear: function () { this._d = {} },
    key: function (i) { return Object.keys(this._d)[i] || null },
    get length() { return Object.keys(this._d).length },
}

sessionStorage = {
    _d: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null },
    setItem: function (k, v) { this._d[k] = String(v) },
    removeItem: function (k) { delete this._d[k] },
    clear: function () { this._d = {} },
    key: function (i) { return Object.keys(this._d)[i] || null },
    get length() { return Object.keys(this._d).length },
}

get_enviroment(proxy_array)
