angular.module("sampleApp")
    .controller('addServerToScenarioCtrl',
        function ($scope,ecosystemSvc,allServers,scenario) {

            console.log(allServers)
            $scope.dlgAllServers = [];
            $scope.scenario = scenario;

            $scope.dlgAllServers = allServers;
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
                $scope.$close({server:$scope.selectedServer,role:$scope.selectedRole})
            }
        }
    );