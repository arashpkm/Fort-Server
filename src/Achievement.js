var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
exports.GetAchievements = interception.Intercept(function (requestBody, context) {
    var Achievement = Backtory.Object.extend("Achievement");
    var query = new Backtory.Query(Achievement);
    query.find({
        success: function (results) {
            var achievements =[];
            for(var i=0;i<results.length;i++){
                if(_.has(requestBody,"Full")) {
                    achievements.push({AchievementId:results[i].get("AchievementId"),Score:results[i].get("Score"),Values:results[i].get("Values"),Name:results[i].get("Name")});
                }
                else{
                    achievements.push({AchievementId:results[i].get("AchievementId"),Score:results[i].get("Score"),Values:results[i].get("Values")});
                }

            }
            context.succeed(achievements);
        },
        error: function (error) {
            context.fail("Internal Error");
        }
    });
});

var resolveAchievementsAndReturn=function (index, achievementObjectIds,achievementIds, context) {
    if(index==achievementObjectIds.length){
        context.succeed(achievementIds);
    }
    else {
        var Achievement = Backtory.Object.extend("Achievement");
        var achievement = new Achievement();
        achievement.set("_id",achievementObjectIds[index]);
        achievement.fetch({
            success: function(achievement) {
                achievementIds.push(achievement.get("AchievementId"));
                resolveAchievementsAndReturn(index+1,achievementObjectIds,achievementIds,context);
            },error:function (error) {
                //context.fail("Internal Error");
                resolveAchievementsAndReturn(index+1,achievementObjectIds,achievementIds,context);
            }
        });
    }
}
var getUserAchievementObjectIds = function(context){
    var userAchievements = context.userData.relation("UserAchievements");
    var achievementObjectIds =[];
    for(var i=0;i<userAchievements.size();i++){

        achievementObjectIds.push(userAchievements.getByIndex(i).get("_id"));
    }
    return achievementObjectIds;
}
exports.GetClaimedAchievements = interception.Intercept(function (requestBody, context) {
    var achievementObjectIds =getUserAchievementObjectIds(context);
    resolveAchievementsAndReturn(0,achievementObjectIds,[],context);
});
var isAchievementClaimedByUser = function (achievementId,context,resultAction)
{
    var Achievement = Backtory.Object.extend("Achievement");
    var query = new Backtory.Query(Achievement);
    query.equalTo("AchievementId", achievementId);
    query.find({
        success: function(results) {
            if(results.length==0){
                resultAction({claimed:true});
            }
            else{
                var achievementObjectId = results[0].get("_id");
                var achievementObjectIds = getUserAchievementObjectIds(context);
                if(achievementObjectIds.includes(achievementObjectId)){
                    resultAction({claimed:true,achievement:results[0]});
                }else{
                    resultAction({claimed:false,achievement:results[0]});
                }
            }
        },
        error: function(error) {
            context.fail("Internal Error");
        }
    });
}
var reloveAchievements =function (index,achievementIds,context,settings)
{
    if(index==achievementIds.length) {
        context.succeed({});
    }else{
        isAchievementClaimedByUser(achievementIds[index],context,function (claimResult) {
            if(claimResult.claimed){
                reloveAchievements(index+1,achievementIds,context);
            }else{
                var relation = context.userData.relation("UserAchievements");
                relation.add(claimResult.achievement);
                context.userData.set("Score",context.userData.get("Score")+claimResult.achievement.get("Score"))
                var values = context.userData.get("Values");
                var achievementValues = claimResult.achievement.get("Values");
                for(var i=0;i<settings.ValuesDefenition.length;i++){
                    if(_.has(achievementValues,settings.ValuesDefenition[i])){
                        values[settings.ValuesDefenition[i]]+=achievementValues[settings.ValuesDefenition[i]];
                    }
                }
                context.userData.set("Values",values)
                context.userData.save({
                    success: function() {
                        reloveAchievements(index+1,achievementIds,context,settings);
                    },error : function (error) {
                        context.fail("Invalid Parameter");
                    }
                });
            }
        })
    }
}
exports.ClaimAchievements = interception.Intercept(function (requestBody, context) {
    if(!("achievementIds" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    var Settings = Backtory.Object.extend("Settings");
    var query = new Backtory.Query(Settings);
    query.find({
        success: function (results) {
            var result = results[0];
            var settings = result.get("Settings");
            reloveAchievements(0,requestBody.achievementIds,context,settings);
        },
        error: function (object, error) {
            context.fail("InternalServerError");
        }
    });

});