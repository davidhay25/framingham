angular.module("sampleApp")
    .controller('editScenarioCtrl',
        function ($scope,ecosystemSvc,scenario,allResourceTypes,library,$uibModal,modalService) {

            $scope.scenario = scenario;
            $scope.library = library;
            $scope.input = {roles:{}};

            if (scenario && scenario.roleIds) {
                scenario.roleIds.forEach(function (id) {
                    console.log(id)
                    $scope.input.roles[id] = true;
                })
            }

            $scope.allRoles = ecosystemSvc.getAllRoles();
            console.log($scope.allRoles)

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


                $uibModal.open({
                    templateUrl: 'modalTemplates/addLinkToScenario.html',
                    //size: 'lg',
                    controller: function($scope,links){
                        $scope.input = {};
                        $scope.addLink = function() {
                            links.push({url:$scope.input.linkUrl,description:$scope.input.linkDescription});
                            $scope.$close();
                        }
                    },
                    resolve : {
                        links: function () {          //the default config
                            return scenario.links;
                        }
                    }
                }).result.then(function(vo){

                })

                return;

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

                scenario.roleIds = [];
                $scope.allRoles.forEach(function (role) {
                    if ($scope.input.roles[role.id]) {
                        scenario.roleIds.push(role.id)
                    }
                })


                $scope.$close(scenario)
            };

            $scope.makeExampleDEP = function() {
                $scope.exampleScenario = {resourceType:'ExampleScenario',process:[{step:[]}]}


            };

            function cfLibraryHistorySummary(hx){
                $scope.hxSummary = []
                hx.forEach(function (item) {
                    var hashResource = {}

                })

            }
        }
    );