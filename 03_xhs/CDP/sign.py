"""小红书 x-s 签名（CDP 方案）。

为什么用 CDP 而不是纯补环境
    x-s 里最核心的一项 x3 = window.mnsv2(url + body, md5(url + body), md5(url))，
    这个 mnsv2 由页面上的 vmp.js（虚拟机保护）提供。它做了大量环境检测（DOM 标签
    枚举、Navigator 原型原生性、eval 劫持检测等），纯 Node 补环境成本极高。
    所以这里换个思路：借本机真实 Chrome（真实 cookies + 指纹），把页面自己的
    window.mnsv2 调出来用；其余算法（md5 / utf8 / 自定义 base64 / 各种常量）
    全部由我们自己复刻，不依赖页面的拦截器。

签名结构（逆向自页面加载的 vendor-dynamic.*.js）

    seccore_signv2(url, data)                       # 生成 X-s
        c      = url + JSON.stringify(data)
        md5_c  = md5(c)                             # 记为 x5
        x3     = window.mnsv2(c, md5_c, md5(url))    # 虚拟机算出来的核心值
        S      = {x0: "4.4.3", x1: "xhs-pc-web", x2: 平台, x3: x3,
                  x4: "object", x5: md5_c}
        X-s    = "XYS_" + 自定义base64(utf8(JSON.stringify(S)))
        X-t    = Date.now()

    xsCommon(platform, url)                         # 生成 X-S-Common
        et     = {s0: 3, s1: "", x0: localStorage[w.z7] || w.fI, x1: w.i8,
                  x2: 平台, x3: "xhs-pc-web", x4: "6.56.2", x5: cookie[w.o4],
                  x6: "", x7: "", x8: localStorage[w.q2],
                  x9: hash("" + "" + x8), x10: sessionStorage 计数,
                  x11: "normal", x12: localStorage[w.br] + ";" + window._dsl}
        X-S-Common = 自定义base64(utf8(JSON.stringify(et)))

    其中自定义 base64 的字母表是（不是标准表）：
        ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5

    三个 helper（md5 / utf8 / 自定义 base64）和常量模块都从页面 webpack 运行时取：
        window.webpackChunkxhs_pc_web  ->  require
        require(384)                   ->  {Pu: md5, lz: encodeUtf8, xE: b64Encode}
        含 i8 / mj 的模块               ->  SDK 版本、平台等常量

注意：签名和请求体必须使用完全相同的字符串，否则服务端校验不过；
      homefeed 还需要 X-S-Common，少了会返回 461（带上但值不完全等于站内也能过）。

用法：
    uv run python 03_xhs/CDP/sign.py            # 只打印签名
    uv run python 03_xhs/CDP/sign.py --feed     # 请求 homefeed 并打印笔记列表
    uv run python 03_xhs/CDP/sign.py --capture  # 顺便抓站内真实请求头做对照
"""

import argparse
import json
import pathlib
import sys
import urllib.request

# 让脚本能 import 到仓库根目录下的 utils
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from playwright.sync_api import sync_playwright

from utils.cdp import ensure_cdp_chrome

# 首页（用它把页面的签名环境加载出来）
HOME = "https://www.xiaohongshu.com/explore"
# 接口域名
API_HOST = "https://edith.xiaohongshu.com"
# 目标接口路径（签名要覆盖这个路径）
PATH = "/api/sns/web/v1/homefeed"
# 请求体：签名和发送必须用同一个 JSON 字符串
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

