var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
exports.GetInvitaionToken = interception.Intercept(function (requestBody, context) {
    context.succeed(context.userData.get("_id"));
});



exports.ApplyInvitation = interception.Intercept(function (requestBody, context) {
    if(!("invitorToken" in requestBody) || !("invitationToken" in requestBody)) {
        context.fail("Invalid Parameter");
        return;
    }
    var invitor = context.userData.get("Invitor");
    if(invitor != null) {
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
                                invitorUserData.set("InvitationCount",(invitorUserData.get("InvitationCount")||0)+1);
                                var invitationAddedValues = invitorUserData.get("InvitationAddedValues")||{};
                                var invitorValues = invitorUserData.get("Values");
                                for(var i=0;i<settings.ValuesDefenition.length;i++){

                                    if(_.has(settings.InvitationPrize,settings.ValuesDefenition[i])){
                                        invitorValues[settings.ValuesDefenition[i]]+=settings.InvitationPrize[settings.ValuesDefenition[i]];
                                        invitationAddedValues[settings.ValuesDefenition[i]]=invitationAddedValues[settings.ValuesDefenition[i]]||0;
                                        invitationAddedValues[settings.ValuesDefenition[i]]+=settings.InvitationPrize[settings.ValuesDefenition[i]];
                                    }
                                }
                                invitorUserData.set("InvitationAddedValues",invitationAddedValues);
                                invitorUserData.set("Values",invitorValues);
                                invitorUserData.save({
                                    success: function(invitorUserData) {
                                        context.userData.set("Invitor",invitorUserData);
                                        context.userData.set("InvitationToken",requestBody.invitationToken);
                                        context.userData.save({
                                            success: function(userData) {
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

exports.GetUserInvitationInfo = interception.Intercept(function (requestBody, context) {
    var invitor = context.userData.get("Invitor");
    if(invitor == null)
        context.succeed({InvitationAddedValues:context.userData.get("InvitationAddedValues")||{},InvitationCount:context.userData.get("InvitationCount")||0});
    else{
        invitor.fetch({success: function (invitor) {
            context.succeed({InvitationAddedValues:context.userData.get("InvitationAddedValues")||{},InvitationCount:context.userData.get("InvitationCount")||0,InvitorUserName:invitor.get("UserName")});
        },
            error: function (error) {
                context.succeed({InvitationAddedValues:context.userData.get("InvitationAddedValues")||{},InvitationCount:context.userData.get("InvitationCount")||0});
            }
        })
    }
});