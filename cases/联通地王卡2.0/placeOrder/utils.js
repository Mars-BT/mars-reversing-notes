import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import CryptoJS from 'crypto-js';
const JSEncrypt = require('jsencrypt');
import axios from 'axios';
import { postCodeList, postDistrictCodeList } from './constant.js';

const PUBLIC_KEY = `MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCquu96QavU/XKFEcfluBVgDvIz8dUkXhifHtazSegrnqVIo/QnfRo6wFhKcErfLo0nq1mYJKHakti4R6dn7TKDi27dHVevjwnMyV4GwoddNPVHpiBwEbQEOr4iMuQiUHXnD9SeY/0GRI6fUgi1jGq+bEMyZmHHfYhMSI7/NX+ApQIDAQAB`;

const _generateRandomKey = (len = 16) => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    const res = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]);
    return res.join("");
};

// 私有方法：获取城市代码
const _getPostCityCode = (postCity) => {
    const city = postCodeList.find(item => item.name === postCity);
    return city.value;
}

// 私有方法：获取区县代码
const _getPostDistrictCode = (postDistrict) => {
    const district = postDistrictCodeList.find(item => item.name === postDistrict);
    return district.value;
}

// 获取id
export async function getUid() {
    const targetUrl = "https://txwk.10010.com/kcardorder/gotoUid?state=KCARD_WKPEN_COMMOM_ORDERLAND&pageKey=5bb97A78eb&ADTAG=09-2279-btd2-9999&channel=09-2279-btd2-9999";


    const response = await axios.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' // 模拟手机端
        },
        maxRedirects: 0, // 拦截重定向
        validateStatus: (status) => status >= 200 && status < 400
    });

    const finalLocation = response.headers.location;
    // console.log("最终跳转目标:", finalLocation);

    if (finalLocation) {
        const urlObj = new URL(finalLocation);
        return urlObj.searchParams.get('uid')
    } else {
        throw new Error('获取uid失败')
    }
}

// 获取号码列表
export async function getNumList(uid) {
    const response = await axios.post(
        'https://kapi.10010.com/kcardorder/intentionalOrder/selectNum',
        new URLSearchParams({
            'productType': '3434',
            'provinceCode': '51',
            'cityCode': '556',
            'provinceName': '广东',
            'cityName': '中山',
            'id': uid
        }),
        {
            params: {
                'channel': '09-2279-btd2-9999',
                'id': uid
            },
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'origin': 'https://txwk.10010.com',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://txwk.10010.com/',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' // 模拟手机端
            }
        }
    );
    return response.data.data.map(item => item.number)
}

// 加密数据
const _encryptPayload = (data) => {
    const plainText = typeof data !== "string" ? JSON.stringify(data) : data;
    if (!plainText) return "";

    // 生成随机 AES Key
    const aesKeyStr = _generateRandomKey(16);

    const JSEncryptClass = JSEncrypt.default || JSEncrypt;
    const rsa = new JSEncryptClass();
    rsa.setPublicKey(PUBLIC_KEY);
    const encryptedKey = rsa.encrypt(aesKeyStr);

    // AES 加密数据 (ECB 模式, Pkcs7 填充)
    const key = CryptoJS.enc.Utf8.parse(aesKeyStr);
    const content = CryptoJS.enc.Utf8.parse(plainText);

    const encryptedData = CryptoJS.AES.encrypt(content, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString();

    // 返回结果
    return {
        v: "v1",
        k: encryptedKey,
        data: encryptedData
    };
};

// 下单
export async function placeOrder(uid, certName, certNo, contactNum, postCity, postDistrict, postAddr, selectNum) {
    let payload = {
        "pageKey": "5bb97A78eb",
        "referer": "https://txwk.10010.com/kcardorder/commonOrder5G/index.html?channel=09-2279-btd2-9999&pageKey=5bb97A78eb&ADTAG=09-2279-btd2-9999&uid=" + uid + "#/common",
        "id": uid,
        "productType": "3434",
        "channel": "09-2279-btd2-9999",
        "certName": certName,
        "certNo": certNo,
        "contactNum": contactNum,
        "postProvinceCode": "440000",
        "postCityCode": _getPostCityCode(postCity),
        "postDistrictCode": _getPostDistrictCode(postDistrict),
        "postProvince": "广东",
        "postCity": postCity,
        "postDistrict": postDistrict,
        "postAddr": postAddr,
        "postName": certName,
        "fromWx": false,
        "provinceCode": "51",
        "cityCode": "556",
        "province": "广东",
        "city": "中山",
        "firstMonthFee": "",
        "phoneNum": selectNum,
        "consentSign": false,
        "historyId": 73137,
        "pageRouter": "commonOrder5G_common",
        "unicomMallUid": "itHEkiPap4S1EOe",
        "saleTurn": "",
    }

    const encryptedPayload = _encryptPayload(payload);



    const response = await axios.post(
        'https://kapi.10010.com/kcardorder/intentionalOrder/preSelect',
        encryptedPayload,
        {
            headers: {
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'origin': 'https://txwk.10010.com',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'r-encrypted': 'A',
                'referer': 'https://txwk.10010.com/',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            }
        }
    );

    return response.data;
}

// 查看订单详情
export async function getOrderDetail(uid) {
    const response = await axios.get('https://kapi.10010.com/kcardorder/intentionalOrder/getPhotoUrl', {
        params: {
            'uid': uid
        },
        headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9',
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
             'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' // 模拟手机端
        }
    });
    const xml = response.data;
    const shortUrlMatch = xml.match(/<shortUrl>(.*?)<\/shortUrl>/);
    if (shortUrlMatch) {
        try {
            // 处理 &amp; 转义字符
            const urlStr = shortUrlMatch[1].replace(/&amp;/g, '&');
            const urlObj = new URL(urlStr);
            return Object.fromEntries(urlObj.searchParams);
        } catch (e) {
            console.error('URL Parse Error:', e);
        }
    }
    return response.data
}