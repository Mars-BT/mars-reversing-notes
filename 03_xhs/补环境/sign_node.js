/**
 * 纯 Node 出签（补环境路线，不需要浏览器）。
 *
 * 用法：
 *     node sign_node.js [path] [bodyJson]
 * 例如：
 *     node sign_node.js "/api/sns/web/v1/homefeed" '{"cursor_score":"","num":20}'
 *
 * 输出（stdout，单行 JSON）：
 *     {"X-s":"XYS_...","X-t":"1790241...","x3":"mns0101_...","x5":"<md5>"}
 *
 * 原理：x-s = "XYS_" + 自定义base64(utf8(JSON({x0..x5})))，核心的 x3 由 vmp.js 里的
 * 虚拟机函数 window.mnsv2 算出 —— 这台虚拟机已经被 env.js 补成可以在 Node 里跑。
 */

const crypto = require('crypto');
const fs = require('fs');
const DIR = __dirname + '/';

// env.js 会打印大量探测日志，会污染 stdout 的 JSON，这里直接静音
console.log = function () {};

require(DIR + 'env.js');
require(DIR + 'vmp.js');

// 自定义 base64 字母表（逆向自线上 vendor-dynamic 的模块 384：xE = b64Encode）
const ALPHA = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5';
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64Encode(buf) {
    return buf.toString('base64').replace(/=+$/, '').split('')
        .map(ch => ALPHA[STD.indexOf(ch)]).join('');
}

function md5(text) {
    return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

const PATH = process.argv[2] || '/api/sns/web/v1/homefeed';
const BODY_JSON = process.argv[3] || '';

// 线上 seccore_signv2 里的常量：
//   x0 = w.i8            （签名 SDK 版本）
//   x2 = window[w.mj]    （平台，macOS 上是 "Mac OS"）
const X0 = '4.4.3';
const X2 = 'Mac OS';

setTimeout(() => {
    const c = PATH + BODY_JSON;
    const u = md5(c);          // md5(url + body)  -> x5
    const p = md5(PATH);       // md5(url)
    const x3 = globalThis.window.mnsv2(c, u, p);

    const S = {
        x0: X0,
        x1: 'xhs-pc-web',
        x2: X2,
        x3: x3,
        x4: BODY_JSON ? 'object' : '',
        x5: u,
    };
    const Xs = 'XYS_' + b64Encode(Buffer.from(JSON.stringify(S), 'utf8'));

    // X-S-Common 是设备级、不随请求变化的值，这里直接用凭证文件里的原值重新编码。
    // 注意：必须原样使用，随意改写里面的时间戳字段会直接 461。
    let common = '';
    try {
        const creds = JSON.parse(fs.readFileSync(DIR + 'creds.json', 'utf8'));
        if (creds.common_plain) common = b64Encode(Buffer.from(creds.common_plain, 'utf8'));
    } catch (e) {}

    process.stdout.write(JSON.stringify({
        'X-s': Xs,
        'X-t': String(Date.now()),
        'X-S-Common': common,
        x3: String(x3),
        x5: u,
    }));
    process.exit(0);
}, 600);
