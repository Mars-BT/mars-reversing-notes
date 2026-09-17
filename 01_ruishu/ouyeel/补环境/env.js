import { JSDOM, VirtualConsole } from 'jsdom'

export const PAGE_URL =
  'https://www.ouyeel.com/steel/search?pageIndex=0&pageSize=50&channel=RJ&productType='

const virtualConsole = new VirtualConsole()
virtualConsole.forwardTo(console)

export const dom = new JSDOM(
  `<!doctype html>
  <html>
    <head>
      <meta r="m">
      <script src="https://www.ouyeel.com/enc.js"></script>
      <script src="https://www.ouyeel.com/dec.js"></script>
    </head>
    <body></body>
  </html>`,
  {
    url: PAGE_URL,
    referrer: 'https://www.ouyeel.com/',
    contentType: 'text/html',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole,
  },
)

export const { window } = dom
export const { document } = window

// jsdom 尚未实现 Chromium Location 上的 ancestorOrigins。
// 当前页面没有父级来源，所以用一个行为等价的空 DOMStringList 补齐。
const ancestorOrigins = {}
Object.defineProperties(ancestorOrigins, {
  length: { value: 0 },
  item: { value: () => null },
  contains: { value: () => false },
  [Symbol.iterator]: { value: function* () {} },
  [Symbol.toStringTag]: { value: 'DOMStringList' },
})
Object.defineProperty(window.location, 'ancestorOrigins', {
  configurable: true,
  enumerable: true,
  value: ancestorOrigins,
})

// jsdom 已经提供 DOM、location、storage、events、XHR 和 cookie jar。
// 这里只补页面脚本常用、但 jsdom 默认值不够像桌面 Chrome 的只读字段。
Object.defineProperties(window.navigator, {
  userAgent: {
    configurable: true,
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/152.0.0.0 Safari/537.36',
  },
  platform: { configurable: true, value: 'MacIntel' },
  language: { configurable: true, value: 'zh-CN' },
  languages: { configurable: true, value: ['zh-CN', 'zh'] },
})
