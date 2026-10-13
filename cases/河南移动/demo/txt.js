// success
let s = {
    code: "1",
    message: "成功",
    data: {
        payAmount: "0",
        payType: "GROUPALIPAY",
        orderId: "BTJD202601100206544421",
        outBackUrl: "",
        signStr: "3f3a2bd3835122d0c12b8a387434fb78",
    },
    success: true,
};

// fail
let f = {
    code: "0",
    message: "您的身份证已预占号码，请在激活号码后再购买。",
    success: false,
};

let f2 = {
    code: "0",
    message: "未获取到分销商来源标识!",
    success: false,
};