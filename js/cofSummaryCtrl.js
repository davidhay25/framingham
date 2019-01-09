angular.module("sampleApp")
    .controller('cofSummaryCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal,cofSvc) {

            $scope.input = {};
            $scope.showAllScenarios = false;
            let hashScenarios = {};      //set when the track is selected

            $scope.selectAllScenarios = function(flag){
                $scope.showAllScenarios = flag


                if (flag) {

                    //get all scenarios in this track
                    var hashScenario = {}
                    $scope.selectedTrack.scenarios.forEach( function (scenario) {
                        hashScenario[scenario.id] = scenario;
                    });

                    // selectedTrack.scenarios
                    $http.get('/scenarioGraph').then(
                        function(data) {
                            $scope.graphs.length = 0;

                            data.data.forEach(function (graph) {
                                var t = hashScenario[graph.scenarioid]
                                if (t) {
                                    graph.scenario = t;
                                    graph.user = ecosystemSvc.getPersonWithId(graph.userid);

                                    $scope.graphs.push(graph)
                                }

                            });

                            console.log($scope.graphs)
                        }
                    );


                } else {
                    $scope.sumSelectScenario($scope.selectedScenario)
                }

            };

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

            //show/hide elements in the graph...
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

            //add a comment to the selected item (from the graph)
            $scope.addComment = function(row){

                $uibModal.open({
                    templateUrl: 'modalTemplates/addElementComment.html',
                    size : 'lg',
                    controller: function($scope,commentItem,row,user,graph,moment){
                        $scope.moment = moment;
                        $scope.input = {};
                        $scope.row = row;





                        $scope.save = function() {
                            var url = "/scenarioGraphComment"; //+ commentItem.id;
                            var comment = {graphid:graph.id,itemid:commentItem.id, rowid:row.id,value:$scope.input.comment};
                            if (user) {
                                comment.user = {userid:user.id,name:user.name};
                            }

                            $http.put(url,comment).then(
                                function(data) {
                                    console.log(data)
                                },
                                function(err) {
                                    console.log(err)
                                }
                            ).finally(
                                function() {
                                    $scope.$close();
                                }
                            )
                        }
                    },
                    resolve: {
                        graph : function(){
                            //the graph that the comment is being added to...
                            return $scope.selectedGraph
                        },
                        commentItem : function(){
                            //the item (containing the resource) where the resource instance is...
                            return $scope.commentItem
                        },
                        row : function(){
                            // actual row (ie element) that the comment is attached to
                            return row;
                        },
                        user : function() {
                            return ecosystemSvc.getCurrentUser();
                        }

                    }
                }).result.then(function(row){
                    console.log(row)

                });
            }

            //a single graph (for a single user) is selected from the list at the left...
            $scope.selectGraph = function(shortGraph){
                $scope.filteredGraph = false;       //set the filter off to start with...



                //delete $scope.item;                 //this is a selected item in teh selected graph
                delete $scope.allHashPathSummaries;


                var url = "/oneScenarioGraph/"+shortGraph.id;

                //retrieve the graph...
                $http.get(url).then(
                    function(data) {
                        $scope.selectedGraph = angular.copy(data.data); //not saving the graph back, but you never know...
                        $scope.selectedGraph.scenario = hashScenarios[$scope.selectedGraph.scenarioid];

                        //trck

                        makeGraph($scope.selectedGraph.items);

                        //now generate the complete set of sample/notes summaries (by the graph author)
                        $scope.allHashPathSummaries = [];
                        $scope.selectedGraph.items.forEach(function(item){
                            var summary = makeItemSummary(item)
                            if (summary.hasData) {
                                $scope.allHashPathSummaries.push({type:item.type,summary:summary})
                            }
                        });

                        //now decorate the graph items with the comments...
                        if ($scope.selectedGraph.comments && $scope.selectedGraph.items) {
                            //craete a hask of items - from all rows...
                            var itemHash = {};
                            $scope.selectedGraph.items.forEach(function (item) {
                                var itemId = item.id;
                                if (item.table) {
                                    item.table.forEach(function (row) {
                                        itemHash[itemId + ':' + row.id] = row;  //composite key
                                    })
                                }

                            });

                            console.log(itemHash)
                            //now, add the comments...
                            $scope.selectedGraph.comments.forEach(function (comment) {
                                var cId = comment.itemid + ':' + comment.rowid;
                                if (itemHash[cId]) {
                                    itemHash[cId].comments = itemHash[cId].comments || [];
                                    itemHash[cId].comments.push(comment)
                                    console.log(itemHash[cId])
                                }
                            })

                        }


                        //if there's already a selected item, then find the one with the same id in the new graph and select that...
                        if ($scope.item) {
                            let found = false;

                            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
                            for (const el of $scope.selectedGraph.items) {
                                if (el.id == $scope.item.id) {
                                    $scope.selectItem(el);
                                    found = true;
                                    break;
                                }
                            }

                            if (! found) {
                                $scope.selectItem();    //will clear the details of the selected item..
                            }
                        }


                    },
                    function(err) {
                        alert('error retrieving graph: '+angular.toJson(err))
                    }
                );

            };

            //used to order graphs by name...
            $scope.graphName = function(graph) {
                if (graph && graph.scenario) {
                    return graph.scenario.name;
                }

            }

            //select an item/resource from the graph
            $scope.selectItem = function(item) {

                //clear the current derived values...
                delete $scope.itemResourceJson;
                $('#sumryTreeView').jstree('destroy');
                delete $scope.selectedTreeNode;
                //delete $scope.item;


                if (!item) {
                    return;
                }

                $scope.item = item;     //the item (containing the resourcce)

                var treeData = cofSvc.makeTree(item.table);
                var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);
                if (vo && vo.resource) {
                    $scope.itemResourceJson = vo.resource;
                }

                $scope.commentItem = angular.copy(item);        //will add all the comments to this object...

                if ($scope.commentItem.table) {
                    $scope.commentItem.table.forEach(function (row) {
                        var note = $scope.commentItem.notes[row.id]
                        if (note) {
                            row.authorNote = note;
                        }

                    })
                }


                //a hash of notes & samples by path...
                $scope.hashPathSummary = makeItemSummary(item);

                //draw the tree

                //var treeData = cofSvc.makeTree(table,$scope.hideEmptyInTreeView);
               // $('#sumryTreeView').jstree('destroy');
                $('#sumryTreeView').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    if (data.node) {
                        $scope.selectedTreeNode = data.node;

                        delete $scope.selectedTreeRow;

                        if ($scope.item.table) {
                            $scope.item.table.forEach(function (row) {
                                if (row.id == $scope.selectedTreeNode.data.id) {
                                    $scope.selectedTreeRow = row;
                                }
                            })
                        }

                        //console.log($scope.currentItem.table);


                        $scope.$digest();
                    }
                })


            };

            //construct a summary object for the samples and notes in a specific graph...
            function makeItemSummary(item) {
                var hashPathSummary = {hasData: false};
                if (item.notes || item.sample) {

                    //build a hash of rows by id (item.table must be present - not for imported)
                    var hashRows = {};

                    if (item.table) {
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
                            $scope.graphs = data.data;      //note that this doesn't include the elements...


                            //add the user object so er can display in the list...
                            $scope.graphs.forEach(function (graph) {
                                graph.user = ecosystemSvc.getPersonWithId(graph.userid);

                                //if there's a graph and the user can't be found then ignore...
                                if (graph.items && graph.user) {
                                    graph.items.forEach(function(item){
                                        $scope.hashResources[item.type] = $scope.hashResources[item.type] || [];

                                        if (item.notes && item.table) {
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

                            });

                            $scope.graphs.sort(function(a,b){
                                if (a.user && a.user.name && b.user && b.user.name) {
                                    if (a.user.name > b.user.name) {
                                        return 1
                                    } else {
                                        return -1
                                    }
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

                if (track && track.scenarios) {

                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(scen){
                        hashScenarios[scen.id] = scen
                        if (scen.scenarioTypes) {
                            scen.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true,track)
                            })
                        }
                    });






                    $scope.sumSelectScenario(track.scenarios[0]);
                    $scope.input.scenario = track.scenarios[0];



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

                        //console.log(item)
                        $scope.selectItem(item);
                        $scope.$digest();
                    }
                });
            }



        })