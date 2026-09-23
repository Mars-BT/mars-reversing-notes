# 目录说明
./document-all  c++模拟补 document.all
document_all.node  c++模拟补 document.all

## document_all.node 使用说明
```javascript
const native = require("./document_all.node");
const all = native.createDocumentAll();
document = {};

Object.defineProperty(document, "all", {
  configurable: true,
  enumerable: false,
  get() {
    return all;
  },
});
```


## AI逆向源代码
bdms.js  混淆文件
demo.js  deepseek逆向代码 可直接运行

## 人工整理后
env.js  补环境
bdms.js  混淆文件
get_params.js  获取参数 可直接运行
demo.py  python版本