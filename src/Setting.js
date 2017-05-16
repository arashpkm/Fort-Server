var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("lodash");
exports.GetSettings = interception.Intercept(function (requestBody, context) {
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
});