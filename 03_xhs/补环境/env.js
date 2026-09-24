function get_enviroment(proxy_array) {
    for(var i=0; i<proxy_array.length; i++){
        handler = '{\n' +
            '   get: function(target, property, receiver) {\n' +
            '       console.log("方法:", "get    ", "对象:", ' +
            '"' +  proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值:", ' + 'target[property], ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '        return target[property];\n' +
            '     },\n' +
            '     set: function(target, property, value, receiver)  {\n' +
            '         console.log("方法:", "set   ", "对象:", ' +
            '"' +  proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值:", ' + 'target[property], ' +
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

window = global
window.top = window

// ==================== 补环境区 ====================
// 虚拟机初始化第一步就要操作 DOM（会把节点 append 到 body 再 removeChild），
// 浏览器里 <script> 放在 <head> 时 document.body 还是 null，这一步就会抛错中断，
// 结果 window.mnsv2 不会被定义。所以这里必须把 DOM 补齐。

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'

// ---------- 0. 伪原生 toString（参考 02_a_bogus/toutiao/env.js）----------
// SDK 会用 fn.toString().indexOf('[native code]') 判断环境有没有被篡改，
// 这里让桩函数在 toString 时表现得像原生函数
const __nativeFns = new WeakSet()
const __origFnToString = Function.prototype.toString
Function.prototype.toString = function () {
    if (__nativeFns.has(this)) {
        return 'function ' + (this.name || '') + '() { [native code] }'
    }
    return __origFnToString.call(this)
}
function markNative(fn) {
    if (typeof fn === 'function') __nativeFns.add(fn)
    return fn
}

// ---------- 1. 极简 DOM ----------
// 虚拟机用 new Function 编译过一段环境检测：枚举 document 里所有标签名，
// 空集合就判定"不是真浏览器"。所以这里得有真实的 DOM 树。
function collectElements(root, out) {
    out = out || []
    out.push(root)
    const children = root.children || []
    for (const child of children) collectElements(child, out)
    return out
}

function byTagName(root, tag) {
    const all = collectElements(root, [])
    if (!tag || tag === '*') return all
    const want = String(tag).toUpperCase()
    return all.filter(function (el) { return el.tagName === want })
}

function makeElement(tag) {
    tag = String(tag).toLowerCase()
    const el = {
        tagName: tag.toUpperCase(),
        nodeName: tag.toUpperCase(),
        nodeType: 1,
        parentNode: null,
        parentElement: null,
        children: [],
        childNodes: [],
        attributes: {},
        style: {},
        dataset: {},
        id: '',
        className: '',
        innerHTML: '',
        outerHTML: '',
        textContent: '',
        value: '',
        width: 300,
        height: 150,
        src: '',
        href: '',
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () { return true },
        setAttribute: function (name, value) { this.attributes[name] = String(value) },
        getAttribute: function (name) { return name in this.attributes ? this.attributes[name] : null },
        removeAttribute: function (name) { delete this.attributes[name] },
        hasAttribute: function (name) { return name in this.attributes },
        appendChild: function (child) {
            // 虚拟机偶尔会拿垃圾值来 append/remove（DOM 探针里见过传 undefined / window），
            // 这里必须容错：一旦抛出 TypeError 会被它的字节码 try/catch 静默吞掉，流程就跑偏了
            if (child === null || typeof child !== 'object') return child
            child.parentNode = this
            child.parentElement = this
            this.children.push(child)
            this.childNodes.push(child)
            return child
        },
        insertBefore: function (child) { return this.appendChild(child) },
        removeChild: function (child) {
            if (child === null || typeof child !== 'object') return child
            const i = this.children.indexOf(child)
            if (i >= 0) { this.children.splice(i, 1); this.childNodes.splice(i, 1) }
            child.parentNode = null
            child.parentElement = null
            return child
        },
        replaceChild: function (newNode, oldNode) { this.removeChild(oldNode); return this.appendChild(newNode) },
        getElementsByTagName: function (tag) { return byTagName(this, tag) },
        querySelector: function () { return null },
        querySelectorAll: function () { return [] },
        getBoundingClientRect: function () { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 } },
        cloneNode: function () { return makeElement(tag) },
        contains: function () { return false },
        focus: function () {},
        blur: function () {},
        click: function () {},
    }
    if (tag === 'canvas') {
        el.getContext = function (type) { return makeContext(type) }
        el.toDataURL = function () {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        }
    }
    return el
}

// canvas / webgl 上下文桩：读参数一律给固定值，未实现的方法统一返回函数桩
function makeContext(type) {
    const glParams = {
        7936: 'WebKit',
        7937: 'WebKit WebGL',
        7938: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
        3379: 16384,
        34930: 16,
        35660: 16,
        35661: 32,
        35724: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)',
        37445: 'Google Inc. (Apple)',
        37446: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unversioned)',
    }
    const base = {
        canvas: null,
        drawingBufferWidth: 300,
        drawingBufferHeight: 150,
        getParameter: function (p) { return p in glParams ? glParams[p] : 4096 },
        getExtension: function (name) {
            if (/debug_renderer_info/i.test(String(name))) {
                return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 }
            }
            return null
        },
        getSupportedExtensions: function () {
            return ['WEBGL_debug_renderer_info', 'EXT_texture_filter_anisotropic', 'OES_texture_float']
        },
        getShaderPrecisionFormat: function () { return { rangeMin: 127, rangeMax: 127, precision: 23 } },
        getContextAttributes: function () {
            return {
                alpha: true, depth: true, stencil: false, antialias: true,
                premultipliedAlpha: true, preserveDrawingBuffer: false,
                powerPreference: 'default', failIfMajorPerformanceCaveat: false,
            }
        },
        measureText: function (t) { return { width: String(t).length * 7 } },
        getImageData: function (x, y, w, h) {
            w = (w | 0) || 1; h = (h | 0) || 1
            return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
        },
    }
    return new Proxy(base, {
        get: function (t, p) {
            if (p in t) return t[p]
            if (p === 'canvas') return makeElement('canvas')
            // webgl 里大量指纹读取走的是方法调用，给个函数桩避免 xxx is not a function
            return function () { return 0 }
        },
        set: function (t, p, v) { t[p] = v; return true },
    })
}

