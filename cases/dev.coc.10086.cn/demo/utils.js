import axios from 'axios';
import CryptoJS from 'crypto-js';


// 字符串加密 start
function Ye(t, e) {
    (null == e || e > t.length) && (e = t.length);
    for (var n = 0, r = new Array(e); n < e; n++)
        r[n] = t[n];
    return r
}

function M(t) {
    return function (t) {
        if (Array.isArray(t))
            return Ye(t)
    }(t) || function (t) {
        if ("undefined" != typeof Symbol && null != t[Symbol.iterator] || null != t["@@iterator"])
            return Array.from(t)
    }(t) || function (t, e) {
        if (t) {
            if ("string" == typeof t)
                return Ye(t, e);
            var n = Object.prototype.toString.call(t).slice(8, -1);
            return "Map" === (n = "Object" === n && t.constructor ? t.constructor.name : n) || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? Ye(t, e) : void 0
        }
    }(t) || function () {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
    }()
}

export function Xe(t) {
    var t = 0 < arguments.length && t !== undefined ? t : ""
        , e = t.fontsize
        , n = t.split(e.name[6])
        , r = (n.splice(n.length - 1, 1),
            n = n.map(function (t) {
                return parseInt(t, 35)
            }),
            Math.ceil(n.length / 2));
    return n = M(n = n.map(function (t, e) {
        return t - n.length - e - r
    })),
        String.fromCharCode.apply(String, M(n))
}

// 字符串加密 end

// payload加密
const encryptOrderData = (dataObj, aesKeyStr) => {
    // 1. 将对象转为 JSON 字符串
    const jsonStr = JSON.stringify(dataObj);

    // 2. 解析待加密内容和 Key 为 CryptoJS 可识别的 Utf8 格式
    const plainText = CryptoJS.enc.Utf8.parse(jsonStr);
    const key = CryptoJS.enc.Utf8.parse(aesKeyStr);

    // 3. 执行 AES 加密
    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        mode: CryptoJS.mode.ECB,        // 指定模式为 ECB
        padding: CryptoJS.pad.Pkcs7     // 指定填充为 Pkcs7
    });

    // 4. 返回密文字符串 (默认即为 Base64)
    return encrypted.toString();
};

// 获取协议序列id
export async function getProtocolSequenceId(provinceCode = '200') {
    const response = await axios.post(
        'https://dev.coc.10086.cn/coc/grocer/protocol/prov/queryProtocol',
        {
            'pageId': '2036293653691981824', // 页面id
            'productCode': '500000052095', // 产品id
            'provinceCode': provinceCode,
            'orderType': '1'
        },
        {
            headers: {
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'origin': 'https://dev.coc.10086.cn',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"iOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
            }
        }
    );
    return response.data.data[0].protocolSequenceId
}

// 获取手机号列表
export async function getNumberList(provinceCode = '200', cityCode = '755') {
    const response = await axios.post(
        'https://dev.coc.10086.cn/coc/reservoir/phone/anti-select',
        {
            'provinceCode': provinceCode,
            'cityCode': cityCode,
            'touchCode': 'P99999999177',
            'certificateNumber': '',
            'numberKeyword': '',
            'size': 10
        },
        {
            headers: {
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'origin': 'https://dev.coc.10086.cn',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"iOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
            }
        }
    );
    // 这里是可以选号的
    return response.data.data
}

// 锁住号码
export async function lockNumber(provinceCode, cityCode, lockNumber, checkCode) {
    const response = await axios.post(
        'https://dev.coc.10086.cn/coc/reservoir/phone/anti-lock',
        {
            'provinceCode': provinceCode,
            'cityCode': cityCode,
            'touchCode': 'P99999999177',
            'certificateNo': '',
            'lockNumber': lockNumber,
            'checkCode': checkCode
        },
        {
            headers: {
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'origin': 'https://dev.coc.10086.cn',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"iOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
                'cookie': '9e4e5fa7244c6b6e_gdp_user_key=; gdp_user_id=gioenc-550a2cc3%2Ceg0c%2C545g%2C8da5%2C4gdb730ead05; ad78e7d2d9315369_gdp_cs1=; ad78e7d2d9315369_gdp_user_key=; 1593375845_gdp_cs1=; 1593375845_gdp_user_key=; ad78e7d2d9315369_gdp_sequence_ids={%22globalKey%22:4}; 1593375845_gdp_sequence_ids={%22globalKey%22:4}; 9e4e5fa7244c6b6e_gdp_session_id=1a97d655-17b0-4746-af6c-e742351c5c50; 9e4e5fa7244c6b6e_gdp_session_id_1a97d655-17b0-4746-af6c-e742351c5c50=true; 9e4e5fa7244c6b6e_gdp_sequence_ids={%22globalKey%22:103%2C%22VISIT%22:3%2C%22PAGE%22:7%2C%22CUSTOM%22:33%2C%22VIEW_CLICK%22:44%2C%22VIEW_CHANGE%22:20}'
            }
        }
    );

    // 成功
    if (response.data.code === "0") {
        return response.data.data.sequence
    } else { // 失败
        return null
    }
}

// 下单
export async function placeOrder(payload) {
    const aesKey = "d3e0e09222653c55" // 这里是随机生成的 写死
    const aseKeyEncryptByRSA = "Fyt4HcwlcweiRS9ESoLFQdMbGLzbHv7M95wXcP/RiL1fu0KVSm4Mz035iNvwRrqhrGLMlhVWIMvrE7huFoLz3M+4oAE4vtN0X8roFcVz7d2RdUdQTSsSyF4E2Al/Lb0FsOEeIs0fCo4cP6YOhFPxk0cc4SJfh6otAEA6OlnpHIw=" // 这里就写死了，其实就是上面aeskey通过RSA加密
    const cocEnContent = encryptOrderData(payload, aesKey)

    const response = await axios.post(
        'https://dev.coc.10086.cn/coc/card/trade/newEncrypt/order',
        {
            'cocEnContent': cocEnContent
        },
        {
            headers: {
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'coc-aurora': aseKeyEncryptByRSA,
                'coc-aurora-v': '1',
                'coc-en-version': '1486234121417629696',
                'origin': 'https://dev.coc.10086.cn',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"iOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
                'cookie': '9e4e5fa7244c6b6e_gdp_user_key=; gdp_user_id=gioenc-550a2cc3%2Ceg0c%2C545g%2C8da5%2C4gdb730ead05; ad78e7d2d9315369_gdp_cs1=; ad78e7d2d9315369_gdp_user_key=; 1593375845_gdp_cs1=; 1593375845_gdp_user_key=; ad78e7d2d9315369_gdp_sequence_ids={%22globalKey%22:4}; 1593375845_gdp_sequence_ids={%22globalKey%22:4}; 9e4e5fa7244c6b6e_gdp_session_id=1a97d655-17b0-4746-af6c-e742351c5c50; 9e4e5fa7244c6b6e_gdp_session_id_1a97d655-17b0-4746-af6c-e742351c5c50=true; 9e4e5fa7244c6b6e_gdp_sequence_ids={%22globalKey%22:115%2C%22VISIT%22:3%2C%22PAGE%22:7%2C%22CUSTOM%22:38%2C%22VIEW_CLICK%22:49%2C%22VIEW_CHANGE%22:22}'
            }
        }
    );
    console.log(response.data)
}

// console.log(await getProtocolSequenceId())
// console.log(await getNumberList())
