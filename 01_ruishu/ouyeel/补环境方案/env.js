// 上海移动 VMP 所需的纯 Node 浏览器环境兼容层。
var window, self, location, document, navigator, screen, history, div, script, Image,
    localStorage, sessionStorage, indexedDB, MutationObserver, WebKitMutationObserver,
    Event, CustomEvent, AbortController;

window = self = globalThis = global;
global.window = global;
global.self = global;
global.top = global;
// 当前页面不在 iframe 中，真实浏览器的 parent/frames 都会回到自身。
// 顶层浏览上下文中，parent/frames 都指向当前 window。
global.parent = global;
global.frames = global;

// 给 window(Node.js global) 补上浏览器事件方法
window.addEventListener = function (type, listener, options) { };
window.removeEventListener = function (type, listener, options) { };
window.dispatchEvent = function (event) { return true; };
window.attachEvent = function (type, listener) { };
window.detachEvent = function (type, listener) { };

// ===== XMLHttpRequest polyfill（让 VMP 能 hook 请求加密） =====
import xhr2 from 'xhr2';
var _XHR = xhr2.XMLHttpRequest;
global.XMLHttpRequest = _XHR;
global.XMLHttpRequest.prototype._originalSend = global.XMLHttpRequest.prototype.send;
global.XMLHttpRequest.prototype._originalOpen = global.XMLHttpRequest.prototype.open;
global.XMLHttpRequest.prototype._originalSetRequestHeader = global.XMLHttpRequest.prototype.setRequestHeader;

// FormData mock（VMP 可能会用到）
global.FormData = function () {
    this._data = {};
};
global.FormData.prototype.append = function (k, v) { this._data[k] = v; };
global.FormData.prototype.get = function (k) { return this._data[k]; };
global.FormData.prototype.getAll = function (k) { return [this._data[k]]; };
global.FormData.prototype.has = function (k) { return k in this._data; };
global.FormData.prototype.delete = function (k) { delete this._data[k]; };

var _locationCompatibilityDepth = 0;
var _requestMathDescriptor;
var _locationState = {
    "ancestorOrigins": {},
    "href": "https://www.sh.10086.cn/emall/static/h5/card/card_list.html?id=2025026046&xparam=xopid_10057117_xorgid_909340&channel=TF_SDCLzx_mh_mt",
    "origin": "https://www.sh.10086.cn",
    "protocol": "https:",
    "host": "www.sh.10086.cn",
    "hostname": "www.sh.10086.cn",
    "port": "",
    "pathname": "/emall/static/h5/card/card_list.html",
    "search": "?id=2025026046&xparam=xopid_10057117_xorgid_909340&channel=TF_SDCLzx_mh_mt",
    "hash": ""
};
location = new Proxy(_locationState, {
    get: function (target, property, receiver) {
        if (_locationCompatibilityDepth > 0) {
            if (property === 'Math') return globalThis.Math;
            if (property === 'eval') return globalThis.eval;
            if (property === 'parseFloat') return globalThis.parseFloat;
        }
        return Reflect.get(target, property, receiver);
    },
});
globalThis.__beginVmpRequestCompatibility = function () {
    if (_locationCompatibilityDepth === 0) {
        _requestMathDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'Math');
        Object.defineProperty(Object.prototype, 'Math', {
            configurable: true,
            enumerable: false,
            get: function () { return globalThis.Math; },
        });
    }
    _locationCompatibilityDepth++;
};
globalThis.__endVmpRequestCompatibility = function () {
    if (_locationCompatibilityDepth === 0 || --_locationCompatibilityDepth > 0) return;
    if (_requestMathDescriptor) {
        Object.defineProperty(Object.prototype, 'Math', _requestMathDescriptor);
    } else {
        delete Object.prototype.Math;
    }
    _requestMathDescriptor = undefined;
};

