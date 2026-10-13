// yxai.189.cn 工具库
import CryptoJS from "crypto-js"
import axios from 'axios';
import fs from 'fs';

// 加密
export function encrypt(data) {
    if (typeof data !== "string") {
        data = JSON.stringify(data)
    }
    const key_str = "KEYJSDKKYHKLSSWS"
    var encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key_str), {
        'iv': CryptoJS.enc.Utf8.parse(key_str),
        'mode': CryptoJS.mode.CBC,
        'padding': CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

// 解密
export function decrypt(encryptedData) {
    const key_str = "KEYJSDKKYHKLSSWS";
    const decrypted = CryptoJS.AES.decrypt(encryptedData, CryptoJS.enc.Utf8.parse(key_str), {
        'iv': CryptoJS.enc.Utf8.parse(key_str),
        'mode': CryptoJS.mode.CBC,
        'padding': CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// 获取订单url
export async function getUrl() {
    const response = await axios.post(
        'https://yk.haoranwl.cn/card-retail-api/api/cloudOrder',
        {
            'channelId': '204',
            'staffId': '1569',
            'productId': '129'
        },
        {
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'application/json',
                'Origin': 'https://yk.haoranwl.cn',
                'Pragma': 'no-cache',
                'Referer': 'https://yk.haoranwl.cn/hlwcard/cloud-A9F3K7Q2.html?&channelId=204&staffId=1569&productId=129',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
                'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
            }
        }
    );
    if (response.data.resultCode === 200) {
        const orderUrl = response.data.data.url;
        const urlParams = new URL(orderUrl).searchParams;
        return {
            orderNo: response.data.data.orderNo,
            url: orderUrl,
            signcode: urlParams.get("signcode"),
            serialNumber: urlParams.get("serialNumber"),
        }
    } else {
        throw new Error(response.data.resultMsg);
    }
    /*
        {
            data: {
                orderNo: 'HR202602121737030001',
                url: 'https://yxai.189.cn/bloc-uni/pages/opportunity/netCardNew?actNo=IACT2026010405553&temp=netCardNew&pcode=sc&syscode=S054680&shopid=lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934&salesid=00000000000f0977ed2b11f0a2fbfa163e6607b1&serialNumber=HR202602121737030001&signcode=970d1ab035ab2c3ce0b4febf1cca479a'
            },
            resultCode: 200,
            resultMsg: '操作成功'
        }
    */
}

// 获取验证码
export async function getCaptcha(saveToFile = false) {
    const _data = { type: 'SLIDER' }
    const encrypted = encrypt(_data);
    const requestTimestamp = Date.now();
    const response = await axios.post(
        'https://yxai.189.cn/bloc/actApi/code/captcha',
        encrypted,
        {
            headers: {
                'sec-ch-ua-platform': '"Android"',
                'Timestamp': requestTimestamp.toString(),
                'Referer': 'https://yxai.189.cn/bloc-uni/pages/opportunity/netCardNew?actNo=IACT2026010405553&temp=netCardNew&pcode=sc&syscode=S054680&shopid=lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934&salesid=00000000000f0977ed2b11f0a2fbfa163e6607b1&serialNumber=HR202602120957470001&signcode=f08fabb01954d890c8fd9cbc0425475e',
                'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'SignFlag': '1',
                'sec-ch-ua-mobile': '?1',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
                'Content-Type': 'application/json'
            }
        }
    );
    let result = {
        id: response.data.data.id,
        requestTimestamp,
        requestTime: new Date(requestTimestamp).toISOString(),
        background: response.data.data.captcha.backgroundImage.replace(/^data:image\/\w+;base64,/, ''), // 这里replace是要去掉base64前缀才可以直接保存到文件
        slider: response.data.data.captcha.sliderImage.replace(/^data:image\/\w+;base64,/, ''),
        /*
            这里的验证码和滑块 宽度,高度 是固定的
            backgroundImageWidth: 590,
            backgroundImageHeight: 360,
            sliderImageWidth: 110,
            sliderImageHeight: 360,
        */
    }

    // 保存到文件
    if (saveToFile) {
        fs.writeFileSync('background.png', Buffer.from(result.background, 'base64'));
        fs.writeFileSync('slider.png', Buffer.from(result.slider, 'base64'));
    }

    return result
}
