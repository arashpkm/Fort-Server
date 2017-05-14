var interception = require("./Interception/Intercept.js");

exports.GetAchievements = interception.Intercept(function (requestBody, context) {
    var x = requestBody.x;
    var y = requestBody.y;

    context.log("First number = " + x);
    context.log("Second number = " + y);
    context.log("Answer = " + (x + y));
    context.succeed(x + y);
});

exports.GetClaimedAchievements = interception.Intercept(function (requestBody, context) {
    var x = requestBody.x;
    var y = requestBody.y;

    context.log("First number = " + x);
    context.log("Second number = " + y);
    context.log("Answer = " + (x + y));
    context.succeed(x + y);
});

exports.ClaimAchievements = interception.Intercept(function (requestBody, context) {
    var x = requestBody.x;
    var y = requestBody.y;

    context.log("First number = " + x);
    context.log("Second number = " + y);
    context.log("Answer = " + (x + y));
    context.succeed(x + y);
});