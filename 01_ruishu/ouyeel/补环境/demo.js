const fs = require('fs')

function require_if_exists(filename) {
    const path = __dirname + '/' + filename
    if (fs.existsSync(path)) {
        require(path)
    }
}

require(__dirname + '/env.js')
require_if_exists('cookies.js')
require(__dirname + '/enc.js')
require(__dirname + '/dec.js')
try {
    require_if_exists('boot.js')
} catch (error) {
    console.log('bootstrap error:', error.stack || error.message)
}

window.dispatchEvent({type: 'load', target: window})

function get_cookie() {
    return document.cookie
}

function get_suffix(_url) {
    const urls = new URL(_url)
    const path = urls.pathname + urls.search
    const request = new window.XMLHttpRequest()

    // dec.js has already wrapped XMLHttpRequest.prototype.open at this point.
    // The environment's original open() receives and records the rewritten URL.
    request.open('POST', path, true)
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    request.send('')

    // Some RS6 builds protect this endpoint through fetch instead of XHR.
    if (window.req_param === path) {
        window.fetch(path, {method: 'POST'})
    }
    return window.req_param
}

if (require.main === module) {
    console.log(get_cookie())
    console.log(get_suffix('https://www.ouyeel.com/search-ng/commoditySearch/queryCommodityResult'))
}
