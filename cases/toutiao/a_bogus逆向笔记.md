# 今日头条 a_bogus 补环境逆向笔记

> 目标文件：`bdms.js`（混淆样本，V 1.0.1.7）
> 产物：`env.js`（环境）、`get_params.js`（取参数）、`demo.js` / `demo.py`（Python 版）

---

## 0. 结论速览

| 参数 | 谁生成 | 形态 | 有效期 |
|---|---|---|---|
| **a_bogus** | **前端算**（就是本文件里的 BDMS SDK） | 172 字符左右（长度会变），魔改 base64 | 单次，每次请求都不同 |
| msToken | **服务端下发** | 128 字符，高熵密文 | 长效（社区说法 7 天量级） |

两者职责要分清，这是整件事的第一个关键判断：

- 一开始我以为 `a_bogus` 也是服务端给的，因为 SDK 里有一段跑去请求 `mssdk.bytedance.com/web/common` 的代码。
- 把字节码的字符串表解出来后，看到两条**不同的**链路：
  - `getItem('xmst')` → `POST /web/common?ms_appid=24` → 响应头 `x-ms-token` / `Set-Cookie: msToken=` → `setItem('xmst')` ← **msToken，服务端给的**
  - `handleUrl` + `a_bogus` + `fetch/url/clone/headers/searchParams` ← **a_bogus，本地算的，算完塞进 URL**
- 实测验证：`localStorage` 清空、服务端返回 `resultCode:-6`（拒绝）时，SDK **没有**自己造一个 msToken 出来 —— 所以 msToken 不是算的。

---

## 1. 样本的保护方式

`bdms.js` 不是普通混淆，是**自研字节码 VM**：

- 每个模块的代码是一大串十六进制，开头魔数固定 `484e4f4a403f5243`（`0x484E4F4A` = 1213091658，`0x403F5243` = 1077891651，SDK 里会校验这两个值）
- 字符串常量存在**加密字符串表**里，跟着字节码一起传进去
- 有一个解释器 `function e(r, t, a, n, c)` 负责跑这套指令
- 对外只导出：

```js
window.bdms = { __esModule: true, init: fn, getReferer: fn }
```

**没有公开的签名 API** —— 所以不可能“直接调用某个函数拿 a_bogus”，只能让它自己跑起来、在它 hook 网络请求时把结果截出来。

---

## 2. 三件小工具

### 2.1 字符串表解码器（最有用的一步）

字符串表的解码逻辑就写在样本里（模块内联），直接抄出来即可：

```js
// 变长长度前缀：首字节高 2 位决定后面跟几个字节
function a(e, r) {
    var t = parseInt(e.slice(r, r + 2), 16);
    return t >>> 7 == 0 ? [1, t]
        : t >>> 6 == 2 ? (t = (63 & t) << 8, [2, t += parseInt(e.slice(r + 2, r + 4), 16)])
        : (t = (63 & t) << 16, [3, t += parseInt(e.slice(r + 2, r + 6), 16)]);
}

// 头部：
//   0..8   魔数
//   8..16  魔数
//   16..18 必须为 0
//   24..32 取 4 组 2bit，拼出异或密钥 c
//   48..56 字节码长度（×2）
var c = 0;
for (n = 0; n < 4; ++n) c += (3 & parseInt(e.slice(24 + 2 * n, 26 + 2 * n), 16)) << 2 * n;

// 每条字符串：长度前缀 + 每个字符自己的长度前缀，字符 = c ^ 值
```

解出来后是**明文关键字表**，整个逆向方向就是靠它定的。

两个副产品：

- 拿到了 4 张**魔改 base64 表**（见第 6 节）
- 看到 SDK 到底在检测什么（见第 4 节）

### 2.2 VM 插桩（定位“缺了哪个方法”）

补环境最常见的报错是：

```
TypeError: Cannot read properties of undefined (reading '_u')
TypeError: Cannot read properties of undefined (reading 'apply')
```

这类错误是 **VM 自己抛的**，栈里全是 `at e (demo.js:xxxx)`，看不出缺什么。

在 VM 的「读属性」指令（opcode 18）上加一行打印：

