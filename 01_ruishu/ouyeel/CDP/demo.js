const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const CDP_PORT = 9222;
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

const SEARCH_URL = "https://www.ouyeel.com/steel/search?pageSize=50&channel=RJ";
const API_PATH = "/search-ng/commoditySearch/queryCommodityResult";

// 复用 Python 版 prepare_chrome_profile 复制好的 profile
const PROFILE_DIR = path.join(__dirname, ".chrome-profile");

const CHROME_PATHS = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  linux: "/usr/bin/google-chrome",
};

const CRITERIA = {
  pageSize: 50,
  industryComponent: null,
  channel: null,
  productType: null,
  sort: null,
  warehouseCode: null,
  key_search: null,
  is_central: null,
  searchField: null,
  companyCode: null,
  inquiryCategory: null,
  inquirySpec: null,
  provider: null,
  shopCode: null,
  packCodes: null,
  steelFactory: null,
  resourceIds: null,
  providerCode: null,
  jsonParam: { channel: "RJ", keywordAnalyseResult: null },
  excludeShowSoldOut: null,
  pageIndex: 1,
  maxPage: 50,
};

async function cdpReady() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`);
    const info = await res.json();
    return Boolean(info.webSocketDebuggerUrl);
  } catch {
    return false;
  }
}

function detectProfileName() {
  const entries = fs.readdirSync(PROFILE_DIR, { withFileTypes: true });
  const hit = entries.find(
    (e) => e.isDirectory() && (e.name === "Default" || e.name.startsWith("Profile"))
  );
  if (!hit) throw new Error(`在 ${PROFILE_DIR} 里找不到 profile 目录`);
  return hit.name;
}

function launchChrome() {
  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error(
      `找不到 ${PROFILE_DIR}，先跑一次 Python 版生成 profile：\n` +
        "  uv run python -m 01_ruishu.ouyeel.CDP.demo"
    );
  }
  spawn(
    CHROME_PATHS[process.platform],
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      `--profile-directory=${detectProfileName()}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
    { detached: true, stdio: "ignore" }
  ).unref();
}

async function ensureCdpChrome(timeoutMs = 15000) {
  if (await cdpReady()) return CDP_URL;

  console.log("启动 Chrome 并打开调试端口...");
  launchChrome();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cdpReady()) return CDP_URL;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`等了 ${timeoutMs / 1000} 秒，调试端口 ${CDP_PORT} 还是没起来`);
}

async function main() {
  const cdpUrl = await ensureCdpChrome();
  console.log("CDP 地址:", cdpUrl);

  const browser = await chromium.connectOverCDP(cdpUrl);
  console.log("已连接:", browser.version());


  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.newPage());


  await page.goto(SEARCH_URL);
  
  // 这里可以做函数等待，但是此处用的fetch获取数据，所以不需要等待。如果是拿axios可以写()=>{return typeof window.axios !== 'undefined'}
  await page.waitForFunction(() => document.title.includes("欧冶"), null, { timeout: 60000 });

  // 这里cookies和后缀直接由浏览器生成，不需要处理
  const result = await page.evaluate(
    async ({ apiPath, criteria }) => {
      // 此处为浏览器环境，直接用 fetch 发送请求即可
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "criteriaJson=" + encodeURIComponent(criteria),
      });
      return { status: res.status, body: await res.text() };
    },
    { apiPath: API_PATH, criteria: JSON.stringify(CRITERIA) } // 此处传nodejs对象到浏览器环境
  );

  console.log("状态码:", result.status);
  console.log("响应片段:", result.body.slice(0, 300));

  // 必须断开，否则这条 CDP WebSocket 会吊着事件循环，Node 进程不退出
  // 对 connectOverCDP 连来的浏览器，close() 只断连、不会关掉 Chrome
  await browser.close();
  // 真要关掉这个浏览器：browser.newBrowserCDPSession().send("Browser.close")
}

main().catch((err) => {
  console.error("失败了:", err.message);
  process.exit(1);
});
