var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
exports.GetSettings = interception.Intercept(function (requestBody, context) {
    var Settings = Backtory.Object.extend("Settings");
    var query = new Backtory.Query(Settings);
    query.equalTo("Tag","Fort");
    query.find({
        success: function (results) {
            if(results.length === 0){
                context.succeed({});
                return;
            }
            var result = results[0];
            var settings = result.get("Settings");
            context.succeed(settings);
        },
        error: function (object, error) {
            context.fail("InternalServerError");
        }
    });
});

var UpdateSettings = function (requestBody, context) {
    if(!_.has(requestBody,"ServerSettings") || !_.isObject(requestBody.ServerSettings))
    {
        context.fail("Invalid Parameter");
        return;
    }
    var Settings = Backtory.Object.extend("Settings");
    var query = new Backtory.Query(Settings);
    query.equalTo("Tag","Fort");
    query.find({
        success: function (results) {
            var setting;
            if(results.length === 0){
                setting = new Settings();
                setting.set("Tag","Fort");
            }else{
                setting = results[0];
            }
            setting.set("Settings",requestBody.ServerSettings);
            setting.save({
                success: function (savedUserData) {
                    context.succeed({});
                },
                error: function (error) {
                    context.fail("InternalServerError");
                }
            });
        },
        error: function (object, error) {
            context.fail("InternalServerError");
        }
    });

};
UpdateSettings.MasterOnly = true;
exports.UpdateSettings = interception.Intercept(UpdateSettings);