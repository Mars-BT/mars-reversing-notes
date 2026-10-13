fn = function(){}
window = self = top = global
window.ActiveXObject = undefined
window.addEventListener = function(){};
window.attachEvent = undefined
div = {
    getElementsByTagName:function(tag_name){
        // console.log("div getElementsByTagName ->",tag_name)
        if(tag_name === "i"){
            return []
        }
    }
}
head = {
    removeChild:function(child){
        // console.log("head removeChild ->",child)
    }
}
script = {
    getAttribute:function(attr){
        // console.log("script getAttribute ->", attr)
        if (attr === "r"){
            return "m"
        }
    },
    parentElement:head
}
document = {
    createElement:function(tag_name){
        // console.log("document createElement ->",tag_name)
        if(tag_name === "div"){
            return  div
        }
        if(tag_name === 'a'){
            return []
        }
    },
    getElementsByTagName:function(tag_name){
        // console.log("document getElementsByTagName ->",tag_name)
        if(tag_name === 'script'){
            return [script,script,script,script,script,script]
        }
        if(tag_name === 'base'){
            return []
        }
    },
    getElementById:function(ele_id){
        // console.log("document getElementById ->",ele_id)
        if(ele_id === 'a'){
            return []
        }
    }
}
location = {
    "ancestorOrigins": {},
    "href": "https://yxai.189.cn/bloc-uni/pages/opportunity/netCardNew?actNo=IACT2026010405553&temp=netCardNew&pcode=sc&syscode=S054680&shopid=lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934&salesid=00000000000f0977ed2b11f0a2fbfa163e6607b1&serialNumber=HR202602120957470001&signcode=f08fabb01954d890c8fd9cbc0425475e",
    "origin": "https://yxai.189.cn",
    "protocol": "https:",
    "host": "yxai.189.cn",
    "hostname": "yxai.189.cn",
    "port": "",
    "pathname": "/bloc-uni/pages/opportunity/netCardNew",
    "search": "?actNo=IACT2026010405553&temp=netCardNew&pcode=sc&syscode=S054680&shopid=lmk.cps.ybsclxcardzbfwmghzpt.152904100_Y51000022934&salesid=00000000000f0977ed2b11f0a2fbfa163e6607b1&serialNumber=HR202602120957470001&signcode=f08fabb01954d890c8fd9cbc0425475e",
    "hash": ""
}
setInterval = function(){}
setImmediate = function(){}

// window.XMLHttpRequest = fn
// window.XMLHttpRequest.prototype = {
//     open: function (method, url) {
//         // 关键：必须返回URL，瑞数重写后的open会读取这个返回值
//         return url;
//     },
//     send: function () {
//         // send方法无需复杂实现，仅占位避免报错即可
//     }
// };