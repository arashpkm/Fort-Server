var interception = require("./Interception/Intercept.js");

exports.GetUserData = interception.Intercept(function (requestBody, context) {
    context.succeed({Score:context.userData.get("Score"),Coin:context.userData.get("Coin")});
});

exports.AddScoreAndCoin = interception.Intercept(function (requestBody, context) {
    var tokens = context.userData.get("ScoreAndCoinAddedTokens")||[];
    if(!("addToken" in requestBody) || !("score" in requestBody) || !("coin" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    if(tokens.includes(requestBody.addToken)) {
        context.succeed({
            ScoreAdded:false,
        });
    }
    else{
        context.userData.set("Score",context.userData.get("Score")+requestBody.score);
        context.userData.set("Coin",context.userData.get("Coin")+requestBody.coin);
        tokens.push(requestBody.addToken);
        context.userData.set("ScoreAndCoinAddedTokens",tokens);
        context.userData.save({
            success: function(gameScore) {
                context.succeed({
                    ScoreAdded:true,
                });
            },error : function (error) {
                context.fail("Invalid Parameter");
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
            context.fail("Invalid Parameter");
        }
    });
});