// ===== CSSStyleDeclaration mock =====
function createCSSStyleDeclaration() {
    var _styles = {};
    return {
        _styles: _styles,
        getPropertyValue: function (prop) { return _styles[prop] || ''; },
        setProperty: function (prop, value) { _styles[prop] = value; },
        removeProperty: function (prop) { delete _styles[prop]; },
        get length() { return Object.keys(_styles).length; },
        item: function (i) { return Object.keys(_styles)[i] || ''; },
        cssText: '',
        setPropertyValue: function () { },
    };
}

// ===== fake element builder =====
function createElement(tagName) {
    tagName = (tagName || 'div').toLowerCase();
    var el = {
        tagName: tagName.toUpperCase(),
        nodeType: 1,
        nodeName: tagName.toUpperCase(),
        style: createCSSStyleDeclaration(),
        innerHTML: '',
        innerText: '',
        textContent: '',
        className: '',
        id: '',
        children: [],
        childNodes: [],
        parentNode: null,
        parentElement: null,
        attributes: [],
        classList: {
            length: 0,
            add: function () { },
            remove: function () { },
            contains: function () { return false; },
            toggle: function () { },
        },
        getAttribute: function (name) {
            for (var i = 0; i < el.attributes.length; i++) {
                if (el.attributes[i].name === name) return el.attributes[i].value;
            }
            return null;
        },
        setAttribute: function (name, value) {
            for (var i = 0; i < el.attributes.length; i++) {
                if (el.attributes[i].name === name) { el.attributes[i].value = value; return; }
            }
            el.attributes.push({ name: name, value: value });
        },
        removeAttribute: function (name) {
            for (var i = 0; i < el.attributes.length; i++) {
                if (el.attributes[i].name === name) { el.attributes.splice(i, 1); return; }
            }
        },
        hasAttribute: function (name) {
            return el.getAttribute(name) !== null;
        },
        appendChild: function (child) {
            if (child && child.nodeType) {
                child.parentNode = el;
                child.parentElement = el;
                el.children.push(child);
                el.childNodes.push(child);
                el.innerHTML += (child.outerHTML || '');
            }
        },
        removeChild: function (child) {
            var idx = el.children.indexOf(child);
            if (idx >= 0) { el.children.splice(idx, 1); el.childNodes.splice(idx, 1); }
        },
        insertBefore: function (newChild, refChild) {
            var idx = el.children.indexOf(refChild);
            if (idx >= 0) { el.children.splice(idx, 0, newChild); el.childNodes.splice(idx, 0, newChild); }
            else { el.appendChild(newChild); }
        },
        addEventListener: function () { },
        removeEventListener: function () { },
        dispatchEvent: function (evt) { return true; },
        cloneNode: function (deep) {
            var clone = createElement(tagName);
            if (deep) {
                for (var i = 0; i < el.children.length; i++) {
                    clone.appendChild(el.children[i].cloneNode(true));
                }
            }
            return clone;
        },
        getElementsByTagName: function (name) {
            var result = [];
            for (var i = 0; i < el.children.length; i++) {
                if (!name || el.children[i].tagName === name.toUpperCase()) result.push(el.children[i]);
            }
            result.length = result.length;
            result.item = function (i) { return result[i]; };
            return result;
        },
        getElementsByClassName: function () { return []; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        focus: function () { },
        blur: function () { },
        click: function () { },
        contains: function (other) { return false; },
        matches: function () { return false; },
        outerHTML: '<' + tagName + '></' + tagName + '>',
    };

    // Canvas-specific
    if (tagName === 'canvas') {
        el.width = 0;
        el.height = 0;
        var _ctx = createCanvas2DContext(el);
        el.getContext = function (type) {
            if (type === '2d') return _ctx;
            return null;
        };
        el.toDataURL = function () {
            return 'data:image/png;base64,';
        };
    }

    // Anchor-specific
    if (tagName === 'a') {
        el.href = '';
        el.protocol = '';
        el.hostname = '';
        el.port = '';
        el.pathname = '';
        el.search = '';
        el.hash = '';
        el.host = '';
        el.origin = '';
    }

    // Form-specific
    if (tagName === 'form') {
        el.action = '';
        el.method = 'GET';
        el.submit = function () { };
        el.reset = function () { };
    }

    // Input-specific
    if (tagName === 'input') {
        el.name = '';
        el.type = 'text';
        el.value = '';
    }

    // Image-specific
    if (tagName === 'img') {
        el.src = '';
        el.width = 0;
        el.height = 0;
        el.naturalWidth = 0;
        el.naturalHeight = 0;
        el.complete = false;
        el.onload = null;
        el.onerror = null;
    }

    // Script-specific
    if (tagName === 'script') {
        el.src = '';
        el.type = '';
        el.async = false;
        el.defer = false;
        el.onload = null;
    }

    return el;
}

// ===== Canvas 2D Context mock =====
function createCanvas2DContext(canvas) {
    var _fillStyle = '#000000';
    var _strokeStyle = '#000000';
    var _font = '10px sans-serif';
    var _textBaseline = 'alphabetic';
    var _textAlign = 'start';
    var _imageData = null;

    return {
        canvas: canvas,
        fillStyle: _fillStyle,
        strokeStyle: _strokeStyle,
        font: _font,
        textBaseline: _textBaseline,
        textAlign: _textAlign,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,

        fillRect: function (x, y, w, h) { },
        strokeRect: function (x, y, w, h) { },
        clearRect: function (x, y, w, h) { },
        fillText: function (text, x, y, maxWidth) { },
        strokeText: function (text, x, y, maxWidth) { },
        measureText: function (text) {
            return {
                width: text.length * 6,
                actualBoundingBoxAscent: 10,
                actualBoundingBoxDescent: 2,
                hangingBaseline: 0,
                alphabeticBaseline: -8,
                ideographicBaseline: -10,
            };
        },
        getImageData: function (x, y, w, h) {
            var size = w * h * 4;
            var data = new Uint8ClampedArray(size);
            for (var i = 0; i < size; i++) data[i] = 0;
            return {
                data: data,
                width: w,
                height: h,
                colorSpace: 'srgb',
            };
        },
        putImageData: function () { },
        createImageData: function (w, h) {
            return {
                data: new Uint8ClampedArray(w * h * 4),
                width: w,
                height: h,
            };
        },
        drawImage: function () { },
        beginPath: function () { },
        closePath: function () { },
        moveTo: function () { },
        lineTo: function () { },
        arc: function () { },
        arcTo: function () { },
        bezierCurveTo: function () { },
        quadraticCurveTo: function () { },
        rect: function () { },
        fill: function () { },
        stroke: function () { },
        clip: function () { },
        save: function () { },
        restore: function () { },
        scale: function () { },
        rotate: function () { },
        translate: function () { },
        transform: function () { },
        setTransform: function () { },
        createLinearGradient: function () { return { addColorStop: function () { } }; },
        createRadialGradient: function () { return { addColorStop: function () { } }; },
        createPattern: function () { return null; },
    };
}

// ===== document =====
document = {
    cookie: "",
    // 真实浏览器中这两个属性都指向 window。VMP 在锁号分支中
    // 保留浏览器 Document 到所属 window 的标准引用。
    defaultView: window,
    parentWindow: window,
    body: createElement('body'),
    head: createElement('head'),
    documentElement: createElement('html'),
    createElement: createElement,
    createTextNode: function (text) {
        return { nodeType: 3, nodeName: '#text', textContent: String(text), nodeValue: String(text) };
    },
    createComment: function (text) {
        return { nodeType: 8, nodeName: '#comment', textContent: String(text), data: String(text) };
    },
    createEvent: function (type) {
        return {
            type: type,
            initEvent: function (t, bubbles, cancelable) {
                this.type = t;
                this.bubbles = !!bubbles;
                this.cancelable = !!cancelable;
            },
            initCustomEvent: function () { },
        };
    },
    createExpression: function (xpath, resolver) {
        return {
            evaluate: function (contextNode) { return []; },
        };
    },
    appendChild: function (child) { document.documentElement.appendChild(child); },
    removeChild: function (child) { document.documentElement.removeChild(child); },
    getElementById: function (id) { return null; },
    getElementsByTagName: function (name) {
        var result = [];
        if (name === 'body') result.push(document.body);
        if (name === 'head') result.push(document.head);
        if (name === 'html') result.push(document.documentElement);
        result.length = result.length;
        result.item = function (i) { return result[i]; };
        return result;
    },
    getElementsByClassName: function () { return []; },
    getElementsByName: function () { return []; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () { },
    removeEventListener: function () { },
    dispatchEvent: function (evt) { return true; },
    createDocumentFragment: function () { return createElement('div'); },
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    readyState: 'complete',
    title: '',
    URL: location.href,
    referrer: '',
    visibilityState: 'visible',
    hidden: false,
    all: {
        length: 0,
        item: function () { return null; },
        namedItem: function () { return null; },
    },
};

// 目标站点的 VMP 在较长的下单分支中，会把这些全局对象作为 document
// 的兼容属性读取。使用 getter 是因为 navigator 和 eval 会在后面初始化；
// 属性保持不可枚举，避免改变 VMP 对 document 自有字段的遍历结果。
Object.defineProperties(document, {
    Math: { value: Math, configurable: true },
    parseFloat: { value: parseFloat, configurable: true },
    navigator: { get: function () { return globalThis.navigator; }, configurable: true },
    eval: { get: function () { return globalThis.eval; }, configurable: true },
    Function: { get: function () { return globalThis.Function; }, configurable: true },
});

// 补: document.all 应该返回 HTMLAllCollection，包含关键元素
(function () {
    var _allItems = [document.documentElement, document.head, document.body];
    document.all = {
        0: document.documentElement,
        1: document.head,
        2: document.body,
        length: _allItems.length,
        item: function (i) { return _allItems[i] || null; },
        namedItem: function (name) { return null; },
    };
})();

// ===== navigator =====
navigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    language: 'zh-CN',
    languages: ['zh-CN', 'zh'],
    cookieEnabled: true,
    hardwareConcurrency: 4,
    maxTouchPoints: 0,
    webdriver: false,
    standalone: undefined,
    brave: undefined,
    battery: undefined,
    vendor: 'Google Inc.',
    vendorSub: '',
    productSub: '20030101',
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    onLine: true,
    javaEnabled: function () { return false; },
    getBattery: function () {
        return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            onchargingchange: null,
            onchargingtimechange: null,
            ondischargingtimechange: null,
            onlevelchange: null,
            addEventListener: function () { },
            removeEventListener: function () { },
        });
    },
    plugins: {
        length: 0,
        item: function () { return null; },
        namedItem: function () { return null; },
        refresh: function () { },
    },
    mimeTypes: {
        length: 0,
        item: function () { return null; },
        namedItem: function () { return null; },
    },
    webkitPersistentStorage: {
        queryUsageAndQuota: function () { return Promise.resolve({ usage: 0, quota: 0 }); },
        requestQuota: function () { return Promise.resolve({ usage: 0, quota: 0 }); },
    },
    webkitTemporaryStorage: {
        queryUsageAndQuota: function () { return Promise.resolve({ usage: 0, quota: 0 }); },
        requestQuota: function () { return Promise.resolve({ usage: 0, quota: 0 }); },
    },
    connection: {
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
        type: 'cellular',
        addEventListener: function () { },
        removeEventListener: function () { },
    },
    deviceMemory: 4,
    getGamepads: function () { return []; },
};

