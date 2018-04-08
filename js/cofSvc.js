angular.module("sampleApp").service('cofSvc', function($q,$http,modalService,$localStorage) {


    return {
        makeJson : function(item) {
            console.log(item);
            var data = []
            item.forEach(function (row) {
                if (row.structuredData) {
                    data.push(row)
                }
            })



            return {raw:data};
        }
        }
    })