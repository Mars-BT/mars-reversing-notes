import time
from pathlib import Path
from lxml import etree
from playwright.sync_api import sync_playwright

from utils.chrome_profile import prepare_chrome_profile

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

        data = []

        def handle_response(response):
            if '/commoditySearch/queryCommodityResult' not in response.url:
                return
            if response.status != 200:
                print("状态码错误:", response.status)
                return
            data.append(response.json())
        
        page.on("response", handle_response)
        
        page.goto(f"https://www.ouyeel.com/steel/search?pageIndex=0&pageSize=50&channel=RJ")
        for i in range(3):
            page.get_by_text("下一页").click()
            page.wait_for_timeout(2000)
        page.wait_for_timeout(2000)
        print("爬取页数:", len(data))
        context.close()

# uv run python -m 01_ruishu.ouyeel.auto_playwright.demo2
