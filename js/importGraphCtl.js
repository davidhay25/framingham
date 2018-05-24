
angular.module("sampleApp")
    .controller('importGraphCtrl',
        function ($scope,cofSvc,allScenariosThisTrack,ecosystemSvc,$http) {

            var hashScenario={};
            $scope.allGraphs = [];      //the array of graphs to diaplsy
            var url = "/scenarioGraph/";
            $scope.waiting = true;
            $scope.input = {};

            var currentUser = ecosystemSvc.getCurrentUser();

            $scope.mineOnly = function(mineOnly) {
                console.log(mineOnly)

                if (mineOnly) {
                    if (currentUser && $scope.allGraphsForEvent) {
                        $scope.allGraphs.length = 0;
                        $scope.allGraphsForEvent.forEach(function(graph) {
                            if (graph.userid == currentUser.id && hashScenario[graph.scenarioid]) { //this user and a valid scenario
                                graph.scenario = hashScenario[graph.scenarioid]
                                $scope.allGraphs.push(graph)
                            }
                        })
                    }
                } else {
                    if ($scope.input.selectedScenario) {
                        $scope.selectScenario($scope.input.selectedScenario)
                    }

                }



            };

            //load all the scenario graphs for this track...
            $http.get(url).then(
                function(data) {
                    //var allGraphs = data.data;
                    $scope.allGraphsForEvent = data.data;

                    $scope.allGraphsForEvent.forEach(function (graph) {
                        if (! graph.user) {
                            var user = ecosystemSvc.getPersonWithId(graph.userid);
                            if (user) {
                                graph.user = user;
                            }
                        }
                        graph.scenario = ecosystemSvc.getScenarioWithId(graph.scenarioid);
                    });

                    //sort by the name of the person who created it...
                    $scope.allGraphsForEvent.sort(function(a,b){
                        if (a.user && a.user.name && b.user && b.user.name) {
                            if (a.user.name.toLowerCase() > b.user.name.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        }
                    });

                    if (allScenariosThisTrack) {
                        $scope.allScenarios = angular.copy(allScenariosThisTrack);

                        //the list of scenario...
                        var initial = {name:'All Scenarios',id:'allScenarios'};
                        $scope.allScenarios.splice(0,0,initial);
                        $scope.input.selectedScenario = initial;


                        allScenariosThisTrack.forEach(function (scenario) {
                            hashScenario[scenario.id] = scenario;
                        });

                        //only add graphs from the same track...
                        $scope.allGraphsForEvent.forEach(function(graph) {
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


            //when a single scenario is selected for display
            $scope.selectScenario = function(scenario){
                console.log(scenario)
                $scope.input.mineOnly = false;
                if (scenario.id == 'allScenarios') {
                    $scope.allGraphs.length = 0;
                    $scope.allGraphsForEvent.forEach(function(graph) {
                        if (hashScenario[graph.scenarioid]) {
                            graph.scenario = hashScenario[graph.scenarioid]
                            $scope.allGraphs.push(graph)
                        }
                    })
                } else {
                    $scope.allGraphs.length = 0;
                    $scope.allGraphsForEvent.forEach(function(graph) {
                        if (graph.scenarioid == scenario.id) {
                            graph.scenario = hashScenario[graph.scenarioid]
                            $scope.allGraphs.push(graph)
                        }

                    })
                }
            };

            $scope.selectGraph = function(shortGraph){

                var url = "/oneScenarioGraph/"+shortGraph.id

                $http.get(url).then(
                    function(data) {
                        $scope.selectedGraph = data.data;
                        makeGraph($scope.selectedGraph.items)
                    },
                    function(err) {
                        alert('error retrieving graph: '+angular.toJson(err))
                    }
                );

                //var url = "/scenarioGraph/";


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
