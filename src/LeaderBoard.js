var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
var getLessUsers = function (context, resultAction) {
    var UserData = Backtory.Object.extend("Userdata");
    var query = new Backtory.Query(UserData);
    query.descending("Score");
    query.lessThanOrEqualTo("Score",context.userData.get("Score"));
    query.limit(3);
    query.find({
        success: function(results) {
            var result = [];
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                result.push({UserName:object.get("UserName"),Score:object.get("Score")});
            }
            resultAction(result);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });

};
var getGreaterUsers = function (context, resultAction) {
    var UserData = Backtory.Object.extend("Userdata");
    var query = new Backtory.Query(UserData);
    query.ascending("Score");
    query.greaterThanOrEqualTo("Score",context.userData.get("Score"));
    query.limit(3);
    query.find({
        success: function(results) {
            var result = [];
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                result.splice(0,0,{UserName:object.get("UserName"),Score:object.get("Score")});
            }
            resultAction(result);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });

};
var getTopPlayers = function(context,resultAction){
    var UserData = Backtory.Object.extend("Userdata");
    var query = new Backtory.Query(UserData);
    query.descending("Score");
    query.limit(5);

    query.find({
        success: function(results) {
            var result = [];
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                result.push({UserName:object.get("UserName"),Score:object.get("Score")});
            }
            resultAction(result);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
};
var getAbovePlayer = function (context, resultAction) {
    var UserData = Backtory.Object.extend("Userdata");
    var query = new Backtory.Query(UserData);
    query.greaterThan("Score",context.userData.get("Score"));
    query.count({
        success: function(count) {
            resultAction(count);
        },
        error: function(error) {
            context.fail("Internal server error");
        }
    });
};
exports.GetLeaderboard = interception.Intercept(function (requestBody, context) {
    getTopPlayers(context,function (topPlayers) {
        getAbovePlayer(context,function (count) {
            getGreaterUsers(context,function (greaterUsers) {
                getLessUsers(context,function (lessUsers) {
                    var dataCollection = _.concat(greaterUsers,{UserName:context.userData.get("UserName"),Score:context.userData.get("Score")},lessUsers);
                    
                    context.succeed({TopPlayers:topPlayers,Rank:count,UserRank:_.uniqBy(dataCollection, "UserName")});
                });
            });
        });
    });
});