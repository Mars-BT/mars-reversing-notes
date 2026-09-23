/* V 1.0.1.7 */
window = global

// execjs / 子进程场景：定时器会把 Node 事件循环挂住，导致进程不退出（Python 端表现为卡死）
// 统一 unref，让定时器不再阻止进程结束
;(function() {
    var _setTimeout = globalThis.setTimeout
    var _setInterval = globalThis.setInterval
    globalThis.setTimeout = function(fn, ms) {
        var args = [].slice.call(arguments, 2)
        var h = _setTimeout.apply(globalThis, [fn, ms].concat(args))
        if (h && typeof h.unref === 'function') h.unref()
        return h
    }
    globalThis.setInterval = function(fn, ms) {
        var args = [].slice.call(arguments, 2)
        var h = _setInterval.apply(globalThis, [fn, ms].concat(args))
        if (h && typeof h.unref === 'function') h.unref()
        return h
    }
})()

// 是否让补出来的 XHR 真的发网络请求。
// false = 本地空响应（execjs 场景用这个，避免 undici 的 DNS/socket 把进程挂住）
window.__USE_REAL_NETWORK = false

// SDK 会用 fn.toString().indexOf('[native code]') 检测环境是否被篡改，
// 这里让环境桩函数在 toString 时表现得像原生函数
const __nativeFns = new WeakSet()
const __origFnToString = Function.prototype.toString
Function.prototype.toString = function() {
    if (__nativeFns.has(this)) {
        return 'function ' + (this.name || '') + '() { [native code] }'
    }
    return __origFnToString.call(this)
}
function markNative(fn) {
    if (typeof fn === 'function') __nativeFns.add(fn)
    return fn
}

function get_enviroment(proxy_array) {
    for(var i=0; i<proxy_array.length; i++){
        handler = '{\n' +
            '   get: function(target, property, receiver) {\n' +
            '       console.log("方法:", "get    ", "对象:", ' +
            '"' +  proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            // '"  属性值:", ' + 'target[property], ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '        return target[property];\n' +
            '     },\n' +
            '     set: function(target, property, value, receiver)  {\n' +
            '         console.log("方法:", "set   ", "对象:", ' +
            '"' +  proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            // '"  属性值:", ' + 'target[property], ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '       return Reflect.set(...arguments);\n' +
            '    }\n' +
            '}'
        eval('try{\n' + proxy_array[i] + ';\n'
        + proxy_array[i] + '=new Proxy(' + proxy_array[i] + ', ' + handler + ')}catch (e) {\n' + proxy_array[i] + '={};\n'
        + proxy_array[i] + '=new Proxy(' + proxy_array[i] + ', ' + handler + ')}')
    }
}
proxy_array = ['window', 'document', 'navigator', 'location', 'history', 'screen','localStorage','canvas','UA_InputId','body','CanvasRenderingContext2D','b','a','input','button','script','span','documentElement','a','experimental','webgl','WEBGL_debug_renderer_info','submit','UNMASKED_VENDOR_WEBGL','button1','button2','div','head','meta','html']

// 补出特殊的document.all属性
const native =
  require("./document_all.node");

const all = native.createDocumentAll();

// 补出 HTMLElement（字节码 getter 会取用）
HTMLElement = function HTMLElement() {}
Element = function Element() {}

function createClassList() {
    return {
        add: function() {},
        remove: function() {},
        contains: function() { return false },
        toggle: function() { return false },
        item: function() { return null },
        length: 0,
        toString: function() { return "" }
    }
}

span = {
    classList: createClassList(),
    style: {},
    getBoundingClientRect: function() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }
    },
    setAttribute: function() {},
    getAttribute: function() { return null },
    appendChild: function(e) { return e },
    removeChild: function(e) { return e }
}

// 补出 requestAnimationFrame
window.requestAnimationFrame = function(cb) {
    return setTimeout(function() {
        if (typeof cb === "function") cb(performance.now())
    }, 16)
}
window.cancelAnimationFrame = function(id) {
    clearTimeout(id)
}

// 补出 localStorage / sessionStorage
function createStorage() {
    var data = {}
    return {
        getItem: function(k) {
            k = String(k)
            return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null
        },
        setItem: function(k, v) {
            data[String(k)] = String(v)
        },
        removeItem: function(k) {
            delete data[String(k)]
        },
        clear: function() {
            data = {}
        },
        key: function(i) {
            var ks = Object.keys(data)
            return i < ks.length ? ks[i] : null
        },
        get length() {
            return Object.keys(data).length
        }
    }
}
window.localStorage = createStorage()
window.sessionStorage = createStorage()

