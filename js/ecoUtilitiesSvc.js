angular.module("sampleApp").service('ecoUtilitiesSvc', function($q,$http,modalService,$localStorage) {

    let termService = "https://r4.ontoserver.csiro.au/fhir/"

    return {

        expandVSbyUrl : function (url) {
            var deferred = $q.defer();
            let qry = `${termService}ValueSet/$expand?url=${url}`
            $http.get(qry).then(
                function(data) {
                    deferred.resolve(data.data)     //will be an expanded VS
                }, function(err) {
                    deferred.reject(err)
                }
            )
            return deferred.promise

        },

        findConformanceResourceByUri : function(url,serverUrl,typeOfConformanceResource) {
            //find a StructureDefinition based on its Uri. ie we query the registry to find the required SD
            //copied from rbServices
            var deferred = $q.defer();

            typeOfConformanceResource = typeOfConformanceResource || 'StructureDefinition';
            serverUrl = serverUrl || "http://fhirtest.uhn.ca/baseDstu3/";
            var qry = serverUrl  + typeOfConformanceResource + "?url=" + url;



            $http.get(qry).then(
                function(data){
                    var bundle = data.data;
                    if (bundle && bundle.entry && bundle.entry.length > 0) {
                        //return the first on if more than one...
                        deferred.resolve(bundle.entry[0].resource);
                    } else {
                        deferred.reject({msg:"No matching profile ("+url+") found on "+serverUrl  + typeOfConformanceResource +" (but not a server error - just not present)"})
                    }
                },function(err){
                    deferred.reject({msg:"Server error retrieving profile:" +url + " : " + angular.toJson(err)})
                }
            );
            return deferred.promise;
        },

        getObjectSize : function(obj) {
            //http://www.russwurm.com/uncategorized/calculate-memory-size-of-javascript-object/

            function roughSizeOfObject( object ) {
                var objectList = [];
                var recurse = function( value ) {
                    var bytes = 0;

                    if ( typeof value === 'boolean' ) {
                        bytes = 4;
                    } else if ( typeof value === 'string' ) {
                        bytes = value.length * 2;
                    } else if ( typeof value === 'number' ) {
                        bytes = 8;
                    } else if (typeof value === 'object'
                        && objectList.indexOf( value ) === -1) {
                        objectList[ objectList.length ] = value;
                        for( i in value ) {
                            bytes+= 8; // assumed existence overhead
                            bytes+= recurse( value[i] )
                        }
                    }
                    return bytes;
                }

                return recurse( object );
            }

            return roughSizeOfObject(obj)
        },

        generateHash : function(){
            var hash = "";
            var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 5; i++ ) {
                hash += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return hash;
        },

        performQueryFollowingPaging : function(url,limit){
            //Get all the resurces specified by a query, following any paging...
            //http://stackoverflow.com/questions/28549164/how-can-i-do-pagination-with-bluebird-promises

            var returnBundle = {total:0,type:'searchset',link:[],entry:[]};
            returnBundle.link.push({relation:'self',url:url})

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
                    function(data) {
                        var bundle = data.data;     //the response is a bundle...

                        //copy all resources into the array..
                        if (bundle && bundle.entry) {
                            bundle.entry.forEach(function(e){
                                returnBundle.entry.push(e);
                            })
                        }

                        //is there a link
                        if (bundle.link) {
                            var moreToGet = false;
                            for (var i=0; i < bundle.link.length; i++) {
                                var lnk = bundle.link[i];

                                //if there is a 'next' link and we're not at the limit then get the next page
                                if (lnk.relation == 'next'){// && returnBundle.entry.length < limit) {
                                    moreToGet = true;
                                    var url = lnk.url;

                                    //todo - this is a real hack as the NZ server is not setting the paging correctly...

                                    url = url.replace('http://127.0.0.1:8080/baseDstu2','http://fhir.hl7.org.nz/baseDstu2')

                                    getPage(url);
                                    break;
                                }
                            }

                            //all done, return...
                            if (! moreToGet) {
                                deferred.resolve(returnBundle);
                            }
                        } else {
                            deferred.resolve(returnBundle);
                        }
                    },
                    function(err) {
                        deferred.reject(err);
                    }
                )
            }

            return deferred.promise;

        }
    }

    });