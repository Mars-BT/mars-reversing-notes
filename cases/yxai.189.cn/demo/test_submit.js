import axios from "axios";
import { spawnSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { encrypt, getCaptcha } from './utils.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = await getCaptcha(false);
const baseDir = path.join(__dirname, "验证", "auto_submit");
const caseDir = path.join(baseDir, `${Date.now()}`);
await mkdir(caseDir, { recursive: true });
await writeFile(path.join(caseDir, "background.png"), Buffer.from(result.background, "base64"));
await writeFile(path.join(caseDir, "slider.png"), Buffer.from(result.slider, "base64"));

const pythonScript = path.join(__dirname, "verify_slider.py");
const run = spawnSync("python3", [pythonScript, "--dir", caseDir, "--id", result.id], {
    stdio: "inherit",
});
if (run.status !== 0) {
    process.exit(run.status ?? 1);
}

const resultJson = await readFile(path.join(caseDir, "result.json"), "utf-8");
const parsed = JSON.parse(resultJson);
const captchaId = parsed.validCaptcha.id;
const distance = parsed.validCaptcha.imageCaptchaTrack.trackList.at(-1)?.x ?? 0;
const formatLocalTime = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const currentTime = formatLocalTime(new Date());
const fingerprintValue = randomUUID();

const generateTrackList = (totalDistance) => {
    const fixedDecimal = [0.04296875, 0.10546875, 0.61328125, 0.76171875][Math.floor(Math.random() * 4)];
    const steps = Math.max(30, Math.min(80, Math.floor(Math.max(10, totalDistance) * 0.5)));
    const downTime = Date.now();
    const duration = 800 + Math.floor(Math.random() * 201);
    const track = [{ x: 0, y: 0, type: "down", t: 0 }];
    for (let i = 1; i <= steps; i += 1) {
        const t = Math.round((duration * i) / steps);
        const progress = i / steps;
        const eased = 1 - Math.pow(1 - progress, 2);
        const x = Math.max(0, totalDistance) * eased + fixedDecimal;
        const y = [-0.5, 0, 0.5, 1.0, 1.5][Math.floor(Math.random() * 5)];
        track.push({
            x: Number(x.toFixed(8)),
            y,
            type: i === steps ? "up" : "move",
            t: Number(String(t).slice(-4)),
        });
    }
    const endTime = downTime + duration;
    return {
        startSlidingTime: new Date(downTime).toISOString(),
        endSlidingTime: new Date(endTime).toISOString(),
        trackList: track,
    };
};

const { startSlidingTime, endSlidingTime, trackList } = generateTrackList(distance);
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
        "checkNetworkProtocolTime": currentTime,
        "checkNotificationTime": currentTime,
        "fingerprintValue": fingerprintValue,
        "overseasCallInterceptServiceStatus": 1,
        "overseasMsgInterceptServiceStatus": 1,
        "overseasCallInterceptServiceTime": "",
        "overseasMsgInterceptServiceTime": ""
    },
    "overseasConfig": 2,
    "validCaptcha": {
        "id": captchaId,
        "startSlidingTime": startSlidingTime,
        "endSlidingTime": endSlidingTime,
        "imageCaptchaTrack": {
            "bgImageWidth": 260,
            "bgImageHeight": 159,
            "sliderImageWidth": 240,
            "sliderImageHeight": 38,
            "trackList": trackList
        }
    }
}
console.log(data)
console.log(trackList)
console.log('滑动距离:', distance)
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
console.log(response.data);
