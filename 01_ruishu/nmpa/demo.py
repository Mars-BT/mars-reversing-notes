"""药监总局（NMPA）瑞数6 —— 获取数据。

流程与真实浏览器一致：
    1) GET 页面 → 412 挑战页；S cookie（NfBCSins2OywS）由服务器在这一步下发
    2) 从挑战页 HTML 提取内联脚本，写入 enc.js（即 $_ts.cd / $_ts.nsd）
    3) 运行 node demo.js —— 补环境里跑虚拟机，产出 T cookie（NfBCSins2OywT）
    4) 带上 S + T cookie 再 GET → 200 真实页面

判定：第 4 步拿到的 HTML 里不再含 $_ts、且带有 SiteName/SiteIDCode 即为通过。
"""

import json
import os
import re
import subprocess

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
URL = "https://www.nmpa.gov.cn/xxgk/ggtg/index_2.html"

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Pragma": "no-cache",
    "Referer": URL,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
}


def extract_enc(html):
    """挑战页里那段设置 $_ts 的内联脚本，就是仓库约定中的 enc.js"""
    for s in re.findall(r"<script[^>]*>(.*?)</script>", html, re.S):
        if "$_ts" in s and ".cd=" in s:
            return s
    return None


def gen_cookie():
    """跑补环境，返回 document.cookie 解析出的字典"""
    out = subprocess.run(
        ["node", "demo.js"], cwd=BASE_DIR,
        capture_output=True, text=True, timeout=120,
    )
    if out.returncode != 0:
        raise RuntimeError("node demo.js 失败：\n" + out.stderr[-1500:])

    cookies = {}
    for part in out.stdout.strip().split("; "):
        if "=" in part:
            name, value = part.split("=", 1)
            cookies[name.strip()] = value.strip()
    return cookies


def decode(html, resp):
    """按页面自身声明的 charset 解码（requests 默认猜测常把 UTF-8 猜成 latin-1）"""
    m = re.search(r'<meta[^>]+charset=["\']?([\w-]+)', html[:2000], re.I)
    resp.encoding = m.group(1) if m else "utf-8"
    return resp.text


def main():
    sess = requests.Session()

    for rnd in range(1, 6):
        resp = sess.get(URL, headers=HEADERS, timeout=30)
        html = decode(resp.text, resp)
        print(f"[{rnd}] GET status={resp.status_code} size={len(html)}"
              f" cookies={sorted(sess.cookies.keys())}")

        # 真实页面带有站点标识 meta；没有就说明还在挑战阶段
        if "SiteIDCode" in html or "SiteName" in html:
            title = (re.search(r"<title>(.*?)</title>", html, re.S) or [None, ""])[1].strip()
            print(f"[√] cookie 通过，拿到真实页面 | 长度 {len(html)} | 标题 {title}")
            return html

        enc = extract_enc(html)
        if enc is None:
            raise SystemExit(f"既不是真实页面也没有挑战脚本，body: {html[:300]}")

        open(os.path.join(BASE_DIR, "enc.js"), "w", encoding="utf-8").write(enc)

        # 挑战页里那个 <meta id="..." content="..." r='m'> 的 content 每次都会变，
        # 一并交给 env.js 使用（id 是固定的）
        meta = re.search(r'<meta id="([^"]+)" content="([^"]+)"', html)
        if meta:
            with open(os.path.join(BASE_DIR, "meta.json"), "w", encoding="utf-8") as f:
                json.dump({"id": meta.group(1), "content": meta.group(2)}, f)

        cookies = gen_cookie()
        print("    -> node 出签:", {k: v[:26] + "..." for k, v in cookies.items()})
        for name, value in cookies.items():
            sess.cookies.set(name, value, domain="www.nmpa.gov.cn")

    raise SystemExit("超过 5 轮仍未通过")


if __name__ == "__main__":
    print(main())
