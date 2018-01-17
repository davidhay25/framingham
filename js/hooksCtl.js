angular.module("sampleApp")
    .controller('hooksCtrl',
        function ($scope,$http,modalService,$q) {

            $scope.input = {}
            $scope.input.patientid = 7268;

            //var dataServer = "http://fhirtest.uhn.ca/baseDstu3/";
            var dataServer = "http://snapp.clinfhir.com:8081/baseDstu3/";   //clinfhir stu3 server

            $scope.invoke = function(){
                var payload = {};
                payload.hook = $scope.selectedHook.hook;
                payload.hookInstance = "decb68d5-c076-4f72-b1f2-be9f895e0249";
                payload.user = 'Practitioner/213';
                payload.fhirServer = dataServer;
                payload.patient = "Patient/"+$scope.input.patientid;

                var arQuery = []
                if ($scope.selectedHook.prefetch) {
                    //payload.prefetch = {};
                    angular.forEach($scope.selectedHook.prefetch,function(v,k) {

                        //replace the placeholders
                        v = v.replace("{{Patient.id}}",$scope.input.patientid)
                        //console.log(v)
                        var url = dataServer + v;
                        arQuery.push($http.get(url).then(
                            function(data){
                                var resource = data.data;
                                if (resource.resourceType == 'Bundle') {
                                    payload.prefetch = payload.prefetch || {}
                                    payload.prefetch[k]= resource.entry[0];       //just the first one for now...
                                } else {
                                    var entry = {resource : resource};
                                    entry.response = {"status" : "200 OK"};
                                    payload.prefetch = payload.prefetch || {};
                                    payload.prefetch[k]=entry;
                                }
                            }, function(err) {
                                console.log(err)
                            }
                        ))
                    });

                    $q.all(arQuery).then(function(data){
                        console.log(data);
                        callService(payload);
                    },function(err){
                        console.log(err);
                    })

                } else {
                    //no prefetch...
                    callService(payload);
                }


            };


            var callService = function(payload) {
                delete $scope.request;
                delete $scope.response;
                delete $scope.url;

                var url = $scope.selectedServer.address + 'cds-services/' + $scope.selectedHook.id;
              /*  var payload = {};
                payload.hook = $scope.selectedHook.hook;
                payload.hookInstance = "decb68d5-c076-4f72-b1f2-be9f895e0249";
                payload.user = 'Practitioner/213';
                payload.fhirServer = dataServer;
                payload.patient = "Patient/7268";



                payload.prefetch = {patientToGreet:$scope.patientEntry}
*/
                $scope.url = url;

                $scope.request = payload;
                var proxyUrl = 'proxyfhir/'+url
                $http.post(proxyUrl,payload).then(
                    function(data) {
                        console.log(data)
                        $scope.response = data.data;
                    },
                    function(err) {
                        $scope.response = err;
                    }
                )

            };

            $scope.selectServer = function(svr) {
                console.log(svr)
                $scope.selectedServer = svr;

            };

            $scope.selectHook = function(hook) {
                console.log(hook)
                $scope.selectedHook = hook;
            };

            // var url = '/server'
            $scope.lstServers = []
            $http.get('/server').then(
                function(data) {
                    data.data.forEach(function (svr) {
                        if (svr.allHooks) {
                            $scope.lstServers.push(svr);
                        }
                    })

                }
            );

        }
    );