angular.module("sampleApp")
    .controller('addClientToScenarioCtrl',
        function ($scope,ecosystemSvc,allClients,scenario) {

            console.log(allClients)
           // $scope.dlgAllServers = [];
            $scope.scenario = scenario;

            $scope.dlgAllClients = allClients;

            $scope.dlgScenario = scenario;

            $scope.selectClient = function(clnt) {
                $scope.selectedClient = clnt;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };

            $scope.addClient = function(){
                $scope.$close({client:$scope.selectedClient,role:$scope.selectedRole})
            }
        }
    );