```js
18 === y ? (o = (i[r] << 8) + i[r + 1],
r += 2,
s = f[o],
b = p[l],
"undefined" === typeof b && console.log("VM_DBG obj undefined, prop=", s, "r=", r),
p[l] = b[s],
"undefined" === typeof p[l] && console.log("VM_DBG val undefined, prop=", s, "r=", r, "objTag=", Object.prototype.toString.call(b), "objKeys=", b && Object.keys(b))) : ...
```

输出直接给出了答案：

```
VM_DBG val undefined, prop= addEventListener r= 6412 objTag= [object Object] objKeys= [ 'withCredentials' ]
VM_DBG obj undefined, prop= apply r= 6416
```

→ `objKeys: ['withCredentials']` 一眼认出这是 `new XMLHttpRequest()` 的实例，它缺 `addEventListener`。

### 2.3 原生性探测（`[native code]` 检测）

字符串表里出现了 `[native code]`，说明 SDK 会检查环境函数是不是被替换过。挂个钩子就能看到它查了哪些：

```js
const _indexOf = String.prototype.indexOf
String.prototype.indexOf = function (search) {
    if (search === '[native code]') {
        console.log('NATIVE_CHECK ->', JSON.stringify(String(this).slice(0, 150)))
    }
    return _indexOf.apply(this, arguments)
}
```

实测它查了：`eval` / `Promise` / `String` / `WeakMap`（原生，通过）+ 我们的两个桩函数（**没通过**）。

对策：给桩函数做“伪原生” `toString`：

```js
const __nativeFns = new WeakSet()
const __origFnToString = Function.prototype.toString
Function.prototype.toString = function() {
    if (__nativeFns.has(this)) return 'function ' + (this.name || '') + '() { [native code] }'
    return __origFnToString.call(this)
}
function markNative(fn) { if (typeof fn === 'function') __nativeFns.add(fn); return fn }
```

### 2.4 定位“非代理子对象”的方法

`get_enviroment(proxy_array)` 只能代理顶层对象（window/document/navigator…），像 `navigator.plugins`、`document.fonts`、`XHR 实例` 这种**子对象访问不到**，报错时日志里一片安静。

办法：给这些子对象临时套一层日志 Proxy：

```js
function spy(obj, name) {
    return new Proxy(obj, {
        get: function (t, p) {
            console.log('SPY get', name, String(p), '=>', typeof t[p])
            return t[p]
        }
    })
}
navigator.plugins = spy(navigator.plugins, 'navigator.plugins')
document.fonts = spy(document.fonts, 'document.fonts')
// ...
```

---

## 3. 补环境：一轮一轮是怎么探测的

方法固定为三步循环：

**看现象（日志/报错） → 判断缺什么 → 补 → 再跑**

| 轮次 | 现象（日志 / 报错） | 判断 | 补了什么 |
|---|---|---|---|
| 1 | `TypeError: ... reading '_u'` 崩在 VM 内部；日志最后停在 `window.requestAnimationFrame` | SDK 直接调了 undefined | `window.requestAnimationFrame` / `cancelAnimationFrame`、`HTMLElement`、`span.classList` |
| 2 | 探测日志变成 `sessionStorage`、`localStorage.getItem/removeItem`、`document.referrer` 全是 undefined | 存储与 document 属性缺失 | 完整 Storage（getItem/setItem/removeItem/clear/key/length）、`XMLHttpRequest`、`document.referrer/cookie/title/documentElement/createEvent` |
| 3 | `ReferenceError: XMLHttpRequest is not defined`（字节码 getter 里直接引用） | 必须存在这个全局 | 同上 |
| 4 | `window.EventSource` undefined | 同上 | `EventSource` |
| 5 | `init()` 崩，日志停在 `document.addEventListener` | init 里要挂事件监听 | `addEventListener` / `removeEventListener` / `dispatchEvent`（后来做成能真正派发，见第 5 节） |
| 6 | `ReferenceError: Image is not defined`，日志开始成片探测 navigator/screen/canvas | 进入指纹采集阶段 | `Image` / `Audio`、完整 `navigator`、`screen`、canvas 2d + webgl 桩、`chrome`、`document.fonts`、`plugins`/`mimeTypes`、`location`/`history`、各对象的 `Symbol.toStringTag` |
| 7 | `reading 'apply'`，插桩后发现 XHR 实例缺方法 | 上报走 XHR | 给 XHR 加 `addEventListener`/`withCredentials`/`getResponseHeader`（这版还接了真实网络） |
| 8 | `NATIVE_CHECK` 命中我们的桩函数 | 原生性检测 | `markNative` 伪原生 toString |

