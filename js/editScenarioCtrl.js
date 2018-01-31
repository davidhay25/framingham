angular.module("sampleApp")
    .controller('editScenarioCtrl',
        function ($scope,ecosystemSvc,scenario,allResourceTypes,modalService) {


            scenario.scenarioTypes = scenario.scenarioTypes || []

            $scope.scenario = scenario;

            $scope.allResourceTypes = allResourceTypes;


            $scope.addStep = function(step){
                $scope.scenario.steps = $scope.scenario.steps || []
                $scope.scenario.steps.push(step);
            };

            $scope.addType = function(type) {
                scenario.scenarioTypes.push(type.name);
            }

            $scope.updateScenario = function(){
                if (! $scope.scenario.name) {
                    alert("The scenario name is required.")
                    return;
                }
                $scope.$close(scenario)


/*
                ecosystemSvc.updateClientD(client,isNewClient).then(
                    function(data) {
                        $scope.$close()
                    }, function(err) {
                        alert('Error saving client: '+ angular.toJson(err))
                        $scope.$dismiss()
                    }
                )
                */

            }
        }
    );