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
        plugins: [],
        mimeTypes: []
    }
})
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
            console.log('event callback error:', error.message)
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
    "hash": ""
}
navigator={userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
           languages : ['zh-CN'],
            platform: 'Win32',
 
}

div = {
    getElementsByTagName: function (...args) {
        console.log(args)
        return []
    }
}
form = {}
input = {}
n = {}
head = { removeChild: function (ele) { } }
script = {
    getAttribute: function (ele) {
        console.log('script getAttribute', ele)
        if (ele === 'r') {
            return 'm'
        }
    },
    parentElement: head
}

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
    return {
        set href(value) { parsed = new URL(value, location.href) },
        get href() { return parsed.href },
        get origin() { return parsed.origin },
        get protocol() { return parsed.protocol },
        get host() { return parsed.host },
        get hostname() { return parsed.hostname },
        get port() { return parsed.port },
        get pathname() { return parsed.pathname },
        get search() { return parsed.search },
        get hash() { return parsed.hash },
        setAttribute(name, value) { this[name] = value },
        getAttribute(name) { return this[name] }
    }
}

// get_enviroment(['meta[1]'])

document = {
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
        return {}
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
        return []
    },
    getElementById: function (...args) {
        console.log(args)
        return {}
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
    addEventListener:function (){}
}


get_enviroment(proxy_array)
