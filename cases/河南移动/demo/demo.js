import { getPhoneList } from "./1.getPhoneList.js";
import { orderSubmit } from "./3.placeOrder.js";
import { checkSensitiveWord } from "./2.checkSensitiveWord.js";

async function main() {
    let userName = "**"; // 姓名 
    let usertel = "****"; // 联系电话
    let province = "河南"; // 省份（这里不需要市）
    let city = "南阳市"; // 城市
    let county = "淅川县"; // 区县
    let address = "****"; // 详细地址
    let card = "****"; // 身份证号

    // step1: 获取手机号列表
    const phoneList = await getPhoneList();
    const firstPhone = phoneList[0]["CARDSVCNUM"];

    // step2：检查地址是否包含敏感词
    const checkResponse = await checkSensitiveWord(
        address
    );

    if (checkResponse.code != "1") {
        return console.log("地址包含敏感词，无法下单");
    }

    // step3：下单
    const orderResponse = await orderSubmit(
        firstPhone, // 用户选择的号码
        userName, // 姓名
        usertel, // 联系电话
        province, // 省份
        city, // 城市
        county, // 区县
        address, // 详细地址
        card // 身份证号
    );
    console.log(orderResponse);

    // step4：解析下单结果
    if(orderResponse.code == '1'){
        console.log('用户选择的号码：',firstPhone)
        // 有用的返回值
        console.log('订单号：',orderResponse.data.orderId); // 订单号
        console.log('签名：',orderResponse.data.signStr); // 签名

        // 其他返回值
        // console.log(orderResponse.data.payAmount); // 支付金额
        // console.log(orderResponse.data.payType); // 支付类型
        // console.log(orderResponse.data.outBackUrl); // 回调地址
    }else{
        console.log(orderResponse.message); // 错误信息
    }
}

main();
