angular.module("sampleApp")
    .controller('hooksCtrl',
        function ($scope,$http,modalService,$q,$uibModal) {

            $scope.input = {}
            //$scope.input.patientid = 7268;        //on publoic hapi
            $scope.input.patientid = 68052;     //on local server
            //68052 on local server - http://localhost:8080/baseDstu3/

            //default to hapi
            $scope.input.patientid = 7268;        //on publoic hapi
            var dataServer = "http://fhirtest.uhn.ca/baseDstu3/";

            //var dataServer = "http://snapp.clinfhir.com:8081/baseDstu3/";   //clinfhir stu3 server
            //var dataServer = "http://localhost:8080/baseDstu3/";        //local server
            $scope.dataServer = dataServer;


            $scope.selectDataServer = function(svr) {
                console.log(svr)
                $scope.dataServer = svr.address;
            };

            $scope.selectPatient = function() {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop. stuffs up the original settings...
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/hooksFindPerson.html',
                    size:'lg',
                    controller: 'hooksFindPersonCtrl',
                    resolve : {
                        dataServerUrl: function() {
                            return $scope.dataServer;
                        },
                        resourceType : function(){
                            return 'Patient';
                        }
                    }
                }).result.then(
                    function(patient) {
                        if (patient) {
                            $scope.input.patientid = patient.id;
                        }
                    }
                )
            };

            $scope.selectPractitioner = function() {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop. stuffs up the original settings...
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/hooksFindPerson.html',
                    //size:'lg',
                    controller: 'hooksFindPersonCtrl',
                    resolve : {
                        dataServerUrl: function() {
                            return $scope.dataServer;
                        },
                        resourceType : function(){
                            return 'Practitioner';
                        }
                    }
                }).result.then(
                    function(practitioner) {
                        if (practitioner) {
                            $scope.input.practitionerid = practitioner.id;
                        }
                    }
                )
            };

            $scope.invoke = function(){
                var payload = {};
                payload.hook = $scope.selectedHook.hook;
                payload.hookInstance = uuidv4(); //"decb68d5-c076-4f72-b1f2-be9f895e0249";
                payload.user = 'Practitioner/213';
                //payload.fhirServer = dataServer;
                payload.patient = "Patient/"+$scope.input.patientid;

                var arQuery = []
                if ($scope.selectedHook.prefetch) {
                    //payload.prefetch = {};
                    angular.forEach($scope.selectedHook.prefetch,function(v,k) {

                        //replace the placeholders
                        v = v.replace("{{Patient.id}}",$scope.input.patientid)
                        //console.log(v)
                        var url = $scope.dataServer + v;
                        arQuery.push($http.get(url).then(
                            function(data){
                                var resource = data.data;
                                if (resource.resourceType == 'Bundle') {
                                    payload.prefetch = payload.prefetch || {}
                                    payload.prefetch[k]= resource;//.entry[0];       //just the first one for now...
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


                var url = $scope.selectedServer.address;
                if (url.substr(-1,1) !== '/') {url += '/'}

                url += 'cds-services/' + $scope.selectedHook.id;
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
                delete $scope.request;
                delete $scope.response;
                delete $scope.url;
                delete $scope.selectedHook;
                console.log(svr)
                $scope.selectedServer = svr;

            };

            $scope.selectHook = function(hook) {
                delete $scope.request;
                delete $scope.response;
                delete $scope.url;
                //console.log(hook)
                $scope.selectedHook = hook;
            };

            // var url = '/server'
            $scope.lstServers = [];         //servers that have CDS hooks defined...
            $scope.allServers = [];
            $http.get('/server').then(
                function(data) {
                    data.data.forEach(function (svr) {
                        if (svr.address) {
                            $scope.allServers.push(svr);
                            if (svr.address == $scope.dataServer) {
                                $scope.input.newDataServer = svr
                            }

                            if (svr.allHooks) {
                                $scope.lstServers.push(svr);
                            }
                        }

                    })

                }
            );


            function uuidv4() {
                //https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }


            /*
            //this represents the fhir interface exposed by the 'client' - tp allow the hooks service
            //to query for extra data it needs.
            var ehrFhirServer = "http://localhost:8443/ehrFhir/";
            $http.post("https://localhost:8443/ehrFhir/server",dataServer).then(
                function(data) {
                    console.log(data)
                },
                function(err) {
                    console.log('err',err)
                }
            )
*/


        }
    );