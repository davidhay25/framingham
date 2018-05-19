
angular.module("sampleApp")
    .controller('importGraphCtrl',
        function ($scope,allGraphs,cofSvc,allScenariosThisTrack) {
        
            var hashScenario={};
            $scope.allGraphs = []

            if (allScenariosThisTrack) {
                allScenariosThisTrack.forEach(function (scenario) {
                    hashScenario[scenario.id] = scenario;

                });

                //only add graphs from the same track...
                allGraphs.forEach(function(graph) {
                    if (hashScenario[graph.scenarioid]) {
                        graph.scenario = hashScenario[graph.scenarioid]
                        $scope.allGraphs.push(graph)
                    }

                })

            }

            //$scope.allGraphs = allGraphs;//[];

            $scope.selectGraph = function(graph){
                $scope.selectedGraph = graph;
                makeGraph(graph.items)
            };

            $scope.import = function(){

                //remove all the samples and comments....
                delete $scope.selectedGraph.scenarioNotes;
                if ($scope.selectedGraph.items) {
                    $scope.selectedGraph.items.forEach(function(item){
                        item.sample = [];
                        item.notes = [];
                    })
                }



                $scope.$close($scope.selectedGraph)
            };

            function makeGraph(lst) {
                var vo = cofSvc.makeGraph(lst);
                var graphData = vo.graphData;

                var container = document.getElementById('importGraph');
                var options = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };

                $scope.graph = new vis.Network(container, graphData, options);
              /*  $scope.graph.on("click", function (obj) {

                    var nodeId = obj.nodes[0];  //get the first node
                    var node = graphData.nodes.get(nodeId);
                    var item = node.item;
                    if (item) {
                        $scope.selectItem(item);
                        $scope.$digest();
                    }
                }); */
            }



        });
