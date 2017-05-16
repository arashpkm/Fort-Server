var _ = require("./../lodash/lodash");
var iapProviders={};
var normalizedPath = require("path").join(__dirname, "Providers");
require("fs").readdirSync(normalizedPath).forEach(function(file) {
    var provider = require("./Providers/" + file);
    iapProviders[provider.getName()]=provider;
});

exports.getProvider = function (name) {
    return iapProviders[name];
};

exports.getProvidersName = function () {
    return _.keys(iapProviders);
};

