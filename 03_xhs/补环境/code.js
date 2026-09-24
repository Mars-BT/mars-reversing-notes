require("./env.js")
require("./vmp.js")

e = "/api/sec/v1/scripting"
a = {
    "callFrom": "web",
    "callback": "",
    "type": "ds",
    "appId": "xhs-pc-web"
}
function seccore_signv2(e, a) {
    var r = window.toString
        , c = e;
    "[object Object]" === r.call(a) || "[object Array]" === r.call(a) || (void 0 === a ? "undefined" : (0,
        B._)(a)) === "object" && null !== a ? c += JSON.stringify(a) : "string" == typeof a && (c += a);
    var u = '3d08093c65de13679b96a87493e1ed41'
        , p = '30075585641997ca77efa138e473890d'
        , v = window.mnsv2(c, u, p)
        , S = {
            x0: w.i8,
            x1: "xhs-pc-web",
            x2: window[w.mj] || "PC",
            x3: v,
            x4: a ? void 0 === a ? "undefined" : (0,
                B._)(a) : "",
            x5: u
        }
        , R = buildEncSskSign(u);
    return R && (S.x6 = R.encSskSign,
        S.x7 = R.encSsk),
        "XYS_" + (0,
            ed.xE)((0,
                ed.lz)(JSON.stringify(S)))
}

console.log(seccore_signv2(e, a))