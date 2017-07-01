/**
 * Created by Jafarzadeh on 5/16/2017.
 */
var _ = require("./../lodash/lodash");
var internalFetchAll = function (index, objects, result) {
    if(index == objects.length){
        if(_.isFunction(result.success))
            result.success(objects);
    }else{
        objects[index].fetch({success:function (obj) {
            objects[index] = obj;
            internalFetchAll(index+1,objects,result);
        },error:function () {
/*            if(_.isFunction(result.error))
                result.error(objects);*/
            objects[index] = null;
            internalFetchAll(index+1,objects,result);
        }});
    }
}
exports.fetchAll=function(objects,result){
    internalFetchAll(0,objects,result);
}

exports.getRelationObjects = function (relation) {
    var results = [];
    for(var i = 0; i < relation.size(); i++){
        results.push(relation.getByIndex(i));
    }
    return results;
}