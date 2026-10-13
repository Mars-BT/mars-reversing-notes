import { placeOrder } from "./index.js";

// ！！！！请以独立进程方式调用。这里由于补环境会污染全局环境，导致egg服务器可能出现不可预知错误。

try {
    const result = await placeOrder({
        merchant: 'meituan',
        planPrice: 28,
        customer: {
            name: '****',
            idCard: '****',
            district: '****',
            address: '******',
            contactPhone: '******',
        },
    });

    console.log('下单成功：', result);
} catch (error) {
    console.error('下单失败：', {
        message: error.message,
        step: error.step,
        kind: error.kind,
        respCode: error.respCode,
        respDesc: error.respDesc,
        httpStatus: error.httpStatus,
    });
}
// ==== 下单成功实例 ===================================================
/**
下单成功： {
  status: 'SUBMITTED',
  merchant: 'meituan',
  planPrice: 28,
  carrierPlanPrice: 38, // 实际绑定并提交的套餐价格
  orderNumber: 'E2026072117443333Y7H',
  selectedNumber: '17821144230',
  completedSteps: [
    'step1_getPhoneNumberList',
    'step2_lockPhoneNumber',
    'step3_bindPlan',
    'step4_uploadUserInfo',
    'step5_submitOrder'
  ]
}
 */

// ==== 下单失败示例 ===================================================
/** 
下单失败： {
  message: 'step4_uploadUserInfo: 温馨提示：对不起！您的同证件下号码19535873363\n存在欠费(含历史)，请缴清后继续办理该业务。',
  step: 'step4_uploadUserInfo',
  kind: 'business',
  respCode: '1',
  respDesc: '温馨提示：对不起！您的同证件下号码19535873363\n存在欠费(含历史)，请缴清后继续办理该业务。',
  httpStatus: null
}
 */