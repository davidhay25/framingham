angular.module("sampleApp")
    .controller('cofSummaryCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal,cofSvc) {

            $scope.input = {};


            $scope.selectResourceSummary = function(type,summary) {
                $scope.selectedSummaryType = type;
                $scope.selectedSummary = summary;
                $scope.selectedSummary.sort(function(a,b){
                    if (a.path > b.path) {
                        return 1
                    } else {
                        return -1;
                    }
                })

            };

            $scope.filteredGraph = false;
            $scope.setFocus = function() {
                $scope.filteredGraph = ! $scope.filteredGraph

                console.log($scope.currentItem);
                if ($scope.filteredGraph) {
                    console.log($scope.item);
                    makeGraph($scope.selectedGraph.items,$scope.item.id)
                } else {
                    makeGraph($scope.selectedGraph.items)
                }


            };

            //a single graph (for a single user) is selected from the list at the left...
            $scope.selectGraph = function(graph){
                $scope.filteredGraph = false;       //set the filter off to start with...
                delete $scope.item;                 //this is a selected item in teh selected graph

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


            };

            //select an item/resource from the graph
            $scope.selectItem = function(item) {


                $scope.item = item;

                //a hash of notes & samples by path...
                $scope.hashPathSummary = makeItemSummary(item);



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

                $scope.hashResources = {};

                //retrieve all of the scenarios (actually referred to as graphs) for this scenario...
                $scope.selectedScenario = scenario;
                if (scenario) {
                    var url = "/scenarioGraph/"+scenario.id
                    $http.get(url).then(
                        function(data) {
                            $scope.graphs = data.data;


                            //add the user object so er can display in the list...
                            $scope.graphs.forEach(function (graph) {
                                graph.user = ecosystemSvc.getPersonWithId(graph.userid);

                                if (graph.items) {
                                    graph.items.forEach(function(item){
                                        $scope.hashResources[item.type] = $scope.hashResources[item.type] || [];

                                        if (item.notes) {
                                            //there are notes for this item (== resource)
                                            //create a hash of id for this item
                                            var hashId = {}
                                            item.table.forEach(function (row) {
                                                hashId[row.id] = row;
                                            })
                                            angular.forEach(item.notes,function(note,id){
                                                var lne = {user:graph.user.name,path:hashId[id].path,note:note}

                                                $scope.hashResources[item.type].push(lne)
                                            })

                                        }


                                        //hashResources[item.type].push(item)
                                    })
                                }

                            })





                        },
                        function(err) {
                            console.log(err)
                        }
                    )


                }

            };

            $scope.refreshSummaryList = function(){
                $scope.sumSelectScenario($scope.selectedScenario)
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



            function makeGraph(lst,focusId) {

                var vo = cofSvc.makeGraph(lst,focusId);
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