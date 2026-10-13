require('./env.js') // 补环境
require('./ts.js') // 加密
require('./iBlPiBtflxq4.81fbd34.js') // 解密

// 这里有点奇怪的是 60开头的cookie没有被设置 不知道是不是必须携带的cookie
console.log(document.cookie)
const URL = require('url')
function get_url(method, url){
    const parsedUrl = URL.parse(url)
    Object.keys(parsedUrl).forEach(key => {
        if(parsedUrl[key] && key !== 'query') location[key] = parsedUrl[key]
    })

    return new XMLHttpRequest().open(method, url)
}
// xhr = new XMLHttpRequest()
// console.log(get_url('GET', 'https://yxai.189.cn/bloc/actApi/activity/roc/qryProtocolLib'))