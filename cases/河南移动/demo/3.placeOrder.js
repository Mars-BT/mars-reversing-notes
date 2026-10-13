import axios from "axios";
import https from "https";
import crypto from "crypto";
import { encryptEncode, Encry04Encode } from "./utils.js";

export async function orderSubmit(
    cardsvcnum, // 选择的号码
    userName, // 姓名
    usertel, // 联系电话
    province, // 省份
    city, // 城市
    county, // 区县
    address, // 详细地址
    card // 身份证
) {
    const agent = new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    });
    userName = encryptEncode(userName);
    usertel = encryptEncode(usertel);
    address = encryptEncode(address);
    let cardstr1 = Encry04Encode(card).substring(0, 4);
    let cardstr2 = Encry04Encode(card).substring(4);

    const response = await axios.post(
        "https://www.ha.10086.cn/shop/sellCard/ordersubmit",
        `schoolName=&chooseCity=&cardregion=B&cardsvcnum=${cardsvcnum}&mastercard=&iccid=&plancode=XWAPH5FXNCS&numberFeatures=&mealFeatures=B&cardstr1=${cardstr1}&cardstr2=${cardstr2}&userName=${userName}&usertel=${usertel}&province=${province}&city=${city}&county=${county}&town=&address=${address}&latitude=&longitude=&recsvcnum=&paytype=GROUPALIPAY&havecardtype=12&busihall=&netpro=2%3B0%3B0%3B0%3B0%3B0&activityId=2174321811236602634&channelCode=E001&planId=23925&prodprcname=(26Q1)%E5%BC%80%E5%B0%81%E6%96%B0%E9%AA%91%E5%A3%AB%E5%8D%A169%E5%85%83%E6%A1%A37%E6%8A%98%E5%85%A5%E7%BD%91&transactionId=&attachedTransid=&picnamerpath=&inSource=&outorderid=&sourcestaffcode=&outBackUrl=&outOrderidfx=&inParam=&signStr=&cardconfid=&checkcode=`,
        {
            httpsAgent: agent,
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                Origin: "https://www.ha.10086.cn",
                Pragma: "no-cache",
                Referer:
                    "https://www.ha.10086.cn/shop/sellCard/viewMeal?activityId=2174321811236602634&pchannel=channel_HN8W21&touchPoint=HN8W01",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
                "X-Requested-With": "XMLHttpRequest",
                Cookie: "channelKey=channel_HN8W21;touchPoint=HN8W01",
            },
        }
    );
    return response.data;
}


