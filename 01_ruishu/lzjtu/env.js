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

window = global
window.top = window
window.addEventListener = function(...args){
    console.log(args)
}

setTimeout = function(){}
setInterval = function(){}

div = {
    getElementsByTagName:function(...args){
        return []
    }
}

meta = {
    getAttribute:function(...args){
        return 'm'
    },
    parentNode:{
        removeChild:function(...args){
            
        }
    }
}

get_enviroment(['div'])

document = {
    createElement:function(...args){
        if (args[0] == 'div'){
            return div
        }
    },
    getElementById:function(...args){
        console.log(args)
        return meta
    },
    getElementsByTagName:function(...args){
        return []
    },
    addEventListener:function(...args){
        console.log(args)
    }
}

location = {
    "ancestorOrigins": {},
    "href": "https://zbzx.lzjtu.edu.cn/zbxx/gcl.htm",
    "origin": "https://zbzx.lzjtu.edu.cn",
    "protocol": "https:",
    "host": "zbzx.lzjtu.edu.cn",
    "hostname": "zbzx.lzjtu.edu.cn",
    "port": "",
    "pathname": "/zbxx/gcl.htm",
    "search": "",
    "hash": ""
}

get_enviroment(proxy_array)