"""
百度翻译接口(直接请求即可)
https://fanyi.baidu.com/
"""

import json
import time
import requests

def translate(text: str) -> str:
    """翻译文本。"""

    cookies = {
        'BIDUPSID': '64D4C1D8C34D2A0835C33DDC2A501DE7',
        'PSTM': '1788926366',
        'BAIDUID': '64D4C1D8C34D2A0822E12536CEF1EDE5:FG=1',
        'H_WISE_SIDS_BFESS': '63140_72660_72944_73031_73053_73318_73288_73332_73351_73365_73415_73449_73672_73692_73700_73711_73723_73726_73754_73742_73646_73647_73721_73787_73793_73789_73748_73800_73841_73871_73889_73904_73920_73922_73952_73960_73970_73976_74039_74055_74183_74179_74185_74377_74240_74268_74248_74322_74220_74347_74196_74292_74479_74366_74411_74405_74423_74397_74500_74505_74506_74516_74521_74538_74530_74543_74555_74485_74591_74600_74060_74627',
        'BDORZ': 'B490B5EBF6F3CD402E515D22BCDA1598',
        'H_WISE_SIDS': '63140_73053_73318_73365_73692_73787_73789_73800_73889_73904_73952_73976_74039_74055_74183_74179_74185_74377_74240_74268_74248_74322_74220_74347_74196_74292_74479_74366_74411_74405_74423_74397_74506_74516_74521_74538_74530_74555_74485_74591_74600_74627_74668_74666_74671_74702_74680_74738_74761_74663_74730_74780_74800_74814_74831_74836_74839_74838_74888_74887_74885_74890_74902_74895_74898_74907_74918_74942_74939_74944_74970_74996_75006',
        'BA_HECTOR': '0080852580ag010001a42k24058k2l1lamn7b29',
        'BAIDUID_BFESS': '64D4C1D8C34D2A0822E12536CEF1EDE5:FG=1',
        'ZFY': 'd4S68CKGZf5YCsOJ67jS0kMBtDKwl3K88pQUY8K3J3M:C',
        'delPer': '0',
        'PSINO': '6',
        'H_PS_PSSID': '63140_73053_73318_73365_73692_73787_73789_73800_73889_73904_73952_73976_74039_74055_74144_74183_74185_74377_74240_74268_74248_74322_74220_74347_74196_74292_74479_74366_74411_74405_74423_74397_74506_74516_74521_74538_74530_74555_74485_74591_74600_74627_74668_74666_74671_74702_74680_74738_74761_74663_74730_74780_74800_74814_74831_74836_74839_74838_74888_74887_74885_74890_74902_74895_74898_74907_74918_74942_74939_74944_74970_74996_75006',
        'Hm_lvt_64ecd82404c51e03dc91cb9e8c025574': '1789631258',
        'Hm_lpvt_64ecd82404c51e03dc91cb9e8c025574': '1789631258',
        'HMACCOUNT': '473AACB584565A68',
        'BCLID': '8932340951746028078',
        'BCLID_BFESS': '8932340951746028078',
        'BDSFRCVID': 'We8OJexroGWSSon8mvKE81kVQ2KK0gOTDYLEOwXPsp3LGJLV41k3EG0Pt8pCGEIM4ch-ogKK3gOTH4PF_2uxOjjg8UtVJeC6EG0Ptf8g0M5',
        'BDSFRCVID_BFESS': 'We8OJexroGWSSon8mvKE81kVQ2KK0gOTDYLEOwXPsp3LGJLV41k3EG0Pt8pCGEIM4ch-ogKK3gOTH4PF_2uxOjjg8UtVJeC6EG0Ptf8g0M5',
        'H_BDCLCKID_SF': 'tb48_CDMfIt3fP36q4jqMJtJ5eT22jPtBnn9aJ5nJDoKof5tehLWhJFm2HADah5ItJ7g2-n8QpP-HJ7y5Cc8e-KFKprQ56jgtR-LKl0MafjYbb0xynoDKR_-KfnMBMPe52OnaIbx3fAKftnOM46JehL3346-35543bRTLnLy5KJWMDFGD5Khejo-jHRabK6aKC5bL6rJabC3Ht5VXU6q2bDeQnJgQ-RXfIjqabFytRv4VDooyT3JXp0vWtv4WbbvLT7johRTWqR4MKjcDUonDh83eh3m0MQABRn2BT6O5hvvhn3O3MAM0MKmDloOW-TB5bbPLUQF5l8-sq0x0bOte-bQXH_Et68HJRKDVCKQKt8_HRjYbb__-P4Den6hWURZ56bHWh36LMOoDCnz5xRre5_f3RLHBMPj52OnKUT13l7boMJRK5bdQUIT3G8Da5J43bRTLInM0h3pOqCm-PAVhP-UyNbMWh37JNRlMKoaMp78jR093JO4y4Ldj4oxJpOJ5JbMopCafDK2hCKwDjuhePDyqx5Ka43tHD7yWCv65CncOR59K4nn3pt9hUIO2R5i3R-DBMQltqvvhb3O3MOZXMLg5n7Tbb8eBgvZ2UL2tRk5sq0x0b8WKMt1QtrutPJ3HCOMahkb5h7xOKbMQlPK5JkgMx6MqpQJQeQ-5KQN3KJmfbL9bT3YjjISKx-_tTKJJJcP',
        'H_BDCLCKID_SF_BFESS': 'tb48_CDMfIt3fP36q4jqMJtJ5eT22jPtBnn9aJ5nJDoKof5tehLWhJFm2HADah5ItJ7g2-n8QpP-HJ7y5Cc8e-KFKprQ56jgtR-LKl0MafjYbb0xynoDKR_-KfnMBMPe52OnaIbx3fAKftnOM46JehL3346-35543bRTLnLy5KJWMDFGD5Khejo-jHRabK6aKC5bL6rJabC3Ht5VXU6q2bDeQnJgQ-RXfIjqabFytRv4VDooyT3JXp0vWtv4WbbvLT7johRTWqR4MKjcDUonDh83eh3m0MQABRn2BT6O5hvvhn3O3MAM0MKmDloOW-TB5bbPLUQF5l8-sq0x0bOte-bQXH_Et68HJRKDVCKQKt8_HRjYbb__-P4Den6hWURZ56bHWh36LMOoDCnz5xRre5_f3RLHBMPj52OnKUT13l7boMJRK5bdQUIT3G8Da5J43bRTLInM0h3pOqCm-PAVhP-UyNbMWh37JNRlMKoaMp78jR093JO4y4Ldj4oxJpOJ5JbMopCafDK2hCKwDjuhePDyqx5Ka43tHD7yWCv65CncOR59K4nn3pt9hUIO2R5i3R-DBMQltqvvhb3O3MOZXMLg5n7Tbb8eBgvZ2UL2tRk5sq0x0b8WKMt1QtrutPJ3HCOMahkb5h7xOKbMQlPK5JkgMx6MqpQJQeQ-5KQN3KJmfbL9bT3YjjISKx-_tTKJJJcP',
        'AIT_PERSONAL_VERSION': '1',
        'AIT_ENTERPRISE_VERSION': '1',
        'RT': '"z=1&dm=baidu.com&si=e60c576c-31f6-4bf8-bd6e-bc8c6084343b&ss=mu588wef&sl=5&tt=46i&bcn=https%3A%2F%2Ffclog.baidu.com%2Flog%2Fweirwood%3Ftype%3Dperf"',
        'ab_sr': '1.0.1_ZmRmOGU4ZTcxZTk5YjExOTgwM2ViMmNkMTk2YWM1NWZhZGNkYWU4MWMzZGRhNzdlNTIxYzM0ZWYzZWUxMTQ5MDNjOGRmM2MyZDlkMDg1NjM1MjlhYzBkMjZiOTNlOTQ3NTBmYzAzMGY0OGQwN2UyNDg4MTJiZmFjN2MwMjdiNWFjNTI1YzUwNGViNjZhMzVjMGMwNjMyYzdmZTE0MzJmZg==',
    }

    headers = {
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Acs-Token': 'P1_1789545607882_1789631652045_n56hhyazfU3MwBNF1uBbBtpwlGUVX8/D+aXPB1qR+v5hjOup6xwlAT4l6zGvoWEEuOVsLkU0APvgClfoIDCMzbLsKfcVOkuxOZ0pLYv1OA98nWkNGJ8kY83ifAOpiE2K0n2iT6Imn00irmVLIOTDXwfv6AMFmq//ajQYiTZdIcoHwAfe+/6p0Y+ogf8czvQIE44O9AHPVD55KW/oXkSkgUZygZ1pH57oXLq8Yyxaa2lRA9iQ8KHtB58Q/Z19Wid/yINitKMcXkyTbNcuWYiuEUx7ZiLuWvz6AyJKjsL1dg56+7E/jheuByQMBWwz3kz3WODOgLRmqxwJY+YmLd6KU3Hhm7UQl5x7M6FwUzktylduga7+ayutU1PkrxOEEOjXcDLXIKVZjpBt7l0dqv9Alrf2xmbgmeJT+4Dm5cSOm4iNKgqLI2ylktX7KExFczqyk5eBT/K3II29lX/Fc37U2Z8faabuyAnlJobZfC03NJUxDVCbIbTXVLTu93Jkc+Z0',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Origin': 'https://fanyi.baidu.com',
        'Referer': 'https://fanyi.baidu.com/mtpe-individual/transText?query=%E2%80%9C%E4%BD%A0%E5%A5%BD%E2%80%9D%E5%9C%A8%E4%B8%AD%E6%96%87%E4%B8%AD%E6%98%AF%E5%B8%B8%E8%A7%81%E7%9A%84%E9%97%AE%E5%80%99%E8%AF%AD%EF%BC%8C%E5%AF%B9%E5%BA%94%E8%8B%B1%E8%AF%AD%E6%9C%89%E5%A4%9A%E7%A7%8D%E8%AF%91%E6%B3%95%EF%BC%8C%E5%85%B7%E4%BD%93%E5%8F%96%E5%86%B3%E4%BA%8E%E8%AF%AD%E5%A2%83%E5%92%8C%E6%AD%A3%E5%BC%8F%E7%A8%8B%E5%BA%A6%EF%BC%9A&lang=zh2en&ext_channel=Aldtype01',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        'accept': 'text/event-stream',
        }


    json_data = {
        'needNewlineCombine': False,
        'disableCache': False,
        'isAi': False,
        'sseStartTime': int(time.time()*1000),
        'query': text,
        'from': 'zh',
        'to': 'en',
        'reference': '',
        'corpusIds': [],
        'needPhonetic': True,
        'domain': 'common',
        'detectLang': '',
        'isIncognitoAI': False,
        'milliTimestamp': int(time.time()*1000),
    }

    response = requests.post('https://fanyi.baidu.com/ait/text/translate', cookies=cookies, headers=headers, json=json_data, stream=True)
    # SSE 响应体按「event: xxx / data: {...} / 空行」分块，逐行读取并只解析 data 行
    translations = {}  # paraIdx -> 译文，先攒着不输出
    for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith('data: '):
            continue
        chunk = json.loads(line[len('data: '):])
        if chunk['errno'] != 0:  # 出错时 data 为 null，只有 errmsg
            print(chunk['errmsg'])
            break
        data = chunk['data']
        if data.get('event') == 'Translating':  # 译文在 list[].dst 中，message 只是进度提示
            for item in data['list']:
                translations[item['paraIdx']] = item['dst']
        elif data.get('event') == 'Finished':
            break

    return '\n'.join(translations[idx] for idx in sorted(translations))


if __name__ == '__main__':
    text = '''
    任务前提
    如果任务与说明“新用户”，需确保做任务的手机从未安装过该APP，注册手机号从未注册过该APP。使用虚拟定位、模拟器或作弊工具，将被系统判定为无效并取消奖励。
    1
    下载并安装App
    在任务详情页面，点击按钮下载进行下载。跳转到应用市场下载时，请务必选择没有“广告”字样的进行下载，否则可能导致任务失败。
    2
    使用新手机号注册
    打开App，使用从未注册过该App的手机号进行注册。
    3
    完成指定行为
    完成任务要求的指定的操作。例如：登录APP、签到、浏览特定页面、搜索关键词、或进行实名认证、下单、开通会员等。
    4
    满足留存条件
    如任务有要求第2天登录，请一定在第2天，再次打开并登录该App，保持活跃状态，切勿中途卸载。
    5
    等待审核与发放
    如需任务有要求提交任务过程截图，请务必按要求提交。提交后系统将在T+1个工作日内进行审核，审核通过后，奖励将自动发放至您的账户中。如有疑问请联系客服。
    '''
    print(translate(text))
