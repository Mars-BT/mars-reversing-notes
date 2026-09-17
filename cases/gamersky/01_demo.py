"""游民星空新闻列表爬虫：通过 JSONP 接口获取列表数据。"""

import requests
import time
import json
import re
from lxml import etree

CALLBACK = 'jQuery18307389676395164748_1789627952146'  
NODE_ID = '11007'  


def fetch_news_data(page: int = 1) -> dict:
    """请求 JSONP 接口，返回解析后的字典（含 totalPages 与 body 字段）。"""
    headers = {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'referer': 'https://www.gamersky.com/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    }

    params = {
        'callback': CALLBACK,
        'jsondata': json.dumps({  
            'type': 'updatenodelabel',
            'isCache': True,
            'cacheTime': 60,
            'nodeId': NODE_ID,
            'isNodeId': 'true',
            'page': page,
        }, separators=(',', ':')),
        '_': str(int(time.time())),  
    }

    response = requests.get('https://db2.gamersky.com/LabelJsonpAjax.aspx', params=params, headers=headers)
    # 正则提取json数据
    text = re.search(re.escape(CALLBACK) + r'\((.*)\);', response.text, re.S).group(1)
    return json.loads(text)


def get_max_page() -> int:
    """获取新闻列表的总页数。"""
    return int(fetch_news_data()['totalPages'])


def get_news(page: int = 1):
    """打印指定页的新闻列表（标题、链接、封面图、发布时间）。"""
    data = fetch_news_data(page)['body']  # body 是列表的 HTML 片段
    tree = etree.HTML(data)
    items = tree.xpath("//li")
    for item in items:
        title = item.xpath("./div[1]/a/text()")[0]
        url = item.xpath("./div[1]/a/@href")[0]
        img_url = item.xpath("./div[2]/img/@src")
        img_url = img_url[0] if img_url else ""  # 部分条目可能没有封面图
        pub_time = item.xpath(".//div[@class='time']/text()")[0]
        print(title, url, img_url, pub_time)


if __name__ == '__main__':
    max_page = get_max_page()
    print("总页数:", max_page)
    print("-----------------")
    print("第一页新闻列表:")
    get_news()
    