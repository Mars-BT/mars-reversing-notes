// 配置

export const COUNTY_CODES = Object.freeze({
    '黄浦区': '310101',
    '徐汇区': '310104',
    '长宁区': '310105',
    '静安区': '310106',
    '普陀区': '310107',
    '虹口区': '310109',
    '杨浦区': '310110',
    '闵行区': '310112',
    '宝山区': '310113',
    '嘉定区': '310114',
    '浦东新区': '310115',
    '金山区': '310116',
    '松江区': '310117',
    '青浦区': '310118',
    '奉贤区': '310120',
    '崇明区': '310151',
});

export const MERCHANTS = Object.freeze({
    meituan: Object.freeze({
        key: 'meituan',
        name: '美团',
        tcId: '2025026046',
        channel: '*****',
        xparam: '******',
        chkProductIds: '',
        // key 是接口/用户看到的补贴后价格；carrierPrice 才是实际绑定档位。
        plans: Object.freeze({
            28: Object.freeze({
                salePrice: 28,
                carrierPrice: 38,
                contractId: 2025026207,
                name: '闵行美团卡38元套餐',
                monthMoney: '38元',
                contractPeriod: '12月',
                detailInfo: '38元/月,1500分钟,100GB国内流量,30GB任我嗨定向流量优惠包',
            }),
            38: Object.freeze({
                salePrice: 38,
                carrierPrice: 48,
                contractId: 2025026206,
                name: '闵行美团卡48元套餐',
                monthMoney: '48元',
                contractPeriod: '12月',
                detailInfo: '48元/月,1500分钟,140GB国内流量,30GB任我嗨定向流量优惠包',
            }),
            48: Object.freeze({
                salePrice: 48,
                carrierPrice: 58,
                contractId: 2025026286,
                name: '闵行美团卡58元套餐',
                monthMoney: '58元',
                contractPeriod: '12月',
                detailInfo: '58元/月,2000分钟,150GB国内流量,30GB任我嗨定向流量优惠包',
            }),
            58: Object.freeze({
                salePrice: 58,
                carrierPrice: 68,
                contractId: 2025026306,
                name: '闵行美团卡68元套餐',
                monthMoney: '68元',
                contractPeriod: '12月',
                detailInfo: '68元/月,2500分钟,195GB国内流量,30GB任我嗨定向流量优惠包,100条短信',
            }),
        }),
    }),
    sf: Object.freeze({
        key: 'sf',
        name: '顺丰同城',
        tcId: '2026050266',
        channel: '*****',
        xparam: '******',
        chkProductIds: '1400,1401',
        plans: Object.freeze({
            29: Object.freeze({
                salePrice: 29,
                carrierPrice: 39,
                contractId: 2026050248,
                name: '顺丰同城39元档',
                monthMoney: '39元',
                contractPeriod: '24月',
                detailInfo: '39元/月,1000分钟,120GB国内流量,30GB任我嗨定向流量优惠包,100条短信',
            }),
            49: Object.freeze({
                salePrice: 49,
                carrierPrice: 59,
                contractId: 2026050247,
                name: '顺丰同城59元档',
                monthMoney: '59元',
                contractPeriod: '24月',
                detailInfo: '59元/月,3600分钟,100GB国内流量,30GB任我嗨定向流量优惠包',
            }),
        }),
    }),
});

/** 将外部名称归一化为内部渠道 key；未知值必须显式报错，不默认落到美团。 */
export function resolveMerchant(merchantKey) {
    const aliases = {
        meituan: 'meituan',
        '美团': 'meituan',
        '美团众包': 'meituan',
        sf: 'sf',
        '顺丰': 'sf',
        '顺丰同城': 'sf',
    };
    const resolvedKey = aliases[String(merchantKey || '').trim()];
    const merchant = MERCHANTS[resolvedKey];
    if (!merchant) throw new TypeError(`不支持的渠道: ${merchantKey}`);
    return merchant;
}

export function resolvePlan(merchant, planPrice) {
    const plan = merchant.plans[String(planPrice)];
    if (!plan) {
        const supported = Object.keys(merchant.plans).join(', ');
        throw new TypeError(
            `${merchant.name}不支持用户价 ${planPrice} 元，可选补贴价: ${supported}`,
        );
    }
    if (plan.carrierPrice - plan.salePrice !== 10) {
        throw new Error(`${merchant.name}套餐补贴配置异常: ${plan.salePrice}`);
    }
    return plan;
}

export function resolveCountyCode(district) {
    const code = COUNTY_CODES[String(district || '').trim()];
    if (!code) throw new TypeError(`不支持的上海区县: ${district}`);
    return code;
}
