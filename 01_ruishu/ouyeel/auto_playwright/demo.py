import json
from pathlib import Path

from playwright.sync_api import sync_playwright

from utils.chrome_profile import prepare_chrome_profile

TARGET_API = "/commoditySearch/queryCommodityResult"
SEARCH_URL = "https://www.ouyeel.com/steel/search?pageSize=50&channel=RJ"
MAX_PAGES = 3

if __name__ == "__main__":
    user_data_dir, profile_name = prepare_chrome_profile(
        dst=Path(__file__).parent / ".chrome-profile",
        # system="linux",   # 需要跑其它系统时显式指定
        # refresh=True,     # 想同步真实 Chrome 的最新登录态时打开
    )

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            channel="chrome",
            headless=False,
            viewport=None,  # 用真实窗口尺寸
            args=[
                f"--profile-directory={profile_name}",
                "--disable-blink-features=AutomationControlled",  # navigator.webdriver = false
            ],
        )
        page = context.pages[0] if context.pages else context.new_page()

        rows = []
        for page_index in range(MAX_PAGES):
            # 一次 expect_response 只能接住一次响应，所以每页都要重新挂一次监听
            with page.expect_response(lambda r: TARGET_API in r.url) as res:
                if page_index == 0:
                    page.goto(SEARCH_URL)  # 首屏：进页面时前端自己发请求
                else:
                    page.get_by_text("下一页").click()  # 翻页：点一次发一次请求

            rows += json.loads(res.value.json()["resultList"])  # resultList 是 JSON 字符串

        print(f"共 {len(rows)} 条")
        context.close()

# uv run python -m 01_ruishu.ouyeel.auto_playwright.demo