### 几个“看起来该补但其实不用补”的坑

- `document.all` 的 `typeof` **本来就该是 undefined**。样本用 C++ 插件（`document_all.cc` 里 `tpl->MarkAsUndetectable()`）故意做成不可检测 —— 这是**正确**的，不是缺环境。
- `window.bdms` 第一次读是 undefined、随后被 set —— 那是 `window.bdms || function(){...}()` 的守卫，正常。
- `navigator.usb` / `oscpu` / `cpuClass` 这类 undefined 就对了（Chrome 没有）。

---

## 4. 他到底检测了什么

字符串表解码结果（按类别归并）：

| 类别 | 明文关键字 | 说明 |
|---|---|---|
| **环境篡改** | `[native code]`、`toString`、`createElement`、`canvas`、`toDataURL` | 函数是否被 hook |
| **原型伪造** | `[object Navigator]`、`[object HTMLDocument]`、`[object Location]`、`[object History]`、`[object HTMLAllCollection]`、`[object Storage]` | `Object.prototype.toString` 比对 |
| **无头/自动化** | `HeadlessChrome`、`webdriver`、`_phantom`、`callPhantom`、`__nightmare`、`cefSharp`、`CefSharp`、`eoapi`、`eoWebBrowserDispatcher`、`Audio`、`plugins` | headless 与内嵌浏览器检测 |
| **指纹：字体** | `jsFontsList`、`72px Trebuchet MS`、`72px Wingdings`、`72px SimSun-ExtB`…（一大串） | 字体枚举 |
| **指纹：Canvas / WebGL** | `getContext('2d')`、`getImageData`、`measureText`、`MAX_TEXTURE_SIZE`、`WEBGL_debug_renderer_info`、`UNMASKED_RENDERER_WEBGL` | Canvas 与显卡指纹 |
| **指纹：能力** | `getBattery`、`permissions.query`、`storage.estimate`、`indexedDB.bdmsCheck`、`deviceMemory`、`hardwareConcurrency`、`maxTouchPoints` | 权限/电池/存储 |
| **UA 解析** | `isWindows`、`isMacOS`、`isAndroid`、`isHarmonyOS`、`isChrome`、`isEdge`、`isOpera`、`isFirefox`、`isSafari` | 浏览器与系统判定 |
| **本地/内网** | `^(file\|http://localhost)`、`^https?://([0-9]{1,3}\.){3}[0-9]{1,3}` | 是否在本地或内网 IP |
| **Node 环境** | `process`、`[object process]` | `isNode` 检测 ⚠️ 见第 8 节 |
| **行为采集** | `mousemove`、`touchstart`、`mouseup`、`touchend`、`keydown`、`deviceorientation`、`visibilitychange`、`beMove`、`beClick`、`beKeyboard`、`gyro` | 埋点上报 |
| **配置项** | `bdmsVersion`、`aid`、`pageId`、`boe`、`ddrt`、`include`、`exclude`、`paths`、`mode`、`delay`、`track`、`dump` | `init()` 的字段 |
| **签名相关** | `a_bogus`、`handleUrl`、`msToken`、`x-ms-token`、`bdmsInvokeList`、`0X21`、`_Ax`、`onwheelx` | 见第 5、6 节 |

> 还有一个细节：日志里能看到 `navigator.permissions` 被连续读了 **21 次**，对应字符串表里那一串权限名（`geolocation`、`notifications`、`camera`、`clipboard`…）——这是逐项探测权限状态。

---

## 5. 触发签名的关键：`init()` 的 `paths`

**这是最大的一个坑**。

补完环境后一切都跑通了、`window.bdms` 也赋值成功了，但不管怎么调 `fetch` / `XHR`，URL 里**就是没有 a_bogus**。

从字符串表看到 `init` 支持的字段里有 `include` / `exclude` / `paths`（URL 白名单），试了一下：

