require(__dirname + '/env.js')
require(__dirname + '/js_security.js')

window.PSign = new window.ParamsSign({
    appId: 'f06cc',
    preRequest: false,
    onSign: (res) => {
        if (res.code !== 0) {
            console.error('ParamsSign onSign', res)
        }
    },
    onRequestTokenRemotely: (res) => {
        if (res.code != 200) {
            console.error('ParamsSign onRequestTokenRemotely', res)
        }
    },
})
let l = {
    "appid": "search-pc-java",
    "functionId": "pc_club_productCommentSummaries",
    "client": "pc",
    "clientVersion": "1.0.0",
    "t": 1792468514857,
    "body": "51cedfe61943765d191e31808212af0a792fe89df5e4ef486d8fe3bd3e92833f"
}
window.PSign.sign(l)
    .then((r) => console.log('========== SIGN RESULT ==========\n', r))
    .catch((e) => console.error('SIGN ERROR:', e))

