/**
 * Created by Jafarzadeh on 5/29/2017.
 */
var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");

exports.Synchronize = interception.Intercept(function (requestBody, context) {
    if(!_.has(requestBody,"SynchronizationData")){
        context.fail("SynchronizationData not found in parameters");
    }else{
        var Settings = Backtory.Object.extend("Settings");
        var query = new Backtory.Query(Settings);
        query.find({
            success: function (results) {
                var result = results[0];
                var settings = result.get("Settings");
                context.succeed(settings);
            },
            error: function (object, error) {
                context.fail("InternalServerError");
            }
        });
    }

});