import os

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
    'Referer': 'https://zbzx.lzjtu.edu.cn/zbxx/gcl.htm',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    # 'Cookie': 'evbSrBv8QGpBO=60nLY31Sav4_p6lHrx.zOup8OIblUc9C.kKOfqrluwzkrVTChcengXx01RB4zl4SPm7apQ2WMzD3c.AVAQ44HVkq; evbSrBv8QGpBP=0mLMQ33ddXAQLvCMumo2Y4fplWE9HpJLF_Y1qjeYCFQtyyCpg0LnhDgjtinOpoFUZJMyO_tj6QGsuEFUCyOuFZSCIQk6_.fRvV0cYMeYRoY4BwmnerBEjx6vAv64S1KE2jfsKC21pqHdmag07vnPoDXVtUVJE5p6M.PtoXRMTyzcrb5yqszbuqQzreSY7dY_1HpADC0iMIK4RfRJ.dw9Yowp68I.Q5V33zpEyOswsEIdKJHyfcTYx1qgYjuI.AR_55C1oYRlFoYyz6wAC.wm8n.9PtPn6v6Xz5MTYKldXsBzZfv8gwB5van44L0Z.z98q_K9LE.BN.TjLCy3PuOryuxkOs8hB5H23G6cr0fT87GfKcL70ZPsheu9uzwKtqQb_p2l1IipjjAWtfFXo_X9OzNcAmNqcdEsGqPKngHb_I8u8N43z609XCDl4ci_36FyB',
}

response = requests.get('https://zbzx.lzjtu.edu.cn/zbxx/gcl.htm', headers=headers)
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
response = requests.get('https://zbzx.lzjtu.edu.cn/zbxx/gcl.htm', headers=headers, cookies=cookies)
response.encoding = 'utf-8'
print(response.text)