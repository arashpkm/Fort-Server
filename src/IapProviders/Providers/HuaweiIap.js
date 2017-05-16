/**
 * Created by Jafarzadeh on 5/16/2017.
 */

exports.getName=function () {
    return "Huawei";
};

exports.checkPurchase = function(payload,purchaseToken,sku,marketConfig,resultAction){
    resultAction(true);
};
