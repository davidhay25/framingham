angular.module("sampleApp")
    .controller('cofSummaryCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal,cofSvc) {

            $scope.input = {};

            //a single graph (for a single user) is selected
            $scope.selectGraph = function(graph){
                console.log(graph)
                $scope.selectedGraph = graph;
                makeGraph(graph.items)

                //now generate the complete set of sample/notes summaries
                $scope.allHashPathSummaries = [];
                graph.items.forEach(function(item){
                    var summary = makeItemSummary(item)
                    if (summary.hasData) {
                        $scope.allHashPathSummaries.push({type:item.type,summary:summary})
                    }

                });
                console.log($scope.allHashPathSummaries)

            };

            //select an item/resource from the graph
            $scope.selectItem = function(item) {
                console.log(item);

                $scope.item = item;

                //a hash of notes & samples by path...
                $scope.hashPathSummary = makeItemSummary(item);


                /*
                if (item.notes || item.sample) {
                    //build a hash of rows by id (item.table must be present)
                    var hashRows = {};
                    item.table.forEach(function (row) {
                        hashRows[row.id] = row
                    });

                    //if there are any notes for this item/resource
                    if (item.notes) {
                        angular.forEach(item.notes,function(v,id){
                            var h = hashRows[id]
                            var path = h.path;

                            $scope.hashPathSummary[path] = $scope.hashPathSummary[path] || {};
                            var t = $scope.hashPathSummary[path];

                            t.path = h.path;
                            t.notes = t.notes || [];
                            t.notes.push(v)
                        })
                    }


                    if (item.sample) {
                        angular.forEach(item.sample,function(v,id){
                            var h = hashRows[id]
                            var path = h.path;

                            $scope.hashPathSummary[path] = $scope.hashPathSummary[path] || {};
                            var t = $scope.hashPathSummary[path];

                            t.path = h.path;
                            t.sample = t.sample || [];
                            t.sample.push(v)
                        })
                    }
                }

*/
                console.log($scope.hashPathSummary)




            };


            //construct a summary object for the samples and notes in a specific graph...
            function makeItemSummary(item) {
                var hashPathSummary = {hasData: false};
                if (item.notes || item.sample) {

                    //build a hash of rows by id (item.table must be present)
                    var hashRows = {};
                    item.table.forEach(function (row) {
                        hashRows[row.id] = row
                    });

                    //if there are any notes for this item/resource
                    if (item.notes) {

                        angular.forEach(item.notes,function(v,id){
                            hashPathSummary.hasData = true;     //have to do it here, as there can be am empty object
                            var h = hashRows[id]
                            var path = h.path;

                            hashPathSummary[path] = hashPathSummary[path] || {};
                            var t = hashPathSummary[path];

                            t.path = h.path;
                            t.notes = t.notes || [];
                            t.notes.push(v)
                        })
                    }


                    if (item.sample) {

                        angular.forEach(item.sample,function(v,id){
                            hashPathSummary.hasData = true;     //have to do it here, as there can be am empty object
                            var h = hashRows[id]
                            var path = h.path;

                            hashPathSummary[path] = hashPathSummary[path] || {};
                            var t = hashPathSummary[path];

                            t.path = h.path;
                            t.sample = t.sample || [];
                            t.sample.push(v)
                        })
                    }
                }
                return hashPathSummary;


            }

            //a scenario is selected (from the top selection box)...
            $scope.sumSelectScenario = function(scenario) {
                if ($scope.graph) {
                    $scope.graph.destroy()
                }
                //delete $scope.graph;
                delete $scope.graphs;
                delete $scope.allHashPathSummaries;
                delete $scope.selectedGraph;

                //retrieve all of the scenarios (actually referred to as graphs) for this scenario...
                $scope.selectedScenario = scenario;
                if (scenario) {
                    var url = "/scenarioGraph/"+scenario.id
                    $http.get(url).then(
                        function(data) {
                            $scope.graphs = data.data;
                            console.log($scope.graphs);

                            //add the user object so er can display in the list...
                            $scope.graphs.forEach(function (graph) {
                                graph.user = ecosystemSvc.getPersonWithId(graph.userid);
                            })

                        },
                        function(err) {
                            console.log(err)
                        }
                    )
                }


            };


            //'selectedTrack' comes from the parent scope...
            $scope.$watch(function(scope) {return scope.selectedTrack},function(track,olfV){
            ///$scope.$watch('selectedTrack',function(track){
                if (track && track.scenarios) {

                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true,track)
                            })
                        }
                    });


                    $scope.sumSelectScenario(track.scenarios[0]);
                    $scope.input.scenario = track.scenarios[0];

                    /*loadScenarioGraph(function(){
                        makeGraph();
                    });
*/

                }

            });



            function makeGraph(lst) {

                var vo = cofSvc.makeGraph(lst);
                var graphData = vo.graphData;

                var container = document.getElementById('sumCofGraph');
                var options = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };

                $scope.graph = new vis.Network(container, graphData, options);


                $scope.graph.on("click", function (obj) {

                    var nodeId = obj.nodes[0];  //get the first node
                    var node = graphData.nodes.get(nodeId);
                    var item = node.item;
                    if (item) {
                        $scope.selectItem(item);
                        $scope.$digest();
                    }
                });
            }



        })