from curl_cffi import requests

cookies = {
    '_RGUID': '889fb183-97a5-4584-9c5d-f76db14500f6',
    '_RSG': '4MKfNEOiVY8s3GHnsszTn9',
    '_RDG': '28e7df045663602fa10c2117daa8a2ced1',
}

headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': 'https://www.ctrip.com/',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    # 'cookie': '_RGUID=889fb183-97a5-4584-9c5d-f76db14500f6; _RSG=4MKfNEOiVY8s3GHnsszTn9; _RDG=28e7df045663602fa10c2117daa8a2ced1',
}

response = requests.get(
    'https://flights.ctrip.com/online/channel/domestic',
    cookies=cookies,
    headers=headers,
    impersonate='chrome',
)
print(response.status_code)
print(response.text[:200])
