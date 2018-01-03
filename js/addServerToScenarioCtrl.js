angular.module("sampleApp")
    .controller('addServerToScenarioCtrl',
        function ($scope,ecosystemSvc,allServers,modalService, scenario) {

            console.log(allServers)
            $scope.dlgAllServers = [];
            $scope.scenario = scenario;

            $scope.dlgAllServers = allServers;


            //only include roles that have no role (server, client) or where the role.role !== client
            $scope.roles = [];
            scenario.roles.forEach(function (role) {
                if (role.role && role.role == 'client') {
                    //ignore
                } else {
                    $scope.roles.push(role)
                }

            });


            /* temp - need to allow for roles...
            allServers.forEach(function (svr) {
                var alreadyAdded = false;
                if (scenario.servers) {
                    scenario.servers.forEach(function (svr1) {
                        if (svr1.id == svr.id) {alreadyAdded = true;}
                    })

                }
                if (! alreadyAdded) {
                    $scope.dlgAllServers.push(svr)
                }

            });
*/


            //$scope.dlgAllServers = allServers;
            $scope.dlgScenario = scenario;

            $scope.selectServer = function(svr) {
                $scope.selectedServer = svr;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };


            $scope.addServer = function(svr){


                //make sure this combination has not already been added...
                var canAdd = true;
                scenario.servers = scenario.servers || []
                scenario.servers.forEach(function (serverRole) {
                    if (serverRole.server.id == $scope.selectedServer.id && serverRole.role.id == $scope.selectedRole.id) {
                        canAdd = false;
                    }
                });
                if (!canAdd) {
                    modalService.showModal({},{bodyText:"This combination of server and role has already been specified for this scenario."})
                    return;
                }


                $scope.$close({server:$scope.selectedServer,role:$scope.selectedRole})
            }
        }
    );