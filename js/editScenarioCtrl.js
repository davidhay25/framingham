angular.module("sampleApp")
    .controller('editScenarioCtrl',
        function ($scope,ecosystemSvc,scenario,allResourceTypes,library,modalService) {

            $scope.scenario = scenario;
            $scope.library = library;
            $scope.input = {};

            if (scenario && library && scenario.cfScenario) {
                for (var i=0; i<library.length;i++) {
                    var item = library[i];
                    if (item.name == $scope.scenario.cfScenario.name) {
                        $scope.input.selectedLibraryItem = item;
                        $scope.selectedLibrary = item;
                        break;
                    }
                }
            }

            $scope.libraryItemSelected = function(item){
                console.log(item)
                $scope.selectedLibrary = item;
                $scope.scenario.cfScenario = {name:item.name};
            };

            $scope.selectHxItem = function(hx) {
               // console.log(hx)

                var vo = ecosystemSvc.makeGraph(hx.bundle);


                var container = document.getElementById('resourceGraph');
                var options = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };

                $scope.graph = new vis.Network(container, vo.graphData, options);


            };

            scenario.scenarioTypes = scenario.scenarioTypes || []
            scenario.links = scenario.links || []



            $scope.allResourceTypes = allResourceTypes;


            $scope.addStep = function(step){
                $scope.scenario.steps = $scope.scenario.steps || []
                $scope.scenario.steps.push(step);
                delete $scope.input.newStep;
            };

            $scope.addType = function(type) {
                scenario.scenarioTypes.push(type.name);
            };

            $scope.addLink = function(link) {
                scenario.links.push({url:link});
                delete $scope.input.link
            };
            $scope.removeLink = function(inx){
                scenario.links.splice(inx,1)
            };

            $scope.updateScenario = function(){
                if (! $scope.scenario.name) {
                    alert("The scenario name is required.")
                    return;
                }
                $scope.$close(scenario)
            };

            function cfLibraryHistorySummary(hx){
                $scope.hxSummary = []
                hx.forEach(function (item) {
                    var hashResource = {}

                })

            }
        }
    );