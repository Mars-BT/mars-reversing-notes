require('./env.js')
require('./bdms.js')


window.bdms.init({
    aid: 24,
    pageId: 1,
    paths: ['/api/'] // 命中该前缀的 URL 才会被签名
})

// 浏览器里拿到的 msToken（留空则 SDK 会自己去 mssdk 换，目前服务端会返回 -6）
const MS_TOKEN = 'Wo_tyHdOGj3zBKJGZlY3X8Vs12OMsZZBD_deBHL1_oYPBIKxZO1b_db4u1TMTtu7cL5lO0RTxLPaHNkk2tgnDjBvZF-LNhViAR3B362BStOsJJll1NY8mze3abJKBp4='
if (MS_TOKEN) localStorage.setItem('xmst', MS_TOKEN)

// 同步拿到带 a_bogus 的完整 URL。
// SDK 的 fetch hook 是同步执行的：调用 window.fetch 后，签名结果立刻就在 __capturedRequests 里，
// 不需要 await —— execjs 是同步调用，只能拿同步返回值。
window.getSignedUrlSync = function(url) {
    window.__capturedRequests.length = 0
    try { window.fetch(url, {}) } catch (e) {}
    var list = window.__capturedRequests
    if (!list.length) return url
    return list[list.length - 1].url
}

// 异步包装（在 node 里用着顺手）
window.getSignedUrl = async function(url) {
    return window.getSignedUrlSync(url)
}

// 只取 a_bogus
window.getABogusSync = function(url) {
    var signed = window.getSignedUrlSync(url)
    var q = signed.indexOf('?') > -1 ? signed.split('?')[1] : ''
    return new URLSearchParams(q).get('a_bogus')
}
window.getABogus = async function(url) {
    return window.getABogusSync(url)
}

// 取 msToken（SDK 缓存在 localStorage.xmst）
window.getMsToken = function() {
    return localStorage.getItem('xmst')
}

// 给外部（Python/execjs）调用：把 url 签名，返回 { msToken, a_bogus, url }
// msToken 可选：传了就用传进来的（Python 动态换到的新 token），否则用本地已有的
function sign_url(url, msToken) {
    if (msToken) localStorage.setItem('xmst', msToken)
    var token = window.getMsToken()

    var u = new URL(url)
    if (token && !u.searchParams.get('msToken')) u.searchParams.set('msToken', token)

    var signed = window.getSignedUrlSync(u.toString())
    return {
        msToken: token,
        a_bogus: new URL(signed).searchParams.get('a_bogus'),
        url: signed
    }
}

// 直接用默认的头条 feed 地址签名
function get_params(msToken) {
    return sign_url('https://www.toutiao.com/api/pc/list/feed?channel_id=0&max_behot_time=' +
        Math.floor(Date.now() / 1000 - 10000) +
        '&offset=0&category=pc_profile_recommend&aid=24&app_name=toutiao_web', msToken)
}

if (require.main === module) {
    var r = get_params()
    console.log('\n===== 请求参数 =====')
    console.log('msToken :', r.msToken)
    console.log('a_bogus :', r.a_bogus)
    console.log('请求 URL:', r.url)
    process.exit(0)
}
