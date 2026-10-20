// ============================================================================
// JD h5st (ParamsSign) 补环境脚本
// 用法：node demo.js   （demo.js 中先 require 本文件，再 require js_security.js）
// ============================================================================

// ---------------------------------------------------------------------------
// 1. window / 全局对象
// ---------------------------------------------------------------------------
window = global
window.top = window
window.self = window
window.window = window
window.parent = window
window.globalThis = window

const native = require("./document_all.node")

function noop() {}

// ---------------------------------------------------------------------------
// 2. DOM 元素工厂
//    库内部有一个 JSONP 动态加载 <script> 的逻辑，需要 createElement /
//    getElementsByTagName 返回真实可用的元素对象，否则异步回调里访问
//    element.parentNode 会抛异常。
// ---------------------------------------------------------------------------
function triggerScriptLoad(el) {
    // 离线环境无法真正加载远程脚本：异步触发 onerror（库内部有超时兜底，
    // 若不主动失败会挂起 15s）。元素上没挂 onerror 时回退到 onreadystatechange。
    if (el.tagName !== "SCRIPT" || !el.src) return
    setTimeout(function () {
        if (typeof el.onerror === "function") el.onerror(new Error("Failed to load script"))
        else if (typeof el.onreadystatechange === "function") el.onreadystatechange()
    }, 0)
}

function createElement(tagName) {
    tagName = String(tagName || "").toLowerCase()
    const el = {
        nodeType: 1,
        tagName: tagName.toUpperCase(),
        nodeName: tagName.toUpperCase(),
        parentNode: null,
        childNodes: [],
        style: {},
        attributes: {},
        innerHTML: "",
        textContent: "",
        src: "",
        type: "",
        onload: null,
        onerror: null,
        onreadystatechange: null,
        appendChild(child) {
            child.parentNode = this
            this.childNodes.push(child)
            triggerScriptLoad(child)
            return child
        },
        removeChild(child) {
            const i = this.childNodes.indexOf(child)
            if (i >= 0) this.childNodes.splice(i, 1)
            child.parentNode = null
            return child
        },
        insertBefore(child, ref) {
            child.parentNode = this
            const i = this.childNodes.indexOf(ref)
            if (i >= 0) this.childNodes.splice(i, 0, child)
            else this.childNodes.push(child)
            return child
        },
        setAttribute(k, v) {
            this.attributes[k] = v
            this[k] = v
        },
        getAttribute(k) {
            return this.attributes[k]
        },
        removeAttribute(k) {
            delete this.attributes[k]
        },
        hasAttribute(k) {
            return Object.prototype.hasOwnProperty.call(this.attributes, k)
        },
        addEventListener(type, fn) {
            this["on" + type] = fn
        },
        removeEventListener() {},
        getBoundingClientRect() {
            return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
        },
        toDataURL() {
            return "data:image/png;base64,"
        },
        getContext() {
            return null
        },
        querySelector() {
            return null
        },
        querySelectorAll() {
            return []
        },
    }
    return el
}

// ---------------------------------------------------------------------------
// 3. document
// ---------------------------------------------------------------------------
function createDocument() {
    // 浏览器里始终存在 <script>，库会向 getElementsByTagName('script')[0] 上挂载
    const scripts = [createElement("script")]

    const doc = {
        nodeType: 9,
        cookie: "",
        URL: "https://www.jd.com/",
        domain: "jd.com",
        referrer: "",
        title: "",
        readyState: "complete",
        characterSet: "UTF-8",
        charset: "UTF-8",
        hidden: false,
        visibilityState: "visible",
        all: native.createDocumentAll(),
        createElement: createElement,
        createTextNode(t) {
            return { nodeType: 3, textContent: String(t) }
        },
        createComment(t) {
            return { nodeType: 8, textContent: String(t) }
        },
        createEvent() {
            return { initEvent: noop, initCustomEvent: noop, initMouseEvent: noop, initKeyboardEvent: noop }
        },
        getElementsByTagName(tag) {
            tag = String(tag).toLowerCase()
            if (tag === "script") return scripts
            return []
        },
        getElementsByClassName() {
            return []
        },
        getElementById() {
            return null
        },
        querySelector() {
            return null
        },
        querySelectorAll() {
            return []
        },
        addEventListener: noop,
        removeEventListener: noop,
        write: noop,
        writeln: noop,
        open: noop,
        close: noop,
    }

    doc.documentElement = createElement("html")
    doc.head = createElement("head")
    doc.body = createElement("body")
    doc.documentElement.appendChild(doc.head)
    doc.documentElement.appendChild(doc.body)
    doc.head.appendChild(scripts[0])
    return doc
}

