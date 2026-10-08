/**
 * 纯 Node 端到端取数（不出 Node、不开浏览器）。
 *
 *   补环境出签：env.js + vmp.js（window.mnsv2）→ 拼 X-s
 *   传输：@zionsssx/freq-js（Rust 引擎 wreq，同时仿 Chrome 的 JA3 + Akamai HTTP/2 指纹）
 *
 * 为什么需要它：Node 自带 fetch/undici 的 TLS 指纹不是 Chrome，接口直接 461；
 *             curl_cffi 是 Python 的；这个库是 Node 原生的同类方案。
 *
 * 用法：
 *     node fetch_feed_node.js            # 取 homefeed 并打印笔记
 *     node fetch_feed_node.js --profile chrome_149
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { fetch } = require('@zionsssx/freq-js');
const { buildXsc } = require('./xs_common.js');

// env.js 的探测日志会污染 stdout，静音（本脚本自己的输出用 process.stdout.write）
console.log = function () {};

require('./env.js');
require('./vmp.js');

const ALPHA = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5';
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64Encode = (buf) => buf.toString('base64').replace(/=+$/, '').split('')
    .map((ch) => ALPHA[STD.indexOf(ch)]).join('');
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

const API = 'https://edith.xiaohongshu.com';
const PATH_ = '/api/sns/web/v1/homefeed';
const BODY = {
    cursor_score: '', num: 20, refresh_type: 1, note_index: 0,
    unread_begin_note_id: '', unread_end_note_id: '', unread_note_count: 0,
    category: 'homefeed_recommend', search_key: '', need_num: 10,
    image_formats: ['jpg', 'webp', 'avif'], need_filter_image: false,
};

const out = (s) => process.stdout.write(s + '\n');

function buildHeaders(bodyJson, creds) {
    const c = PATH_ + bodyJson;
    const u = md5(c);
    const p = md5(PATH_);
    const x3 = globalThis.window.mnsv2(c, u, p);
    const S = { x0: '4.4.3', x1: 'xhs-pc-web', x2: 'Mac OS', x3: x3, x4: 'object', x5: u };
    const device = creds.device || {};

    // X-S-Common：优先用设备原值**离线算**（xs_common.js 复刻的 xsCommon），
    // 只有缺原值时才退回凭证里抓到的成品
    let xsc = creds.xsc || '';
    if (creds.xsc_inputs) xsc = buildXsc(creds.xsc_inputs).encoded;

    return {
        'user-agent': device['user-agent'] ||
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
        'sec-ch-ua': device['sec-ch-ua'] || '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
        'sec-ch-ua-mobile': device['sec-ch-ua-mobile'] || '?0',
        'sec-ch-ua-platform': device['sec-ch-ua-platform'] || '"macOS"',
        'content-type': 'application/json;charset=UTF-8',
        referer: 'https://www.xiaohongshu.com/explore',
        'X-s': 'XYS_' + b64Encode(Buffer.from(JSON.stringify(S), 'utf8')),
        'X-t': String(Date.now()),
        'X-S-Common': xsc,
        cookie: (creds.cookies || []).map((x) => x.name + '=' + x.value).join('; '),
    };
}

async function main() {
    const argv = process.argv.slice(2);
    let profile = 'chrome_149';
    const pi = argv.indexOf('--profile');
    if (pi >= 0 && argv[pi + 1]) profile = argv[pi + 1];

    const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'creds.json'), 'utf8'));
    const bodyJson = JSON.stringify(BODY);

    await new Promise((r) => setTimeout(r, 600));   // 等虚拟机的异步初始化收尾

    const headers = buildHeaders(bodyJson, creds);
    out('[sign] X-s 前缀: ' + headers['X-s'].slice(0, 60) + ' ...');

    const resp = await fetch(API + PATH_, {
        method: 'POST',
        headers: headers,
        body: bodyJson,
        browser: profile,
        os: 'macos',
    });
    const text = await resp.text();
    out('[http] status: ' + resp.status);
    try {
        const j = JSON.parse(text);
        const items = (j.data || {}).items || [];
        out(`[data] code=${j.code} 笔记条数=${items.length}`);
        items.slice(0, 8).forEach((it) => {
            const card = it.note_card || {};
            out('   · ' + card.display_title + ' | by ' + ((card.user || {}).nickname || ''));
        });
    } catch (e) {
        out('[data] 解析失败: ' + text.slice(0, 200));
    }
    process.exit(0);
}

main().catch((e) => {
    out('[error] ' + (e && e.message));
    process.exit(1);
});
