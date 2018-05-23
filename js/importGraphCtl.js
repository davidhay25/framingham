
angular.module("sampleApp")
    .controller('importGraphCtrl',
        function ($scope,cofSvc,allScenariosThisTrack,ecosystemSvc,$http) {

            var hashScenario={};
            $scope.allGraphs = [];
            var url = "/scenarioGraph/";
            $scope.waiting = true;



            $http.get(url).then(
                function(data) {
                    var allGraphs = data.data;
                    allGraphs.forEach(function (graph) {


                        if (! graph.user) {
                            var user = ecosystemSvc.getPersonWithId(graph.userid);
                            if (user) {
                                graph.user = user;
                            }
                        }
                        graph.scenario = ecosystemSvc.getScenarioWithId(graph.scenarioid);


                    });


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
                    } else {
                        alert('There were no scenario definitions passed into the import function')
                    }
                },
                function(err) {
                    alert('Error getting scenarios: '+ angular.toJson(err))
                }
            ).finally(function(){$scope.waiting = false;});

        




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
