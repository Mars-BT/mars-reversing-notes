import assert from 'node:assert/strict';
import test from 'node:test';

import { MERCHANTS } from '../src/config.js';
import { createPlaceOrder } from '../src/place-order.js';

const MEITUAN_INPUT = Object.freeze({
    merchant: 'meituan',
    planPrice: 38,
    customer: Object.freeze({
        name: '测试用户',
        idCard: '310101199001011234',
        district: '徐汇区',
        address: '测试地址',
        contactPhone: '13800138000',
    }),
});

const SF_INPUT = Object.freeze({
    merchant: 'sf',
    planPrice: 29,
    customer: Object.freeze({
        ...MEITUAN_INPUT.customer,
        district: '奉贤区',
    }),
});

function createHarness({ respond } = {}) {
    const state = {
        activeClients: 0,
        closeCount: 0,
        createCount: 0,
        maxActiveClients: 0,
        requests: [],
        confirmations: [],
    };

    state.clientFactory = async (merchant) => {
        state.createCount += 1;
        state.activeClients += 1;
        state.maxActiveClients = Math.max(state.maxActiveClients, state.activeClients);
        const clientNumber = state.createCount;

        return {
            sessionId: null,
            async initializeSession(sessionId) {
                this.sessionId = sessionId;
            },
            async request(path, data, options) {
                const request = { clientNumber, merchant, path, data, options };
                state.requests.push(request);
                const customResponse = await respond?.(request, state);
                if (customResponse !== undefined) return customResponse;

                if (path.endsWith('card.query.yx')) {
                    return {
                        status: 200,
                        data: {
                            respCode: '0000',
                            respDesc: 'success',
                            data: {
                                list: [
                                    { tel: '13000000001' },
                                    { tel: '13000000002' },
                                    { tel: '13000000003' },
                                    { tel: '13000000004' },
                                    { tel: '13000000005' },
                                ],
                            },
                        },
                    };
                }
                if (path.endsWith('card.lock')) {
                    return {
                        status: 200,
                        data: {
                            respCode: '0000',
                            respDesc: 'success',
                            data: { orderId: `mock-order-${clientNumber}` },
                        },
                    };
                }
                if (path.endsWith('card.order.submit')) {
                    return {
                        status: 200,
                        data: {
                            respCode: '0000',
                            respDesc: 'success',
                            data: { orderCode: `mock-code-${clientNumber}` },
                        },
                    };
                }
                return {
                    status: 200,
                    data: { respCode: '0000', respDesc: 'success', data: null },
                };
            },
            async prepareOrderConfirmation(orderId) {
                state.confirmations.push({ clientNumber, orderId });
            },
            async close() {
                state.activeClients -= 1;
                state.closeCount += 1;
            },
        };
    };

    return state;
}

function findRequest(state, suffix, clientNumber = 1) {
    return state.requests.find((request) => (
        request.clientNumber === clientNumber && request.path.endsWith(suffix)
    ));
}

test('公开模块只暴露 placeOrder', async () => {
    const publicApi = await import('../index.js');
    assert.deepEqual(Object.keys(publicApi), ['placeOrder']);
});

test('所有套餐都严格执行用户价 +10 = 运营商价', () => {
    for (const merchant of Object.values(MERCHANTS)) {
        for (const plan of Object.values(merchant.plans)) {
            assert.equal(plan.carrierPrice, plan.salePrice + 10);
        }
    }
});

test('美团用户下单 38 元，实际绑定并提交 48 元套餐', async () => {
    const harness = createHarness();
    const progress = [];
    const placeOrder = createPlaceOrder({
        clientFactory: harness.clientFactory,
        sessionIdFactory: () => 'mock-session_1',
        onProgress: (event) => progress.push(event),
    });

    const result = await placeOrder(MEITUAN_INPUT);
    const bindRequest = findRequest(harness, 'card.submit.contract');
    const submitRequest = findRequest(harness, 'card.order.submit');

    assert.equal(result.status, 'SUBMITTED');
    assert.equal(result.planPrice, 38);
    assert.equal(result.carrierPlanPrice, 48);
    assert.equal(bindRequest.data.contractId, 2025026206);
    assert.equal(bindRequest.data.detailInfo.startsWith('48元/月'), true);
    assert.deepEqual(submitRequest.data, {
        orderId: 'mock-order-1',
        plcProtocol: '0',
        autoProtocol: '0',
        ads: '0',
        captureHtml: '',
        content: '',
    });
    assert.deepEqual(harness.confirmations, [
        { clientNumber: 1, orderId: 'mock-order-1' },
    ]);
    assert.deepEqual(result.completedSteps, [
        'step1_getPhoneNumberList',
        'step2_lockPhoneNumber',
        'step3_bindPlan',
        'step4_uploadUserInfo',
        'step5_submitOrder',
    ]);
    assert.equal(harness.closeCount, 1);

    const progressText = JSON.stringify(progress);
    assert.equal(progressText.includes(MEITUAN_INPUT.customer.idCard), false);
    assert.equal(progressText.includes(MEITUAN_INPUT.customer.address), false);
    assert.equal(progressText.includes(MEITUAN_INPUT.customer.contactPhone), false);
});