# 在页面上下文里复刻 seccore_signv2 + xsCommon，产出两个签名头。
# 只有 x3 用页面的 window.mnsv2，其余全是自己算的。
SIGN_JS = """([path, bodyJson]) => {
    try {
        // 1) 通过 webpack 运行时拿到模块
        let req;
        window.webpackChunkxhs_pc_web.push([[Math.random().toString(36)], {}, r => { req = r }]);
        const ed = req(384);                       // { Pu: md5, lz: encodeUtf8, xE: 自定义base64 }
        const mods = [];
        for (const id in req.c) {
            try { const e = req.c[id].exports; if (e && typeof e === 'object') mods.push(e); } catch (err) {}
        }
        const w = mods.find(e => 'i8' in e && 'mj' in e);   // 含 SDK 版本 / 平台常量的模块
        if (!ed || !w) return { error: '拿不到模块', hasEd: !!ed, hasW: !!w };

        // 2) X-s：路径 + body 拼一起算 md5，再交给页面的虚拟机
        const c = path + bodyJson;
        const u = ed.Pu(c);                        // md5(url + body)  -> x5
        const p = ed.Pu(path);                     // md5(url)
        const v = window.mnsv2(c, u, p);           // 虚拟机算出的 x3
        const S = { x0: w.i8, x1: 'xhs-pc-web', x2: window[w.mj] || 'PC', x3: v, x4: 'object', x5: u };

        // 3) X-S-Common：复刻 xsCommon
        const platform = window[w.mj] || 'PC';
        const ls = window.localStorage, ss = window.sessionStorage;
        const cookieVal = name => {
            const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
            return m ? decodeURIComponent(m[1]) : '';
        };
        const x8 = ls.getItem(w.q2);
        const et = {
            s0: 3, s1: '',
            x0: ls.getItem(w.z7) || w.fI,
            x1: w.i8,
            x2: platform,
            x3: 'xhs-pc-web',
            x4: '6.56.2',
            x5: cookieVal(w.o4),
            x6: '', x7: '',
            x8: x8,
            x9: ed.tb('' + '' + (x8 || '')),
            x10: Number(ss.getItem(w.DY)) || 0,
            x11: 'normal',
            x12: ls.getItem(w.br) + ';' + (window._dsl || ''),
        };
        return {
            'X-s': 'XYS_' + ed.xE(ed.lz(JSON.stringify(S))),
            'X-t': String(Date.now()),
            'X-S-Common': ed.xE(ed.lz(JSON.stringify(et))),
            from: 'seccore_signv2 + xsCommon',
            common_plain: JSON.stringify(et),
        };
    } catch (e) {
        return { error: String(e && e.message) };
    }
}"""

# 在页面脚本执行前注入：记录站内请求的 X-s / X-t / X-S-Common，用来对照我们自己算的对不对
CAPTURE_JS = """() => {
    window.__xhs = [];
    const push = (u, h) => {
        if (!h) return;
        const get = k => h[k] || h[k.toLowerCase()] || (h.get && h.get(k));
        const xs = get('X-s') || get('x-s');
        if (xs) window.__xhs.push({ url: String(u), xs: String(xs), xt: String(get('X-t') || get('x-t') || '') });
    };
    const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.setRequestHeader, ps = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; return oo.apply(this, arguments); };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) { (this.__h = this.__h || {})[k] = v; return os.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () { const self = this; self.addEventListener('load', () => push(self.__u, self.__h)); return ps.apply(this, arguments); };
    const of = window.fetch;
    window.fetch = function (i, init) { const r = of.apply(this, arguments); try { push(typeof i === 'string' ? i : i && i.url, init && init.headers); } catch (e) {} return r; };
}"""


