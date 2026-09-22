"""用 CDP 方式驱动本机 Chrome 的辅助函数。

思路：自己拉起一个带 `--remote-debugging-port` 的 Chrome，Playwright 用
`connect_over_cdp` 附加过去。相比 `launch_persistent_context`，Chrome 是由你自己
启动的，没有 Playwright 注入的启动参数，环境更接近真人；而且这个 Chrome 可以一直
开着，后续脚本随时附加，不用每次重开。
"""

import os
import shutil
import subprocess
import sys
import time
import urllib.request

from utils.chrome_profile import detect_system, prepare_chrome_profile

# 各系统 Chrome 可执行文件的候选位置，非绝对路径的会去 PATH 里找
CHROME_PATHS = {
    "mac": ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    "windows": [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
    ],
    "linux": ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
}

# 显式绕过系统代理：本机开着代理时，代理可能替 127.0.0.1 的端口应答，造成误判
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def find_chrome(system=None, chrome_path=None):
    """返回 Chrome 可执行文件路径；传了 chrome_path 就直接用它。"""
    if chrome_path:
        return chrome_path

    for candidate in CHROME_PATHS[system or detect_system()]:
        candidate = os.path.expandvars(candidate)
        if os.path.isabs(candidate):
            if os.path.exists(candidate):
                return candidate
        else:
            found = shutil.which(candidate)
            if found:
                return found
    raise FileNotFoundError("找不到 Chrome，请用 chrome_path 指定可执行文件路径")


def cdp_ready(port=9222, timeout=2):
    """探测调试端口是否真的可用（要能拿到 DevTools 的 JSON 才算数）。"""
    try:
        with _OPENER.open(f"http://127.0.0.1:{port}/json/version", timeout=timeout) as resp:
            return "webSocketDebuggerUrl" in resp.read().decode()
    except Exception:
        return False


def launch_cdp_chrome(user_data_dir, profile_name, port=9222, system=None, chrome_path=None):
    """拉起一个带调试端口的 Chrome，不等待端口就绪。"""
    subprocess.Popen(
        [
            find_chrome(system, chrome_path),
            f"--remote-debugging-port={port}",
            f"--user-data-dir={user_data_dir}",
            f"--profile-directory={profile_name}",
            "--no-first-run",
            "--no-default-browser-check",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def ensure_cdp_chrome(
    dst,
    port=9222,
    system=None,
    src=None,
    profile_name=None,
    refresh=False,
    chrome_path=None,
    timeout=15,
):
    """确保有一个带调试端口的 Chrome 在跑，返回可直接连接的 CDP 地址。

    已经探测到有实例在跑就直接复用，不会重复启动、也不会去复制 profile；
    dst / system / src / profile_name / refresh 只在需要新启动时透传给
    prepare_chrome_profile。

    两个注意点：
    - 想让 user_data_dir 指向日常使用的真实 Chrome 目录，必须先完全退出 Chrome，
      否则新进程会把请求交接给已有实例，调试端口根本不会打开。
    - 连上之后调 browser.close() 只会断开连接，不会关掉 Chrome；真要关掉得发 CDP
      的 Browser.close：browser.new_browser_cdp_session().send("Browser.close")
    """
    if cdp_ready(port):
        return f"http://127.0.0.1:{port}"

    user_data_dir, profile_name = prepare_chrome_profile(
        dst=dst, system=system, src=src, profile_name=profile_name, refresh=refresh
    )
    launch_cdp_chrome(
        user_data_dir, profile_name, port=port, system=system, chrome_path=chrome_path
    )

    deadline = time.time() + timeout
    while time.time() < deadline:
        if cdp_ready(port):
            return f"http://127.0.0.1:{port}"
        time.sleep(0.5)
    raise TimeoutError(f"等了 {timeout} 秒，调试端口 {port} 还是没起来")
