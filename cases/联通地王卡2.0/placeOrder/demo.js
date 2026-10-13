import { getUid, getNumList, placeOrder, getOrderDetail } from './utils.js';
// 1. 获取uid
const id = await getUid();
// 2. 获取号码列表
const num = (await getNumList(id))[0];
// 3. 下单
const response = await placeOrder(id, "**", "****", "****", "惠州市", "惠城区", "广东省惠州市惠", num);

// 4. 下单成功
if (response.code === 200) {
    console.log('下单成功')
    console.log({
        "id": id,
        "selectNum": num,
    })

    // 5. 查询订单详情
    console.log('查询订单详情')
    const result = await getOrderDetail(id); // 参考： '4E596C6778354768684B696474665946514B692F7030564E4636574570377138475947713343314E4B7969786267475A41566F4B4730696534566345344C5762' 
    if (result) {
        console.log('orderId:', result.orderId); // 订单id (加密)
        console.log('number:', result.number); // 手机号
        console.log('contactNumber:', result.contactNumber); // 联系手机号
        console.log('pname:', result.pname); // 产品名称
        console.log('productName:', result.productName); // 产品名称
        console.log('goodsid:', result.goodsid); // 商品id
    }
}else{
    console.log('下单失败')
}

