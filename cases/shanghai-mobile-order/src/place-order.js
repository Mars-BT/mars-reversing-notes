import {
    createShanghaiMobileClient,
    generateSessionId,
} from './mobile-client.js';
import {
    resolveCountyCode,
    resolveMerchant,
    resolvePlan,
} from './config.js';
import {
    ORDER_SUBMISSION_CAPABILITY,
    OrderStepError,
    step1_getPhoneNumberList,
    step2_lockPhoneNumber,
    step3_bindPlan,
    step4_uploadUserInfo,
    step5_submitOrder,
} from './order-steps.js';

function requireText(value, fieldName) {
    const text = String(value ?? '').trim();
    if (!text) throw new TypeError(`缺少必填字段: ${fieldName}`);
    return text;
}

/** 在任何网络副作用发生前完成校验，并复制一份输入防止排队时被调用方修改。 */
function normalizeInput(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('placeOrder 需要一个订单对象');
    }

    const merchant = resolveMerchant(input.merchant);
    const plan = resolvePlan(merchant, input.planPrice);
    const source = input.customer || {};
    const customer = Object.freeze({
        name: requireText(source.name, 'customer.name'),
        idCard: requireText(source.idCard, 'customer.idCard'),
        district: requireText(source.district, 'customer.district'),
        address: requireText(source.address, 'customer.address'),
        contactPhone: requireText(source.contactPhone, 'customer.contactPhone'),
    });

    if (!/^\d{17}[\dXx]$/.test(customer.idCard)) {
        throw new TypeError('customer.idCard 必须是 18 位大陆居民身份证号');
    }
    if (!/^1\d{10}$/.test(customer.contactPhone)) {
        throw new TypeError('customer.contactPhone 必须是 11 位大陆手机号');
    }
    resolveCountyCode(customer.district);

    return Object.freeze({ merchant, plan, customer });
}

function maskPhone(value) {
    return String(value).replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
}

/** 保留页面原流程的 20%/40%/60% 候选策略，并为短列表去重。 */
function chooseCandidatePhones(phoneList, limit = 3) {
    const candidates = [];
    const add = (item) => {
        const phone = String(item?.tel || '').trim();
        if (phone && !candidates.includes(phone)) candidates.push(phone);
    };

    for (const ratio of [0.2, 0.4, 0.6]) {
        const index = Math.min(
            phoneList.length - 1,
            Math.floor(phoneList.length * ratio),
        );
        add(phoneList[index]);
    }
    for (const item of phoneList) {
        if (candidates.length >= limit) break;
        add(item);
    }
    return candidates.slice(0, limit);
}

function isRetryableLockError(error) {
    if (!(error instanceof OrderStepError) || error.kind !== 'business') return false;
    const message = `${error.respDesc || ''} ${error.message}`;
    return /(号码|选号|锁号|锁定|占用|已售|库存)/.test(message);
}

function emit(onProgress, step, message, details = {}) {
    onProgress?.({ step, message, ...details });
}

async function executeOrder(order, dependencies) {
    const {
        clientFactory,
        sessionIdFactory,
        onProgress,
        debug,
    } = dependencies;
    const { merchant, plan, customer } = order;
    const sessionId = sessionIdFactory();
    const completedSteps = [];
    let client;

    try {
        emit(onProgress, 0, `初始化${merchant.name}纯 Node 加密会话`);
        client = await clientFactory(merchant, {
            debug,
            logEncrypted: debug,
        });
        await client.initializeSession(sessionId);

        emit(onProgress, 1, '查询可用号码');
        const phoneList = await step1_getPhoneNumberList(client, sessionId, merchant);
        completedSteps.push('step1_getPhoneNumberList');

        const candidatePhones = chooseCandidatePhones(phoneList);
        if (candidatePhones.length === 0) {
            throw new OrderStepError('step1_getPhoneNumberList', '列表中没有可用的 tel 字段');
        }

        emit(onProgress, 2, `尝试锁定 ${candidatePhones.length} 个候选号码`);
        const lockAttempts = [];
        let selectedNumber;
        let orderId;
        for (const candidate of candidatePhones) {
            try {
                const locked = await step2_lockPhoneNumber(
                    client,
                    sessionId,
                    candidate,
                    merchant,
                );
                selectedNumber = candidate;
                orderId = locked.orderId;
                break;
            } catch (error) {
                lockAttempts.push({
                    phone: maskPhone(candidate),
                    respCode: error.respCode ?? null,
                    message: error.respDesc || error.message,
                });
                if (!isRetryableLockError(error)) throw error;
            }
        }
        if (!orderId) {
            const error = new OrderStepError(
                'step2_lockPhoneNumber',
                `${candidatePhones.length} 个候选号码均锁定失败`,
            );
            error.attempts = lockAttempts;
            throw error;
        }
        completedSteps.push('step2_lockPhoneNumber');

        emit(onProgress, 3, `绑定运营商 ${plan.carrierPrice} 元套餐`, {
            selectedNumber: maskPhone(selectedNumber),
            salePrice: plan.salePrice,
        });
        await step3_bindPlan(client, orderId, plan);
        completedSteps.push('step3_bindPlan');

        emit(onProgress, 4, '上传实名与配送信息');
        await step4_uploadUserInfo(client, orderId, customer, merchant);
        completedSteps.push('step4_uploadUserInfo');

        emit(onProgress, 4, '打开订单确认页');
        await client.prepareOrderConfirmation(orderId);

        emit(onProgress, 5, '提交订单');
        const orderData = await step5_submitOrder(
            client,
            { orderId },
            ORDER_SUBMISSION_CAPABILITY,
        );
        completedSteps.push('step5_submitOrder');

        const orderNumber = orderData?.orderCode;
        if (typeof orderNumber !== 'string' || orderNumber.length === 0) {
            throw new OrderStepError('step5_submitOrder', '成功响应中缺少 orderCode', {
                response: orderData,
                kind: 'protocol',
            });
        }

        return {
            status: 'SUBMITTED',
            merchant: merchant.key,
            planPrice: plan.salePrice,
            carrierPlanPrice: plan.carrierPrice,
            orderNumber,
            selectedNumber,
            completedSteps,
        };
    } finally {
        await client?.close?.();
    }
}

/**
 * 创建一个串行下单函数。VMP 会修改 Node 全局浏览器对象，因此同一进程的
 * API 请求必须排队，不能并行创建多个加密 client。
 *
 * 该工厂只供内部测试/服务装配使用；模块公开入口只导出 placeOrder。
 */
export function createPlaceOrder({
    clientFactory = createShanghaiMobileClient,
    sessionIdFactory = generateSessionId,
    onProgress = null,
    debug = false,
} = {}) {
    let queue = Promise.resolve();

    return function placeOrder(input) {
        let order;
        try {
            order = normalizeInput(input);
        } catch (error) {
            return Promise.reject(error);
        }

        const task = queue.then(() => executeOrder(order, {
            clientFactory,
            sessionIdFactory,
            onProgress,
            debug: debug === true,
        }));
        queue = task.catch(() => {});
        return task;
    };
}

/**
 * 唯一公开业务接口。调用本函数会执行 step1 ~ step5 并提交真实订单。
 *
 * @param {object} input
 * @param {'meituan'|'sf'} input.merchant 结算渠道
 * @param {number} input.planPrice 用户补贴后价格；实际移动套餐固定高 10 元
 * @param {object} input.customer 实名与配送资料
 */
export const placeOrder = createPlaceOrder();
