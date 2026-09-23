import time
import requests
import execjs

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'

# 浏览器里的 cookie（ttwid 必需，其它有就一起带上）
COOKIES = {
    'ttwid': '1%7CNXQOCfnlVU4CjjR82UhaMZb2LY-77C5ggNOxJSV-GKU%7C1790134544%7C64ad0c9d890e0dd68f3b37d17c821a9aa70f25bfc38cb5e87e11f39485d6fc15',
}


# ============ 1. 动态换 msToken（服务端通过 Set-Cookie 下发） ============
def get_msToken(ms_token=''):

    headers = {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'cache-control': 'no-cache',
        'content-type': 'text/plain;charset=UTF-8',
        'origin': 'https://www.toutiao.com',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.toutiao.com/',
        'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-storage-access': 'active',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        # 'cookie': 'ttwid=1%7CNXQOCfnlVU4CjjR82UhaMZb2LY-77C5ggNOxJSV-GKU%7C1790134544%7C64ad0c9d890e0dd68f3b37d17c821a9aa70f25bfc38cb5e87e11f39485d6fc15',
    }

    params = {'ms_appid': '24'}
    if ms_token:
        params['msToken'] = ms_token

    data = '{"magic":538969122,"version":1,"dataType":8,"strData":"fvK4ph9jd+4U+EwyVEQHccKh7XKvzuRDVOLrvsU9zfiAxEE7pXI2eQeNsiA/fyhru89yeAhDypoNCzLAb3QG0fDIT3ZPsjLLTBTwTaCNFNdx+0uwCuLleK3900a/dBocZYKvJWPE6Ikn0HGnHJS4loa5uqRPJNGU/Euj/djfuW12a9BItdV3FnvJ/eVENExXQrqylUSZaTTwz2Hys5I+1sWLoYA0KvpvBbAAwW6dcdAv0a/EXDkR+bpNUl7wZ4JB8uCUhSCQLB/v26l6k3JDsUmF6kdfZSBg5nouaB0DUbGNtkErDE21ZMCsJi9wLbMjZtNITMhCyk0GqF0Cax6Q0A+3vom80MkSOFAparu2mRqWze+P7iSQ5NlmaiQRhiD75HBaYFCCLhD6XH41J8CIa4rPVD73bEiL7EHv2rlBC0rOSYtcoB/jMlv9A0PRJSX9m23ztG/tkjWCunjYBT6OidT2+cLVs/QubB/LTV3fI7h8rbu1Kplws0pKlHTc5NtqkPqlmFrXut7w6VkH2Rmblq8wOyF6+HawA3ediaYgL/Fbxdn1p8BhSRihvyu1bhsG5lMGTUsJS5lgRZfF9y209BHHw9hLsOZeBREoJk/vfjX5zo3cWZiInxmYGUjkSQK/vtoEhg02dPN8yRtMrsYvtdOH2hIFdXyQoCps6F0FYSvjekywfTQu8RJ2HV2kK29AZch595eSbVVK7vRbRqf3SCMIvjHz0+GYoFaUxBe8S/GlO5wtV2MRL5I7NTirnYuiepQMoDeNpmTsek4CVxV653USWB1SP0Q2YR9H55C2tqXc9VD5sl6BMisogzDT1jx4bKuDnAJgJjxKRDWvxjVUYllyFt4XL3Izh1+jlt61idlZgH/sBtwNfja/dntc2c27Il2bcZ+74vLW9VvaJZEXxpg4aNIutWOkRIxvu0r2TOJ4oo1zx/OCYkZqYKjpIUz7aqwtRB2+E61qikVtTpytUiaVMCxJ4EXRD17INWjf45Axw4ph00NkmYFTDR4yi2+8orea9sDXX3Qtg17zrmN7wnHW00jUzJGsTGC92L18b0uRvJqxPLtMbdT6KKqIi3P/+HB6cZlprLz8A0MMUZYGjZdosBSYqyBok+YKBmUJBhtRS5gUTnmSahnJVGk+/ky/QC+UOoWJRtTy7eRLFVd5YUCwOP8fjtDUHzwrUfvr3+acfKxbUHDL12W0nwmy0dyQKHRJ7crO2wvCHn2QHWTb9Gj58lSOfd2XPtW/dDg2tB1W8Ux/XKRCSgSe5Igbw9i/dvR4SgfrAgpBOTmpw4l5ZeYjmol3xjT+AHPG8xAx9ZBhFW+jxC+z/+aOwuLR5SbGt8YQN9Csaws/zn610q7/eW1JzIlV8dqCgcRUEGwpSnnfs+mKJv/2GMLYpv0wOm/EjPZFoE7ZSYU6+QXekN3ExV5MJFbRqkbeisSZicMxlczfOhO/AW1S/fIAIqIoWseT3q7fcQXmhMGRa+ErQjZ3ePFxKMqYtKvXgzwu31Gg5QTI9XaL8jxeWQv5qZoQxC1HJUtgkVnT9NAqN1t5L/2GpQaqPPdcadggOoEmBVsTVjAvKgbUHnnlcI2MMmhr1+9f3kIiwGl1MTCK26YWabz5obd2gRUcvwxps/FMfLmYIEJklKf3U6u37gpgd9jYaexyqfxK7a+AWZySaiFF35nUg0rkIlcQOOQAZ51o+K2KbKKhvQSEqXij7qDzadkQPZeZr/NihaznRgTNIrP262qfQwWcWp8cUR0fuRaVjZFrnZIYOGYlZO/33PhkSrKsd+Bw/a/ecMoibEogF88NlTl61bkkTa9pVSV4uoUMkZqn13OwVPpftjFPowZboO6mlIfJZNNLh8nS+7k/4kdECJVDTWDLJtZ4eKWHEeigmQmEN0sdAoDlx21t3C+ve5wDeYTBtcPMH6r6P2FDs7FNBS/UpJcm2jmGkIwGUJ2OQMpb6rcIE9ZafWaNTgY1rfIa+gFvPSCa+6NnYwccLpG0AKnHbnogYfQTuSNWEyYVfmJBwKTeorM8LZf8oF+FUm4sucqE06zehsh/54Q8vn9Nb9c5UUko35xI/cru928hN8AXpIFrvnFgSVlCMRuHvZghG6MZeZh6JOMn6+8G1EkTyVbvmSLF7W0d8VoBnk2gV8lDuqBUXDwqOirXjLvbPPQywqIuDpNNumGD6wEQAwjnFjgYGAft3xLDO4f3A5bXEDpv0ZsYjACioWVe7I/1U8EwwlVEyXaIt3gt1ndDYufX1Lg9qVIbnY3oTOOGfofyd6OpZ+y12JByoH7pmQv5IxVd06D/P1BPzEfPAqD+e6pd6rIhzSczoOLJZJOVE5bi69AmqLc6TSTu/JCiVlRVRXpfjMvmuZWLqrVeX6Ah2LxusFMQE4ObEbOI8OX4+tmPXw5ldz9b3ILol4TFwOYnd6vmIJ7ljRgHlgc7L/rHKmLKhvBemXt0oqIoYDKgGQQr/J9VjlaFLzO7MIYsdh/UVCXlpdl2a49xWboZ6J4IiJGEmAlNT5c4F2fnC9vthufoaoLTzZfrCemw25HZ8RDNvQGm5iFBBnU4dQDJ4DGTkp4k/CHTj3o3muxWrKE9Lb60V4PmAYnQqZ4tYZxlt+xOzuNYHX0FJ81FzH9D0TEeVlNYIRrW012+77Iw5IdV+O0o1NRBVqDbNWULGinTeenJH7w3TpqOWiklxKqxng+aj0VJaglATk9S4NUS0jKJpgsBdPv7pQnPedR6wSfkCEuKKFTYGxiOUXwG6Qx7a/Iq9ZaCJoh2Zho2y0cW8vFl5xhY5WPxbfC3CeZm4ieMXmZa8aC8BBHKXEkNdjvtHUzkIX9SIb1TBfZu1tzyIzAiO20QkptnUILJMLUgOD4epvkNv2Zn1tKVwGEAcFibMIH3ZQs8FHVf+BqqSU0jY+rft89FQnAxcMI0+eOOYct52MeAPN0VdpkE1dDRKz8hMhKtgb9ilpDXZtwSAdh2MkDT6eqoAEEMl+BuOxxVrnQAUr5jDm4aba54/2AB86G7V6RYOBbCYAPDgeoaWMMJ6hitJoo1do3Xs4s3l7zYt9WiFy+xDRPmBE494Jn4E8nLOQzIW4ZWiq7nIPNDH0KghcGKpZHpppxvFltS7asHeXh8DbxSLmTj1+I88XUHEAqjKh2jZhPHkDZX56CDOiqnlLMCUtDPTMkngsTmVaWiuRFw3iiAgn44EFVgIwqo3Z8uzGm4xP+xxP9eA4aF51r1MiMtze9g8qwqu7pOMqk926ekt58TeUzkqI/ojJGm/qgXX1mY1xfpYR4y7KMrSixJj64PGXlV9HkdsI9dfkIhnGo0gA9YpSfgMbEuVwwi49ntkjztsNJ5y+sfucwLMWI6n4FA6gPwly7Y48+mKKS+K/5GbsFH/vmgQr/3ba+P5QbcIWWl5qk1NOS39Dwv56OQNiXDiXfLhyE4BKEKx46PLNvF3fobBHBTE5cNYgI2lpnr7aIy00lyasjT2qjkBM+CwFbBeFbWdEs0gXCxGC2z/mxoWjFhfz2/85yGAC5n0nFdYviiOhrw1HQ5mU10diP03eLpQyjnPrWb2DCMNG8XrUBmOmyD9cFnoujLxI9r+MEbj0fCJXPCqjrPWXV8SnebCBGdMZiZiAx6qMx58kordiKoAvDzRu8KnFiaFzrjMYoWzY5IBR1jJjX1E6uF+DOH7V/YXodUITHc3O7IJcCchVbPrgiehHl8wG/pmxnSOVlxbXSL4MuBpgIAOX9ldqUHDxe1cWRQYnk5Y9EIyXcKdikVDD6M5Kly2mTR7r3oApmMBj+pnnAL/iLdXESYf2xBaCPu3Oigz7W/RlFMtUwO8YikC/0y4i9ZIfIE/OLW9tHfzANwAtK4CW+rgP3SY7bxE1hsSxa6YU0BXT8=","tspFromClient":1790134568308,"ulr":0}'

    response = requests.post('https://mssdk.bytedance.com/web/common', params=params,
                             cookies=COOKIES, headers=headers, data=data, timeout=10)
    return response.cookies.get('msToken')