document = {
    cookie: '',
    title: '小红书 - 你的生活兴趣社区',
    URL: 'https://www.xiaohongshu.com/explore',
    documentURI: 'https://www.xiaohongshu.com/explore',
    domain: 'www.xiaohongshu.com',
    referrer: 'https://www.xiaohongshu.com/',
    readyState: 'complete',
    hidden: false,
    visibilityState: 'visible',
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    compatMode: 'CSS1Compat',
    currentScript: null,
    scripts: [],
    images: [],
    forms: [],
    links: [],
    styleSheets: [],
    // 注意：真机上 document.all 的 typeof 是 'undefined'（HTMLAllCollection 的怪癖），
    // 且 !document.all 为 true。给成数组/对象会被浏览器检测一眼识破，所以这里留空。
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () { return true },
    hasFocus: function () { return true },
    createElement: makeElement,
    createElementNS: function (ns, tag) { return makeElement(tag) },
    createTextNode: function (text) { return { nodeType: 3, nodeName: '#text', textContent: String(text) } },
    createDocumentFragment: function () { return makeElement('fragment') },
    createComment: function (text) { return { nodeType: 8, textContent: String(text) } },
    getElementById: function () { return null },
    getElementsByTagName: function (tag) { return byTagName(document.documentElement, tag) },
    getElementsByClassName: function () { return [] },
    getElementsByName: function () { return [] },
    querySelector: function () { return null },
    querySelectorAll: function () { return [] },
    write: function () {},
    writeln: function () {},
    open: function () {},
    close: function () {},
    execCommand: function () { return false },
    getSelection: function () { return { toString: function () { return '' } } },
    elementFromPoint: function () { return null },
    implementation: { createHTMLDocument: function () { return document } },
    documentElement: makeElement('html'),
    head: makeElement('head'),
    body: makeElement('body'),
}