// 真实网络请求的底层 fetch（SDK 会 hook window.fetch，所以先保存一份原生的）
const __realFetch = globalThis.fetch
window.__realFetch = __realFetch
// SDK hook 掉 window.fetch 之后，被签名后的 URL 会落到这个桩函数里，用于取 a_bogus
const __capturedRequests = []
window.__capturedRequests = __capturedRequests
const __capturedXhr = []
window.__capturedXhr = __capturedXhr

// 把 window.fetch 换成一个「不发网络、只记录」的桩；SDK 会 hook 它，
// 于是 SDK 签名后的 URL（带 a_bogus）会原样落到这里
window.fetch = function(url, opts) {
    __capturedRequests.push({ url: String(url), opts: opts })
    return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: String(url),
        headers: { get: function() { return null }, forEach: function() {} },
        text: function() { return Promise.resolve('{}') },
        json: function() { return Promise.resolve({}) },
        clone: function() { return this }
    })
}

// 补出 XMLHttpRequest（SDK 用它去 mssdk.bytedance.com 换 msToken，这里接真实网络）
function XMLHttpRequest() {
    this.readyState = 0
    this.status = 0
    this.statusText = ''
    this.response = null
    this.responseText = ''
    this.responseType = ''
    this.responseURL = ''
    this.responseXML = null
    this.withCredentials = false
    this.timeout = 0
    this.upload = { addEventListener: function() {}, removeEventListener: function() {} }
    this._method = ''
    this._url = ''
    this._reqHeaders = {}
    this._respHeaders = null
    this._listeners = {}
    this.onreadystatechange = null
    this.onload = null
    this.onerror = null
    this.onloadend = null
}

XMLHttpRequest.prototype.addEventListener = function(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn)
}
XMLHttpRequest.prototype.removeEventListener = function(type, fn) {
    var a = this._listeners[type]
    if (a) {
        var i = a.indexOf(fn)
        if (i > -1) a.splice(i, 1)
    }
}
XMLHttpRequest.prototype._fire = function(type) {
    var self = this
    var ev = { type: type, target: this, currentTarget: this }
    ;(this._listeners[type] || []).slice().forEach(function(fn) {
        try { fn.call(self, ev) } catch (e) {}
    })
    var h = this['on' + type]
    if (typeof h === 'function') {
        try { h.call(this, ev) } catch (e) {}
    }
}
XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method
    this._url = url
    this.readyState = 1
}
XMLHttpRequest.prototype.setRequestHeader = function(k, v) {
    this._reqHeaders[k] = v
}
XMLHttpRequest.prototype.getResponseHeader = function(k) {
    if (!this._respHeaders) return null
    var v = this._respHeaders.get(k)
    return v === undefined ? null : v
}
XMLHttpRequest.prototype.getAllResponseHeaders = function() {
    if (!this._respHeaders) return ''
    var out = []
    this._respHeaders.forEach(function(v, k) { out.push(k + ': ' + v) })
    return out.join('\r\n')
}
XMLHttpRequest.prototype.abort = function() {}
XMLHttpRequest.prototype.send = function(body) {
    var self = this
    var rec = {
        method: this._method,
        url: this._url,
        headers: this._reqHeaders,
        body: body,
        status: null,
        responseHeaders: null,
        responseText: null
    }
    __capturedXhr.push(rec)

    // 不真的发网络：给一个空的 200 响应。
    // 用微任务派发（不用定时器），既不产生 socket 也不会让进程挂住。
    if (!window.__USE_REAL_NETWORK) {
        Promise.resolve().then(function() {
            self.status = 200
            self.statusText = 'OK'
            self.responseURL = self._url
            self._respHeaders = null
            self.responseText = '{}'
            self.response = '{}'
            rec.status = 200
            rec.responseHeaders = {}
            rec.responseText = '{}'
            self.readyState = 4
            self._fire('readystatechange')
            self._fire('load')
            self._fire('loadend')
        })
        return
    }

    var init = {
        method: this._method || 'GET',
        headers: this._reqHeaders
    }
    // 浏览器里对 mssdk 的请求会带上这些头，这里模拟一下
    if (String(this._url).indexOf('bytedance.com') > -1) {
        init.headers = Object.assign({
            'content-type': 'application/json',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
            'origin': 'https://www.toutiao.com',
            'referer': 'https://www.toutiao.com/',
            'accept': '*/*',
            'accept-language': 'zh-CN,zh;q=0.9'
        }, init.headers)
    }
    if (body !== undefined && body !== null) init.body = body
    __realFetch(this._url, init).then(function(resp) {
        self.status = resp.status
        self.statusText = resp.statusText
        self.responseURL = resp.url || self._url
        self._respHeaders = resp.headers
        rec.status = resp.status
        rec.responseHeaders = {}
        resp.headers.forEach(function(v, k) { rec.responseHeaders[k] = v })
        return resp.text()
    }).then(function(text) {
        self.responseText = text
        self.response = text
        rec.responseText = String(text).slice(0, 300)
        self.readyState = 4
        self._fire('readystatechange')
        self._fire('load')
        self._fire('loadend')
    }).catch(function(e) {
        rec.error = String(e && e.message)
        self.readyState = 4
        self.status = 0
        self._fire('readystatechange')
        self._fire('error')
        self._fire('loadend')
    })
}
window.XMLHttpRequest = XMLHttpRequest

