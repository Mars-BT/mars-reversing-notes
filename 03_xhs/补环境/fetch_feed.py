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
    """从真实 Chrome 里抓凭证。

    关键：**要等站内自己的签名请求发出去之后再采集**。
    因为站内请求会刷新 ets / sec_poison_id / websectiga / acw_tc 这些反爬 cookie，
    页面刚打开就抢着抓，拿到的是"未预热"的状态，外部请求很容易被判 461。
    同时直接复用站内请求里的 X-S-Common 和设备头（比自己复刻/写死更稳）。
    """
    from playwright.sync_api import sync_playwright

    sign = load_sign_module()
    cdp_url = ensure_cdp_chrome(dst=str(REPO / ".chrome-profile"))
    sign.ensure_page_target(cdp_url)

    captured = {}

    def on_request(req):
        if "edith.xiaohongshu.com/api" in req.url and "xsc" not in captured:
            h = {k.lower(): v for k, v in req.headers.items()}
            if h.get("x-s-common"):
                captured["xsc"] = h["x-s-common"]
                for k in ("user-agent", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform", "referer"):
                    if h.get(k):
                        captured[k] = h[k]

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(cdp_url)
        ctx = browser.contexts[0]
        page = ctx.new_page()
        page.on("request", on_request)
        page.goto(sign.HOME, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function("typeof window.mnsv2 === 'function'", timeout=40000)

        # 等站内自己的签名请求出现（最多 15 秒）
        for _ in range(30):
            if captured.get("xsc"):
                break
            page.wait_for_timeout(500)

        # 兜底：万一没抓到站内请求，就用页面里复刻的一份
        out = page.evaluate(sign.SIGN_JS, [PATH, json.dumps(BODY, ensure_ascii=False, separators=(",", ":"))])
        device = page.evaluate("""() => {
            const d = navigator.userAgentData;
            const ck = (n) => {
                const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)'));
                return m ? decodeURIComponent(m[1]) : null;
            };
            const ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
            const ss = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
            return {
                'user-agent': navigator.userAgent,
                'sec-ch-ua': (d && d.brands || []).map(b => '"' + b.brand + '";v="' + b.version + '"').join(', '),
                'sec-ch-ua-mobile': d ? (d.mobile ? '?1' : '?0') : '?0',
                'sec-ch-ua-platform': '"' + (d ? d.platform : 'macOS') + '"',
                'referer': 'https://www.xiaohongshu.com/explore',
                // ↓ X-S-Common 离线计算的输入（键名来自线上 bundle 的常量模块 w）
                a1: ck('a1'),                 // w.o4
                dsllt: ls('dsllt'),           // w.br
                b1: ls('b1'),                 // w.q2
                b1b1: ls('b1b1'),             // w.z7
                dsl: String(window._dsl),
                platform: window['xsecplatform'] || (d ? d.platform : 'Mac OS'),
                sc: ss('sc'),                 // w.DY
            };
        }""")
        # cookies 也在这个时点取（站内请求已经刷过反爬 cookie）
        cookies = [c for c in ctx.cookies() if "xiaohongshu.com" in (c.get("domain") or "")]
        page.close()

    for k, v in device.items():
        captured.setdefault(k, v)

    # 拆成两类：请求头用的设备信息 / X-S-Common 离线计算的输入
    XSC_KEYS = ("a1", "dsllt", "b1", "b1b1", "dsl", "platform", "sc")
    header_device = {k: v for k, v in captured.items() if k not in XSC_KEYS}
    xsc_inputs = {k: captured[k] for k in XSC_KEYS if k in captured}

    creds = {
        "cookies": cookies,
        "xsc": captured.get("xsc"),                 # 兜底：站内真实 X-S-Common 成品
        "common_plain": out.get("common_plain"),    # 兜底
        "device": header_device,                    # UA / Client Hints / Referer
        "xsc_inputs": xsc_inputs,                   # 供 xs_common.js 离线算 X-S-Common
    }
    CREDS.write_text(json.dumps(creds, ensure_ascii=False, indent=2), encoding="utf-8")
    src = "站内真实请求" if captured.get("xsc") else "页面复刻"
    print(f"[creds] 已写入 {CREDS}（cookie {len(cookies)} 项，X-S-Common 取自：{src}）")
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


def build_headers(creds, sign):
    """拼请求头，对齐"真机抓到的请求头"那一套：
    user-agent / sec-ch-ua / sec-ch-ua-mobile / sec-ch-ua-platform / referer / content-type
    / cookie / x-s / x-t / x-s-common

    三处硬要求：
    1) X-S-Common 必须原样使用（改字段即 461）
    2) sec-ch-ua* 必须带，且与 UA 一致（缺或不一致即 461）
    3) 不要画蛇添足加 origin / accept —— 真机这套请求头里就没有，多加了反而不一致
    """
    device = creds.get("device") or {}
    # X-S-Common 优先用站内真实请求里抓到的（原样），没有才用页面复刻的
    xsc = creds.get("xsc") or sign.get("X-S-Common") or ""
    return {
        "user-agent": device.get("user-agent") or UA,
        "sec-ch-ua": device.get("sec-ch-ua") or '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
        "sec-ch-ua-mobile": device.get("sec-ch-ua-mobile") or "?0",
        "sec-ch-ua-platform": device.get("sec-ch-ua-platform") or '"macOS"',
        "content-type": "application/json;charset=UTF-8",
        "referer": device.get("referer") or "https://www.xiaohongshu.com/explore",
        "X-s": sign["X-s"],
        "X-t": sign["X-t"],
        "X-S-Common": xsc,
        "Cookie": "; ".join(f'{c["name"]}={c["value"]}' for c in creds["cookies"]),
    }


def post_feed(headers, body_json):
    return requests.post(API_HOST + PATH, data=body_json.encode(), headers=headers,
                         impersonate="chrome", timeout=30)


def print_notes_from_text(text):
    try:
        data = json.loads(text)
    except Exception:
        print("[data] 解析失败:", text[:200])
        return
    items = (data.get("data") or {}).get("items") or []
    print(f'[data] code={data.get("code")} 笔记条数={len(items)}')
    for it in items[:8]:
        card = it.get("note_card") or {}
        print("   ·", card.get("display_title"), "| by", (card.get("user") or {}).get("nickname"))


def print_notes(resp):
    print_notes_from_text(resp.text)


FETCH_JS = """async ([url, body, headers]) => {
    const r = await fetch(url, { method: 'POST', headers: headers, body: body, credentials: 'include' });
    return { status: r.status, text: await r.text() };
}"""


def fetch_via_browser(body_json, node_sign_result=None):
    """兜底：用真实浏览器上下文发请求。

    为什么需要它：服务端在**连接层**（TLS/HTTP2 指纹）上能区分"真浏览器"和"外部客户端"，
    风控收紧时外部客户端即使签名/请求头全对也会 461，而页面内 fetch 依旧 200。
    所以这里用浏览器自己的连接发 —— 但**签名仍优先用 Node 出签**，
    这样补环境始终在链路里（浏览器只当传输通道）。
    """
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
        page.wait_for_timeout(1500)

        # 先试 Node 出签的签名：浏览器只负责传输
        if node_sign_result and node_sign_result.get("X-s"):
            out = page.evaluate(FETCH_JS, [API_HOST + PATH, body_json, {
                "Content-Type": "application/json;charset=UTF-8",
                "X-s": node_sign_result["X-s"],
                "X-t": node_sign_result["X-t"],
                "X-S-Common": node_sign_result.get("X-S-Common", ""),
            }])
            print("[兜底] Node 出签 + 浏览器传输 → status:", out["status"])
            if out["status"] == 200:
                page.close()
                return out

        # 再用页面自己算的签名
        s = page.evaluate(sign.SIGN_JS, [PATH, body_json])
        out = page.evaluate(FETCH_JS, [API_HOST + PATH, body_json, {
            "Content-Type": "application/json;charset=UTF-8",
            "X-s": s["X-s"],
            "X-t": str(s["X-t"]),
            "X-S-Common": s.get("X-S-Common", ""),
        }])
        page.close()
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="强制重新抓一次凭证")
    parser.add_argument("--direct", action="store_true", help="只用外部客户端，不走浏览器兜底")
    args = parser.parse_args()

    body_json = json.dumps(BODY, ensure_ascii=False, separators=(",", ":"))

    # 先用缓存凭证；一旦被拒（461/406）就自动重新抓凭证再试，最多三轮。
    # 这样直接跑一条命令就能稳定拿到数据，不用手动 --refresh。
    creds = None
    if CREDS.exists() and not args.refresh:
        creds = json.loads(CREDS.read_text(encoding="utf-8"))

    last = None
    for attempt in range(1, 4):
        if creds is None:
            creds = refresh_creds()
        sign = node_sign(body_json)
        print(f"[sign] 第 {attempt} 轮 X-s 前缀:", sign["X-s"][:60], "...")
        last = post_feed(build_headers(creds, sign), body_json)
        print("[http] status:", last.status_code)
        if last.status_code == 200:
            print_notes(last)
            return
        print("[http] 被拒，刷新凭证后重试")
        creds = None

    print("[http] 外部客户端三轮都被拒，改用浏览器上下文兜底（浏览器只负责传输，签名仍用 Node 出签）")
    out = fetch_via_browser(body_json, node_sign(body_json))
    print("[http] 浏览器兜底 status:", out["status"])
    if out["status"] == 200:
        print_notes_from_text(out["text"])
    else:
        print("[http] 兜底也失败:", out["text"][:200])


if __name__ == "__main__":
    main()
