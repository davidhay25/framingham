angular.module("sampleApp")
    .controller('addClientToScenarioCtrl',
        function ($scope,ecosystemSvc,allClients,scenario,modalService) {

            console.log(allClients)
           // $scope.dlgAllServers = [];
            $scope.scenario = scenario;


            //only include roles that have no role (server, client) or where the role.role !== server
            $scope.roles = [];
            if (scenario.roles) {
                scenario.roles.forEach(function (role) {
                    if (role.role && role.role == 'server') {
                        //ignore
                    } else {
                        $scope.roles.push(role)
                    }
                });
            }


            $scope.dlgAllClients = allClients;

            $scope.dlgScenario = scenario;

            $scope.selectClient = function(clnt) {
                $scope.selectedClient = clnt;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };

            $scope.addClient = function(){

                //make sure this combination has not already been added...
                var canAdd = true;
                scenario.clients = scenario.clients || []
                scenario.clients.forEach(function (clientRole) {
                    if (clientRole.client.id == $scope.selectedClient.id && clientRole.role.id == $scope.selectedRole.id) {
                        canAdd = false;
                    }
                });

                if (!canAdd) {
                    modalService.showModal({},{bodyText:"This combination of client and role has already been specified for this scenario."})
                    return;
                }
                $scope.$close({client:$scope.selectedClient,role:$scope.selectedRole})
            }
        }
    );