| init 配置 | fetch 收到的 URL |
|---|---|
| `{}` / `{aid:24}` / `{aid:24,pageId:1}` | ❌ 没有 a_bogus |
| `{aid:24, pageId:1, paths:['/api/']}` | ✅ 补上了 a_bogus |
| `{aid:24, pageId:1, paths:['/api/pc/list/feed']}` | ✅ 补上了 a_bogus |

**不给 `paths` 就完全不签名。** 这是纯试出来的（`{aid:24, pageId:1}` 这种看起来最“标准”的配置反而不行）。

### 怎么把签名结果拿出来

SDK 在加载时就 hook 了 `window.fetch` / `XMLHttpRequest` / `EventSource`。所以：

1. 加载 SDK **之前**，把 `window.fetch` 换成一个「不发网络、只记录」的桩
2. SDK 会包住这个桩；它算完 a_bogus 再调桩 → 签名后的 URL 原样落到 `__capturedRequests`

```js
window.fetch = function(url, opts) {
    __capturedRequests.push({ url: String(url), opts: opts })
    return Promise.resolve({ ok: true, status: 200, ... })
}
```

**重要细节：hook 是同步执行的。** 调用 `window.fetch(url)` 之后、还没 await，`__capturedRequests` 里就已经有结果了：

```
同步捕获数量: 1
同步捕获 URL : https://...&a_bogus=d6WMMRgX...
```

这一点决定了 Python/execjs 那边必须是**同步函数**（execjs 不会 await Promise，`JSON.stringify(Promise)` 恒等于 `{}`）。

---

## 6. a_bogus 的特征（实测）

拿同一份 URL 连签 5 次、再改 URL、再改环境，实测结果：

### 6.1 基本形态

| 项目 | 实测值 |
|---|---|
| 长度 | **不固定**。本例 172 字符，改环境后变成 168 字符 |
| 字符集 | 不是标准 base64：**没有 `+`**，有 `/`、末尾有 `=` |
| URL 编码 | 放进 query 后 `/` 变 `%2F`、`=` 变 `%3D` |
| 唯一性 | **每次调用都不同**（同 URL 连签 5 次，5 个结果全不一样） |
| 用标准表硬解 | 能解出 128 字节，但全是乱码 → 必须按 SDK 里的魔改表解 |

### 6.2 分段结构（同环境、同 URL 连签两份）

```
第 1 份: xvRZ/m0hmE2T6D6Z56xLfY3qVvN3Ygxd0SVDhDhqtnVI3L39HMT19exoIcTvizWjFs/jIejjy4hbO3OBrQC70Zwf7WkO/2CZmyh0t-Pg-nSSs1feegS8rsJi-kUlFeHd-vV3EQXBqJKczbYs09Q9-vIlO6ZCcHgjxiSmtn3FvWy=
第 2 份: YX8wBQhgdEfTXV6p56xLfY3qVvN3Y/9d0SVDhDhqtn3F3L39HMT-9exoIcTvizYjFs/jIeSjy4hbT3ohrQC70Zwf7WkO/2CZmyh0t-Pg-nSSs1feegS8rsJi-kUlFeep5JV3EcvhqJKczbYs09Q9-vIlO6ZCcHgOEisnOJm=   ← 这份是改了环境的
```

用最长公共子串量出来的规律：

| 位置 | 变化来源 | 证据 |
|---|---|---|
| 约 0 ~ 62 | 随机数 + URL | 同 URL 连签也变；只改 `max_behot_time` 时，差异全部落在这段 |
| 约 63 ~ 169 | **环境指纹** | 同环境下多份逐字符相同；改 `navigator`/`screen`/`devicePixelRatio` 后这段变了 |
| 末尾 1~2 字符 | URL | 同上 |

- 同一环境 + 同一 URL：第 63~169 位（107 字符）**逐字符一致**
- 只改 URL（`max_behot_time`）：仍然是 63~169 位一致 → 这段与 URL 无关
- 改环境（UA / platform / hardwareConcurrency / deviceMemory / screen / devicePixelRatio / innerWidth）：长度 172 → 168，最长公共子串只剩 46 字符

**结论：a_bogus = f(URL query, 环境指纹, 随机数)**，所以：

