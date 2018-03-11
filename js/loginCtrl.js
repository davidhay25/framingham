angular.module("sampleApp")
    .controller('loginCtrl',
        function ($scope,$http,eventConfig) {

            $scope.input = {}
            $scope.eventConfig = eventConfig;


            //get all the users for this event
            $http.get("/public/getUsers/"+eventConfig.key).then(
                function(data) {

                    $scope.allPersons = data.data;
                    $scope.state = 'selectUser';
                },
                function(err) {
                    alert(angular.toJson(err))
                }
            );




            $scope.personSelected = function(person) {
                $scope.person = person;
            };

            $scope.dbSelectedDEP = function(item) {
                //a db (event) has been selected - get all the users for that session
                $scope.item = item;
                $http.get("/public/getUsers/"+item.key).then(
                    function(data) {

                        $scope.allPersons = data.data;
                        $scope.state = 'selectUser';
                    },
                    function(err) {
                        alert(angular.toJson(err))
                    }
                );

            };

            $scope.addPerson = function(flag){
                $scope.input.newPerson =flag;
                $scope.state = 'addUser';
            };

            $scope.login = function() {
                if ($scope.input.newPersonName) {
                    $scope.$close({event:$scope.item,
                        newUser:{name:$scope.input.newPersonName,contact:[],id:'id'+new Date().getTime()}})
                } else {
                    $scope.$close({event:$scope.item,user:$scope.person})
                }
            }

    });