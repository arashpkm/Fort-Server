var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
var UUID = require("./uuid/uuid.js");
var tokens = {};
var BacktoryHelper = require("./Helpers/backtoryHelper");

exports.GetUserData = interception.Intercept(function (requestBody, context) {
    context.succeed({Score:context.userData.get("Score"),Values:context.userData.get("Values")});
});

exports.AddScoreAndValues = interception.Intercept(function (requestBody, context) {
    var tokens = context.userData.get("ScoreAndValuesAddedTokens")||[];
    if(!("addToken" in requestBody) || !("score" in requestBody) || !("values" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    if(tokens.includes(requestBody.addToken)) {
        context.succeed({
            Added:false,
        });
    }
    else{
        var Settings = Backtory.Object.extend("Settings");
        var query = new Backtory.Query(Settings);
        query.equalTo("Tag","Fort");
        query.find({
            success: function (results) {
                var result = results[0];
                var settings = result.get("Settings");
                context.userData.set("Score",context.userData.get("Score")+requestBody.score);
                var values = context.userData.get("Values");
                for(var i=0;i<settings.ValuesDefenition.length;i++){
                    if(settings.ValuesDefenition[i] in requestBody.values && _.isNumber(requestBody.values[settings.ValuesDefenition[i]])){
                        values[settings.ValuesDefenition[i]]+=requestBody.values[settings.ValuesDefenition[i]];
                    }
                }
                context.userData.set("Values",values);
                tokens.push(requestBody.addToken);
                context.userData.set("ScoreAndValuesAddedTokens",tokens);
                context.userData.save({
                    success: function() {
                        context.succeed({
                            Added:true,
                        });
                    },error : function (error) {
                        context.fail("Invalid Parameter");
                    }
                });
            },
            error: function (object, error) {
                context.fail("InternalServerError");
            }
        });

    }
});

exports.GetUserConfig = interception.Intercept(function (requestBody, context) {
    var userconfig = context.userData.get("UserConfig");
    context.succeed(context.userData.get("UserConfig")||{});
});

exports.UpdataUserConfig = interception.Intercept(function (requestBody, context) {
    if(!("userConfig" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    context.userData.set("UserConfig",requestBody.userConfig);
    context.userData.save({
        success: function(gameScore) {
            context.succeed({});
        },error : function (error) {
            context.fail("Internal Error");
        }
    });
});

var SyncAddedScoreAndValues = function (context,addScoreValuesData,finalResult) {
    var tokens = context.userData.get("ScoreAndValuesAddedTokens")||[];
    if(!("addToken" in addScoreValuesData) || !("score" in addScoreValuesData) || !("values" in addScoreValuesData)) {
       finalResult({success:false});
        return;
    }
    if(tokens.includes(addScoreValuesData.addToken)) {
        finalResult({success:true,result:{Added:false}});
    }
    else{
        var Settings = Backtory.Object.extend("Settings");
        var query = new Backtory.Query(Settings);
        query.equalTo("Tag","Fort");
        query.find({
            success: function (results) {
                var result = results[0];
                var settings = result.get("Settings");
                context.userData.set("Score",context.userData.get("Score")+addScoreValuesData.score);
                var values = context.userData.get("Values");
                for(var i=0;i<settings.ValuesDefenition.length;i++){
                    if(settings.ValuesDefenition[i] in addScoreValuesData.values && _.isNumber(addScoreValuesData.values[settings.ValuesDefenition[i]])){
                        values[settings.ValuesDefenition[i]]+=addScoreValuesData.values[settings.ValuesDefenition[i]];
                    }
                }
                context.userData.set("Values",values);
                tokens.push(addScoreValuesData.addToken);
                context.userData.set("ScoreAndValuesAddedTokens",tokens);
                context.userData.save({
                    success: function() {
                        finalResult({success:true,result:{Added:true}});
                    },error : function (error) {
                        finalResult({success:false});
                    }
                });
            },
            error: function (object, error) {
                finalResult({success:false});
            }
        });

    }
};

var GetPurchaseItemId = function (index, itemIds,itemObjects, resultAction) {
    if(index >= itemIds.length){
        resultAction({success:true});
    }else{
        var Items = Backtory.Object.extend("Items");
        var query = new Backtory.Query(Items);
        query.equalTo("ItemId",itemIds[index]);
        query.find({
            success: function (results) {
                var result = results[0];
                itemObjects.push(result);
                GetPurchaseItemId(index+1,itemIds,itemObjects,resultAction);
            },
            error: function (object, error) {
                resultAction({success:false});
            }
        });
    }
};

var GetPurchasedItems = function (context,resultAction) {
    var relation = context.userData.relation("PurchasedItems");
    BacktoryHelper.fetchAll(BacktoryHelper.getRelationObjects(relation),{success:function (results) {
        resultAction({success:true,PurchasedItems:_.map(results,function (result) {
            return result.get("ItemId");
        })});
    },error:function () {
        resultAction({success:false});
    }});
};
var SyncPurchases = function (context,purchaseData,finalResult) {
    GetPurchasedItems(context,function (resultData) {
        if(!resultData.success) {
            finalResult(resultData);
        }else{
            purchaseData = _.filter(purchaseData,function (purchaseItemId) {
                return !resultData.PurchasedItems.includes(purchaseItemId);
            });
            var objects = [];
            GetPurchaseItemId(0,purchaseData,objects,function (resultData) {
                if(!resultData.success){
                    finalResult(resultData);
                }else{
                    var relation = context.userData.relation("PurchasedItems");
                    for(var i=0;i<objects.length;i++){
                        relation.add(objects[i]);
                    }
                    context.userData.save({success:function (userData) {
                        finalResult({success:true});
                    },error:function () {
                        finalResult({success:false});
                    }})
                }
            });
        }
    })
};

var getUserAchievementObjectIds = function(context){
    var userAchievements = context.userData.relation("UserAchievements");
    var achievementObjectIds =[];
    for(var i=0;i<userAchievements.size();i++){

        achievementObjectIds.push(userAchievements.getByIndex(i).get("_id"));
    }
    return achievementObjectIds;
}
var isAchievementClaimedByUser = function (achievementId,context,resultAction)
{
    var Achievement = Backtory.Object.extend("Achievement");
    var query = new Backtory.Query(Achievement);
    query.equalTo("AchievementId", achievementId);
    query.find({
        success: function(results) {
            if(results.length==0){
                resultAction({success:true,claimResult:{claimed:true}});
                //resultAction({claimed:true});
            }
            else{
                var achievementObjectId = results[0].get("_id");
                var achievementObjectIds = getUserAchievementObjectIds(context);
                if(achievementObjectIds.includes(achievementObjectId)){
                    resultAction({success:true,claimResult:{claimed:true,achievement:results[0]}});
                    //resultAction({claimed:true,achievement:results[0]});
                }else{
                    resultAction({success:true,claimResult:{claimed:false,achievement:results[0]}});
                    //resultAction({claimed:false,achievement:results[0]});
                }
            }
        },
        error: function(error) {
            resultAction({success:false});
        }
    });
};
var relsoveAchievements =function (index,achievementIds,context,resultAction)
{
    if(index==achievementIds.length) {
        resultAction({success:true});
    }else{
        isAchievementClaimedByUser(achievementIds[index],context,function (claimResult) {
            if(!claimResult.success) {
                resultAction({success:false});
                return;
            }
            if(claimResult.claimResult.claimed){
                relsoveAchievements(index+1,achievementIds,context,resultAction);
            }else{
                var relation = context.userData.relation("UserAchievements");
                relation.add(claimResult.claimResult.achievement);
                context.userData.save({
                    success: function() {
                        relsoveAchievements(index+1,achievementIds,context,resultAction);
                    },error : function (error) {
                        resultAction({success:false});
                    }
                });
            }
        })
    }
};
var SyncAchievements = function (context,achievementData,finalResult) {
    relsoveAchievements(0,achievementData,context,finalResult);
};

var fullUpdateData = function (requestBody, context) {
    var resultCount = 0;
    var result = {};
    if(_.has(requestBody,"AddScoreValuesDatas") && _.isArray(requestBody.AddScoreValuesDatas)){
        result.AddScoreValuesResult = [];
        resultCount+=requestBody.AddScoreValuesDatas.length;
    }
    if(_.has(requestBody,"AchievementData")&&_.isArray(requestBody.AchievementData)){
        resultCount++;
    }
    if(_.has(requestBody,"PurchaseData")&&_.isArray(requestBody.PurchaseData)){
        resultCount++;
    }
    var resolvedCount = 0;

    var checkForFinish = function () {
        resolvedCount++;
        if(resolvedCount==resultCount){
            result.userData = {Score:context.userData.get("Score"),Values:context.userData.get("Values")};
            context.succeed(result);
        }
    };
    if(_.has(requestBody,"AddScoreValuesDatas")&& _.isArray(requestBody.AddScoreValuesDatas)){
        for(var i = 0 ; i < requestBody.AddScoreValuesDatas.length ; i++){
            requestBody.AddScoreValuesDatas[i].index = i;
        }
        _.forEach(requestBody.AddScoreValuesDatas,function (addScoreValuesData) {
            SyncAddedScoreAndValues(context,addScoreValuesData,function (addScoreValuesResult) {
                result.AddScoreValuesResult[addScoreValuesData.index] = addScoreValuesResult;
                checkForFinish();
            });
        });
    }
    if(_.has(requestBody,"AchievementData")&&_.isArray(requestBody.AchievementData)){
        SyncAchievements(context,requestBody.AchievementData,function (achievementResult) {
            result.AchievementResult = achievementResult;
            checkForFinish();
        });

    }
    if(_.has(requestBody,"PurchaseData")&&_.isArray(requestBody.PurchaseData)){
        SyncPurchases(context,requestBody.PurchaseData,function (purchaseResult) {
            result.PurchaseResult = purchaseResult;
            checkForFinish();
        });
    }
    if(resultCount == 0)
        context.succeed(result);
};
fullUpdateData["CheckToken"] = true;
exports.FullUpdateData = interception.Intercept(fullUpdateData);
exports.GetToken = interception.Intercept(function (requestBody,context) {
    var uuid4 = UUID.create();
    var expireDate=Date.now()+1000*2000;
    var MethodTokens = Backtory.Object.extend("MethodTokens");
    var methodToken = new MethodTokens();
    var token = uuid4.toString();
    methodToken.set("Token",token);
    methodToken.set("Used",false);
    methodToken.set("ExpireDate",Date.now()+20000);
    methodToken.save({
        success: function (savedUserData) {
            context.succeed(token);
        },
        error: function (error) {
            context.fail("Internal server error");
        }
    });


});