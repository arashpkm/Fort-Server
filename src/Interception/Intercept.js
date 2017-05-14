var methods = [];

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
                query.get("5911fcc05e17c4000139c402", {
                    success: function (result) {
                        var settings = result.get("Settings");
                        var userData = new UserData();
                        userData.set("Score", 0);
                        userData.set("Coin", settings.StartupCoin);
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
                    context.UserData = userData;
                    func(requestBody, context);
                }
            });
            
        } else {
            func(requestBody, context);
        }
        
    }
    return interceptionFunction;
}