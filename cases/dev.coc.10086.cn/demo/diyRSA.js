// 自定义 rsa 加密 start
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSEncrypt = require('jsencrypt');
/**
 * 增强型 RSA 类，支持 ESM 模式
 */
export default class JSEncryptPlus extends JSEncrypt {
    constructor() {
        super();
        // 这里的常量用于 Base64 和 Hex 互转
        this.b64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        this.b64pad = "=";
        this.BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    }

    // --- 内部辅助转换方法 ---
    hex2b64(h) {
        let i, v, b = "";
        for (i = 0; i + 3 <= h.length; i += 3) {
            v = parseInt(h.substring(i, i + 3), 16);
            b += this.b64map.charAt(v >> 6) + this.b64map.charAt(v & 63);
        }
        if (i + 1 === h.length) {
            v = parseInt(h.substring(i, i + 1), 16);
            b += this.b64map.charAt(v << 2);
        } else if (i + 2 === h.length) {
            v = parseInt(h.substring(i, i + 2), 16);
            b += this.b64map.charAt(v >> 2) + this.b64map.charAt((v & 3) << 4);
        }
        while ((b.length & 3) > 0) b += this.b64pad;
        return b;
    }

    b64tohex(s) {
        let ret = "", i, k = 0, slop = 0;
        for (i = 0; i < s.length; ++i) {
            if (s.charAt(i) === this.b64pad) break;
            let v = this.b64map.indexOf(s.charAt(i));
            if (v < 0) continue;
            if (k === 0) {
                ret += this.BI_RM.charAt(v >> 2);
                slop = v & 3;
                k = 1;
            } else if (k === 1) {
                ret += this.BI_RM.charAt((slop << 2) | (v >> 4));
                slop = v & 15;
                k = 2;
            } else if (k === 2) {
                ret += this.BI_RM.charAt(slop);
                ret += this.BI_RM.charAt(v >> 2);
                slop = v & 3;
                k = 3;
            } else {
                ret += this.BI_RM.charAt((slop << 2) | (v >> 4));
                ret += this.BI_RM.charAt(v & 15);
                k = 0;
            }
        }
        if (k === 1) ret += this.BI_RM.charAt(slop << 2);
        return ret;
    }

    // --- 核心业务方法 ---

    // 长文本分段加密
    encryptLong(text) {
        const rsaKey = this.getKey(); // 调用父类 JSEncrypt 的获取密钥方法
        try {
            let result = "";
            // 1024位密钥下，分段长度通常为 117
            const maxLength = 117;

            for (let i = 0; i < text.length; i += maxLength) {
                let subStr = text.substring(i, i + maxLength);
                // 使用 rsaKey 对象进行单次基础加密（返回 hex）
                let enc = rsaKey.encrypt(subStr);
                result += enc;
            }
            // 将拼接后的长 Hex 转为最终的 Base64
            return this.hex2b64(result);
        } catch (e) {
            console.error("加密失败:", e);
            return false;
        }
    }

    // 长文本分段解密
    decryptLong(text) {
        const rsaKey = this.getKey();
        const maxLength = 256; // 1024位密文 hex 长度为 256
        try {
            const hexText = this.b64tohex(text);
            let result = "";
            for (let i = 0; i < hexText.length; i += maxLength) {
                let subStr = hexText.substring(i, i + maxLength);
                result += rsaKey.decrypt(subStr);
            }
            return result;
        } catch (e) {
            console.error("解密失败:", e);
            return false;
        }
    }
}

