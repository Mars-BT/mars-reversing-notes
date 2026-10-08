import json
from pathlib import Path

from playwright.sync_api import sync_playwright

from utils.cdp import ensure_cdp_chrome

CDP_PORT = 9222

CRITERIA = {
    "pageSize": 50,
    "industryComponent": None,
    "channel": None,
    "productType": None,
    "sort": None,
    "warehouseCode": None,
    "key_search": None,
    "is_central": None,
    "searchField": None,
    "companyCode": None,
    "inquiryCategory": None,
    "inquirySpec": None,
    "provider": None,
    "shopCode": None,
    "packCodes": None,
    "steelFactory": None,
    "resourceIds": None,
    "providerCode": None,
    "jsonParam": {"channel": "RJ", "keywordAnalyseResult": None},
    "excludeShowSoldOut": None,
    "pageIndex": 1,
    "maxPage": 50,
}

if __name__ == "__main__":
    cdp_url = ensure_cdp_chrome(
        dst=Path(__file__).parent / ".chrome-profile",
        port=CDP_PORT,
        # system="linux",    # 需要跑其它系统时显式指定
        # chrome_path="...", # Chrome 不在默认位置时手动指定
    )
    print("CDP 地址:", cdp_url)

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(cdp_url)
        print("已连接:", browser.version)

        # attach 模式下浏览器已经存在，直接复用它的默认上下文和标签页
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()

        # 先进到目标站点，保证同源、且瑞数的 hook 已在该页面生效
        page.goto("https://www.ouyeel.com/steel/search?pageSize=50&channel=RJ")

        # 故意不传瑞数那个动态参数（curl 里的 K5nOZLud），看它的 hook 会不会自动补上
        result = page.evaluate(
            """
            async (criteria) => {
                const res = await fetch("/search-ng/commoditySearch/queryCommodityResult", {
                    method: "POST",
                    headers: {"Content-Type": "application/x-www-form-urlencoded"},
                    body: "criteriaJson=" + encodeURIComponent(criteria),
                });
                return {status: res.status, body: await res.text()};
            }
            """,
            json.dumps(CRITERIA),
        )
        print("状态码:", result["status"])
        print("响应片段:", result["body"][:300])

        # browser.close() 在 CDP 模式下只断开连接，不会关掉 Chrome
        # 真要关掉这个浏览器：browser.new_browser_cdp_session().send("Browser.close")

# uv run python -m 01_ruishu.ouyeel.CDP.demo