// 补出 EventSource
function EventSource() {
    this.readyState = 0
    this.close = function() {}
}
window.EventSource = EventSource

// 补出可真实派发的事件 API（SDK 靠这些事件触发上报，上报时才会用 a_bogus / msToken）
function createEventTarget(target) {
    var listeners = {}
    target._listeners = listeners
    target.addEventListener = function(type, fn) {
        if (typeof fn !== 'function') return
        ;(listeners[type] = listeners[type] || []).push(fn)
    }
    target.removeEventListener = function(type, fn) {
        var a = listeners[type]
        if (!a) return
        var i = a.indexOf(fn)
        if (i > -1) a.splice(i, 1)
    }
    target.dispatchEvent = function(ev) {
        var type = ev && ev.type
        if (!type) return true
        var self = this
        ;(listeners[type] || []).slice().forEach(function(fn) {
            try { fn.call(self, ev) } catch (e) {}
        })
        var h = this['on' + type]
        if (typeof h === 'function') {
            try { h.call(this, ev) } catch (e) {}
        }
        return true
    }
    return target
}
createEventTarget(window)

// ===================== 指纹环境 =====================
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'

// 让 Object.prototype.toString.call(x) 返回浏览器里的值
function setTag(obj, name) {
    Object.defineProperty(obj, Symbol.toStringTag, {
        value: name,
        configurable: true,
        enumerable: false
    })
    return obj
}

// PluginArray / MimeTypeArray 不是普通数组，必须有 item / namedItem
function makePluginArray(list) {
    var arr = list.slice()
    var o = {
        length: arr.length,
        item: function(i) { return arr[i] || null },
        namedItem: function(n) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].name === n) return arr[i]
            }
            return null
        },
        refresh: function() {}
    }
    arr.forEach(function(p, i) { o[i] = p })
    return o
}

function makeMimeTypeArray(list) {
    var arr = list.slice()
    var o = {
        length: arr.length,
        item: function(i) { return arr[i] || null },
        namedItem: function(n) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].type === n) return arr[i]
            }
            return null
        }
    }
    arr.forEach(function(m, i) { o[i] = m })
    return o
}

var _pdfMime = { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: null }

var _plugins = [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: _pdfMime },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: _pdfMime },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: _pdfMime },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: _pdfMime },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: _pdfMime }
]
_plugins[0].item = function(i) { return this[i] || null }
_plugins[0].namedItem = function() { return null }

// navigator（Node 自带的是只读 getter，必须 defineProperty 覆盖）
const _navigator = {
    userAgent: UA,
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    product: 'Gecko',
    productSub: '20030107',
    vendor: 'Google Inc.',
    vendorSub: '',
    platform: 'MacIntel',
    language: 'zh-CN',
    languages: ['zh-CN', 'zh', 'en'],
    cookieEnabled: true,
    onLine: true,
    doNotTrack: null,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    webdriver: false,
    plugins: makePluginArray(_plugins),
    mimeTypes: makeMimeTypeArray([_pdfMime]),
    userAgentData: {
        brands: [
            { brand: 'Not?A_Brand', version: '24' },
            { brand: 'Chromium', version: '152' },
            { brand: 'Google Chrome', version: '152' }
        ],
        mobile: false,
        platform: 'macOS',
        getHighEntropyValues: function() { return Promise.resolve({}) }
    },
    connection: { effectiveType: '4g', rtt: 50, downlink: 10, saveData: false },
    permissions: {
        query: function() { return Promise.resolve({ state: 'prompt', name: '', onchange: null }) }
    },
    getBattery: function() {
        return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            addEventListener: function() {},
            removeEventListener: function() {},
            onchargingchange: null,
            onlevelchange: null
        })
    },
    sendBeacon: function() { return true }
}
Object.defineProperty(globalThis, 'navigator', {
    value: _navigator,
    configurable: true,
    writable: true,
    enumerable: true
})
setTag(_navigator, 'Navigator')