// ！！！下面是getToken的环境，目前不清楚是否有用到，在提交订单的时候没有用到
// 环境
// let env = {
//     "visitorId": "c69034ad9e1a5a6d8050efeeab5e50f6",
//     "confidence": {
//         "score": 0.4,
//         "comment": "0.994 if upgrade to Pro: https://fpjs.dev/pro"
//     },
//     "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
//     "fonts": [
//         "Arial Unicode MS",
//         "Gill Sans",
//         "Helvetica Neue",
//         "Menlo"
//     ],
//     "domBlockers": [],
//     "fontPreferences": {
//         "default": 74.4296875,
//         "apple": 74.4296875,
//         "serif": 72.15625,
//         "sans": 74.4296875,
//         "mono": 66.53125,
//         "min": 4.65625,
//         "system": 73.046875
//     },
//     "audio": 124.04348155876505,
//     "screenFrame": [
//         0,
//         0,
//         0,
//         0
//     ],
//     "languages": [
//         [
//             "zh-CN"
//         ]
//     ],
//     "colorDepth": 24,
//     "deviceMemory": 8,
//     "screenResolution": [
//         667,
//         375
//     ],
//     "hardwareConcurrency": 10,
//     "timezone": "Asia/Hong_Kong",
//     "sessionStorage": true,
//     "localStorage": true,
//     "indexedDB": true,
//     "openDatabase": false,
//     "platform": "MacIntel",
//     "plugins": [
//         {
//             "name": "PDF Viewer",
//             "description": "Portable Document Format",
//             "mimeTypes": [
//                 {
//                     "type": "application/pdf",
//                     "suffixes": "pdf"
//                 },
//                 {
//                     "type": "text/pdf",
//                     "suffixes": "pdf"
//                 }
//             ]
//         },
//         {
//             "name": "Chrome PDF Viewer",
//             "description": "Portable Document Format",
//             "mimeTypes": [
//                 {
//                     "type": "application/pdf",
//                     "suffixes": "pdf"
//                 },
//                 {
//                     "type": "text/pdf",
//                     "suffixes": "pdf"
//                 }
//             ]
//         },
//         {
//             "name": "Chromium PDF Viewer",
//             "description": "Portable Document Format",
//             "mimeTypes": [
//                 {
//                     "type": "application/pdf",
//                     "suffixes": "pdf"
//                 },
//                 {
//                     "type": "text/pdf",
//                     "suffixes": "pdf"
//                 }
//             ]
//         },
//         {
//             "name": "Microsoft Edge PDF Viewer",
//             "description": "Portable Document Format",
//             "mimeTypes": [
//                 {
//                     "type": "application/pdf",
//                     "suffixes": "pdf"
//                 },
//                 {
//                     "type": "text/pdf",
//                     "suffixes": "pdf"
//                 }
//             ]
//         },
//         {
//             "name": "WebKit built-in PDF",
//             "description": "Portable Document Format",
//             "mimeTypes": [
//                 {
//                     "type": "application/pdf",
//                     "suffixes": "pdf"
//                 },
//                 {
//                     "type": "text/pdf",
//                     "suffixes": "pdf"
//                 }
//             ]
//         }
//     ],
//     "canvas": {
//         "geometry": "901aaab3ea524de187e73c7c1ed9d966",
//         "text": "3a2b97539acb0c84ff6db9de4d0cf0d6"
//     },
//     "touchSupport": {
//         "maxTouchPoints": 1,
//         "touchEvent": true,
//         "touchStart": true
//     },
//     "vendor": "Google Inc.",
//     "vendorFlavors": [
//         "chrome"
//     ],
//     "cookiesEnabled": true,
//     "colorGamut": "srgb",
//     "forcedColors": false,
//     "monochrome": 0,
//     "contrast": 0,
//     "reducedMotion": false,
//     "hdr": false,
//     "math": {
//         "acos": 1.4473588658278522,
//         "acosh": 709.889355822726,
//         "acoshPf": 355.291251501643,
//         "asin": 0.12343746096704435,
//         "asinh": 0.881373587019543,
//         "asinhPf": 0.8813735870195429,
//         "atanh": 0.5493061443340548,
//         "atanhPf": 0.5493061443340548,
//         "atan": 0.4636476090008061,
//         "sin": 0.8178819121159085,
//         "sinh": 1.1752011936438014,
//         "sinhPf": 2.534342107873324,
//         "cos": -0.8390715290095377,
//         "cosh": 1.5430806348152437,
//         "coshPf": 1.5430806348152437,
//         "tan": -1.4214488238747245,
//         "tanh": 0.7615941559557649,
//         "tanhPf": 0.7615941559557649,
//         "exp": 2.718281828459045,
//         "expm1": 1.718281828459045,
//         "expm1Pf": 1.718281828459045,
//         "log1p": 2.3978952727983707,
//         "log1pPf": 2.3978952727983707,
//         "powPI": 1.9275814160560206e-50
//     }
// }

// // console.log(Xe("39z3fz39z3nz3oz3gz3oz30z2lz2tz"))
// const publicKey = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCtei8LM+YUNw7wBNLX2XJQ0AflgnDkXUGThPJPHDQBYlDSApVbb6qQO/CoZON8wHEq3q0YoyloZ8j8tngV1BbbJAa/oPtA3G68FrdXE58gyf4tAxt2MonyV/iDgWVX0XQkXe4rgw8W2HIiEHD6ixSQkQwx+onBORAjW+AAe9/DowIDAQAB'
// const rsa = new JSEncryptPlus();
// rsa.setPublicKey(publicKey)
// let Be = JSON.stringify({
//     data: rsa.encryptLong(JSON.stringify(env))
// })
// const response = await axios.post(
//   'https://dev.coc.10086.cn/coc/pkg/sdk/getToken',
//   {
//     'data': Be
//   },
//   {
//     headers: {
//       'accept': '*/*',
//       'accept-language': 'zh-CN,zh;q=0.9',
//       'cache-control': 'no-cache',
//       'content-type': 'application/json',
//       'origin': 'https://dev.coc.10086.cn',
//       'pragma': 'no-cache',
//       'priority': 'u=1, i',
//       'referer': 'https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong',
//       'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
//       'sec-ch-ua-mobile': '?1',
//       'sec-ch-ua-platform': '"iOS"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//       'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
//       'cookie': '9e4e5fa7244c6b6e_gdp_user_key=; 9e4e5fa7244c6b6e_gdp_session_id=e9bdc172-f74a-4f7f-9ed4-8a77f4f78346; gdp_user_id=gioenc-a9e41e60%2C265g%2C5b9a%2C8640%2C03787ebe7799; 9e4e5fa7244c6b6e_gdp_session_id_e9bdc172-f74a-4f7f-9ed4-8a77f4f78346=true; 9e4e5fa7244c6b6e_gdp_sequence_ids={%22globalKey%22:45%2C%22VISIT%22:2%2C%22PAGE%22:5%2C%22CUSTOM%22:15%2C%22VIEW_CLICK%22:18%2C%22VIEW_CHANGE%22:9}'
//     }
//   }
// );

// console.log(response.data)