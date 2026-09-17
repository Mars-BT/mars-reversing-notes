import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'

import { document, dom, window } from './env.js'

const context = dom.getInternalVMContext()
const scriptTimeoutMs = Number.parseInt(process.env.RS_VM_TIMEOUT_MS ?? '10000', 10)
const debug = process.env.RS_DEBUG === '1'
let executionError

// enc.js / dec.js 来自网页里的普通 <script>，不是 ESM。
// 放进 jsdom 的上下文执行，才能保持 window、隐式全局变量和 document.cookie
// 都属于同一个浏览器全局对象。
for (const relativePath of ['./enc.js', './dec.js']) {
  const fileUrl = new URL(relativePath, import.meta.url)
  const source = readFileSync(fileUrl, 'utf8')

  try {
    if (debug) console.error(`[瑞数] 开始执行 ${relativePath}`)
    new Script(source, {
      filename: fileURLToPath(fileUrl),
    }).runInContext(context, {
      displayErrors: true,
      timeout: scriptTimeoutMs,
    })
    if (debug) console.error(`[瑞数] 完成执行 ${relativePath}`)
  } catch (error) {
    executionError = error
    console.error(`执行 ${relativePath} 失败：`)
    console.error(error?.stack ?? error)
    break
  }
}

if (executionError) {
  process.exitCode = 1
} else {
  console.log(document.cookie)
}

// 清理瑞数可能创建的定时器，避免 cookie 已输出但 Node 进程仍不退出。
window.close()
