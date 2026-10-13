import { resolveCountyCode } from './config.js';

const API = Object.freeze({
    queryPhoneNumbers: '/emall/server/cardQuery/card.query.yx',
    lockPhoneNumber: '/emall/server/cardOrder/card.lock',
    bindPlan: '/emall/server/cardOrder/card.submit.contract',
    uploadUserInfo: '/emall/server/cardOrder/card.order.information.update',
    submitOrder: '/emall/server/cardOrder/card.order.submit',
});

const CHAMA_INFO = 'eyJvcmRlcldheSI6IlpKWFoiLCJjYXJkVHlwZSI6IlBUIiwiY2FyZFR5cGVDaGFtYSI6IlBUSE0ifQ==';

/** 仅供 place-order.js 调用，避免内部步骤被误当成公开下单入口。 */
export const ORDER_SUBMISSION_CAPABILITY = Symbol('ORDER_SUBMISSION_CAPABILITY');

/** 统一业务异常，让上游不需要解析一长串 JSON 错误文本。 */
export class OrderStepError extends Error {
    constructor(
        step,
        message,
        { response = null, cause = null, kind = 'business', httpStatus = null } = {},
    ) {
        super(`${step}: ${message}`, cause ? { cause } : undefined);
        this.name = 'OrderStepError';
        this.step = step;
        this.respCode = response?.respCode ?? null;
        this.respDesc = response?.respDesc ?? null;
        this.response = response;
        this.kind = kind;
        this.httpStatus = httpStatus;
    }
}

function isSuccess(response) {
    if (response?.respCode !== undefined && response?.respCode !== null) {
        const code = String(response.respCode);
        return code === '0000' || code === '0';
    }
    return response?.respDesc === 'success';
}

function assertSessionId(client, sessionId, step) {
    if (client.sessionId && client.sessionId !== sessionId) {
        throw new OrderStepError(step, 'sessionId 与已初始化的 client 不一致', {
            kind: 'protocol',
        });
    }
}

function isEmptyNginx400(result) {
    return result?.status === 400
        && result.headers?.server === 'nginx'
        && result.headers?.['content-type']?.includes('text/html')
        && String(result.rawBody || '').trim() === '';
}

async function callApi(client, {
    step,
    label,
    path,
    data,
    emptyNginx400Retries = 0,
}) {
    let result;
    for (let attempt = 0; attempt <= emptyNginx400Retries; attempt += 1) {
        try {
            result = await client.request(path, data, { label, quiet: true });
        } catch (cause) {
            throw new OrderStepError(step, cause.message, { cause, kind: 'transport' });
        }

        // 这种 400 由 nginx/VMP 防护层直接产生，业务接口尚未收到订单。
        // 重新生成外层密文是安全的；只要出现任何业务响应就立即停止重试。
        if (!isEmptyNginx400(result) || attempt === emptyNginx400Retries) break;
    }

    if (result.status < 200 || result.status >= 300) {
        throw new OrderStepError(step, `HTTP ${result.status}`, {
            kind: 'http',
            httpStatus: result.status,
        });
    }
    if (!isSuccess(result.data)) {
        throw new OrderStepError(
            step,
            result.data?.respDesc || `业务错误 ${result.data?.respCode || '未知'}`,
            { response: result.data },
        );
    }
    return result.data;
}

// 步骤1：获取可用手机号。sessionId 必须与 client.initializeSession() 一致。
export async function step1_getPhoneNumberList(client, sessionId, merchant) {
    assertSessionId(client, sessionId, 'step1_getPhoneNumberList');
    const response = await callApi(client, {
        step: 'step1_getPhoneNumberList',
        label: 'card.query.yx',
        path: API.queryPhoneNumbers,
        data: {
            all: '1',
            birthday: '',
            commemoration: '',
            cardType: 3,
            cardTypeChama: '',
            car: '',
            lucky: '',
            jx: '',
            hd: '',
            ab: '',
            cn: '',
            yc: '',
            ad: '',
            cd: '',
            tcId: merchant.tcId,
            searchInitType: 0,
            sessionId,
            template: '1',
        },
    });

    const phoneList = response.data?.list;
    if (!Array.isArray(phoneList) || phoneList.length === 0) {
        throw new OrderStepError('step1_getPhoneNumberList', '号码列表为空');
    }
    return phoneList;
}

