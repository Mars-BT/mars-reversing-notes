import { getProtocolSequenceId, getNumberList, lockNumber, placeOrder } from './utils.js'

async function main() {
    const protocolSequenceId = await getProtocolSequenceId('200')
    const { number, checkCode } = (await getNumberList('200', '755'))[0] // 选择列表第一个，这里可以选号的
    const sequence = await lockNumber('200', '755', number, checkCode)
    const res = await placeOrder({
        "mobilePhone": "13000000000", // 联系电话
        "address": "ce1", // 详细地址
        "certificateName": "mm", // 姓名
        "certificateNumber": "450100000000000000", // 身份证
        "name": "mm", // 姓名
        "orderMobile": number, // 订购的手机号
        "protocolSequenceId": protocolSequenceId, // 动态 请求位置：/queryProtocol
        "goodsCityCode": "755", // 商品城市
        "channelSeqId": "",
        "goodsProvinceCode": "200", // 商品省份
        "numberCheckCode": checkCode, // 动态 请求位置：/anti-select返回值
        "numberLockSequence": sequence, // 动态 /anti-lock返回值 response.data.data.sequence
        "productCode": "500000052095", // 产品id
        "sendCityCode": "755", // 发送城市
        "sendDistrictCode": "440306", // 发送区县
        "sendProvinceCode": "200", // 发送省份
        "touchCode": "P99999999177", // 渠道id?
        "pageId": "2036293653691981824", // 页面id
        "sellerId": "2200755055210401357", // 卖家id
        "sellerMobile": "jingdongmiaosoong", // 卖家名称
        "secondSubmit": false,
        "threePhotoProcessFlag": "0",
        "sourceUrl": "https://dev.coc.10086.cn/coc/web2/quickreleaseplatformH5/dantModule?pageId=2036293653691981824&channelId=P99999999177&sellerId=2200755055210401357&sellerMobile=jingdongmiaosoong", // 来源url
        "clickPageReport": {
            "androidId": "",
            "caidList": "",
            "cityCode": "",
            "oaId": "",
            "prov": ""
        },
        "ext1": "{\"cid\":\"\",\"sid\":\"\",\"uuid\":\"\",\"aid\":\"\",\"vid\":\"\",\"gid\":\"\",\"missionid\":\"\",\"adsource\":\"\",\"photoid\":\"\",\"appname\":\"\",\"requestid\":\"\",\"csite\":\"\",\"unionsite\":\"\",\"creativetype\":\"\",\"creativeid\":\"\",\"callback\":\"\",\"threePhotoProcessFlag\":\"0\"}"
    })
    // console.log(res.code === '50')
    if (res.code === '10'){
        console.log('系统繁忙') // 应该是接口不可用
    }

    // code
    // 10 系统繁忙
    // 50 参数不合法，payload 错误
    // 0800001001 系统繁忙，请1分钟后再试
}

main()