// screen
screen = {
    width: 3840,
    height: 2160,
    availWidth: 3840,
    availHeight: 2090,
    availLeft: 0,
    availTop: 25,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: { type: 'landscape-primary', angle: 0, onchange: null }
}
setTag(screen, 'Screen')

// window 自身引用与几何
window.self = window
window.top = window
window.parent = window
window.frames = window
window.window = window
window.name = ''
window.length = 0
window.devicePixelRatio = 2
window.innerWidth = 1908
window.innerHeight = 951
window.outerWidth = 1908
window.outerHeight = 1032
window.screenX = 0
window.screenY = 25
window.pageXOffset = 0
window.pageYOffset = 0
window.scrollX = 0
window.scrollY = 0
window.matchMedia = function() {
    return {
        matches: false,
        media: '',
        addListener: function() {},
        removeListener: function() {},
        addEventListener: function() {},
        removeEventListener: function() {}
    }
}

// Chrome 特有对象 & 其他零碎
window.chrome = {
    app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
    },
    runtime: {
        OnInstalledReason: {},
        PlatformArch: {},
        PlatformOs: {},
        RequestUpdateCheckStatus: {}
    },
    csi: function() { return { onloadT: 0, startE: 0, tran: 0 } },
    loadTimes: function() {
        return { requestTime: 0, startLoadTime: 0, commitLoadTime: 0, finishDocumentLoadTime: 0, finishLoadTime: 0, firstPaintTime: 0 }
    }
}
window.isSecureContext = true
window.origin = 'https://www.toutiao.com'
window.locationbar = { visible: true }
window.menubar = { visible: true }
window.personalbar = { visible: true }
window.scrollbars = { visible: true }
window.statusbar = { visible: true }
window.toolbar = { visible: true }
window.postMessage = function() {}
window.webkitRequestAnimationFrame = window.requestAnimationFrame
window.RTCPeerConnection = undefined
window.webkitRTCPeerConnection = undefined

// Image / Audio
function Image() {
    var self = this
    this.width = 1
    this.height = 1
    this.complete = true
    this.onload = null
    this.onerror = null
    this._src = ''
    Object.defineProperty(this, 'src', {
        get: function() { return self._src },
        set: function(v) {
            self._src = v
            setTimeout(function() {
                if (typeof self.onload === 'function') self.onload()
            }, 0)
        }
    })
}
function Audio() {
    this.canPlayType = function() { return 'maybe' }
    this.play = function() {}
    this.pause = function() {}
}
window.Image = Image
window.Audio = Audio

// canvas 2d / webgl
function createContext2D() {
    var base = {
        canvas: null,
        measureText: function(t) { return { width: String(t).length * 7.5 || 1 } },
        getImageData: function(x, y, w, h) {
            w = w || 1
            h = h || 1
            var data = new Uint8ClampedArray(w * h * 4)
            for (var i = 0; i < data.length; i++) data[i] = (i * 7 + 13) % 256
            return { data: data, width: w, height: h }
        },
        createLinearGradient: function() { return { addColorStop: function() {} } },
        createRadialGradient: function() { return { addColorStop: function() {} } },
        createPattern: function() { return {} },
        getContextAttributes: function() { return {} },
        isPointInPath: function() { return false }
    }
    return new Proxy(base, {
        get: function(t, p) {
            if (p in t) return t[p]
            return function() { return undefined }
        }
    })
}

function createWebGL() {
    var base = {
        getParameter: function(p) {
            if (p === 7938) return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
            if (p === 35724) return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)'
            if (p === 37445) return 'Google Inc. (Apple)'
            if (p === 37446) return 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'
            return 4096
        },
        getExtension: function(name) {
            if (name === 'WEBGL_debug_renderer_info') {
                return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 }
            }
            return null
        },
        getContextAttributes: function() {
            return { alpha: true, antialias: true, depth: true, premultipliedAlpha: true, preserveDrawingBuffer: false, stencil: false }
        },
        getSupportedExtensions: function() { return ['WEBGL_debug_renderer_info'] }
    }
    return new Proxy(base, {
        get: function(t, p) {
            if (p in t) return t[p]
            return function() { return undefined }
        }
    })
}

CanvasRenderingContext2D = function CanvasRenderingContext2D() {}
WebGLRenderingContext = function WebGLRenderingContext() {}