// 组装一棵像真实页面的 DOM 树：虚拟机会枚举所有标签名判断是否为真浏览器，
// 空集合会被判定成非浏览器环境，进而拒绝定义 window.mnsv2。
document.head.appendChild(makeElement('meta'))
const titleEl = makeElement('title')
titleEl.textContent = document.title
document.head.appendChild(titleEl)
document.head.appendChild(makeElement('link'))

const appEl = makeElement('div')
appEl.id = 'app'
document.body.appendChild(appEl)

const vmpScript = makeElement('script')
vmpScript.src = 'https://fe-video-qc.xhscdn.com/fe-platform/vmp.js'
vmpScript.type = 'text/javascript'
document.body.appendChild(vmpScript)

document.documentElement.appendChild(document.head)
document.documentElement.appendChild(document.body)

document.scripts = [vmpScript]
document.currentScript = vmpScript

// document 自身的节点标识，以及"向上收口"：真机上 html.parentNode 就是 document。
// 虚拟机有个助手函数是从某个节点沿 parentNode 往上遍历、遇到 nodeType===9 才停，
// 我们的 html.parentNode 若是 null，它会在中途断掉。
document.nodeType = 9
document.nodeName = '#document'
document.defaultView = window
document.ownerDocument = null
document.documentElement.parentNode = document
collectElements(document.documentElement, []).forEach(function (el) {
    el.ownerDocument = document
})

// document.cookie 也必须是读写回环：真机写进去再读出来只有 "name=value"，
// domain / path / max-age 这些属性不会出现在读回结果里
const cookieJar = {}
Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: function () {
        return Object.keys(cookieJar).map(k => k + '=' + cookieJar[k]).join('; ')
    },
    set: function (v) {
        const raw = String(v)
        const first = raw.split(';')[0]
        const eq = first.indexOf('=')
        if (eq <= 0) return
        const name = first.slice(0, eq).trim()
        const value = first.slice(eq + 1).trim()
        if (!value || /max-age=0/i.test(raw)) delete cookieJar[name]
        else cookieJar[name] = value
    },
})

// document.all：真机上是 HTMLAllCollection，typeof 却是 'undefined'（[[IsHTMLDDA]] 语义），
// 纯 JS 造不出来。借原生 addon（对应 02_a_bogus/toutiao/document_all.cc 的 MarkAsUndetectable）
try {
    const path = require('path')
    const documentAll = require(path.join(__dirname, '..', '..', '02_a_bogus', 'toutiao', 'document_all.node')).createDocumentAll()
    Object.defineProperty(document, 'all', {
        configurable: true,
        enumerable: false,
        get: function () { return documentAll },
    })
} catch (e) {
    // addon 不可用时退化成不定义（typeof document.all 同样是 'undefined'）
}

