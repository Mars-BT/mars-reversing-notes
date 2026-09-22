"""复用本机真实 Chrome 环境跑 Playwright 的辅助函数。

做法：把真实 Chrome 的 profile 复制一份给 Playwright 用，从而复用真实的
cookies / IndexedDB / 指纹数据，同时不影响正在运行的 Chrome。
"""

import json
import os
import shutil
import sys

# 各系统 Chrome 用户数据目录的默认位置，可用 src 参数覆盖
DEFAULT_USER_DATA_DIRS = {
    "mac": "~/Library/Application Support/Google/Chrome",
    "windows": r"%LOCALAPPDATA%\Google\Chrome\User Data",
    "linux": "~/.config/google-chrome",
}

# 纯缓存目录，跳过它们可以把 ~950MB 的 profile 压到 ~180MB
CACHE_DIRS = {
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnGraphiteCache",
    "DawnWebGPUCache",
    "GrShaderCache",
    "ShaderCache",
    "Media Cache",
    "CacheStorage",
    "ScriptCache",
    "LOCK",
    "SingletonLock",
    "SingletonCookie",
}


def _ignore_cache(_dir, names):
    return [name for name in names if name in CACHE_DIRS]


def _detect_system():
    if sys.platform == "darwin":
        return "mac"
    if sys.platform.startswith("win"):
        return "windows"
    return "linux"


def _read_last_used_profile(user_data_dir):
    local_state = os.path.join(user_data_dir, "Local State")
    if os.path.exists(local_state):
        with open(local_state, encoding="utf-8") as fp:
            last_used = json.load(fp).get("profile", {}).get("last_used")
        if last_used:
            return last_used
    return "Default"


def prepare_chrome_profile(dst, system=None, src=None, profile_name=None, refresh=False):
    """复制本机真实 Chrome 的 profile 到 dst，返回 (user_data_dir, profile_name)。

    Playwright 用返回的 user_data_dir 启动即可复用真实 cookies / IndexedDB /
    指纹数据，同时不影响正在运行的 Chrome（不需要退出浏览器）。

    system: mac / linux / windows，默认按当前系统自动判断
    src: 真实 Chrome 用户数据目录，默认取 DEFAULT_USER_DATA_DIRS[system]
    profile_name: 用户数据目录下的 profile 名，默认读 Local State 里的 profile.last_used
    refresh: True 时强制重新复制，用于同步最新的登录态

    注意：参数名用 system 而不是 os，避免遮蔽标准库 os 模块。
    """
    system = system or _detect_system()
    src = src or os.path.expandvars(os.path.expanduser(DEFAULT_USER_DATA_DIRS[system]))
    if not os.path.isdir(src):
        raise FileNotFoundError(f"找不到 Chrome 用户数据目录，请用 src 指定: {src}")

    profile_name = profile_name or _read_last_used_profile(src)
    dst = os.path.abspath(dst)
    target_profile = os.path.join(dst, profile_name)

    if refresh or not os.path.isdir(target_profile):
        os.makedirs(dst, exist_ok=True)
        shutil.copy2(os.path.join(src, "Local State"), os.path.join(dst, "Local State"))
        shutil.copytree(
            os.path.join(src, profile_name),
            target_profile,
            ignore=_ignore_cache,
            dirs_exist_ok=True,
            symlinks=True,
        )
    return dst, profile_name
