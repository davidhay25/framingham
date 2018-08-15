angular.module("demoApp",[])
    .controller('demoCtrl',
        function ($scope,$http) {

            $scope.log = [];
            $scope.state = 'search'
            $scope.input = {};
            $scope.input.name = 'hay';
            $scope.serverUrl = "http://snapp.clinfhir.com:8081/baseDstu3/";

            $scope.selectEntry = function(entry){
                $scope.patient = entry.resource;
                $scope.state = 'summary';

                var url = $scope.serverUrl + "AdverseEvent?subject=Patient/"+$scope.patient.id;
                $scope.log.push({method:'GET',url:"AdverseEvent?subject=Patient/"+$scope.patient.id})
                $http.get(url).then(
                    function(data) {
                        $scope.adverseReactions = data.data;
                        console.log($scope.adverseReactions)
                    }, function(err) {
                        alert(err.data)
                    }
                )


            };

            $scope.showLog = function() {
                $scope.state = 'showlog';
            }

            $scope.searchPatient = function(){
                delete $scope.patient;
                delete $scope.adverseReactions;
                $scope.state = 'search'
            }

            $scope.findPatient = function(name) {
                var url = $scope.serverUrl + "Patient?name="+name;
                $scope.log.push({method:'GET',url:"Patient?name="+name})
                $http.get(url).then(
                    function(data) {

                        $scope.patients = data.data;
                        console.log($scope.patients)
                    }, function(err) {
                        alert(err.data)
                    }
                )
            }
        })
