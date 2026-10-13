import axios from "axios";
import https from "https";
import crypto from "crypto";

export async function getPhoneList() {
    const agent = new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    });

    const response = await axios.post(
        "https://www.ha.10086.cn/shop/sellCard/queryCard",
        new URLSearchParams({
            region: "B",
            plancode: "XWAPH5FXNCS",
            endStr: "",
            iccid: "",
            numberFeatures: "",
            planId: "23925",
            mastercard: "",
        }),
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

    return response.data.data;
}