// ===== screen =====
screen = {
    width: 390,
    height: 844,
    availWidth: 390,
    availHeight: 844,
    availLeft: 0,
    availTop: 0,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: {
        type: 'portrait-primary',
        angle: 0,
        onchange: null,
    },
};

// ===== history =====
history = {
    length: 1,
    state: null,
    scrollRestoration: 'auto',
    back: function () { },
    forward: function () { },
    go: function () { },
    pushState: function () { },
    replaceState: function () { },
};

// ===== div / script (for proxy monitoring) =====
div = createElement('div');
script = createElement('script');


// ===== Image 构造函数 (Canvas 指纹用到) =====
Image = function (width, height) {
    var img = createElement('img');
    img.width = width || 0;
    img.height = height || 0;
    return img;
};

// ===== localStorage / sessionStorage =====
localStorage = {
    _data: {},
    getItem: function (k) { return localStorage._data[k] !== undefined ? localStorage._data[k] : null; },
    setItem: function (k, v) { localStorage._data[k] = String(v); },
    removeItem: function (k) { delete localStorage._data[k]; },
    clear: function () { localStorage._data = {}; },
    key: function (i) { return Object.keys(localStorage._data)[i] || null; },
    get length() { return Object.keys(localStorage._data).length; },
};

sessionStorage = {
    _data: {},
    getItem: function (k) { return sessionStorage._data[k] !== undefined ? sessionStorage._data[k] : null; },
    setItem: function (k, v) { sessionStorage._data[k] = String(v); },
    removeItem: function (k) { delete sessionStorage._data[k]; },
    clear: function () { sessionStorage._data = {}; },
    key: function (i) { return Object.keys(sessionStorage._data)[i] || null; },
    get length() { return Object.keys(sessionStorage._data).length; },
};

