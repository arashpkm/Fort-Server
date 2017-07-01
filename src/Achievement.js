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

var UpdateOrAddAchievementsItem = function (items, index, actionResult) {
    if(index===items.length){
        actionResult(true);
        return;
    }
    var Achievement = Backtory.Object.extend("Achievement");
    var query = new Backtory.Query(Achievement);
    query.equalTo("AchievementId",items[index].AchievementId);
    query.find({
        success: function(results) {
            var item;
            if(results.length===0){
                item = new Achievement();
                item.set("AchievementId",items[index].AchievementId);

            }else{
                item = results[0];
            }
            item.set("Name",items[index].Name);
            item.set("Score",items[index].Score);
            item.set("Values",items[index].Values);
            item.save({
                success: function (savedUserData) {
                    UpdateOrAddAchievementsItem(items,index+1,actionResult);
                },
                error: function (error) {
                    actionResult(false);
                }
            });
        },
        error: function(error) {
            actionResult(false);
        }
    });
};
var UpdateAchievements = function (requestBody, context) {
    if(!_.has(requestBody,"Items") || !_.isArray(requestBody.Items))
    {
        context.fail("Invalid Parameter");
        return;
    }
    UpdateOrAddAchievementsItem(requestBody.Items,0,function (success) {
        if(success){
            context.succeed({});
        }else{
            context.fail("Internal server error");
        }
    })
};
UpdateAchievements.MasterOnly = true;
exports.UpdateAchievements = interception.Intercept(UpdateAchievements);