- 换机器/换浏览器 UA，签名结果整体都会变
- 它必须**覆盖整个 query**，因此 `msToken` 要在签名**之前**拼进 URL（顺序：`...&app_name=toutiao_web&msToken=xxx&a_bogus=yyy`）

### 6.3 魔改 base64 表

字符串表里直接给出的 4 张编码表（a_bogus 编码用，随机选表）：

```
标准 : ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
s0   : Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboYTOPuzmFjJnryx9HVGcaStCe=
s1   : Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboYTOPuzmFjJnryx9HVGcaStCe=
s2   : ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboYTOPuzmFjJnryx9HVGDaStCe
s3   : Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe
```

观察：都是标准表的**置换**（`+` 被换成 `-`、部分字符互换、有的表干脆不带 `=`）—— 这就是为什么它“看着像 base64 但解出来是乱码”。

---

## 7. 现在的可用链路

```
             ┌────────────────────────────────────────────┐
             │  get_params.js  (env.js + bdms.js)         │
Python ──────┤  1) 环境（env.js）                          │
             │  2) init({aid, pageId, paths:['/api/']})    │
             │  3) window.fetch(url) → __capturedRequests  │
             │  4) sign_url(url, msToken) 同步返回         │
             └────────────────────────────────────────────┘
```

```python
def get_feed(max_behot_time=None, category='pc_profile_recommend'):
    ms_token = get_msToken()                    # 服务端换 msToken
    url = '.../api/pc/list/feed?...&app_name=toutiao_web'
    signed = sign(url, ms_token)                # execjs → JS 同步算 a_bogus
    resp = requests.get(signed['url'], headers=FEED_HEADERS, cookies=COOKIES, timeout=10)
    return resp.json()
```

JS 侧对外只留一个同步入口：

```js
function sign_url(url, msToken) {
    if (msToken) localStorage.setItem('xmst', msToken)
    var token = window.getMsToken()
    var u = new URL(url)
    if (token && !u.searchParams.get('msToken')) u.searchParams.set('msToken', token)
    var signed = window.getSignedUrlSync(u.toString())
    return { msToken: token, a_bogus: new URL(signed).searchParams.get('a_bogus'), url: signed }
}
```

### execjs / 子进程的两个坑（Python 版一度卡死）

1. **进程不退出**：execjs 的 Node runner 结尾没有 `process.exit()`，而 SDK 留下的定时器 + 补出来的 XHR 真发网络（`GetAddrInfoReqWrap`/`TCPSocketWrap`）让 Node 一直活着 → Python 等 EOF 等到死。
   对策：定时器统一 `unref()`；XHR 加开关 `window.__USE_REAL_NETWORK = false`（本地空响应，用微任务派发，不产生 socket）。
2. **async 拿不到值**：execjs 是同步调用，只能同步返回值。所以 `sign_url` 必须是普通函数而不是 `async`。

---

## 8. 还没搞定 / 存疑的点

1. **mssdk 上报被拒（`resultCode:-6`）**
   我们自己合成环境发出的 `/web/common` 上报，服务端回 `-6`，拿不到 `x-ms-token`。
   换成教程里那份**固定的 `strData` + `tspFromClient`**（浏览器里抓的）就能成功拿到 `Set-Cookie: msToken=...`。
   → 说明服务端确实在校验上报内容，具体校验哪一项没查清。

2. **`process` 泄漏（怀疑是 1 的成因之一）**
   字符串表里有 `process`、`[object process]`，是标准的 `isNode` 检测。我们的环境里 `window = global`，Node 的 `process` 还在，SDK 能识别出“这是 Node”。
   是否因此影响了上报结果，**未验证**（a_bogus 的生成不受影响）。

3. **a_bogus 内部算法没还原**
   目前是“跑起 SDK 让它自己算”，属于补环境路线，不是算法还原。想要纯算版（不依赖 JS 引擎），需要继续逆 `handleUrl` 那段字节码。

---

## 9. 复现步骤

```bash
cd cases/toutiao
node get_params.js      # 本地验证：打印 msToken / a_bogus / 签名 URL
python3 demo.py         # 完整链路：换 msToken → 算 a_bogus → 拉数据
```

注意：`env.js` 里 `get_enviroment(proxy_array)` 默认是注释掉的，排查新问题时可以打开它看探测日志（生产用关掉，日志量很大）。
