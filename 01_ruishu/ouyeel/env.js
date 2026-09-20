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
window.top = window
window.addEventListener = function (...args) {
    console.log(args)
}

setTimeout = function (){}
setInterval = function (){}

var req_param

const XMLHttpRequest = function () { }
XMLHttpRequest.prototype.open = function (method, url, args) {
    console.log("==========================")
    console.log(method, url)
    req_param = url
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
div = {
    getElementsByTagName: function (...args) {
        console.log(args)
        return []
    }
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

// get_enviroment(['meta[1]'])

document = {
    createElement: function (...args) {
        console.log(args)
        if (args[0] == 'div') {
            return div
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
    }
}

get_enviroment(proxy_array)

function get_curr(_url){
    const urls = new URL(_url)
    const pathname = urls.pathname
    const search = urls.search
    const path = pathname + search
    const g = new XMLHttpRequest()
    g.open('POST', path,true)
    console.log("原来============"+_url)
    console.log("后缀============"+req_param)
}

get_curr('https://www.ouyeel.com/search-ng/commoditySearch/queryCommodityResult')