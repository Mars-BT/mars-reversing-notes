import requests

cookies = {
    'staticVersion': '1789358938498',
    'T0k1m0u5AfREO': '5jZKM8hNS5MICZ_ZAonv2vWRNwZcRB1Uiknic1EXUQCveWrPmEPMUc0YxCJjs3w18jl.XsKk2fy0aAY.tGTolSa',
    'cookiesession1': '678A3E1A6D0FD260D679E7B4DD180AD1',
    'T0k1m0u5AfREP': 'WtI7Jpi6CXAtt7qBfdYS6Y85HS028AfWV4hOYK5BjRFwZtyUTQnDrVVN6mvSAr_onX3cmvkHO4TDMfEsempqrB7.v28QyHP7eg9Uwyflec.b8G3CQelJONFAkhdlgF.XFCB1DC48U__UU8kHzL6Neq3coCNGNVDMEivVkgNl7.IjNfKBZfNH6Rs9LTN3gAa9RvWU_gmpdIoBenzMkhKrHG',
}

headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
    'Referer': 'https://www.ouyeel.com/steel/search?pageIndex=2&pageSize=50&channel=RJ&productType=',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    # 'Cookie': 'staticVersion=1789358938498; T0k1m0u5AfREO=5jZKM8hNS5MICZ_ZAonv2vWRNwZcRB1Uiknic1EXUQCveWrPmEPMUc0YxCJjs3w18jl.XsKk2fy0aAY.tGTolSa; cookiesession1=678A3E1A6D0FD260D679E7B4DD180AD1; T0k1m0u5AfREP=WtI7Jpi6CXAtt7qBfdYS6Y85HS028AfWV4hOYK5BjRFwZtyUTQnDrVVN6mvSAr_onX3cmvkHO4TDMfEsempqrB7.v28QyHP7eg9Uwyflec.b8G3CQelJONFAkhdlgF.XFCB1DC48U__UU8kHzL6Neq3coCNGNVDMEivVkgNl7.IjNfKBZfNH6Rs9LTN3gAa9RvWU_gmpdIoBenzMkhKrHG',
}

params = {
    'pageIndex': '2',
    'pageSize': '50',
    'channel': 'RJ',
    'productType': '',
}

response = requests.get('https://www.ouyeel.com/steel/search', params=params, cookies=cookies, headers=headers)
print(response.text)