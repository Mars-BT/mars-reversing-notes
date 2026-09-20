function get_enviroment(proxy_array) {
    for (var i = 0; i < proxy_array.length; i++) {
        handler = '{\n' +
            '   get: function(target, property, receiver) {\n' +
            '       console.log("方法:", "get    ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
            '"  属性:", property, ' +
            '"  属性类型:", ' + 'typeof property, ' +
            // '"  属性值:", ' + 'target[property], ' +
            '"  属性值类型:", typeof target[property]);\n' +
            '        return target[property];\n' +
            '     },\n' +
            '     set: function(target, property, value, receiver)  {\n' +
            '         console.log("方法:", "set   ", "对象:", ' +
            '"' + proxy_array[i] + '"  ,' +
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
proxy_array = ['window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'canvas', 'UA_InputId', 'body', 'CanvasRenderingContext2D', 'b', 'a', 'input', 'button', 'script', 'span', 'documentElement', 'a', 'experimental', 'webgl', 'WEBGL_debug_renderer_info', 'submit', 'UNMASKED_VENDOR_WEBGL', 'button1', 'button2', 'div', 'head', 'meta', 'html']

window = global
Object.defineProperty(window, 'navigator', {
    configurable: true,
    writable: true,
    value: {
        appCodeName: 'Mozilla',
        appName: 'Netscape',
        appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        cookieEnabled: true,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        language: 'zh-CN',
        languages: ['zh-CN', 'zh'],
        maxTouchPoints: 0,
        onLine: true,
        platform: 'MacIntel',
        product: 'Gecko',
        productSub: '20030107',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        vendorSub: '',
        webdriver: false,
        connection: {
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false,
            addEventListener() {},
            removeEventListener() {}
        },
        plugins: [
            {name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
            {name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
            {name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format'}
        ],
        mimeTypes: [
            {type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format'},
            {type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format'}
        ],
        getBattery() {
            const battery = {charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1}
            return {
                then(callback) {
                    callback(battery)
                    return {catch() {}}
                }
            }
        },
        webkitPersistentStorage: {
            queryUsageAndQuota(callback) { if (callback) callback(0, 0) },
            requestQuota(bytes, callback) { if (callback) callback(bytes) }
        }
    }
})
window.chrome = {
    app: {
        isInstalled: false,
        InstallState: {DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed'},
        RunningState: {CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running'}
    },
    runtime: {
        OnInstalledReason: {CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update'},
        OnRestartRequiredReason: {APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic'},
        PlatformArch: {ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64'},
        PlatformNaclArch: {ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64'},
        PlatformOs: {ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win'},
        RequestUpdateCheckStatus: {NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available'}
    }
}
window.screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1055,
    availLeft: 0,
    availTop: 25,
    colorDepth: 24,
    pixelDepth: 24
}
window.devicePixelRatio = 1
window.innerWidth = 1920
window.innerHeight = 955
window.outerWidth = 1920
window.outerHeight = 1080
window.top = window
window.self = window
window.parent = window
window.clientInformation = window.navigator
window.name = ''
window.open = function () { return null }
window.MutationObserver = function MutationObserver() { this.observe = function () {}; this.disconnect = function () {} }
window.PointerEvent = function PointerEvent(type, init) { this.type = type; Object.assign(this, init || {}) }
window.DOMParser = function DOMParser() {}
window.DOMParser.prototype.parseFromString = function () { return {documentElement: create_dom_element('html')} }
window.indexedDB = {
    open() { return {onsuccess: null, onerror: null, onupgradeneeded: null} },
    deleteDatabase() { return {} }
}
const event_listeners = new Map()
window.addEventListener = function (type, callback) {
    console.log([type, callback])
    if (!event_listeners.has(type)) {
        event_listeners.set(type, [])
    }
    event_listeners.get(type).push(callback)
}
window.dispatchEvent = function (event) {
    const callbacks = event_listeners.get(event.type) || []
    for (const callback of callbacks) {
        try {
            callback.call(window, event)
        } catch (error) {
            console.log('event callback error:', error.stack || error.message)
        }
    }
    return true
}
window.removeEventListener = function (type, callback) {
    const callbacks = event_listeners.get(type) || []
    const index = callbacks.indexOf(callback)
    if (index !== -1) {
        callbacks.splice(index, 1)
    }
}

setTimeout = function () { }
setInterval = function () { }
window.claerInterval = function () { }
window.attachEvent = function () { }

function create_storage() {
    const values = new Map()
    return {
        get length() { return values.size },
        key(index) { return Array.from(values.keys())[index] || null },
        getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null },
        setItem(key, value) { values.set(String(key), String(value)) },
        removeItem(key) { values.delete(String(key)) },
        clear() { values.clear() }
    }
}

window.localStorage = create_storage()
window.sessionStorage = create_storage()

window.req_param = undefined

// Must be exposed on window.  A module-local `const XMLHttpRequest` cannot be
// discovered (and therefore cannot be wrapped) by the Ruishu runtime.
window.XMLHttpRequest = function XMLHttpRequest() { }
window.XMLHttpRequest.prototype.open = function (method, url, async) {
    console.log("==========================")
    console.log(method, url)
    window.req_param = url
    return {}
}
window.XMLHttpRequest.prototype.send = function () {
    return {}
}
window.XMLHttpRequest.prototype.setRequestHeader = function () {
    return {}
}

// The current Ouyeel page also installs hooks for fetch/Request.  Keep small
// browser-like stand-ins so we can capture whichever transport this build
// rewrites without performing a real request from Node.
window.Request = function Request(input, init) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init && init.method ? init.method : 'GET'
}
window.fetch = function fetch(input) {
    window.req_param = typeof input === 'string' ? input : input.url
    return Promise.resolve({})
}

location = {
    "ancestorOrigins": {},
    "href": "https://www.ouyeel.com/steel/search?channel=RJ&pageIndex=0&pageSize=50",
    "origin": "https://www.ouyeel.com",
    "protocol": "https:",
    "host": "www.ouyeel.com",
    "hostname": "www.ouyeel.com",
    "port": "",
    "pathname": "/steel/search",
    "search": "?channel=RJ&pageIndex=0&pageSize=50",
    "hash": "",
    toString() { return this.href },
    assign(value) { this.href = new URL(value, this.href).href },
    replace(value) { this.href = new URL(value, this.href).href },
    reload() {}
}

function create_dom_element(tag_name) {
    const attributes = new Map()
    const children = []
    const element = {
        nodeType: 1,
        tagName: String(tag_name).toUpperCase(),
        nodeName: String(tag_name).toUpperCase(),
        style: {},
        children: children,
        childNodes: children,
        parentNode: null,
        parentElement: null,
        ownerDocument: null,
        innerHTML: '',
        innerText: '',
        textContent: '',
        appendChild(child) {
            children.push(child)
            child.parentNode = element
            child.parentElement = element
            return child
        },
        removeChild(child) {
            const index = children.indexOf(child)
            if (index !== -1) children.splice(index, 1)
            // Keep the relationship readable in this lightweight DOM.  The
            // challenge has two cleanup paths that can remove the same script
            // during our synchronous load dispatch.
            return child
        },
        insertBefore(child, reference) {
            const index = children.indexOf(reference)
            if (index === -1) return element.appendChild(child)
            children.splice(index, 0, child)
            child.parentNode = element
            child.parentElement = element
            return child
        },
        remove() {
            if (element.parentNode) element.parentNode.removeChild(element)
        },
        setAttribute(name, value) {
            attributes.set(String(name), String(value))
            element[name] = String(value)
        },
        getAttribute(name) {
            return attributes.has(String(name)) ? attributes.get(String(name)) : null
        },
        hasAttribute(name) { return attributes.has(String(name)) },
        removeAttribute(name) {
            attributes.delete(String(name))
            delete element[name]
        },
        getElementsByTagName() { return [] },
        querySelector() { return null },
        querySelectorAll() { return [] },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return true },
        click() {},
        focus() {},
        blur() {},
        getBoundingClientRect() {
            return {x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0}
        }
    }
    return element
}

html = create_dom_element('html')
head = create_dom_element('head')
body = create_dom_element('body')
documentElement = html
html.appendChild(head)
html.appendChild(body)

div = create_dom_element('div')
form = create_dom_element('form')
input = create_dom_element('input')
n = create_dom_element('div')
script = create_dom_element('script')
script.setAttribute('r', 'm')
script.src = location.origin + '/.well-known/rs/challenge.js'
head.appendChild(script)

meta = [
    {
    },
    {
        getAttribute: function (...args) {
            console.log(args)
            return 'm'
        },
        parentNode: {
            removeChild: function (...args) {
                console.log(args)
            }
        }
    }
]
meta.length = 2

const cookie_store = new Map()

function create_anchor() {
    let parsed = new URL(location.href)
    const anchor = create_dom_element('a')
    Object.defineProperties(anchor, {
        href: {
            configurable: true,
            enumerable: true,
            get() { return parsed.href },
            set(value) { parsed = new URL(value, location.href) }
        },
        origin: {configurable: true, enumerable: true, get() { return parsed.origin }},
        protocol: {configurable: true, enumerable: true, get() { return parsed.protocol }},
        host: {configurable: true, enumerable: true, get() { return parsed.host }},
        hostname: {configurable: true, enumerable: true, get() { return parsed.hostname }},
        port: {configurable: true, enumerable: true, get() { return parsed.port }},
        pathname: {configurable: true, enumerable: true, get() { return parsed.pathname }},
        search: {configurable: true, enumerable: true, get() { return parsed.search }},
        hash: {configurable: true, enumerable: true, get() { return parsed.hash }}
    })
    return anchor
}

// get_enviroment(['meta[1]'])

const anchor_element = create_anchor()
anchor_element.id = '__anchor__'
body.appendChild(anchor_element)

document = {
    nodeType: 9,
    addEventListener: window.addEventListener,
    removeEventListener: window.removeEventListener,
    dispatchEvent: window.dispatchEvent,
    createElement: function (...args) {
        console.log(args)
        if (args[0] == 'div') {
            return div
        }
        if (args[0] == 'a') {
            return create_anchor()
        }
        return create_dom_element(args[0])
    },
    appendChild: function (...args) {
        console.log(args)
    },
    removeChild: function (...args) {
        console.log(args)
    },
    getElementsByTagName: function (...args) {
        console.log(args)
        if (args[0] == 'meta') {
            return meta
        }
        if (args[0] == 'script') {
            return [script]
        }
        if (args[0] == 'head') {
            return [head]
        }
        if (args[0] == 'body') {
            return [body]
        }
        if (args[0] == 'html') {
            return [html]
        }
        return []
    },
    getElementById: function (...args) {
        console.log(args)
        if (args[0] === '__anchor__') return anchor_element
        return null
    },
    querySelector: function (selector) {
        if (selector === 'script' || selector === 'script[r="m"]') return script
        if (selector === '#__anchor__') return anchor_element
        if (selector === 'head') return head
        if (selector === 'body') return body
        if (selector === 'html') return html
        return null
    },
    querySelectorAll: function (selector) {
        const match = this.querySelector(selector)
        return match ? [match] : []
    },
    createExpression: function () {
        return {evaluate() { return {singleNodeValue: null, snapshotLength: 0} }}
    },
    get cookie() {
        return Array.from(cookie_store.entries())
            .map(([name, value]) => name + '=' + value)
            .join('; ')
    },
    set cookie(value) {
        // A browser stores only the first name/value pair; Path, Expires,
        // Secure, etc. are attributes and are not returned by document.cookie.
        const pair = String(value).split(';', 1)[0]
        const separator = pair.indexOf('=')
        if (separator !== -1) {
            cookie_store.set(pair.slice(0, separator).trim(), pair.slice(separator + 1))
        }
    },
    visibilityState: 'visible',
    hidden: false,
    readyState: 'complete',
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    compatMode: 'CSS1Compat',
    URL: location.href,
    documentURI: location.href,
    baseURI: location.href,
    referrer: location.href,
    location: location,
    documentElement: documentElement,
    head: head,
    body: body,
    currentScript: script
}
document.defaultView = window

for (const element of [html, head, body, div, form, input, script, anchor_element]) {
    element.ownerDocument = document
}


get_enviroment(proxy_array)
