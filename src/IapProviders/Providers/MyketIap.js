/**
 * Created by Jafarzadeh on 5/16/2017.
 */

exports.getName=function () {
    return "Myket";
};

exports.checkPurchase = function(payload,purchaseToken,sku,marketConfig,resultAction){
    resultAction(true);
};
