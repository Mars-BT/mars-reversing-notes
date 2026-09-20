import os
import json

import requests
from lxml import etree
import execjs
from urllib.parse import urlsplit, parse_qsl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

session = requests.Session()

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

response = session.get('https://www.ouyeel.com/steel/search', params=params, headers=headers)
print('server cookies:', list(session.cookies.keys()))
html = etree.HTML(response.text)
ts_code = html.xpath('//script[1]/text()')[0]
boot_code = html.xpath('//script[last()]/text()')[0]
ENC_JS = os.path.join(BASE_DIR, 'enc.js')
BOOT_JS = os.path.join(BASE_DIR, 'boot.js')
COOKIES_JS = os.path.join(BASE_DIR, 'cookies.js')
DEMO_JS = os.path.join(BASE_DIR, 'demo.js')

with open(ENC_JS, 'w', encoding='utf-8') as f:
    f.write(ts_code)

with open(BOOT_JS, 'w', encoding='utf-8') as f:
    f.write(boot_code)

with open(COOKIES_JS, 'w', encoding='utf-8') as f:
    for name, value in session.cookies.get_dict().items():
        f.write(f'document.cookie = {json.dumps(f"{name}={value}")}\n')

with open(DEMO_JS, 'r', encoding='utf-8') as f:
    ts_code = f.read()

js = execjs.compile(ts_code, cwd=BASE_DIR)

cookie = js.call('get_cookie')
cookies = {}
for item in cookie.split('; '):
    cookie_name, cookie_value = item.split('=', 1)
    cookies[cookie_name] = cookie_value
session.cookies.update(cookies)
print('calculated cookies:', list(cookies))

# Complete the browser's challenge/reload flow.  The first response is only the
# RS bootstrap page; the protected application is returned after this cookie.
page_response = session.get(
    'https://www.ouyeel.com/steel/search',
    params={'channel': 'RJ', 'pageIndex': '0', 'pageSize': '50'},
    cookies=cookies,
    headers=headers,
)
print('page after cookie:', page_response.status_code, page_response.headers.get('Content-Type'), len(page_response.content))


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

api_url = 'https://www.ouyeel.com/search-ng/commoditySearch/queryCommodityResult'
protected_url = js.call('get_suffix', api_url)
protected_parts = urlsplit(protected_url)
params = dict(parse_qsl(protected_parts.query, keep_blank_values=True))
print('protected url:', protected_url)

data = {
    'criteriaJson': '{"pageSize":50,"industryComponent":null,"channel":null,"productType":null,"sort":null,"warehouseCode":null,"key_search":null,"is_central":null,"searchField":null,"companyCode":null,"inquiryCategory":null,"inquirySpec":null,"provider":null,"shopCode":null,"packCodes":null,"steelFactory":null,"resourceIds":null,"providerCode":null,"jsonParam":{"channel":"RJ","keywordAnalyseResult":null},"excludeShowSoldOut":null,"pageIndex":0,"maxPage":50}',
}

response = session.post(
    api_url,
    params=params,
    cookies=cookies,
    headers=headers,
    data=data,
)
response.encoding = 'utf-8'
print(response.status_code)
print(response.headers.get('Content-Type'))
try:
    payload = response.json()
    print('response keys:', list(payload) if isinstance(payload, dict) else type(payload).__name__)
except ValueError:
    print('response url:', response.url)
    print('response length:', len(response.content))
    print(repr(response.text[:300]))
