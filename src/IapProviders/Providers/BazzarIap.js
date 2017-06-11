/**
 * Created by Jafarzadeh on 5/16/2017.
 */
var _ = require("../../lodash/lodash");
var querystring = require("querystring");
var request  = require("request");
var Backtory = require("backtory-sdk");

exports.getName=function () {
    return "Bazzar";
};
var checkBazzarPurchaseToken = function (payload, purchaseToken, sku, accessToken,marketConfig, resultAction) {
    request({
        url: "https://pardakht.cafebazaar.ir/devapi/v2/api/validate/"+marketConfig.package_name+"/inapp/"+sku+"/purchases/"+purchaseToken,
        method: "GET",
        headers: {
            "Authorization": accessToken,
        }
    }, function (error, response, body){
        var result = JSON.parse(body);
        if(_.has(result,"error")){
            resultAction(false);
        }else{
            resultAction(result.purchaseState===0);
        }
    });
}
exports.checkPurchase = function(payload,purchaseToken,sku,marketConfig,resultAction){
    if(!_.has(marketConfig,"refresh_token")){
        var post_data = querystring.stringify({
            'grant_type' : 'authorization_code',
            'code': marketConfig.code,
            'client_id': marketConfig.client_id,
            'client_secret' : marketConfig.client_secret,
            'redirect_uri' : marketConfig.redirect_uri
        });
        request({
            url: "https://pardakht.cafebazaar.ir/devapi/v2/auth/token/",
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded; charset=utf-8",  // <--Very important!!!
            },
            body: post_data
        }, function (error, response, body){
            var result = JSON.parse(body);
            if(_.has(result,"error")){
                resultAction(false);
            }else{
                var Markets = Backtory.Object.extend("Markets");
                var query = new Backtory.Query(Markets);
                query.equalTo("Name","Bazzar");
                query.find({success:function (markets) {
                    if(markets.length!=1){
                        resultAction(false);
                    }
                    else{
                        marketConfig.refresh_token = result.refresh_token;
                        markets[0].set("Config",marketConfig);

                        markets[0].save({success:function () {
                            checkBazzarPurchaseToken(payload,purchaseToken,sku,result.access_token,marketConfig,resultAction);
                        },error:function (error) {
                            resultAction(false);
                        }});
                    }

                },error:function (error) {
                    resultAction(false);
                }});
            }
        });
    }else{
        var post_data = querystring.stringify({
            'grant_type' : 'refresh_token',
            'client_id': marketConfig.client_id,
            'client_secret' : marketConfig.client_secret,
            'refresh_token' : marketConfig.refresh_token
        });
        request({
            url: "https://pardakht.cafebazaar.ir/devapi/v2/auth/token/",
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded; charset=utf-8",  // <--Very important!!!
            },
            body: post_data
        }, function (error, response, body){
            var result = JSON.parse(body);
            if(_.has(result,"error")){
                resultAction(false);
            }else{
                checkBazzarPurchaseToken(payload,purchaseToken,sku,result.access_token,marketConfig,resultAction);
            }
        });
    }
};