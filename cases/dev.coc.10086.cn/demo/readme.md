
# 业务主流程
## 1. 获取手机号码以及checkCode https://dev.coc.10086.cn/coc/reservoir/phone/anti-select （这里checkCode在后续提交订单时和订购手机是绑定参数）
 - 具体实现就是 /demo/utils.js 里的 getNumberList

## 2. 获取协议序列id https://dev.coc.10086.cn/coc/grocer/protocol/prov/queryProtocol 
 - 具体实现就是 /demo/utils.js 里的 getProtocolSequenceId

## 3. 锁住订购的号码 https://dev.coc.10086.cn/coc/reservoir/phone/anti-lock

## 这中间有一个 /getToken
 - 这里做了环境检测，不知道是否必要

## 4. 提交订单 https://dev.coc.10086.cn/coc/card/trade/newEncrypt/order
 - RSA加密AES的key然后放在header里的coc-aurora
 - payload中的cocEnContent是AES加密
 

# -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# 加密回顾
# 混淆字符串解密 /demo/utils.js 的 Xe

# 1.加密文件
channel-sdk-min.js
第4636行 new R

# 2.提交订单加密位置和文件
app.bf0544f4.js
 - 搜"cocEnContent"第二个就是
 - 这里的d就是temp.js里的payload
 - 这里的t.$aesK就是"bbe07485b2dec0ad" 写死就行
u = {
    cocEnContent: x.a.AES.encrypt(x.a.enc.Utf8.parse(JSON.stringify(d)), x.a.enc.Utf8.parse(t.$aesK), {
    mode: x.a.mode.ECB,
    padding: x.a.pad.Pkcs7
    }).toString()
}

 - cocEnContent 具体payload内容参考 /demo/temp.js
 - /demo/diyRSA.js 暂不清楚是否必须要，这里继承jsencrypt后扩展了4个方法。其主要作用是更长字符串进行RSA加密，本次逆向只有在getToken中被使用
 - getToken这里做了环境检测，返回值是一串数字，在后续中暂没有看到使用到