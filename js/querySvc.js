

angular.module("sampleApp").service('querySvc', function($http,$q) {

    return {
        performQueryFollowingPaging: function (url, limit) {
            //Get all the resurces specified by a query, following any paging...
            //http://stackoverflow.com/questions/28549164/how-can-i-do-pagination-with-bluebird-promises

            var returnBundle = {total: 0, type: 'searchset', link: [], entry: []};
            returnBundle.link.push({relation: 'self', url: url})

            //add the count parameter
            if (url.indexOf('?') > -1) {
                url += "&_count=100"
            } else {
                url += "?_count=100"
            }


            var deferred = $q.defer();

            limit = limit || 100;


            // var returnBundle = {total:0,type:'searchset',link:[],entry:[]};
            //returnBundle.link.push({relation:'self',url:url})
            getPage(url);

            //get a single page of data
            function getPage(url) {
                return $http.get(url).then(
                    function (data) {
                        var bundle = data.data;     //the response is a bundle...

                        //copy all resources into the array..
                        if (bundle && bundle.entry) {
                            bundle.entry.forEach(function (e) {
                                returnBundle.entry.push(e);
                            })
                        }

                        //is there a link
                        if (bundle.link) {
                            var moreToGet = false;
                            for (var i = 0; i < bundle.link.length; i++) {
                                var lnk = bundle.link[i];

                                //if there is a 'next' link and we're not at the limit then get the next page
                                if (lnk.relation == 'next') {// && returnBundle.entry.length < limit) {
                                    moreToGet = true;
                                    var url = lnk.url;

                                    //todo - this is a real hack as the NZ server is not setting the paging correctly...

                                    url = url.replace('http://127.0.0.1:8080/baseDstu2', 'http://fhir.hl7.org.nz/baseDstu2')


                                    getPage(url);
                                    break;
                                }
                            }

                            //all done, return...
                            if (!moreToGet) {
                                deferred.resolve(returnBundle);
                            }
                        } else {
                            deferred.resolve(returnBundle);
                        }
                    },
                    function (err) {
                        deferred.reject(err);
                    }
                )
            }

            return deferred.promise;

        }
    }
})