def ensure_page_target(cdp_url):
    """CDP 浏览器里一个页面都没有时 Playwright 连接会报
    "Browser context management is not supported"，先用 HTTP 接口开个空白页。"""
    try:
        with urllib.request.urlopen(cdp_url + "/json/list", timeout=5) as resp:
            targets = json.load(resp)
    except Exception:
        targets = []
    if not any(t.get("type") == "page" for t in targets):
        urllib.request.urlopen(
            urllib.request.Request(cdp_url + "/json/new?about:blank", method="PUT"), timeout=5
        ).read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--feed", action="store_true", help="请求 homefeed 并打印笔记列表")
    parser.add_argument("--capture", action="store_true", help="抓站内真实请求的签名做对照")
    parser.add_argument("--port", type=int, default=9222, help="Chrome 调试端口")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[2]
    # 起一个带调试端口的 Chrome（复用真实 profile 副本，带登录态），已存在则直接复用
    cdp_url = ensure_cdp_chrome(dst=str(root / ".chrome-profile"), port=args.port)
    ensure_page_target(cdp_url)

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(cdp_url)
        ctx = browser.contexts[0] if browser.contexts else browser.new_context()
        page = ctx.new_page()

        # 对照用：把站内自己请求里的 X-S-Common 收集起来（只做校验，不参与发请求）
        common = []

        def on_request(req):
            if "edith.xiaohongshu.com/api" in req.url:
                v = req.headers.get("x-s-common")
                if v and v not in common:
                    common.append(v)

        page.on("request", on_request)

        if args.capture:
            # 必须在页面脚本执行前注入，否则抓不到初始化阶段的请求
            page.add_init_script(CAPTURE_JS)

        # 打开首页，等页面的签名环境就绪（mnsv2 / _webmsxyw 出现）
        page.goto(HOME, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function(
            "typeof window._webmsxyw === 'function' || typeof window.mnsv2 === 'function'",
            timeout=30000,
        )

        # 签名和请求必须用完全相同的 body 字符串，所以这里自己序列化一次
        body_json = json.dumps(BODY, ensure_ascii=False, separators=(",", ":"))
        sign = page.evaluate(SIGN_JS, [PATH, body_json])
        print("签名:", json.dumps(sign, ensure_ascii=False, indent=2))

        if args.capture:
            page.wait_for_timeout(6000)
            captured = page.evaluate("window.__xhs || []")
            print("抓到带 X-s 的请求数:", len(captured))
            for item in captured[:6]:
                print(json.dumps(item, ensure_ascii=False))

        if args.feed and "X-s" in sign:
            headers = {
                "Content-Type": "application/json;charset=UTF-8",
                "X-s": sign["X-s"],
                "X-t": str(sign["X-t"]),
                "X-S-Common": sign.get("X-S-Common", ""),
            }
            print("X-S-Common(自算):", sign.get("X-S-Common", "")[:70] + "...")
            if common:
                print("X-S-Common(站内):", common[0][:70] + "...")

            # 用页面内 fetch 发请求：自带 cookies 与同源上下文
            # （CDP 模式下 ctx.request 不可用，会报 context management is not supported）
            result = page.evaluate(
                """async ([url, body, headers]) => {
                    const resp = await fetch(url, { method: 'POST', headers, body, credentials: 'include' });
                    const text = await resp.text();
                    const out = { status: resp.status };
                    try {
                        const j = JSON.parse(text);
                        const d = j.data || {};
                        const items = d.items || [];
                        out.code = j.code;
                        out.count = items.length;
                        out.cursor_score = d.cursor_score;
                        out.notes = items.slice(0, 6).map(it => {
                            const c = it.note_card || {};
                            return {
                                id: it.id,
                                title: c.display_title,
                                type: c.type,
                                author: (c.user || {}).nickname,
                                liked: (c.interact_info || {}).liked_count,
                            };
                        });
                    } catch (e) {
                        out.snippet = text.slice(0, 200);
                    }
                    return out;
                }""",
                [API_HOST + PATH, body_json, headers],
            )
            print("homefeed status:", result["status"], "| code:", result.get("code"))
            print("笔记条数:", result.get("count"), "| cursor_score:", result.get("cursor_score"))
            for n in result.get("notes") or []:
                print(f"  · {n['title']}  [{n['type']}]  by {n['author']}  ♥{n['liked']}")
            if result.get("snippet"):
                print("原始片段:", result["snippet"])

        page.close()


if __name__ == "__main__":
    main()
# python sign.py 获取签名
# python sign.py --capture 获取对照
# python sign.py --feed  获取笔记