function createCanvas() {
    var ctx2d = null
    var ctxGl = null
    var canvas = {
        width: 300,
        height: 150,
        style: {},
        classList: createClassList(),
        getContext: markNative(function(type) {
            if (type === '2d') {
                if (!ctx2d) ctx2d = createContext2D()
                return ctx2d
            }
            if (/webgl/i.test(String(type))) {
                if (!ctxGl) ctxGl = createWebGL()
                return ctxGl
            }
            return null
        }),
        toDataURL: markNative(function() {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        }),
        setAttribute: function() {},
        getAttribute: function() { return null },
        appendChild: function(e) { return e }
    }
    return canvas
}

canvas = createCanvas()

document = {
    referrer: "",
    cookie: "",
    title: "",
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    inputEncoding: 'UTF-8',
    contentType: 'text/html',
    compatMode: 'CSS1Compat',
    hidden: false,
    visibilityState: 'visible',
    readyState: 'complete',
    domain: 'www.toutiao.com',
    URL: 'https://www.toutiao.com/?wid=1790072318144',
    documentMode: undefined,
    documentElement: {
        classList: createClassList(),
        style: {},
        clientWidth: 1908,
        clientHeight: 951,
        scrollWidth: 1908,
        scrollHeight: 1032,
        getAttribute: function() { return null },
        setAttribute: function() {},
        appendChild: function(e) { return e }
    },
    body: {
        classList: createClassList(),
        style: {},
        clientWidth: 1908,
        clientHeight: 951,
        scrollWidth: 1908,
        scrollHeight: 10077,
        appendChild: function(e) { return e },
        removeChild: function(e) { return e },
        getAttribute: function() { return null },
        setAttribute: function() {}
    },
    head: { appendChild: function(e) { return e } },
    fonts: {
        ready: Promise.resolve(),
        status: 'loaded',
        size: 0,
        check: function() { return true },
        forEach: function() {},
        add: function() {},
        addEventListener: function() {},
        removeEventListener: function() {}
    },
    createEvent: function() {
        return {
            initEvent: function() {},
            initCustomEvent: function() {}
        }
    },
    getElementsByTagName: function() { return [] },
    querySelector: function() { return null },
    querySelectorAll: function() { return [] },
    createElement:function(...args){
        console.log(args)
        if (args[0] == "span")
            return span
        if (args[0] == "canvas")
            return createCanvas()
        if (args[0] == "img")
            return new Image()
        return {
            classList: createClassList(),
            style: {},
            setAttribute: function() {},
            getAttribute: function() { return null },
            appendChild: function(e) { return e }
        }
    }
}

location = {
    "ancestorOrigins": {},
    "href": "https://www.toutiao.com/?wid=1790072318144",
    "origin": "https://www.toutiao.com",
    "protocol": "https:",
    "host": "www.toutiao.com",
    "hostname": "www.toutiao.com",
    "port": "",
    "pathname": "/",
    "search": "?wid=1790072318144",
    "hash": ""
}

document.location = location
setTag(location, 'Location')
setTag(document, 'HTMLDocument')
createEventTarget(document)

// history
history = setTag({
    length: 1,
    state: null,
    scrollRestoration: 'auto',
    back: function() {},
    forward: function() {},
    go: function() {},
    pushState: function() {},
    replaceState: function() {}
}, 'History')

Object.defineProperty(document, "all", {
  configurable: true,
  enumerable: false,
  get() {
    return all;
  }
});

// 标记为「原生」，绕开 SDK 的 [native code] 篡改检测
;[document.createElement, document.createEvent, document.addEventListener, document.removeEventListener,
 document.querySelector, document.querySelectorAll, document.getElementsByTagName,
 document.dispatchEvent,
 window.addEventListener, window.removeEventListener, window.dispatchEvent,
 window.requestAnimationFrame, window.cancelAnimationFrame, window.matchMedia,
 _navigator.sendBeacon, _navigator.permissions.query, _navigator.getBattery,
 localStorage.getItem, localStorage.setItem, localStorage.removeItem, localStorage.clear, localStorage.key,
 sessionStorage.getItem, sessionStorage.setItem, sessionStorage.removeItem, sessionStorage.clear, sessionStorage.key,
 XMLHttpRequest, XMLHttpRequest.prototype.open, XMLHttpRequest.prototype.send,
 XMLHttpRequest.prototype.setRequestHeader, XMLHttpRequest.prototype.getResponseHeader,
 XMLHttpRequest.prototype.getAllResponseHeaders, XMLHttpRequest.prototype.addEventListener,
 Image, Audio, EventSource, HTMLElement, Element,
 CanvasRenderingContext2D, WebGLRenderingContext
].forEach(markNative)

// get_enviroment(proxy_array)