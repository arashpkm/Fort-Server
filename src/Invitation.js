var interception = require("./Interception/Intercept.js");

exports.GetInvitaionToken = interception.Intercept(function (requestBody, context) {
    context.succeed(context.userData.get("_id"));
});

exports.ApplyInvitation = interception.Intercept(function (requestBody, context) {
    if(!("invitorToken" in requestBody) || !("invitationToken" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    var invitor = context.userData.relation("Invitor");
    if(invitor.size() >0) {
        context.fail("Already Applied");
    }else{
        var UserData = Backtory.Object.extend("Userdata");
        var query = new Backtory.Query(UserData);
        query.equalTo("InvitationToken",requestBody.invitationToken);
        query.find({success: function (results) {
                if(results.length>0)
                    context.fail("Already Applied");
                else {
                    var invitorUserData = new UserData();
                    invitorUserData.set("_id",requestBody.invitorToken);
                    invitorUserData.fetch({success: function (invitorUserData) {
                        var Settings = Backtory.Object.extend("Settings");
                        var query = new Backtory.Query(Settings);
                        query.find({
                            success: function (results) {
                                var result = results[0];
                                var settings = result.get("Settings");
                                invitorUserData.set("InvitationCount",invitorUserData.get("InvitationCount")||0+1);
                                invitorUserData.set("InvitationAddedCoin",invitorUserData.get("InvitationAddedCoin")||0+settings.InvitationPrize);
                                invitorUserData.set("Coin",invitorUserData.get("Coin")||0+settings.InvitationPrize);
                                invitorUserData.save({
                                    success: function(gameScore) {
                                        context.userData.set("Invitor",invitorUserData);
                                        context.userData.set("InvitationToken",requestBody.invitationToken);
                                        context.userData.save({
                                            success: function(gameScore) {
                                                context.succeed({});
                                            },error : function (error) {
                                                context.fail("Invalid Parameter");
                                            }
                                        });
                                    },error : function (error) {
                                        context.fail("Invalid Parameter");
                                    }
                                });
                                //context.userData.set("Invitor",)
                            },
                            error: function (object, error) {
                                context.fail("InternalServerError");
                            }
                        });
                        },
                        error: function (error) {
                            context.fail("Invitor not found");
                        }
                    });
                }
            },
            error: function (error) {
                context.fail("Internal Error");
            }
        });
    }
});