angular.module("sampleApp")
    .controller('addServerCtrl',
        function ($scope,ecosystemSvc,modalService,$http) {

            $scope.input = {};
            var serverExists = false;

            $scope.contactSelected = function(item){
                $scope.selectedPerson = item;
            };

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]

            $scope.checkServerExists = function() {


                if ($scope.input.address.substr(-1) !== '/') {
                    $scope.input.address += '/';
                }

                url = $scope.input.address + 'metadata';
                $scope.waiting = true;
                $http.get(url).then(
                    function(data) {
                        modalService.showModal({},{bodyText:"The CapabilityStatement was returned, so this server can be addded!"});
                        serverExists = true;
                    },
                    function(err) {
                        modalService.showModal({},{bodyText:"There was no CapabilityStatement returned from "+url+". Are you sure address is correct?"});
                    }
                ).finally(function () {
                    $scope.waiting = false;
                })
            };

            $scope.checkName = function() {
                var canAdd = true;
                var allServers = ecosystemSvc.getAllServers();
                allServers.forEach(function (svr) {
                    if (svr.name.toLowerCase() == $scope.input.name.toLowerCase()) {
                        modalService.showModal({},{bodyText:"This server name has already been used. Please use another one."});
                        canAdd = false;
                    }
                });
                return canAdd;
            };

            $scope.addServer = function(){

                if (serverExists) {
                    var server = {id:'id'+new Date().getTime()};
                    server.name = $scope.input.name;
                    server.description = $scope.input.description;
                    server.address = $scope.input.address;
                    server.contact = [$scope.selectedPerson];
                    ecosystemSvc.addNewServer(server).then(
                        function(data) {
                            $scope.$close()
                        }, function(err) {
                            alert('Error saving server: '+ angular.toJson(err))
                            $scope.$dismiss()
                        }
                    )
                }



            }
    }
);