// ---------------------------------------------------------------------------
// 4. 其它 BOM 对象
// ---------------------------------------------------------------------------
function createStorage() {
    const store = Object.create(null)
    return {
        getItem(k) {
            k = String(k)
            return k in store ? store[k] : null
        },
        setItem(k, v) {
            store[String(k)] = String(v)
        },
        removeItem(k) {
            delete store[String(k)]
        },
        clear() {
            Object.keys(store).forEach((k) => delete store[k])
        },
        key(i) {
            return Object.keys(store)[i] ?? null
        },
        get length() {
            return Object.keys(store).length
        },
    }
}

const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

// navigator 在 Node 里是只读 getter，需用 defineProperty 覆盖
Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: {
        userAgent: UA,
        appVersion: UA.replace("Mozilla/", ""),
        appName: "Netscape",
        appCodeName: "Mozilla",
        product: "Gecko",
        productSub: "20030107",
        vendor: "Google Inc.",
        platform: "MacIntel",
        language: "zh-CN",
        languages: ["zh-CN", "zh"],
        cookieEnabled: true,
        onLine: true,
        webdriver: false,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        doNotTrack: null,
        plugins: [],
        mimeTypes: [],
    },
})

window.document = createDocument()
window.navigator = navigator
window.localStorage = createStorage()
window.sessionStorage = createStorage()
window.location = {
    href: "https://www.jd.com/",
    protocol: "https:",
    host: "www.jd.com",
    hostname: "www.jd.com",
    port: "",
    pathname: "/",
    search: "",
    hash: "",
    origin: "https://www.jd.com",
    ancestorOrigins: [],
    assign: noop,
    replace: noop,
    reload: noop,
    toString() {
        return this.href
    },
}
window.history = {
    length: 2,
    scrollRestoration: "auto",
    state: null,
    back: noop,
    forward: noop,
    go: noop,
    pushState: noop,
    replaceState: noop,
}
window.screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1055,
    availLeft: 0,
    availTop: 25,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: { type: "landscape-primary", angle: 0 },
}
window.outerWidth = 1920
window.outerHeight = 1080

// ---------------------------------------------------------------------------
// 5. Proxy 属性访问日志（保持原样，便于继续定位缺失属性）
// ---------------------------------------------------------------------------
function get_enviroment(proxy_array) {
    for (var i = 0; i < proxy_array.length; i++) {
        handler =
            "{\n" +
            '   get: function(target, property, receiver) {\n' +
            '       console.log("方法:", "get    ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值类型:", typeof target[property]);\n' +
            "        return target[property];\n" +
            "     },\n" +
            "     set: function(target, property, value, receiver)  {\n" +
            '         console.log("方法:", "set   ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            '"  属性值类型:", typeof target[property]);\n' +
            "       return Reflect.set(...arguments);\n" +
            "    }\n" +
            "}"
        eval(
            "try{\n" +
                proxy_array[i] +
                ";\n" +
                proxy_array[i] +
                "=new Proxy(" +
                proxy_array[i] +
                ", " +
                handler +
                ")}catch (e) {\n" +
                proxy_array[i] +
                "={};\n" +
                proxy_array[i] +
                "=new Proxy(" +
                proxy_array[i] +
                ", " +
                handler +
                ")}"
        )
    }
}
proxy_array = [
    "window",
    "document",
    "navigator",
    "location",
    "history",
    "screen",
    "localStorage",
    "canvas",
    "UA_InputId",
    "body",
    "CanvasRenderingContext2D",
    "b",
    "a",
    "input",
    "button",
    "script",
    "span",
    "documentElement",
    "a",
    "experimental",
    "webgl",
    "WEBGL_debug_renderer_info",
    "submit",
    "UNMASKED_VENDOR_WEBGL",
    "button1",
    "button2",
    "div",
    "head",
    "meta",
    "html",
]

// get_enviroment(proxy_array)

HTMLElement = function HTMLElement() {}
Element = function Element() {}