test('顺丰用户价 29 元映射运营商 39 元套餐及渠道参数', async () => {
    const harness = createHarness();
    const placeOrder = createPlaceOrder({ clientFactory: harness.clientFactory });
    const result = await placeOrder(SF_INPUT);

    assert.equal(result.planPrice, 29);
    assert.equal(result.carrierPlanPrice, 39);
    assert.equal(findRequest(harness, 'card.query.yx').data.tcId, '2026050266');
    assert.equal(findRequest(harness, 'card.lock').data.channel, 'TF_SDCLzx_mh_sftc');
    assert.equal(findRequest(harness, 'card.lock').data.xparam, 'xopid_10057272_xorgid_909340');
    assert.equal(findRequest(harness, 'card.submit.contract').data.contractId, 2026050248);
    assert.equal(
        findRequest(harness, 'card.order.information.update').data.chkProductIds,
        '1400,1401',
    );
});

test('step4 失败时关闭 client 且不执行真实提交步骤', async () => {
    const harness = createHarness({
        respond(request) {
            if (request.path.endsWith('card.order.information.update')) {
                return {
                    status: 200,
                    data: { respCode: '1', respDesc: '实名资料校验失败' },
                };
            }
            return undefined;
        },
    });
    const placeOrder = createPlaceOrder({ clientFactory: harness.clientFactory });

    await assert.rejects(
        () => placeOrder(MEITUAN_INPUT),
        (error) => error.step === 'step4_uploadUserInfo' && error.respCode === '1',
    );
    assert.equal(harness.closeCount, 1);
    assert.equal(findRequest(harness, 'card.order.submit'), undefined);
});

test('并发调用 placeOrder 时自动串行，避免 VMP 全局环境互相污染', async () => {
    const harness = createHarness();
    const placeOrder = createPlaceOrder({ clientFactory: harness.clientFactory });

    const [first, second] = await Promise.all([
        placeOrder(MEITUAN_INPUT),
        placeOrder(MEITUAN_INPUT),
    ]);

    assert.equal(first.status, 'SUBMITTED');
    assert.equal(second.status, 'SUBMITTED');
    assert.equal(harness.createCount, 2);
    assert.equal(harness.closeCount, 2);
    assert.equal(harness.maxActiveClients, 1);
});

test('step5 仅对未进入业务层的 nginx 空 400 重加密重试', async () => {
    let submitAttempts = 0;
    const harness = createHarness({
        respond(request) {
            if (!request.path.endsWith('card.order.submit')) return undefined;
            submitAttempts += 1;
            if (submitAttempts < 3) {
                return {
                    status: 400,
                    data: '',
                    headers: { server: 'nginx', 'content-type': 'text/html' },
                    rawBody: '\r\n\r\n',
                };
            }
            return undefined;
        },
    });
    const placeOrder = createPlaceOrder({ clientFactory: harness.clientFactory });

    const result = await placeOrder(MEITUAN_INPUT);

    assert.equal(result.status, 'SUBMITTED');
    assert.equal(submitAttempts, 3);
});

test('无效用户价格在创建网络 client 前直接拒绝', async () => {
    const harness = createHarness();
    const placeOrder = createPlaceOrder({ clientFactory: harness.clientFactory });

    await assert.rejects(
        () => placeOrder({ ...MEITUAN_INPUT, planPrice: 68 }),
        /可选补贴价: 28, 38, 48, 58/,
    );
    assert.equal(harness.createCount, 0);
});
