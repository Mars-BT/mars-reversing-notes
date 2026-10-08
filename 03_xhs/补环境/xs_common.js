/**
 * X-S-Common 的离线实现（复刻线上 vendor-dynamic 里的 xsCommon）。
 *
 * 逆向结论：
 *   明文 et = {
 *     s0: 3,                       // 平台枚举（桌面端）
 *     s1: "",
 *     x0: localStorage['b1b1'] || '1',   // 键名 w.z7='b1b1'，兜底 w.fI='1'
 *     x1: '4.4.3',                 // w.i8，签名 SDK 版本
 *     x2: 平台,                     // window[w.mj]，w.mj='xsecplatform' → 'Mac OS'
 *     x3: 'xhs-pc-web',
 *     x4: '6.56.2',
 *     x5: cookie['a1'],            // w.o4='a1'
 *     x6: "", x7: "",
 *     x8: localStorage['b1'],      // 键名 w.q2='b1'
 *     x9: tb("" + "" + x8),        // 见下面的 crc 变体
 *     x10: sessionStorage['sc'] 计数,   // 键名 w.DY='sc'
 *     x11: 'normal',
 *     x12: localStorage['dsllt'] + ';' + window._dsl,   // 键名 w.br='dsllt'
 *   }
 *   X-S-Common = 自定义base64(utf8(JSON.stringify(et)))
 *
 * x9 那个 hash（线上 ed.tb）不是标准 CRC32，是"标准 CRC32 表 + 收尾异或 0xEDB88320"，
 * 下面的 tb() 已用浏览器实测样本校验过（'abc' / '123456789' / 'xhs-pc-web' / ''）。
 */

const ALPHA = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5';
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64Encode(buf) {
    return buf.toString('base64').replace(/=+$/, '').split('')
        .map((ch) => ALPHA[STD.indexOf(ch)]).join('');
}

// 标准 CRC32 表（多项式 0xEDB88320）
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_TABLE[n] = c | 0;
}
// 收尾异或：实测 tb('') = -306674912 = 0xEDB88320 的有符号形式
const TAIL_XOR = 0xedb88320 | 0;

function tb(text) {
    const bytes = Buffer.from(String(text), 'utf8');
    let c = -1;
    for (let i = 0; i < bytes.length; i++) {
        c = (CRC_TABLE[(255 & c) ^ bytes[i]] ^ (c >>> 8)) | 0;
    }
    return (-1 ^ c ^ TAIL_XOR) | 0;
}

/**
 * 用设备原值拼出 X-S-Common。
 * @param {object} inputs 需要：platform, a1, dsllt, b1, b1b1, dsl, sc
 */
function buildXsc(inputs) {
    const x8 = inputs.b1 === undefined ? null : inputs.b1;
    const et = {
        s0: 3,
        s1: '',
        x0: inputs.b1b1 || '1',
        x1: '4.4.3',
        x2: inputs.platform || 'PC',
        x3: 'xhs-pc-web',
        x4: '6.56.2',
        x5: inputs.a1 || '',
        x6: '',
        x7: '',
        x8: x8,
        x9: tb('' + '' + x8),
        x10: Number(inputs.sc) || 0,
        x11: 'normal',
        x12: String(inputs.dsllt || '') + ';' + String(inputs.dsl || ''),
    };
    return { encoded: b64Encode(Buffer.from(JSON.stringify(et), 'utf8')), plain: JSON.stringify(et) };
}

module.exports = { tb, buildXsc, b64Encode };
