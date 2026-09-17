// 这三个文件都没有 default 导出，只靠执行时挂载全局，所以用副作用导入。
// env.js 必须最先执行：enc/dec 依赖它铺好的 window、document。
import './env.js'

import { readFileSync } from 'node:fs'
import { runInThisContext } from 'node:vm'

// enc.js / dec.js 在网页里是普通 <script>：靠隐式全局 $_ts 通信（$_ts = ...），
// 而 ESM 是严格模式，import 会直接报 "$_ts is not defined"。
// 所以按经典脚本在当前全局里执行，保持原有的非严格语义。
for (const file of ['./enc.js', './dec.js']) {
    runInThisContext(readFileSync(new URL(file, import.meta.url), 'utf8'))
}

console.log(document.cookie)
