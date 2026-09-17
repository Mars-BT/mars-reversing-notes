enc.js 加密文件
dec.js 解密文件
env.js 使用 jsdom 创建浏览器环境

运行：

```bash
npm start
```

排查执行阶段（日志会显示卡在 enc.js 还是 dec.js）：

```bash
RS_DEBUG=1 npm start
```

单个脚本默认最多执行 10 秒，可通过 `RS_VM_TIMEOUT_MS` 调整。