// ---------- 2. navigator ----------
// Node 里 navigator 是 globalThis 上的只读 getter，直接赋值不生效，得用 defineProperty
const fakeNavigator = {
    userAgent: UA,
    appName: 'Netscape',
    appVersion: UA.replace(/^Mozilla\//, ''),
    appCodeName: 'Mozilla',
    platform: 'MacIntel',
    product: 'Gecko',
    productSub: '20030107',
    vendor: 'Google Inc.',
    vendorSub: '',
    language: 'zh-CN',
    languages: ['zh-CN', 'zh'],
    cookieEnabled: true,
    onLine: true,
    webdriver: false,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
    // Chrome 里 plugins 有 5 项、mimeTypes 有 2 项，空数组是典型的"非浏览器"特征
    plugins: {
        length: 5,
        0: { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
        1: { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
        2: { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
        3: { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
        4: { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
        item: function (i) { return this[i] || null },
        namedItem: function (n) { for (let i = 0; i < this.length; i++) if (this[i].name === n) return this[i]; return null },
        refresh: function () {},
    },
    mimeTypes: {
        length: 2,
        0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        1: { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        item: function (i) { return this[i] || null },
        namedItem: function (n) { for (let i = 0; i < this.length; i++) if (this[i].type === n) return this[i]; return null },
    },
    userAgentData: {
        brands: [
            { brand: 'Not)A;Brand', version: '24' },
            { brand: 'Chromium', version: '152' },
            { brand: 'Google Chrome', version: '152' },
        ],
        mobile: false,
        platform: 'macOS',
        getHighEntropyValues: function () { return Promise.resolve({ platform: 'macOS', platformVersion: '14.5.0', architecture: 'arm', bitness: '64' }) },
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    javaEnabled: function () { return false },
    sendBeacon: function () { return true },
}
Object.defineProperty(globalThis, 'navigator', {
    value: fakeNavigator, writable: true, configurable: true, enumerable: true,
})

// 真机上 navigator.__proto__ 是 Navigator.prototype，指向 Object.prototype 会被识破
if (typeof Navigator === 'function' && Navigator.prototype) {
    Object.setPrototypeOf(fakeNavigator, Navigator.prototype)
}

// Node 的 navigator 是用 JS 实现的，Navigator.prototype 上的 getter 源码里没有 [native code]，
// 会被虚拟机的"原生函数检测"（Function.prototype.toString）命中，导致它拒绝导出签名函数。
// 用 Proxy 包一层即可：V8 对 Proxy 函数做 toString 时会返回 [native code]。
if (typeof Navigator === 'function' && Navigator.prototype) {
    const naviProto = Navigator.prototype
    for (const key of Object.getOwnPropertyNames(naviProto)) {
        if (key === 'constructor') continue
        const desc = Object.getOwnPropertyDescriptor(naviProto, key)
        if (desc && typeof desc.get === 'function') {
            const fakeGet = new Proxy(function () { return fakeNavigator[key] }, {})
            Object.defineProperty(naviProto, key, {
                get: fakeGet,
                configurable: true,
                enumerable: desc.enumerable,
            })
        }
    }
}

// ---------- 3. location / screen / history / localStorage ----------
location = {
    href: 'https://www.xiaohongshu.com/explore',
    protocol: 'https:',
    host: 'www.xiaohongshu.com',
    hostname: 'www.xiaohongshu.com',
    port: '',
    pathname: '/explore',
    search: '',
    hash: '',
    origin: 'https://www.xiaohongshu.com',
    ancestorOrigins: [],
    assign: function () {},
    replace: function () {},
    reload: function () {},
    toString: function () { return location.href },
}
document.location = location

screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1055,
    availLeft: 0,
    availTop: 25,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: { angle: 0, type: 'landscape-primary', onchange: null },
}

history = {
    length: 2,
    state: null,
    scrollRestoration: 'auto',
    pushState: function () {},
    replaceState: function () {},
    back: function () {},
    forward: function () {},
    go: function () {},
}

// 必须是真正的读写回环：虚拟机常写入一个值再读回来校验，空实现会被判定为异常环境
function makeStorage() {
    const data = {}
    return {
        get length() { return Object.keys(data).length },
        key: function (i) { return Object.keys(data)[i] === undefined ? null : Object.keys(data)[i] },
        getItem: function (k) {
            return Object.prototype.hasOwnProperty.call(data, String(k)) ? data[String(k)] : null
        },
        setItem: function (k, v) { data[String(k)] = String(v) },
        removeItem: function (k) { delete data[String(k)] },
        clear: function () { Object.keys(data).forEach(k => delete data[k]) },
    }
}
localStorage = makeStorage()
sessionStorage = makeStorage()

// ---------- 4. window 上的其它属性 ----------
window.self = window
window.window = window
window.parent = window
window.frames = window
window.innerWidth = 1920
window.innerHeight = 971
window.outerWidth = 1920
window.outerHeight = 1055
window.devicePixelRatio = 2
window.screenX = 0
window.screenY = 25
window.pageXOffset = 0
window.pageYOffset = 0
window.scrollX = 0
window.scrollY = 0
window.closed = false
window.name = ''
window.length = 0
window.isSecureContext = true
window.origin = 'https://www.xiaohongshu.com'
window.status = ''
window.defaultStatus = ''
window.chrome = { runtime: {}, app: {}, csi: function () { return {} }, loadTimes: function () { return {} } }
window.insight = { sendCustomPoint: function () {}, track: function () {}, report: function () {} }
window.addEventListener = function () {}
window.removeEventListener = function () {}
window.dispatchEvent = function () { return true }
window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()) }, 16) }
window.cancelAnimationFrame = function (id) { clearTimeout(id) }
window.requestIdleCallback = function (cb) { return setTimeout(function () { cb({ didTimeout: false, timeRemaining: function () { return 50 } }) }, 1) }
window.cancelIdleCallback = function (id) { clearTimeout(id) }
window.getComputedStyle = function () { return { getPropertyValue: function () { return '' } } }
window.matchMedia = function () {
    return { matches: false, media: '', addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} }
}
window.scrollTo = function () {}
window.scrollBy = function () {}
window.moveTo = function () {}
window.resizeTo = function () {}
window.open = function () { return null }
window.close = function () {}
window.focus = function () {}
window.blur = function () {}
window.stop = function () {}
window.postMessage = function () {}
window.alert = function () {}
window.confirm = function () { return true }
window.prompt = function () { return null }
window.print = function () {}
window.btoa = globalThis.btoa || function (s) { return Buffer.from(s, 'binary').toString('base64') }
window.atob = globalThis.atob || function (s) { return Buffer.from(s, 'base64').toString('binary') }

// 构造器桩：虚拟机大量做 typeof / instanceof 探测
window.Screen = function Screen() {}
window.MouseEvent = function MouseEvent(type, init) {
    this.type = type
    this.x = 0; this.y = 0
    this.screenX = 0; this.screenY = 25
    this.clientX = 0; this.clientY = 0
    this.movementX = 0; this.movementY = 0
    this.isTrusted = true
    this.timeStamp = Date.now()
    Object.assign(this, init || {})
}
window.KeyboardEvent = function KeyboardEvent() {}
window.PointerEvent = function PointerEvent() {}
window.TouchEvent = function TouchEvent() {}
window.WheelEvent = function WheelEvent() {}
window.FocusEvent = function FocusEvent() {}
window.InputEvent = function InputEvent() {}
window.CustomEvent = globalThis.CustomEvent || function CustomEvent() {}
window.Event = globalThis.Event || function Event() {}
window.HTMLElement = function HTMLElement() {}
window.HTMLDivElement = function HTMLDivElement() {}
window.HTMLCanvasElement = function HTMLCanvasElement() {}
window.HTMLImageElement = function HTMLImageElement() {}
window.HTMLScriptElement = function HTMLScriptElement() {}
window.Element = function Element() {}
window.Node = function Node() {}
window.Document = function Document() {}
window.CanvasRenderingContext2D = function CanvasRenderingContext2D() {}
window.WebGLRenderingContext = function WebGLRenderingContext() {}
window.WebGL2RenderingContext = function WebGL2RenderingContext() {}
window.WebGLBuffer = function WebGLBuffer() {}
window.Image = function Image() { return makeElement('img') }
window.Audio = function Audio() { return makeElement('audio') }
window.XMLHttpRequest = function XMLHttpRequest() {}
window.WebSocket = function WebSocket() {}
window.Worker = function Worker() {}
window.EventTarget = function EventTarget() {}
window.EventSource = function EventSource() {}
window.MutationObserver = function MutationObserver() { return { observe: function () {}, disconnect: function () {}, takeRecords: function () { return [] } } }
window.IntersectionObserver = function IntersectionObserver() { return { observe: function () {}, disconnect: function () {}, unobserve: function () {} } }
window.ResizeObserver = function ResizeObserver() { return { observe: function () {}, disconnect: function () {}, unobserve: function () {} } }
window.ImageData = function ImageData() {}
window.Blob = globalThis.Blob || function Blob() {}
window.File = function File() {}
window.FileReader = function FileReader() {}
window.FormData = function FormData() {}

// ---------- 5. 让被探测的对象更像真机 ----------
// 真机 Screen.prototype 上是 width/height 这些 getter，且 screen.__proto__ 指向它；
// 用 Proxy 包一层，Function.prototype.toString 会报 [native code]，躲过原生性检测
;(function () {
    const proto = window.Screen.prototype
    for (const key of ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth', 'availLeft', 'availTop']) {
        Object.defineProperty(proto, key, {
            get: new Proxy(function () { return screen[key] }, {}),
            configurable: true,
            enumerable: true,
        })
    }
    Object.setPrototypeOf(screen, proto)
})()

// navigator.plugins / mimeTypes 在真机上是 PluginArray / MimeTypeArray
Object.defineProperty(fakeNavigator.plugins, Symbol.toStringTag, { value: 'PluginArray' })
Object.defineProperty(fakeNavigator.mimeTypes, Symbol.toStringTag, { value: 'MimeTypeArray' })

// documentElement 的布局属性（真机上有值）
Object.assign(document.documentElement, {
    clientWidth: 1920, clientHeight: 971,
    offsetWidth: 1920, offsetHeight: 971,
    scrollWidth: 1920, scrollHeight: 971,
})

// 页面级全局（真机上这些是站点脚本挂上去的）
window.webpackChunkxhs_pc_web = []
window.XHS_CALLBACKS = {}
window.XHSInvokeCallback = function () {}
window.XHSCallbacks = []
window.XHSEvents = {}
window.__XHS_AGENT_V2 = {}

get_enviroment(proxy_array)

// 真机上 window.navigator / document / location / screen / history / localStorage ...
// 都是 accessor（带 getter 的访问器属性），不是数据属性。
// 虚拟机很早就会检查这些全局的描述符形态，数据属性会被它一眼识破。
;(function () {
    for (const name of [
        'document', 'navigator', 'location', 'screen', 'history',
        'localStorage', 'sessionStorage', 'performance', 'crypto', 'WebAssembly',
    ]) {
        const value = globalThis[name]
        if (value === undefined) continue
        // 用 Proxy 包 getter，Function.prototype.toString 会报 [native code]
        const getter = new Proxy(function () { return value }, {})
        try {
            Object.defineProperty(globalThis, name, {
                configurable: true,
                enumerable: true,
                get: getter,
            })
        } catch (e) {}
    }
})()

// 把补出来的桩函数标记为「原生」，绕开 [native code] 篡改检测
// （放在最后，保证引用的对象都已创建）
;[
    document.addEventListener, document.removeEventListener, document.dispatchEvent,
    document.createElement, document.createElementNS, document.querySelector,
    document.querySelectorAll, document.getElementsByTagName, document.getElementById,
    document.hasFocus, document.write, document.writeln, document.open, document.close,
    window.addEventListener, window.removeEventListener, window.dispatchEvent,
    window.requestAnimationFrame, window.cancelAnimationFrame, window.matchMedia,
    window.getComputedStyle, window.btoa, window.atob,
    window.scrollTo, window.scrollBy, window.postMessage,
    fakeNavigator.sendBeacon, fakeNavigator.javaEnabled,
    fakeNavigator.addEventListener, fakeNavigator.removeEventListener,
    localStorage.getItem, localStorage.setItem, localStorage.removeItem, localStorage.clear, localStorage.key,
    sessionStorage.getItem, sessionStorage.setItem, sessionStorage.removeItem, sessionStorage.clear, sessionStorage.key,
    window.insight.sendCustomPoint, window.insight.track, window.insight.report,
].forEach(markNative)