// 步骤2：锁定一个候选号码，服务端会创建 orderId。
export async function step2_lockPhoneNumber(
    client,
    sessionId,
    phoneNumber,
    merchant,
) {
    assertSessionId(client, sessionId, 'step2_lockPhoneNumber');
    const response = await callApi(client, {
        step: 'step2_lockPhoneNumber',
        label: 'card.lock',
        path: API.lockPhoneNumber,
        data: {
            tcId: merchant.tcId,
            strPhoneNum: phoneNumber,
            chamaInfo: CHAMA_INFO,
            urlId: '',
            channel: merchant.channel,
            xparam: merchant.xparam,
            wbid: '',
            sessionId,
            cardId: null,
            name: null,
            template: '1',
            enterprise: '',
            ordererProvince: '',
            isYwChama: '',
            eduType: '',
            eduUid: '',
            veteranId: '',
        },
    });

    if (!response.data?.orderId) {
        throw new OrderStepError('step2_lockPhoneNumber', '成功响应中缺少 orderId', {
            response,
            kind: 'protocol',
        });
    }
    return { orderId: response.data.orderId, response };
}

// 步骤3：将已验证的套餐绑定到 orderId。
export async function step3_bindPlan(client, orderId, plan) {
    const data = {
        submitType: '1',
        orderId,
        contractId: plan.contractId,
        groupOfferId: '',
        recharge: 0,
        chkProductIds: '',
        noChkProductIds: '',
    };
    if (plan.detailInfo) data.detailInfo = plan.detailInfo;

    const response = await callApi(client, {
        step: 'step3_bindPlan',
        label: 'card.submit.contract',
        path: API.bindPlan,
        data,
    });
    return { orderId, contractId: plan.contractId, response };
}

// 步骤4：写入实名和配送资料。这一步有服务端副作用，但还没有最终提交订单。
export async function step4_uploadUserInfo(client, orderId, customer, merchant) {
    const countryCode = resolveCountyCode(customer.district);
    const response = await callApi(client, {
        step: 'step4_uploadUserInfo',
        label: 'card.order.information.update',
        path: API.uploadUserInfo,
        data: {
            orderId,
            custactUserName: customer.name,
            cardNum: customer.idCard,
            takeCardModel: '1',
            fieldValue: `上海市/上海市/${customer.district}`,
            fieldCode: countryCode,
            province: '上海市',
            city: '上海市',
            contactarea: customer.district,
            provinceCode: '310000',
            cityCode: '310100',
            countryCode,
            addressModel: '1',
            otherAddr: customer.address,
            deliveryTime: '0',
            contactNumber: customer.contactPhone,
            activationModel: '1',
            annualRadio: -1,
            annualCode: 0,
            refereeId: '',
            invitationCode: '',
            campusCardFlag: 0,
            takeXykdModel: '0',
            secondCardFlag: 0,
            mainBillName: '',
            mainBillIdCard: '',
            mainBill: '',
            mainBillYzm: '',
            mainBillModel: '',
            campname: '',
            addressId: '',
            camparea: '',
            schoolExchangeCode: '',
            isYearFee: 0,
            openUpgradeFlag: '0',
            chkProductIds: merchant.chkProductIds,
            noChkProductIds: '',
            issuedBy: '',
            annualPrice: 0,
            recharge: 0,
            marketingId: '',
            isLLhx: 0,
            qqwTels: '',
            zzywKdAddr: '',
        },
    });
    return { orderId, response };
}

/**
 * 步骤5：最终提交真实订单。
 *
 * 本函数只由公开 placeOrder 流程调用；外部模块不应直接依赖这些 step。
 */
export async function step5_submitOrder(
    client,
    { orderId },
    submissionCapability,
) {
    if (submissionCapability !== ORDER_SUBMISSION_CAPABILITY) {
        throw new TypeError('step5_submitOrder 需要显式的 ORDER_SUBMISSION_CAPABILITY');
    }
    // 当前线上 bundle 的基础号卡提交分支不上传确认页 DOM 快照；订单、套餐、
    // 实名和配送资料已经分别由 step2 ~ step4 持久化。
    const data = {
        orderId,
        plcProtocol: '0',
        autoProtocol: '0',
        ads: '0',
        captureHtml: '',
        content: '',
    };

    const response = await callApi(client, {
        step: 'step5_submitOrder',
        label: 'card.order.submit',
        path: API.submitOrder,
        data,
        emptyNginx400Retries: 3,
    });
    return response.data;
}
