angular.module("sampleApp")
    .controller('addServerCtrl',
        function ($scope,ecosystemSvc,modalService,$http,existingServer) {

            $scope.input = {};
            $scope.input.serverRole = {}
            $scope.saveText = "Add new Server";
            var serverExists = false;

            $scope.eventConfig = ecosystemSvc.getEventConfig();

            if (existingServer) {
                //this is an edit
                serverExists = true;
                $scope.saveText = "Update server";
                $scope.input.name = existingServer.name;
                $scope.input.description = existingServer.description ;
                $scope.input.address = existingServer.address ;

                if (existingServer.contact) {
                    $scope.input.contact = existingServer.contact[0];
                    $scope.selectedPerson = existingServer.contact[0];
                } else {
                    $scope.input.contact = ecosystemSvc.getCurrentUser();
                    $scope.selectedPerson = ecosystemSvc.getCurrentUser();
                }

                $scope.input.serverRoleCount = 0;
                if (existingServer.serverRoles) {
                    existingServer.serverRoles.forEach(function (sr) {
                        $scope.input.serverRole[sr.code] = true;
                        $scope.input.serverRoleCount++;
                    })
                }

                //console.log($scope.input.serverRole)

            } else {
                //this is new...
                $scope.input.contact = ecosystemSvc.getCurrentUser();
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
            }

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
                //if this is an edit, then don't check for dupes!
                if (existingServer) {
                    return true;
                }


                var canAdd = true;
                var allServers = ecosystemSvc.getAllServers();
                allServers.forEach(function (svr) {
                    if (svr.name && (svr.name.toLowerCase() == $scope.input.name.toLowerCase())) {
                        modalService.showModal({},{bodyText:"This server name has already been used. Please use another one."});
                        canAdd = false;
                    }
                });
                return canAdd;
            };

            $scope.addServer = function(){

                if (serverExists) {     //is there a FHIR server at the configured Url?


                    var isNewServer = true;
                    var server = {id:'id'+new Date().getTime()};
                    if (existingServer) {
                        server.id = existingServer.id;
                        isNewServer = false;
                    }


                    server.name = $scope.input.name;
                    server.description = $scope.input.description;
                    server.address = $scope.input.address;
                    server.contact = [$scope.selectedPerson];

                    //now the ecosystem roles
                    server.serverRoles = []
                    console.log($scope.input.serverRole);

                    angular.forEach($scope.input.serverRole,function (v,k) {
                        console.log(v,k)
                        if (v) {
                            server.serverRoles.push({code:k})
                        }
                    });

                    ecosystemSvc.updateServer(server,isNewServer).then(
                        function(data) {
                            $scope.$close()
                        }, function(err) {
                            alert('Error saving server: '+ angular.toJson(err))
                            $scope.$dismiss()
                        }
                    )
                } else {
                    alert("You need to check that the server exists...")
                }



            }
    }
);