// ===== indexedDB =====
indexedDB = {
    _dbs: {},
    open: function (name, version) {
        var db = {
            name: name,
            version: version || 1,
            objectStoreNames: {
                length: 0,
                contains: function (n) { return false; },
                item: function (i) { return null; },
            },
            createObjectStore: function () { return null; },
            transaction: function () { return null; },
            close: function () { },
        };
        indexedDB._dbs[name] = db;

        var request = {
            result: db,
            error: null,
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
            readyState: 'done',
            source: null,
            transaction: null,
            addEventListener: function () { },
        };

        // 异步回调
        if (typeof setImmediate === 'function') {
            setImmediate(function () {
                if (request.onupgradeneeded) request.onupgradeneeded({ target: request, currentTarget: request });
                if (request.onsuccess) request.onsuccess({ target: request, currentTarget: request });
            });
        } else {
            setTimeout(function () {
                if (request.onupgradeneeded) request.onupgradeneeded({ target: request, currentTarget: request });
                if (request.onsuccess) request.onsuccess({ target: request, currentTarget: request });
            }, 0);
        }

        return request;
    },
    deleteDatabase: function (name) {
        delete indexedDB._dbs[name];
        var req = {
            result: undefined,
            onsuccess: null,
            onerror: null,
            onblocked: null,
        };
        setTimeout(function () {
            if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
    },
    cmp: function () { return 0; },
    databases: function () { return Promise.resolve([]); },
};

// ===== MutationObserver =====
MutationObserver = function (callback) {
    this._callback = callback;
    this._targets = [];
};
MutationObserver.prototype.observe = function (target, options) {
    this._targets.push({ target: target, options: options });
};
MutationObserver.prototype.disconnect = function () {
    this._targets = [];
};
MutationObserver.prototype.takeRecords = function () {
    return [];
};

// WebKit 前缀版本（某些旧检测会用到）
WebKitMutationObserver = MutationObserver;

// ===== Event =====
Event = function (type, options) {
    options = options || {};
    this.type = type;
    this.target = null;
    this.currentTarget = null;
    this.bubbles = !!options.bubbles;
    this.cancelable = !!options.cancelable;
    this.defaultPrevented = false;
    this.isTrusted = false;
    this.eventPhase = 0;
    this.timeStamp = Date.now();
};
Event.prototype.preventDefault = function () { this.defaultPrevented = true; };
Event.prototype.stopPropagation = function () { };
Event.prototype.stopImmediatePropagation = function () { };

// CustomEvent
CustomEvent = function (type, options) {
    Event.call(this, type, options);
    this.detail = (options && options.detail) || null;
};
CustomEvent.prototype = Object.create(Event.prototype);

// ===== Uint8ClampedArray (Node.js 已有，但确保存在) =====
if (typeof Uint8ClampedArray === 'undefined') {
    Uint8ClampedArray = Uint8Array;
}

// ===== global 变量暴露到 window（Node.js 环境可能需要） =====
if (typeof global !== 'undefined') {
    for (var _key in global) {
        if (typeof window[_key] === 'undefined') {
            window[_key] = global[_key];
        }
    }
}

// ===== AbortController / AbortSignal =====
if (typeof AbortController === 'undefined') {
    AbortController = function () {
        this.signal = {
            aborted: false,
            onabort: null,
            addEventListener: function () { },
            removeEventListener: function () { },
            dispatchEvent: function () { return true; },
        };
    };
    AbortController.prototype.abort = function () {
        this.signal.aborted = true;
        if (this.signal.onabort) this.signal.onabort();
    };
}

// ===== Hook eval：让 VMP 动态代码仍按浏览器全局语义执行 =====
(function () {
    var _nativeEval = eval;

    globalThis.eval = function (code) {
        // VMP 内部有自己的异常处理；这里不改写源码，只负责交给原生 eval。
        return _nativeEval(code);
    };

    // 保留环境代理使用的轻量访问记录接口。
    var _recentLogs = [];
    var _logLimit = 30;
    globalThis.__trackFuncAccess = function (msg) {
        _recentLogs.push(msg);
        if (_recentLogs.length > _logLimit) _recentLogs.shift();
    };
})();

// ===== 包装 setInterval/setTimeout，防止 VMP 定时器影响主程序 =====
(function () {
    var _nativeSetTimeout = setTimeout;
    var _nativeSetInterval = setInterval;
    var _nativeClearTimeout = clearTimeout;
    var _nativeClearInterval = clearInterval;
    var _managedTimeouts = new Set();
    var _managedIntervals = new Set();
    var _vmpScopeDepth = 0;

    function _safeVmpCallback(cb, onComplete) {
        return function () {
            _vmpScopeDepth++;
            try {
                return cb.apply(this, arguments);
            } catch (e) {
                // VMP 会运行一些与真实 DOM 有关的延迟检查。模拟环境缺少对应
                // 元素时可能报错，这不应让可复用库直接 process.exit() 终止上游进程。
                if (globalThis.__VMP_TIMER_DEBUG__) {
                    console.warn('[VMP timer]', e && e.message ? e.message : e);
                }
            } finally {
                if (onComplete) onComplete();
                _vmpScopeDepth--;
            }
        };
    }

    globalThis.setTimeout = function (cb, delay) {
        var args = Array.prototype.slice.call(arguments, 2);
        // 宿主业务的 timer 直接交给 Node：不跟踪、不吞异常、close 不清理。
        if (_vmpScopeDepth === 0) return _nativeSetTimeout(cb, delay, ...args);

        var timer;
        timer = _nativeSetTimeout(
            _safeVmpCallback(cb, function () { _managedTimeouts.delete(timer); }),
            delay,
            ...args
        );
        _managedTimeouts.add(timer);
        return timer;
    };

    globalThis.setInterval = function (cb, delay) {
        var args = Array.prototype.slice.call(arguments, 2);
        if (_vmpScopeDepth === 0) return _nativeSetInterval(cb, delay, ...args);

        var timer = _nativeSetInterval(_safeVmpCallback(cb), delay, ...args);
        _managedIntervals.add(timer);
        return timer;
    };

    globalThis.clearTimeout = function (timer) {
        _managedTimeouts.delete(timer);
        return _nativeClearTimeout(timer);
    };
    globalThis.clearInterval = function (timer) {
        _managedIntervals.delete(timer);
        return _nativeClearInterval(timer);
    };

    // 纯 Node client 完成后调用，避免 VMP 的轮询定时器阻止进程退出。
    globalThis.__clearVmpTimers = function () {
        for (var timer of _managedTimeouts) _nativeClearTimeout(timer);
        for (var interval of _managedIntervals) _nativeClearInterval(interval);
        _managedTimeouts.clear();
        _managedIntervals.clear();
    };

    // mobile-client.js 只在同步执行实时 $_ts/VMP 时开启 scope。VMP 创建的 timer
    // 回调会自动重新进入 scope，因而它们递归创建的 timer 仍归 client 管理。
    globalThis.__beginVmpTimerScope = function () { _vmpScopeDepth++; };
    globalThis.__endVmpTimerScope = function () {
        _vmpScopeDepth = Math.max(0, _vmpScopeDepth - 1);
    };
})();

// ===== Proxy 环境监控 =====
// ===== 同步到 global，让其他模块（ts.js, vmp.js）能访问 =====
global.location = location;
global.document = document;
// Node.js 21+ 内置了只有 getter 的 global.navigator，直接赋值会抛错。
Object.defineProperty(global, 'navigator', {
    value: navigator,
    writable: true,
    configurable: true,
    enumerable: true,
});
global.screen = screen;
global.history = history;
global.localStorage = localStorage;
global.sessionStorage = sessionStorage;
global.indexedDB = indexedDB;
global.MutationObserver = MutationObserver;
global.WebKitMutationObserver = WebKitMutationObserver;
global.Event = Event;
global.CustomEvent = CustomEvent;
global.Image = Image;
global.FormData = FormData;

/**
 * 将模拟浏览器的地址切换为当前商户页面。
 *
 * browser-env.js 只加载一次，但美团和顺丰的 id/channel/xparam 不同，
 * 因此执行实时 VMP 之前必须同步 location 与 document.URL。
 */
export function configurePageUrl(pageUrl) {
    var parsed = new URL(pageUrl);
    Object.assign(location, {
        href: parsed.href,
        origin: parsed.origin,
        protocol: parsed.protocol,
        host: parsed.host,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
    });
    document.URL = parsed.href;
}

function get_enviroment(targets) {
    for (let i = 0; i < targets.length; i++) {
        let rawObj = targets[i].ref;
        let objName = targets[i].name;

        let proxy = new Proxy(rawObj, {
            get: function (target, property, receiver) {
                var val = target[property];
                var t = typeof val;

                var msg = 'GET ' + objName + '.' + String(property) + ' → ' + t;
                console.log(msg);
                if (typeof __trackFuncAccess === 'function') {
                    __trackFuncAccess(msg);
                }

                if (t === 'function') {
                    return val.bind(rawObj);
                }

                return val;
            },
            set: function (target, property, value, receiver) {
                console.log(
                    '方法: set   对象: ' + objName +
                    '   属性: ' + String(property) +
                    '   属性值类型: ' + typeof value
                );
                return Reflect.set(target, property, value, receiver);
            }
        });

        // 直接赋值，不用 eval
        switch (objName) {
            case 'window': window = top = self = globalThis = proxy; break;
            case 'document': document = proxy; break;
            case 'location': location = proxy; break;
            case 'navigator': navigator = proxy; break;
            case 'history': history = proxy; break;
            case 'screen': screen = proxy; break;
            case 'div': div = proxy; break;
            case 'script': script = proxy; break;
        }
    }
}

// get_enviroment([
//     { name: 'window', ref: window },
//     { name: 'document', ref: document },
//     { name: 'location', ref: location },
//     { name: 'navigator', ref: navigator },
//     { name: 'history', ref: history },
//     { name: 'screen', ref: screen },
//     { name: 'div', ref: div },
//     { name: 'script', ref: script },
// ])
