angular.module("sampleApp")
    .controller('loginCtrl',
        function ($scope,$http,modalService,keys) {

            $scope.input = {}
            $scope.keys = keys;

            console.log(keys);

            $scope.personSelected = function(person) {
                $scope.person = person;
            };

            $scope.dbSelected = function(item) {
                //a db has been selected - get all the users for that session
                $scope.item = item;
                $http.get("/public/getUsers/"+item.key).then(
                    function(data) {
                        console.log(data)
                        $scope.allPersons = data.data;
                    },
                    function(err) {
                        alert(angular.toJson(err))
                    }
                );
                console.log(item)
            };

            $scope.addPerson = function(flag){
                $scope.input.newPerson =flag;
            };

            $scope.login = function() {
                if ($scope.input.newPersonName) {
                    $scope.$close({event:$scope.item,
                        newPerson:{name:$scope.input.newPersonName,contact:[],id:'id'+new Date().getTime()}})
                } else {
                    $scope.$close({event:$scope.item,person:$scope.person})
                }
            }

    });