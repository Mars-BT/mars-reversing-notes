# 上海移动纯 Node 下单模块

本目录是完整、自包含的下单模块，不连接 CDP、不读取 JSON、不操作 Excel。
业务系统只需要导入 `index.js` 暴露的 `placeOrder(order)`。

> `placeOrder()` 会执行 step1 ~ step5，调用后会提交真实订单。开发和测试只能
> 注入 mock client，禁止拿真实用户资料做连通性测试。

## 目录分层

```text
shanghai-mobile-order/
├── index.js                 # 唯一公开入口，只导出 placeOrder
├── src/
│   ├── place-order.js       # 参数校验、串行队列、完整流程编排
│   ├── config.js            # 渠道、补贴价格、套餐和区县配置
│   ├── order-steps.js       # step1 ~ step5 的业务请求 payload
│   ├── mobile-client.js     # Cookie、AES/RSA、VMP、HTTP 和响应解密
│   └── browser-env.js       # VMP 所需的纯 Node 浏览器兼容环境
├── test/                    # 全部使用 mock，不提交真实订单
└── docs/                    # 逆向过程和底层实现说明，不参与运行
```

依赖方向固定为：

```text
index → place-order → order-steps → mobile-client → browser-env
```

`place-order.js` 只编排业务，`order-steps.js` 不关心加密实现，
`mobile-client.js` 不包含下单业务规则。

## 安装

该目录带有自己的 `package.json`，可以单独复制和安装：

```bash
cd shanghai-mobile-order
npm install
```

## 调用方式

```js
import { placeOrder } from './shanghai-mobile-order/index.js';

const result = await placeOrder({
    merchant: 'meituan',
    planPrice: 38,
    customer: {
        name: '真实姓名',
        idCard: '18位身份证号',
        district: '徐汇区',
        address: '详细收货地址',
        contactPhone: '11位联系电话',
    },
});
```

成功结果：

```js
{
    status: 'SUBMITTED',
    merchant: 'meituan',
    planPrice: 38,          // 用户补贴后价格
    carrierPlanPrice: 48,   // 实际绑定的上海移动套餐
    orderNumber: '...',
    selectedNumber: '...',
    completedSteps: [
        'step1_getPhoneNumberList',
        'step2_lockPhoneNumber',
        'step3_bindPlan',
        'step4_uploadUserInfo',
        'step5_submitOrder',
    ],
}
```

如果上层是 HTTP 服务，路由层只负责把请求体交给该函数，例如：

```js
app.post('/orders', async (req, res, next) => {
    try {
        res.json(await placeOrder(req.body));
    } catch (error) {
        next(error);
    }
});
```

## 补贴价格

接口的 `planPrice` 始终是用户看到的补贴后价格，真实运营商套餐固定高 10 元：

| 渠道 | 接口 `planPrice` | 实际套餐 | `contractId` |
|---|---:|---:|---:|
| 美团 | 28 | 38 | 2025026207 |
| 美团 | 38 | 48 | 2025026206 |
| 美团 | 48 | 58 | 2025026286 |
| 美团 | 58 | 68 | 2025026306 |
| 顺丰 | 29 | 39 | 2026050248 |
| 顺丰 | 49 | 59 | 2026050247 |

配置同时保存 `salePrice` 和 `carrierPrice`，并在解析时断言两者必须相差 10，
避免把用户价格直接传给上海移动。

## 并发和错误

VMP 会使用 Node 全局浏览器兼容对象，所以同一进程不能并行创建多个会话。
公开的 `placeOrder()` 内置串行队列；HTTP 层可以并发调用，模块会依次执行。

业务失败会抛出 `OrderStepError`，常用字段包括 `step`、`kind`、`respCode`、
`respDesc` 和 `httpStatus`。日志中不要输出请求对象、身份证号或详细地址。

step4 完成后模块会自动访问订单确认页，并在同一业务 Cookie 会话中重新加载确认页的
实时 VMP，再执行 step5。调用方不需要启动 Chrome、CDP 或手工维护 Cookie。

## 验证

```bash
cd shanghai-mobile-order
npm test
npm run query:dry-run
```

测试覆盖完整 step1 ~ step5，但使用 mock client，不会发送真实订单。加密干跑只生成
查询密文，不发送业务 HTTP 请求。
