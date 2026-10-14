require(__dirname + '/env.js')
require(__dirname + '/enc.js')
require(__dirname + '/dec.js')

function get_cookie(){
    return document.cookie
}

console.log(get_cookie())