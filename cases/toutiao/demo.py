import requests

cookies = {
    # 'tt_webid': '7688302036304545331',
    # 'gfkadpd': '24,6457',
    # 'ttcid': 'b6a71a9388ac47d3a9871da7fd81c0f927',
    # 'local_city_cache': '%E6%B7%B1%E5%9C%B3',
    # 'x-web-secsdk-uid': 'efbd16f0-c027-468a-8723-45d3f0724fe8',
    # 'ttwid': '1%7CyFR2ToFsw2YMqEZvAtkyPfsO7Q96aZpIZJPf2zVJADQ%7C1790072319%7C576444f690f95543a361a359f976e5d39951b01899515da2a0236c7c12633077',
    # 'csrftoken': '5f13433bc7711ae627d725533cef426a',
    # 's_v_web_id': 'verify_muciu9nm_hZ36WWa5_q6xk_4xhH_ANeG_FrFYzanNePjS',
    # 'tt_scid': 'MwjMvpmj7VcZ21APWbqtEeDnRkjQPELDOfORS8aJUO0Me8Kv3EbFlOjnDUlRtXuP99e3',
    # '_ga': 'GA1.1.562980042.1790072320',
    # '_ga_QEHZPBE5HH': 'GS2.1.s1790072320$o1$g0$t1790072320$j60$l0$h0',
}

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.toutiao.com/?wid=1790072318144',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
}

params = {
    'channel_id': '0',
    'max_behot_time': '1790063890',
    'offset': '0',
    'category': 'pc_profile_recommend',
    'aid': '24',
    'app_name': 'toutiao_web',
    'msToken': 'D5ggzCpJvwdbyoeOrCVrgTaXs-CaCOE1vfJDwOf_wee_iQ145CyEeYMWyAdG4sWMzBUKk4uoplVM0GA6mLF1G_piPA-JZoBU_ddf6ucOnKEmDOkDHgGZwjSX6CGJdnc=',
    'a_bogus': 'QJRMMQhXdi6shfyp56nLfY3qV4-3YD3v0t9bMDhq-nV5py39HMOP9exE1ewvJnujFs/jIe6jy4hbO3OBrQC70Zwf7WkO/2nZm6k0e-Ph5VSb-Hv9uy8/r06F-J4-SaBm5v-IrOUho7lHFmuZAnAn4hdAbfFSc36k96EtO9394pD4TKimXFTn',
}

response = requests.get('https://www.toutiao.com/api/pc/list/feed', params=params, cookies=cookies, headers=headers)
# print(response.text)
import json
data = '[{"events":[{"event":"__bav_beat","params":"{\"url\":\"https://www.toutiao.com/?wid=1790072318144\",\"screen_width\":3840,\"screen_height\":2160,\"screen_inner_width\":1908,\"screen_inner_height\":1892,\"beat_type\":1,\"page_key\":\"https://www.toutiao.com/?wid=1790072318144\",\"is_html\":1,\"page_title\":\"今日头条\",\"page_manual_key\":\"\",\"page_viewport_width\":1908,\"page_viewport_height\":951,\"page_total_width\":1893,\"page_total_height\":10077,\"scroll_width\":1908,\"scroll_height\":8470,\"since_page_start_ms\":609264,\"page_start_ms\":1790072318144,\"event_index\":1790072670442}","local_time_ms":1790072927408,"is_bav":1,"session_id":"ac37a57e-bfec-4afb-813a-11219139fd33"}],"user":{"user_unique_id":"7688302036304545331","user_type":14,"user_id":"7688302036304545331","user_is_login":false,"web_id":"7688302036304545331"},"header":{"app_id":24,"os_name":"mac","os_version":"10_15_7","device_model":"Macintosh","language":"zh-CN","platform":"web","sdk_version":"5.1.13","sdk_lib":"js","timezone":8,"tz_offset":-28800,"resolution":"3840x2160","browser":"Chrome","browser_version":"152.0.0.0","referrer":"","referrer_host":"","width":3840,"height":2160,"screen_width":3840,"screen_height":2160,"tracer_data":"{\"$utm_from_url\":1}","custom":"{\"ab_sdk_version\":\"17088266,8813385\",\"user_agent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36\",\"is_pwa\":\"0\"}"},"local_time":1790072927,"verbose":1}]'