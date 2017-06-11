var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
var iapProvider = require("./IapProviders/IapProvider");
var BacktoryHelper = require("./Helpers/backtoryHelper");
exports.GetSupportedIapMarkets = interception.Intercept(function (requestBody, context) {
    context.succeed(iapProvider.getProvidersName());
});
var GetPackageResponseFromPackage = function(object)
{
    return {PackageInfo:object.get("PackageInfo")||null,Price:object.get("Price"),Sku:object.get("Sku"),Values:object.get("Values")||{},Markets:markets};
};
exports.GetIapPackages = interception.Intercept(function (requestBody, context) {
    var packageType = _.has(requestBody,"packageType")?requestBody.packageType:0;
    var Packages = Backtory.Object.extend("Packages");
    var query = new Backtory.Query(Packages);
    query.equalTo("PackageType",packageType);
    query.find({
        success: function(results) {
            var result = [];
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                var markets = object.get("Markets");
                if(markets == null || markets.length ==0){
                    markets = iapProvider.getProvidersName();
                }
                result.push(GetPackageResponseFromPackage(object));
            }
            context.succeed(result);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
});

exports.GetPurchasedIap = interception.Intercept(function (requestBody, context) {
    var UserPackagePurchase = Backtory.Object.extend("UserPackagePurchase");
    var query = new Backtory.Query(UserPackagePurchase);
    query.equalTo("User",context.userData);
    query.find({
        success: function(results) {

            var packages = _.map(results,function (userPackagePurchase) {
                return userPackagePurchase.get("Package");
            });
            BacktoryHelper.fetchAll(packages,{success:function (packages) {
                var result = [];
                for (var i = 0; i < results.length; i++) {
                    var object = results[i];
                    result.push({Sku:packages[i].get("Sku"),Price:object.get("Price"),Market:object.get("Market"),	PurchaseToken:object.get("PurchaseToken"),DisplayName:object.get("DisplayName")});
                }
                context.succeed(result);
            },error:function () {
                context.fail("Internal server error");
            }});

        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
});

var resolveMarketConfig = function (marketName,context,resultAction) {
    var Markets = Backtory.Object.extend("Markets");
    var query = new Backtory.Query(Markets);
    query.equalTo("Name",marketName);
    query.find({success:function (markets) {
        if(markets.length!=1){
            context.fail("Market settings cannot be resolved");
        }
        else{
            resultAction(markets[0].get("Config"));
        }

    },error:function (error) {
        context.fail("Market settings cannot be resolved");
    }})
};

exports.PurchaseIapPackage = interception.Intercept(function (requestBody, context) {
    if(!_.has(requestBody,"market")|| !_.isString(requestBody.market)){
        context.fail("market parameter is needed");
        return;
    }
    if(!_.has(requestBody,"payload")|| !_.isString(requestBody.payload)){
        context.fail("payload parameter is needed");
        return;
    }

    if(!_.has(requestBody,"sku")|| !_.isString(requestBody.sku)){
        context.fail("sku parameter is needed");
        return;
    }

    if(!_.has(requestBody,"purchaseToken")|| !_.isString(requestBody.purchaseToken)){
        context.fail("purchaseToken parameter is needed");
        return;
    }
    var provider = iapProvider.getProvider(requestBody.market);
    if(provider == null)
    {
        context.fail("Iab Market is not defined");
        return;
    }
    resolveMarketConfig(requestBody.market,context,function (marketConfig) {
        provider.checkPurchase(requestBody.payload,requestBody.purchaseToken,requestBody.sku,marketConfig,function (succeed) {
            if(!succeed){
                context.succeed({MarketSuccess:false});
            } else{
                var Packages = Backtory.Object.extend("Packages");
                var query = new Backtory.Query(Packages);
                query.equalTo("Sku",requestBody.sku);
                query.find({
                    success: function (results) {
                        if(results.length==0){
                            context.fail("Sku not found");
                        }else{
                            var package = results[0];
                            var UserPackagePurchase = Backtory.Object.extend("UserPackagePurchase");
                            var query = new Backtory.Query(UserPackagePurchase);
                            //query.equalTo("Package",package);
                            query.equalTo("PurchaseToken",requestBody.purchaseToken);
                            query.count({
                                success: function (count) {
                                    if(count > 0){
                                        context.fail("Purchase Token already Used");
                                    }else{
                                        var packageValues = package.get("Values");
                                        var values = context.userData.get("Values");
                                        _.forEach(_.keys(packageValues),function (key) {
                                            if(_.has(values,key)){
                                                values[key] = values[key]||0;
                                                values[key] += packageValues[key]||0;
                                            }
                                        });
                                        context.userData.set("Values",values);
                                        context.userData.save({success:function (userData) {
                                            var userPackagePurchase = new UserPackagePurchase();
                                            userPackagePurchase.set("Package",package);
                                            userPackagePurchase.set("Market",requestBody.market);
                                            userPackagePurchase.set("Price",package.get("Price"));
                                            userPackagePurchase.set("PurchaseToken",requestBody.purchaseToken);
                                            userPackagePurchase.set("User",userData);
                                            userPackagePurchase.save({success:function (userPackagePurchase) {
                                                context.succeed({AddedValue:packageValues,MarketSuccess:true,Package:GetPackageResponseFromPackage(package)});
                                            },error:function (error) {
                                                context.fail("Internal server Error");
                                            }});
                                        },error:function (error) {
                                            context.fail("Internal server Error");
                                        }});
                                    }

                                },
                                error: function (error) {
                                    context.fail("InternalServerError");
                                }
                            });
                        }
                    },
                    error: function (error) {
                        context.fail("InternalServerError");
                    }
                });

                /*           var UserPackagePurchase = Backtory.Object.extend("UserPackagePurchase");
                 var query = new Backtory.Query(UserPackagePurchase);
                 query.equalTo("")
                 query.count({
                 success: function (count) {
                 },
                 error: function (error) {
                 context.fail("InternalServerError");
                 }
                 });*/
            }
        });
    });

});

exports.GetItems = interception.Intercept(function (requestBody, context) {
    var Items = Backtory.Object.extend("Items");
    var query = new Backtory.Query(Items);
    query.find({
        success: function(results) {
            var result = [];
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                if(_.has(requestBody,"Full")) {
                    result.push({ItemId:object.get("ItemId"),Costs:object.get("Costs"),Name:object.get("Name")});
                }
                else{
                    result.push({ItemId:object.get("ItemId"),Costs:object.get("Costs")});
                }

            }
            context.succeed(result);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
});

exports.PurchaseItem = interception.Intercept(function (requestBody, context) {
    if(!_.has(requestBody,"itemId")|| !_.isString(requestBody.itemId)){
        context.fail("itemId parameter is needed");
        return;
    }
    var Items = Backtory.Object.extend("Items");
    var query = new Backtory.Query(Items);
    query.equalTo("ItemId",requestBody.itemId);
    query.find({
        success: function(results) {
            if(results.length==0){
                context.fail("Item with this itemId not found");
            }else{
                var relation = context.userData.relation("PurchasedItems");
                if(relation.contain(results[0].get("_id"))){
                    context.succeed({
                        Purchased:false
                    });
                }else{
                    var costs = results[0].get("Costs");
                    var keys = _.keys(costs);
                    var values = context.userData.get("Values");
                    for(var i=0;i<keys.length;i++){
                        if(!_.has(values,keys[i])){
                            context.fail("Key from costs mismatched");
                            return;
                        }
                        if(values[keys[i]]<costs[keys[i]]){
                            context.fail("Insufficient funds");
                            return;
                        }
                        values[keys[i]]-=costs[keys[i]];
                    }
                    context.userData.set("Values",values);
                    relation.add(results[0]);
                    context.userData.save({success:function (userData) {
                        context.succeed({Purchased:true});
                    },error:function () {
                        context.fail("Internal server error");
                    }})
                }
            }

        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
});

exports.GetPurchasedItems = interception.Intercept(function (requestBody, context) {
    var relation = context.userData.relation("PurchasedItems");
    BacktoryHelper.fetchAll(BacktoryHelper.getRelationObjects(relation),{success:function (results) {
        context.succeed(_.map(results,function (result) {
            return result.get("ItemId");
        }));
    },error:function () {
        context.fail("Internal server error");
    }});
});