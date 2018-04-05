
angular.module("sampleApp")
    .controller('cofCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal) {

            $scope.input = {};
            $scope.cofTypeList = [];

            var objColours = ecosystemSvc.objColours();

            var elementsByType = {};        //hash of all elements for a given type
            var profilesCache = {};          //cache for SDsss
            var allScenarios = {};
            $scope.showvsviewerdialog = {};

            $scope.showResourceTable = {};

            //add a reference to another resourrce
            $scope.addReference = function(row,type) {
                //row is the functional equivalent of an Element definition...
                var path = row.path;        //the path in the source;
                var type = $filter('referenceType')(type.targetProfile); //target

                //now see what instances we have that match the target type
                var targets = [];       //potential targets
                $scope.cofTypeList.forEach(function (item) {
                    if (item.type == type || type == 'Resource') {
                        targets.push(item)
                    }

                });


                console.log(type,targets);
                switch(targets.length) {
                    case 0 :
                        //no resources of this type yet. KJust add one...
                        var item = addItem(type)
                        addReference(row,item);
                        break;
                    case 1 :
                        //there's only one possible target - just add it;
                        addReference(row,targets[0]);
                        break;
                    default:
                        //need to show a dialog to select which one...


                        $uibModal.open({
                            templateUrl: 'modalTemplates/selectResource.html',
                            controller: function($scope,lst,type,source) {
                                $scope.lst = [];

                                lst.forEach(function (item) {
                                    var include = false;
                                    if (type == 'Resource' || item.type == type) {
                                        include = true;
                                    }
                                    if (item.id == source.id) {
                                        include = false;
                                    }
                                    if (include) {
                                        $scope.lst.push(item)
                                    }


                                });


                                //$scope.lst = lst;
                                $scope.type = type;
                                $scope.source = source
                                $scope.select=function(item){
                                    $scope.$close(item)
                                }

                            },
                            resolve : {
                                lst: function(){
                                    return $scope.cofTypeList;
                                },
                                type: function(){
                                    //
                                    return type;
                                },source : function(){
                                    return $scope.currentItem;
                                }
                            }
                        }).result.then(function(item){
                            console.log(item)
                            addReference(row,item);
                        });
                    break;

                }

                function addReference(row,target) {
                    var path = row.path;
                    row.references = row.references || []
                    var reference = {id:'id-'+ new Date().getTime()};
                    $scope.currentItem.references = $scope.currentItem.references || [];

                    //if the
                    if (row.max == 1) {

                        //remove any references from this path in this row...

                        for (var i=0; i < row.references.length; i++) {
                            var ref = row.references[i];
                            if (ref.sourcePath == path) {
                                row.references.splice(i,1);

                                //now to delete this reference from the item object
                                for (var j=0; j < $scope.currentItem.references.length; j++){
                                    if ($scope.currentItem.references[j].id == ref.id) {
                                        $scope.currentItem.references.splice(j,1)
                                        break;
                                    }
                                }


                                break;
                            }
                        }
                        //}
/* for now
                        //there can only be one - remove any other references from this path...
                        for (var i=0; i < $scope.currentItem.references.length; i++) {
                            if ($scope.currentItem.references[i].sourcePath == path) {
                                $scope.currentItem.references.splice(i,1);
                                break;
                            }
                        }
*/
                        //and the same for the row...


                    }


                    //reference.sourceItem = $scope.currentItem;
                    reference.sourcePath = path;
                    reference.targetItem = target;
                    //reference.targetType =
                   // reference.row = row;

                    row.references.push(reference);     //add the reference to the row
                    /*
                    //now, can copy these references to the item references so that the graph can be built...
                    //remove the current ones...
                    for (var i=0; i < $scope.currentItem.references.length; i++) {
                        if ($scope.currentItem.references[i].sourcePath == path) {
                            $scope.currentItem.references.splice(i,1);
                            break;
                        }
                    }
                    //... and add new ones...
                    row.references.forEach(function (ref) {
                        $scope.currentItem.references.push(ref)
                    })

                    */
                    $scope.currentItem.references.push(reference)


                    //add the reference to the row (which will become the instance eventually)
                    //row.references = row.references || []



                    makeGraph();
                }
            };

            $scope.editDescription = function(item) {

                var description = $window.prompt("Enter description",item.description);
                item.description = description;

            };

            //select an item from the list of items. The SD will have been loaded for this type (async) into profilesCache
            $scope.selectItem = function(item) {
                $scope.currentItem = item;
                console.log(item);

                var type = item.type;
                if (profilesCache[type]) {
                    $scope.showResourceTable.open(item,profilesCache[type]);
                } else {
                    var url = "http://hl7.org/fhir/StructureDefinition/" + item.type;

                    ecoUtilitiesSvc.findConformanceResourceByUri(url).then(
                        function (SD) {
                            profilesCache[type] = SD;
                            $scope.showResourceTable.open(item,SD);
                        }
                    )
                }
            };

            $scope.deleteRow = function (inx) {
                $scope.cofScenario.rows.splice(inx,1);
                save();
            };

            $scope.addRow = function() {
                var row = {};
                row.dataItem = $scope.input.dataItem;
                row.example = $scope.input.example;
                row.resourceType = $scope.cofType;
                row.path = $scope.input.path;
                row.mult = $scope.selectedPathElement.min + '..' + $scope.selectedPathElement.max;
                if ($scope.rowType) {
                    row.dataType = $scope.rowType;
                } else {
                    row.dataType = $scope.input.rowType;
                }
                row.notes = $scope.input.rowNotes;
                $scope.cofScenario.rows.push(row);

                //save the updated scenario...
                save();

                $scope.input = {};
                delete $scope.selectedPathElement;
                delete $scope.rowTypeOptions;
                delete $scope.rowType;

            };

            function save() {
                var url = "/addScenarioToTrack/"+$scope.cofScenario.id;
                $http.post(url,$scope.cofScenario).then(
                    function(data) {
                        //now, add the new scenario to the track and update

                    }, function(err) {
                        console.log(err)
                        alert('There was an error '+ angular.toJson(err))
                    }
                );

            }

            $scope.showEDSummary = function(type,path) {

                ecosystemSvc.getAllPathsForType(type,true).then(
                    function(vo) {
                        var ed = vo.hash[path];
                        console.log(path,ed,vo.hash)
                        if (ed) {
                            return ed.definition
                        }
                    }
                )

            };

            $scope.selectPath = function (path) {
                console.log(path,$scope.allPathsHash[path])
                delete $scope.rowType;
                delete $scope.rowTypeOptions;


                $scope.selectedPathElement = $scope.allPathsHash[path]; //this is an ED


                if ($scope.selectedPathElement) {
                    var types = $scope.selectedPathElement.type
                    if (types) {
                        if (types.length == 1) {
                            //there's only a single type...

                            $scope.rowType = getRefDisplay(types[0])

                        } else {
                            $scope.rowTypeOptions = []
                            types.forEach(function (typ) {
                                $scope.rowTypeOptions.push(getRefDisplay(typ));
                            })


                        }
                    }

                }

                function getRefDisplay(typ) {
                    var code = typ.code;

                    if (code == 'Reference') {
                        return '--> '+ $filter('getLogicalID')(typ.targetProfile)

                    } else {
                        return code;
                    }


                }
            };

            //when the user selects a type from the list of types in the scenario...
            $scope.selectCofType = function(type) {
                addItem(type)
            };

            //add an item with a given resource type...
            //note that the cache update is asynchronous...
            function addItem(type) {
                var item = {id : 'id'+new Date().getTime(),  type:type}

                //create a default description based on the number of this type in the list
                var ctr = 1;
                $scope.cofTypeList.forEach(function (t) {
                    if (t.type == type){
                        ctr++
                    }
                })

                item.description = type + " " + ctr

                $scope.cofTypeList.push(item)
                makeGraph();
                console.log(type)

                //load the profile (SD) for the type...
                if ( ! profilesCache[type]) {
                    var url = "http://hl7.org/fhir/StructureDefinition/" + item.type;
                    ecoUtilitiesSvc.findConformanceResourceByUri(url).then(
                        function (SD) {
                            profilesCache[type] = SD;
                        }
                    )
                }

                return item;
            }

            //select a scenario...
            $scope.cofSelectScenario = function(scenario) {
                delete $scope.cofType;
                $scope.showResourceTable.open();        //will reset the table display
                $scope.cofTypeList.length = 0;

                //first, save the current scenario
                if ($scope.cofScenario) {
                    allScenarios[$scope.cofScenario.id] = $scope.cofScenario
                }

                //is the new scenario already have data
                if (allScenarios[scenario.id]) {
                    $scope.cofScenario = allScenarios[scenario.id]
                } else {
                    //don't want the main scenario object to hold the rows... - actually, I think we do...
                    var clone = angular.copy(scenario);
                    delete scenario._id;
                    allScenarios[scenario.id] = scenario; //clone;
                    $scope.cofScenario = scenario;//clone
                }
                $scope.cofScenario.rows = $scope.cofScenario.rows || []
            };


            $scope.$watch('selectedTrack',function(track,olfV){
                if (track && track.scenarios) {
                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true)
                            })
                        }
                    })

                }

            });

            //generate the graph object. Might want to move to a service...

            $scope.fitGraph = function(){
                $timeout(function(){$scope.graph.fit()},500)

            };

            function makeGraph() {
                var arNodes = [], arEdges = [];

                $scope.cofTypeList.forEach(function (item) {
                    //console.log(item);
                    var node = {id: item.id, label: item.type, shape: 'box',item:item};

                    if ( objColours[item.type]) {
                        node.color = objColours[item.type];
                    }
                    arNodes.push(node);

                    // reference.sourcePath = path;
                    //reference.targetItem = target;
                    if (item.references) {
                        item.references.forEach(function (ref) {
                            var edge = {id: 'e'+arEdges.length+1,from: item.id, to: ref.targetItem.id,
                                label: ref.sourcePath,arrows : {to:true}};

                            arEdges.push(edge)
                        })
                    }
                });


                console.log(arNodes)

                var nodes = new vis.DataSet(arNodes);
                var edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                var graphData = {
                    nodes: nodes,
                    edges: edges
                };

                var container = document.getElementById('cofGraph');
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

    });
