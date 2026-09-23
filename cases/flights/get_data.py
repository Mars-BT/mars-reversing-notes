from curl_cffi import requests

cookies = {
    '_RGUID': '889fb183-97a5-4584-9c5d-f76db14500f6',
    '_RSG': '4MKfNEOiVY8s3GHnsszTn9',
    '_RDG': '28e7df045663602fa10c2117daa8a2ced1',
    'UBT_VID': '1790160115830.9c48digRQT7l',
    '_RF1': '14.153.101.121',
    'GUID': '09031095418830060003',
    'nfes_isSupportWebP': '1',
    '_resDomain': 'https%3A%2F%2Fbd-s.tripcdn.cn',
    '_pd': '%7B%22_o%22%3A5%2C%22s%22%3A18%2C%22_s%22%3A0%7D',
    'Hm_lvt_576acc2e13e286aa1847d8280cd967a5': '1790160600',
    'Hm_lpvt_576acc2e13e286aa1847d8280cd967a5': '1790160600',
    'HMACCOUNT': '53DD9CE7A659F273',
    'MKT_CKID': '1790160600479.rfjv9.vl7h',
    '_bfa': '1.1790160115830.9c48digRQT7l.1.1790160600274.1790160602302.1.6.10650065554',
}

headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': 'https://flights.ctrip.com/',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    # 'cookie': '_RGUID=889fb183-97a5-4584-9c5d-f76db14500f6; _RSG=4MKfNEOiVY8s3GHnsszTn9; _RDG=28e7df045663602fa10c2117daa8a2ced1; UBT_VID=1790160115830.9c48digRQT7l; _RF1=14.153.101.121; GUID=09031095418830060003; nfes_isSupportWebP=1; _resDomain=https%3A%2F%2Fbd-s.tripcdn.cn; _pd=%7B%22_o%22%3A5%2C%22s%22%3A18%2C%22_s%22%3A0%7D; Hm_lvt_576acc2e13e286aa1847d8280cd967a5=1790160600; Hm_lpvt_576acc2e13e286aa1847d8280cd967a5=1790160600; HMACCOUNT=53DD9CE7A659F273; MKT_CKID=1790160600479.rfjv9.vl7h; _bfa=1.1790160115830.9c48digRQT7l.1.1790160600274.1790160602302.1.6.10650065554',
}

params = {
    'ticketType': '0',
    'dStation': '上海',
    'aStation': '北京',
    'dDate': '2026-09-23',
    'rDate': '',
    'trainsType': '',
    'hubCityName': '',
    'highSpeedOnly': '0',
}

response = requests.get('https://trains.ctrip.com/webapp/train/list', params=params, cookies=cookies, headers=headers)
print(response.text)
print(response.status_code)