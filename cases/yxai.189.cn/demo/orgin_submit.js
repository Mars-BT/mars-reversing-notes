import axios from "axios";
import { encrypt } from './utils.js'
const data = {
    "actId": 1447943696891904,
    "deviceId": "17708618926926105505_CUbsz3ot7UOMzisPkepbzr8B6QI6zeg8",
    "salesId": "00000000000f0977ed2b11f0a2fbfa163e6607b1",
    "serialNumber": "HR202602120957470001",
    "shopId": "lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934",
    "sysCode": "S054680",
    "phoneNumber": "17764911316",
    "signCode": "f08fabb01954d890c8fd9cbc0425475e",
    "consigneeInfo": {
        "sendProvince": "002041",
        "sendCity": "002041016",
        "sendCounty": "002041016082",
        "sendProvinceName": "四川",
        "sendCityName": "广安市",
        "sendCountyName": "市辖区",
        "sendCusname": "张三",
        "sendCusmobile": "13900071234",
        "sendAddress": "花园3号楼202室"
    },
    "customers": {
        "customerName": "张三",
        "certificateInfoType": "IDENTITY_CARD",
        "certificateInfoNo": "110101198503127890"
    },
    "extInfo": {
        "otherParamsByUrl": "",
        "checkNetworkProtocolTime": "2026-02-13 14:42:45",
        "checkNotificationTime": "2026-02-13 14:42:45",
        "fingerprintValue": "de45334d-462d-49b1-a3ae-4a1af9d73632",
        "overseasCallInterceptServiceStatus": 1,
        "overseasMsgInterceptServiceStatus": 1,
        "overseasCallInterceptServiceTime": "",
        "overseasMsgInterceptServiceTime": ""
    },
    "overseasConfig": 2,
    "validCaptcha": {
        "id": "4a71ef7f938a42dd9f07127b2b901632",
        "startSlidingTime": "2026-02-13T07:44:51.717Z",
        "endSlidingTime": "2026-02-13T07:44:54.055Z",
        "imageCaptchaTrack": {
            "bgImageWidth": 260,
            "bgImageHeight": 159,
            "sliderImageWidth": 240,
            "sliderImageHeight": 38,
            "trackList":[]
        }
    }
}
delete data['extInfo']
const response = await axios.post(
    'https://yxai.189.cn/bloc/actApi/netCard/submitOrderNew',
    encrypt(data),
    {
        headers: {
            'sec-ch-ua-platform': '"Android"',
            'Timestamp': Date.now().toString(),
            'Sign': '450A722B9ED25DCA0B5598ED2D6180CC',
            'Referer': 'https://yxai.189.cn/bloc-uni/pages/opportunity/netCardNew?actNo=IACT2026010405553&temp=netCardNew&pcode=sc&syscode=S054680&shopid=lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934&salesid=00000000000f0977ed2b11f0a2fbfa163e6607b1&serialNumber=HR202602120957470001&signcode=f08fabb01954d890c8fd9cbc0425475e',
            'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
            'SignFlag': '1',
            'sec-ch-ua-mobile': '?1',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
            'Content-Type': 'application/json'
        }
    }
);
// return response.data
console.log(response.data);