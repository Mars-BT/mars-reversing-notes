import os
from tkinter import constants

import requests
from lxml import etree
import execjs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

requests = requests.Session()

headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Referer': 'https://www.ouyeel.com/steel/search?channel=RJ&pageIndex=0&pageSize=50',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    # 'Cookie': 'T0k1m0u5AfREO=5fzGY2VG1pM0lFr.GKmWJZv.2sW_bmFXakrI8MZLRqKbUxnd5gFA_H8Ga8fduiyv26TIJLhGqsNduIiWqF7940G; cookiesession1=678A3E1A143AFA9DD3CA958379AC5855; T0k1m0u5AfREP=kTdFVVIczUcIUp9GvNr7NpsHTqgY3gZPn8KPOj3RUuCb2FVvqIJr6WWTZRAcW8xyEQmzBOr7PwdBs.cRFRRsHx_v__WTs7QEW_vFWXxM.KZb6Eo5dV8GdbBPi2.kCbCHvgxjGRgydY4_LkxoekjLx5dFW9u38XqD.ueDP6lahUODTZ1DPJRNLzBFnco1HxXRKnzrJCFJ.AvV53n9hTIbXJRgBPGB7XR6HhPX0KqRsag',
}

params = {
    'channel': 'RJ',
    'pageIndex': '0',
    'pageSize': '50',
}

response = requests.get('https://www.ouyeel.com/steel/search', params=params, headers=headers)
html = etree.HTML(response.text)
ts_code = html.xpath('//script[1]/text()')[0]
ENC_JS = os.path.join(BASE_DIR, 'enc.js')
DEMO_JS = os.path.join(BASE_DIR, 'demo.js')

with open(ENC_JS, 'w', encoding='utf-8') as f:
    f.write(ts_code)

with open(DEMO_JS, 'r', encoding='utf-8') as f:
    ts_code = f.read()

js = execjs.compile(ts_code, cwd=BASE_DIR)

cookie = js.call('get_cookie')
cookies = {cookie.split('=')[0]: cookie.split('=')[1]}
print(cookies)


headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://www.ouyeel.com',
    'Pragma': 'no-cache',
    'Referer': 'https://www.ouyeel.com/steel/search?pageIndex=0&pageSize=50&channel=RJ',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
}

params = {
    'K5nOZLud': 'xrShSAlqEJoxMp8d2v8RkJ5LAnOTTVm5krtClMEJR.GRm1gsLtnHElcoC9TN8rOdK53nBULIMBQWQ4_VuDMtcm163Cud3b34',
}

data = {
    'criteriaJson': '{"pageSize":50,"industryComponent":null,"channel":null,"productType":null,"sort":null,"warehouseCode":null,"key_search":null,"is_central":null,"searchField":null,"companyCode":null,"inquiryCategory":null,"inquirySpec":null,"provider":null,"shopCode":null,"packCodes":null,"steelFactory":null,"resourceIds":null,"providerCode":null,"jsonParam":{"channel":"RJ","keywordAnalyseResult":null},"excludeShowSoldOut":null,"pageIndex":0,"maxPage":50}',
}

response = requests.post(
    'https://www.ouyeel.com/search-ng/commoditySearch/queryCommodityResult',
    params=params,
    cookies=cookies,
    headers=headers,
    data=data,
)
response.encoding = 'utf-8'
print(response.status_code)