# ============ 2. a_bogus：交给 JS（get_params.js）算 ============
# get_params.js 里的 sign_url(url, msToken) 是同步函数，execjs 能直接取返回值
with open('get_params.js', 'r', encoding='utf-8') as f:
    _js = execjs.compile(f.read())


def sign(url, ms_token=''):
    """把 url 交给 JS：先拼 msToken，再算 a_bogus，返回 {msToken, a_bogus, url}"""
    return _js.call('sign_url', url, ms_token)


# ============ 3. 取数据 ============
FEED_HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.toutiao.com/',
    'user-agent': UA,
}


def get_feed(max_behot_time=None, category='pc_profile_recommend'):
    """msToken（动态换）+ a_bogus（JS 现算）→ 请求接口 → 返回 json"""
    if max_behot_time is None:
        max_behot_time = int(time.time()) - 10000

    ms_token = get_msToken()

    url = ('https://www.toutiao.com/api/pc/list/feed'
           '?channel_id=0&max_behot_time={}&offset=0'
           '&category={}&aid=24&app_name=toutiao_web').format(max_behot_time, category)

    signed = sign(url, ms_token)

    resp = requests.get(signed['url'], headers=FEED_HEADERS, cookies=COOKIES, timeout=10)
    resp.raise_for_status()
    return resp.json()


if __name__ == '__main__':
    data = get_feed()
    items = data.get('data') or []
    print('message:', data.get('message'), '| has_more:', data.get('has_more'), '| 条数:', len(items))

    for i, it in enumerate(items, 1):
        title = (it.get('title') or it.get('Abstract') or '(无标题)').replace('\n', ' ')
        print('\n[{}] {}'.format(i, title[:60]))
        print('     来源:', it.get('source') or '-', '| 链接:', it.get('article_url') or '-')