var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
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