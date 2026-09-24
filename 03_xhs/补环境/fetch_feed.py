"""小红书 homefeed 取数（补环境路线）。

签名在纯 Node 里算（03_xhs/补环境/sign_node.js + env.js + vmp.js），
本脚本只负责三件事：
    1. 备好凭证（cookies / X-S-Common）—— 首次用 CDP 从真实 Chrome 里抓一次，存成 creds.json
    2. 调 node sign_node.js 拿 X-s / X-t
    3. 用 curl_cffi（Chrome TLS 指纹）发请求并打印笔记

为什么传输层不用 requests：
    Node 的 fetch / python 的 requests 的 TLS 指纹不是 Chrome，接口会拦；curl_cffi 才过得去。

用法：
    uv run python 03_xhs/补环境/fetch_feed.py            # 用已有 creds.json
    uv run python 03_xhs/补环境/fetch_feed.py --refresh  # 重新抓一次凭证（会开 Chrome）
"""

import argparse
import importlib.util
import json
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
CREDS = HERE / "creds.json"

sys.path.insert(0, str(REPO))

from curl_cffi import requests

from utils.cdp import ensure_cdp_chrome

API_HOST = "https://edith.xiaohongshu.com"
PATH = "/api/sns/web/v1/homefeed"
BODY = {
    "cursor_score": "",
    "num": 20,
    "refresh_type": 1,
    "note_index": 0,
    "unread_begin_note_id": "",
    "unread_end_note_id": "",
    "unread_note_count": 0,
    "category": "homefeed_recommend",
    "search_key": "",
    "need_num": 10,
    "image_formats": ["jpg", "webp", "avif"],
    "need_filter_image": False,
}
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
)


def load_sign_module():
    """复用 CDP 方案里已经写好的页面侧签名代码（只用来抓一次凭证）。"""
    spec = importlib.util.spec_from_file_location("xhssign", str(REPO / "03_xhs" / "CDP" / "sign.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def refresh_creds():
    """从真实 Chrome 里抓 cookies 和页面侧算出的 X-S-Common 原值。"""
    from playwright.sync_api import sync_playwright

    sign = load_sign_module()
    cdp_url = ensure_cdp_chrome(dst=str(REPO / ".chrome-profile"))
    sign.ensure_page_target(cdp_url)

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(cdp_url)
        ctx = browser.contexts[0]
        page = ctx.new_page()
        page.goto(sign.HOME, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function("typeof window.mnsv2 === 'function'", timeout=40000)
        body_json = json.dumps(BODY, ensure_ascii=False, separators=(",", ":"))
        out = page.evaluate(sign.SIGN_JS, [PATH, body_json])
        cookies = [c for c in ctx.cookies() if "xiaohongshu.com" in (c.get("domain") or "")]
        page.close()

    creds = {
        "cookies": cookies,
        "common_plain": out.get("common_plain"),
    }
    CREDS.write_text(json.dumps(creds, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[creds] 已写入 {CREDS}（cookie {len(cookies)} 项）")
    return creds


def node_sign(body_json):
    """调纯 Node 出签。"""
    proc = subprocess.run(
        ["node", str(HERE / "sign_node.js"), PATH, body_json],
        cwd=HERE, capture_output=True, text=True, timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"node 出签失败: {proc.stderr[-500:]}")
    return json.loads(proc.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="重新抓一次凭证")
    args = parser.parse_args()

    if args.refresh or not CREDS.exists():
        creds = refresh_creds()
    else:
        creds = json.loads(CREDS.read_text(encoding="utf-8"))

    body_json = json.dumps(BODY, ensure_ascii=False, separators=(",", ":"))
    sign = node_sign(body_json)
    print("[sign] X-s 前缀:", sign["X-s"][:60], "...")

    # X-S-Common 由 sign_node.js 用凭证文件里的原值编码好带出来
    common = sign.get("X-S-Common") or ""

    headers = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        "Origin": "https://www.xiaohongshu.com",
        "Referer": "https://www.xiaohongshu.com/explore",
        # 关键：这组 Client Hints 必须带，且要和 UA 里的 Chrome 版本一致。
        # 实测去掉这三个头 → 直接 461（服务端靠它们判断是不是真浏览器）
        "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "X-s": sign["X-s"],
        "X-t": sign["X-t"],
        "X-S-Common": common,
        "Cookie": "; ".join(f'{c["name"]}={c["value"]}' for c in creds["cookies"]),
    }

    resp = requests.post(API_HOST + PATH, data=body_json.encode(), headers=headers,
                         impersonate="chrome", timeout=30)
    print("[http] status:", resp.status_code)
    try:
        data = resp.json()
    except Exception:
        print("[http] body:", resp.text[:300])
        return

    items = (data.get("data") or {}).get("items") or []
    print(f'[data] code={data.get("code")} 笔记条数={len(items)}')
    for it in items[:8]:
        card = it.get("note_card") or {}
        print("   ·", card.get("display_title"), "| by", (card.get("user") or {}).get("nickname"))


if __name__ == "__main__":
    main()
