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

                var url = $scope.serverUrl + "Patient?name="+name;
                $http.get(url).then(
                    function(data) {

                        $scope.patients = data.data;
                        console.log($scope.patients)
                    }, function(err) {
                        alert(err.data)
                    }
                )


            };

            $scope.findPatient = function(name) {
                var url = $scope.serverUrl + "Patient?name="+name;
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
