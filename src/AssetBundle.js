var interception = require("./Interception/Intercept.js");
var Backtory = require("backtory-sdk");
var _ = require("./lodash/lodash");
exports.GetAssetBundles = interception.Intercept(function (requestBody, context) {
    if(!_.has(requestBody,"Platform") || !_.isString(requestBody.Platform))
    {
        context.fail("Invalid Parameter");
        return;
    }
    var AssetBundle = Backtory.Object.extend("AssetBundle");
    var query = new Backtory.Query(AssetBundle);
    query.equalTo("Platform",requestBody.Platform);
    query.find({
        success: function (results) {
            var assetBundles = _.map(results,function (result) {
                return {Name:result.get("Name"),Versions :result.get("Versions")};
            });

            context.succeed(assetBundles);
        },
        error: function (object, error) {
            context.fail("InternalServerError");
        }
    });
});
var UpdateAssetBundle = function(name,versions,platform,resultAction){
    var AssetBundle = Backtory.Object.extend("AssetBundle");
    var query = new Backtory.Query(AssetBundle);
    query.equalTo("Name",name);
    query.equalTo("Platform",platform);
    query.find({
        success: function (results) {
            if(results.length==0){
                var assetBundle = new AssetBundle();
                assetBundle.set("Name",name);
                assetBundle.set("Versions",versions);
                assetBundle.set("Platform",platform);
                assetBundle.save({
                    success: function (savedUserData) {
                        resultAction(true);
                    },
                    error: function (error) {
                        resultAction(false);
                    }
                });

            }else{
                results[0].set("Versions",versions);
                results[0].save({
                    success: function (results) {
                        resultAction(true);
                    },
                    error: function (object, error) {
                        resultAction(false);
                    }
                });
            }
        },
        error: function (object, error) {
            resultAction(false);
        }
    });

};
var UpdateAllAssetBundles = function (index, assetBundles,platform,context) {
    if(index==assetBundles.length) {
        context.succeed({});
    }else {
        UpdateAssetBundle(assetBundles[index].Name,assetBundles[index].Versions,platform,function (result) {
           if(result) {
               UpdateAllAssetBundles(index+1,assetBundles,platform,context);
           }else{
               context.fail("InternalServerError");
           }
        });
    }
};
var UpdateAssetBundles = function (requestBody, context) {
    var AssetBundle = Backtory.Object.extend("AssetBundle");
    var query = new Backtory.Query(AssetBundle);
    if(!_.has(requestBody,"AssetBundles") || !_.isArray(requestBody.AssetBundles))
    {
        context.fail("Invalid Parameter");
        return;
    }
    if(!_.has(requestBody,"Platform") || !_.isString(requestBody.Platform))
    {
        context.fail("Invalid Parameter");
        return;
    }
    UpdateAllAssetBundles(0,requestBody.AssetBundles,requestBody.Platform,context);
};
UpdateAssetBundles.MasterOnly = true;
exports.UpdateAssetBundles = interception.Intercept(UpdateAssetBundles);
