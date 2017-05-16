//var methods = [];
var Backtory = require("backtory-sdk");
var _ = require("lodash");


function CheckUserAndAdd(requestBody, context, finalAction) {
    var userId = context.getSecurityContext().userId;
    var userName = context.getSecurityContext().userName;
    var UserData = Backtory.Object.extend("Userdata");
    var query = new Backtory.Query(UserData);
    query.equalTo("UserId", userId);
    query.find({
        success: function (results) {
            if (results.length > 0)
                finalAction(results[0]);
            else {
                var Settings = Backtory.Object.extend("Settings");
                var query = new Backtory.Query(Settings);
                query.find({
                    success: function (results) {
                        var result = results[0];
                        var settings = result.get("Settings");
                        var userData = new UserData();
                        userData.set("Score", 0);
                        var values={};
                        for(var i=0;i<settings.ValuesDefenition.length;i++){
                            values[settings.ValuesDefenition[i]] = settings.StartupValues[settings.ValuesDefenition[i]];
                        }
                        userData.set("Values", values);
                        userData.set("UserId", userId);
                        userData.set("LastAddId", 0);
                        userData.set("UserName", userName);
                        userData.save({
                            success: function (savedUserData) {
                                // Execute any logic that should take place after the object is saved.						
                                finalAction(savedUserData);
                            },
                            error: function (error) {
                                // Execute any logic that should take place if the save fails.
                                finalAction(null);
                            }
                        });
                    },
                    error: function (object, error) {
                        finalAction(null);
                    }
                });

            }
        },
        error: function (error) {
            finalAction(null);
        }
    });
}

exports.Intercept = function (func) {
    var interceptionFunction = function (requestBody, context) {
        if (context.getSecurityContext().keyType !== null) {
            CheckUserAndAdd(requestBody, context, function(userData) {
                if (userData == null) {
                    context.fail();
                } else {
                    context.userData = userData;
                    func(requestBody, context);
                }
            });
            
        } else {
            func(requestBody, context);
        }
        
    }
    return interceptionFunction;
}