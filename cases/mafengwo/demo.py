import json
import time
from lxml import etree
import requests

ts = int(time.time() * 1000)  # 毫秒级时间戳

cookies = {
    "PHPSESSID": "kfm2mveq0lpdffp9843onoe225",
    "mfw_uuid": "6ab3a84a-6010-60be-4c58-cc241377a43a",
    "oad_n": "a%3A3%3A%7Bs%3A3%3A%22oid%22%3Bi%3A1029%3Bs%3A2%3A%22dm%22%3Bs%3A15%3A%22www.mafengwo.cn%22%3Bs%3A2%3A%22ft%22%3Bs%3A19%3A%222026-09-23+18%3A22%3A02%22%3B%7D",
    "__mfwc": "direct",
    "__mfwa": "1790158922467.34415.1.1790158922467.1790158922467",
    "__mfwlv": "1790158922",
    "__mfwvn": "1",
    "Hm_lvt_8288b2ed37e5bc9b4c9f7008798d2de0": "1790158923",
    "HMACCOUNT": "53DD9CE7A659F273",
    "uva": "s%3A92%3A%22a%3A3%3A%7Bs%3A2%3A%22lt%22%3Bi%3A1790158922%3Bs%3A10%3A%22last_refer%22%3Bs%3A24%3A%22https%3A%2F%2Fwww.mafengwo.cn%2F%22%3Bs%3A5%3A%22rhost%22%3BN%3B%7D%22%3B",
    "__mfwurd": "a%3A3%3A%7Bs%3A6%3A%22f_time%22%3Bi%3A1790158922%3Bs%3A9%3A%22f_rdomain%22%3Bs%3A15%3A%22www.mafengwo.cn%22%3Bs%3A6%3A%22f_host%22%3Bs%3A3%3A%22www%22%3B%7D",
    "__mfwuuid": "6ab3a84a-6010-60be-4c58-cc241377a43a",
    "__mfwb": "ce4e5fa2abe6.3.direct",
    "__mfwlt": "1790159165",
    "Hm_lpvt_8288b2ed37e5bc9b4c9f7008798d2de0": "1790159166",
}

headers = {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "referer": "https://www.mafengwo.cn/",
    "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "script",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
}

params = {
    "callback": f"jQuery1810016934741450732704_{ts}",
    "params": '{"type":0,"objid":0,"page":1,"ajax":1,"retina":0}',
    "_": str(ts),
}

response = requests.get(
    "https://pagelet.mafengwo.cn/note/pagelet/recommendNoteApi",
    params=params,
    cookies=cookies,
    headers=headers,
)

text = response.text

# 剥掉 jsonp 回调外壳，取出里面的 JSON
payload = text[text.index("(") + 1 : text.rindex(")")]
data = json.loads(payload)


html = etree.HTML(data["data"]["html"])
items = html.xpath('//div[@class="tn-wrapper"]')
for item in items:
    print("title:", item.xpath("./dl/dt/a/text()")[0].strip())
    print("desc:", item.xpath("./dl/dd/a/text()")[0].strip())
    print("url:", "https://www.mafengwo.cn" + item.xpath("./dl/dd/a/@href")[0].strip())
    print("img:", item.xpath("./preceding-sibling::div[@class='tn-image']//img/@src")[0].strip())
    print("local:", item.xpath("./div/span[2]/a/text()")[0].strip())
    print("like:", item.xpath("./div/span[1]/em/text()")[0].strip())
    print()
