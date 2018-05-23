
angular.module("sampleApp")
    .controller('cofCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal,cofSvc,modalService) {

            $scope.input = {};
            $scope.cofTypeList = [];

            //var objColoursDEP = ecosystemSvc.objColours();

            var elementsByType = {};        //hash of all elements for a given type
            var profilesCache = {};          //cache for SDsss
            var allScenarios = {};

            $scope.filteredGraph = false;
            $scope.setFocus = function() {
                $scope.filteredGraph = ! $scope.filteredGraph

                console.log($scope.currentItem);
                if ($scope.filteredGraph) {
                    makeGraph($scope.currentItem.id)
                } else {
                    makeGraph()
                }


            };


            $scope.getProfile = function(){
                var item = {id : 'id'+new Date().getTime(), type:'cc-Patient'};
                item.description = 'cc-Patient';
                //item.url = url;     //needed for LM
                item.baseType = 'Patient';
                item.category = 'profile'

                $scope.cofTypeList.push(item)
                makeGraph();

                profilesCache['cc-Patient'] = $scope.LM;
            }


            $scope.fhirBasePath = "http://hl7.org/fhir/";       //root of the spec.
            $http.get('/artifacts/allResources.json').then(
                function(data) {
                    $scope.allResourceTypes = data.data;
                    $scope.allResourceTypes.sort(function(a,b) {
                        if (a.name > b.name) {
                            return 1
                        } else {
                            return -1
                        }
                    })
                }
            );

            //import a pre-existing graph from this track...
            $scope.importGraph = function(){


                $uibModal.open({
                    templateUrl: 'modalTemplates/importGraph.html',
                    size : 'lg',
                    controller: 'importGraphCtrl',
                    resolve : {

                        allScenariosThisTrack : function(){
                            return $scope.selectedTrack.scenarios;
                        }
                    }
                }).result.then(function(graph){
                    if ($scope.cofTypeList && $scope.cofTypeList.length > 0) {

                        var modalOptions = {
                            closeButtonText: "No, I changed my mind",
                            headerText: "Import scenario graph",
                            actionButtonText: 'Yes, please import',
                            bodyText: 'Are you sure you wish to import a graph? It will replace your current graph...'
                        };

                        //var msg = "Are you sure you wish to import a graph? It will replace your current graph...";
                        modalService.showModal({}, modalOptions).then(
                            function(){
                                doImport(graph)
                            }
                        )

                    } else {
                        doImport(graph)
                    }
                });

                return;


                //console.log()
                    var url = "/scenarioGraph/";
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

                            $uibModal.open({
                                templateUrl: 'modalTemplates/importGraph.html',
                                size : 'lg',
                                controller: 'importGraphCtrl',
                                resolve : {
                                    allGraphs: function(){
                                        return allGraphs;
                                        // return $scope.cofTypeList;
                                    }, allScenariosThisTrack : function(){
                                        return $scope.selectedTrack.scenarios;
                                    }
                                }
                            }).result.then(function(graph){
                                if ($scope.cofTypeList && $scope.cofTypeList.length > 0) {

                                    var modalOptions = {
                                        closeButtonText: "No, I changed my mind",
                                        headerText: "Import scenario graph",
                                        actionButtonText: 'Yes, please import',
                                        bodyText: 'Are you sure you wish to import a graph? It will replace your current graph...'
                                    };

                                    //var msg = "Are you sure you wish to import a graph? It will replace your current graph...";
                                    modalService.showModal({}, modalOptions).then(
                                        function(){
                                            doImport(graph)
                                        }
                                    )

                                } else {
                                    doImport(graph)
                                }
                            });


                        })



                function doImport(graph) {
                    $scope.cofTypeList = graph.items;
                    $scope.input.scenarioNotes = graph.scenarioNotes;
                    makeGraph();
                }


            };

            $scope.resourceNoteUpdated = function() {
                $scope.saveGraph(true)
            }

            //called when the form is updated
            $scope.formWasUpdated = function(table) {
                $scope.saveGraph(true);     //save the graph without showing
                if (table) {
                    drawTree(table)
                }

            };

            $scope.showDescription = function(md) {
                return $filter('markDown')(md);
            }

            $scope.selectCoreType = function(){
                $uibModal.open({
                    templateUrl: 'modalTemplates/selectCoreType.html',
                    size : 'lg',
                    controller: function($scope,lst) {
                        $scope.lst = lst;//[];

                        $scope.select=function(item){
                            $scope.$close(item)
                        }

                    },
                    resolve : {
                        lst: function(){
                            return $scope.allResourceTypes;
                            // return $scope.cofTypeList;
                        }
                    }
                }).result.then(function(item){

                    addItem(item.name)

                });
            };

            //when the directive is updated with structured data, this function is called with the json version of the resource...
            $scope.fnResourceJson = function(json) {
                $scope.resourceJson = json;

            };

            //Select a logical model rather than a core resource type
            $scope.selectLM = function(LM){
                var url = LM.url; //this is a direct url to the model - not a canonical url...

                $http.get(url).then(
                    function(data){
                        var SD = data.data;
                        //get the base resource. The LM must have been created by clinFHIR
                        var extUrl = "http://clinfhir.com/fhir/StructureDefinition/baseTypeForModel"; //yes, a magic string
                        var ext = getExtensionValue(SD,extUrl);
                        if (ext) {
                            var baseType = ext.valueString;
                            var name = $filter('getLogicalID')(url) + '-'+baseType;

                            var item = {id : 'id'+new Date().getTime(), type:name};
                            item.description = 'LM';
                            item.url = url;     //needed for LM
                            item.baseType = baseType;
                            item.category = 'logical'

                            $scope.cofTypeList.push(item)
                            makeGraph();
                            $scope.saveGraph(true)
                            profilesCache[name] = data.data;
                        } else {
                            alert("I couldn't find the base type of the Logical Model. Was this LM authored by clinFHIR, and based on a core resource type?")
                        }



                    },
                    function() {
                        alert('Unable to retrieve a model from '+LM.url)
                    }
                )
            };

            function getExtensionValue(resource,url) {
                if (resource) {
                    var extension = {}
                    resource.extension = resource.extension || []
                    resource.extension.forEach(function(ext){
                        if (ext.url == url) {extension = ext}
                    });
                    return extension;
                }


            }

            //if showNotes is true, then the right pane is larger.
            $scope.setShowNotes = function (show) {

                if (show) {
                    //show the notes. make the right pane larger
                    $scope.showNotes = true;
                    $scope.leftPane = 'col-sm-4 col-md-4';
                    $scope.rightPane = 'col-sm-8 col-md-8';
                } else {
                    $scope.showNotes = false;
                    $scope.leftPane = 'col-sm-6 col-md-6';
                    $scope.rightPane = 'col-sm-6 col-md-6';
                }
            };
            $scope.setShowNotes(false);

            $scope.showResourceTable = {};

            $scope.saveGraph = function (hideNotification) {

                var user = ecosystemSvc.getCurrentUser();
                if (user) {
                    var saveObject = {};
                    saveObject.userid = user.id;
                    saveObject.scenarioid = $scope.cofScenario.id;
                    saveObject.id = user.id + "-" + $scope.cofScenario.id;
                    saveObject.items = $scope.cofTypeList;      //all of the items (ie the resource instances
                    saveObject.scenarioNotes = $scope.input.scenarioNotes;

                    try {
                        var t = angular.toJson(saveObject)
                    } catch (ex) {
                        alert("There was a problem serializing the graph, and it wasn't saved. Can you please tell David Hay about this? and preferably a screen dump of the List tab")
                        return;
                    }

                    $http.put("/scenarioGraph",saveObject).then(
                        function(){
                            if (! hideNotification) {
                                alert('Updated.')
                            } else {
                                console.log('updated')
                                $scope.writeNotification = "Updated";
                                $timeout(function(){
                                    delete $scope.writeNotification
                                },2000);

                            }

                        }, function(err) {
                            alert('error saving result '+angular.toJson(err))
                        }
                    )


                }
            };

            //the scenarioGraph is the set of resources chosen by the user for this scenario...
            function loadScenarioGraph(cb) {
                var user = ecosystemSvc.getCurrentUser();
                if (user && user.id && $scope.cofScenario) {
                    var url = '/scenarioGraph/' + user.id + "/" + $scope.cofScenario.id;

                    $http.get(url).then(
                        function (data) {

                            var vo = data.data;

                            if (vo && vo.items) {
                                $scope.cofTypeList = vo.items;
                                $scope.input.scenarioNotes = vo.scenarioNotes;

                            }


                            if (cb) {cb()}
                        }
                    )
                }
            }

            //remove an item (resource) from the list...
            $scope.removeItem = function(inx){


                var resource = $scope.cofTypeList[inx]
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove resource instance",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this '+resource.type+' resource (and all the references to it)?'
                };

                //var msg = "Are you sure you wish to import a graph? It will replace your current graph...";
                modalService.showModal({}, modalOptions).then(
                    function(){
                        var ar1 = $scope.cofTypeList.splice(inx,1);

                        //remove any references to the deleted resource from other resources...
                        var id = ar1[0].id;      //the id of the item that was removed
                        $scope.cofTypeList.forEach(function (item) {
                            if (item.table) {
                                item.table.forEach(function (row) {
                                    var ar = angular.copy(row.references);
                                    if (ar && ar.length > 0) {
                                        //if the resource has references, then remove them all and copy back the ones that aren't the deleted one...
                                        row.references.length = 0;

                                        ar.forEach(function (ref) {
                                            if (ref.targetItem.id !== id) {
                                                row.references.push(ref)
                                            }
                                        })
                                    }

                                })
                            }

                        });

                        makeGraph();
                        $scope.saveGraph(true);
                    }
                )



            };

            //add a reference to another resource
            $scope.cofAddReference = function(row,type,cb) {
                //row is the functional equivalent of an Element definition...
                //cb used by the tblResourceDir directive
                var path = row.path;        //the path in the source;
                var type = $filter('referenceType')(type.targetProfile); //target

                //now see what instances we have that match the target type
                var targets = [];       //potential targets
                $scope.cofTypeList.forEach(function (item) {
                    if (item.id !== $scope.currentItem.id) {       //don't allow self references...
                        //core resource types...
                        if (item.type == type || type == 'Resource') {
                            targets.push(item)
                        } else {
                            //any Logical models?
                            var ar = item.type.split('-');
                            if (ar.length == 2 && ar[1] == type ) {
                                targets.push(item)
                            }
                        }
                    }


                });

                switch(targets.length) {
                    case 0 :
                        //no resources of this type yet. Just add one...
                        var item = addItem(type)
                        var reference = internalAddReference(row,item);
                        $scope.saveGraph(true);
                        if (cb) {cb(item)}

                        break;
                    case 1 :
                        //there's only one possible target - just refer to it;
                        var reference = internalAddReference(row,targets[0]);
                        $scope.saveGraph(true);
                        if (cb) {cb(targets[0])}
                        break;
                    default:
                        //need to show a dialog to select which one...
                        $uibModal.open({
                            templateUrl: 'modalTemplates/selectResource.html',
                            controller: function($scope,lst,type,source) {
                                $scope.lst = lst;
                                $scope.type = type;
                                $scope.source = source
                                $scope.select=function(item){
                                    $scope.$close(item)
                                }

                            },
                            resolve : {
                                lst: function(){
                                    return targets;
                                   // return $scope.cofTypeList;
                                },
                                type: function(){
                                    //
                                    return type;
                                },source : function(){
                                    return $scope.currentItem;
                                }
                            }
                        }).result.then(function(item){

                            var reference = internalAddReference(row,item);
                            $scope.saveGraph(true);
                            if (cb) {cb(item)}
                        });
                    break;

                }


                return;

                function internalAddReference(row,target) {
                    var path = row.path;
                    row.references = row.references || []
                    var reference = {id:'id-'+ new Date().getTime()};
                    //$scope.currentItem.references = $scope.currentItem.references || [];

                    //?? I think we always remove any existing as the user needs to create a new row...
                    if (1==1 ||row.max == 1) {

                        //remove any references from this path in this row...
                        for (var i=0; i < row.references.length; i++) {
                            var ref = row.references[i];
                            if (ref.sourcePath == path) {
                                row.references.splice(i,1);
/*
                                //now to delete this reference from the item object
                                for (var j=0; j < $scope.currentItem.references.length; j++){
                                    if ($scope.currentItem.references[j].id == ref.id) {
                                        $scope.currentItem.references.splice(j,1)
                                        break;
                                    }
                                }
*/

                                break;
                            }
                        }


                    }


                    reference.sourcePath = path;
                    reference.targetItem = target;

                    row.references.push(reference);     //add the reference to the row, used by the graph
                    //row.structuredData = {reference: target.type + "/"+ target.id};     //needed for building the resource

                    makeGraph();
                    return reference;
                }
            };

            $scope.removeReference = function(row,inx){

                row.references.splice(inx,1);
                makeGraph();
                $scope.saveGraph(true);

            };

            $scope.editDescription = function(item) {

                var description = $window.prompt("Enter description",item.description);
                if (description) {
                    item.description = description;
                    makeGraph();
                }
            };

            //select an item from the list of items. The SD will have been loaded for this type (async) into profilesCache
            $scope.selectItem = function(item) {
                $scope.currentItem = item;

                var type = item.type;

                if (profilesCache[type]) {
                    $scope.showResourceTable.open(item,profilesCache[type],$scope.cofScenario,$scope.selectedTrack,receiveTable);

                } else {
                    //A LM will have a resolvable reference to the SD. A core resource won't
                    if (item.url) {
                        $http.get(item.url).then(
                            function(data) {
                                var SD = data.data;
                                profilesCache[type] = SD;
                                $scope.showResourceTable.open(item,SD,$scope.cofScenario,$scope.selectedTrack,receiveTable);
                            }
                        )
                    } else {
                        //This must be a core resource. Find it on the locally defined conformance server
                        url = "http://hl7.org/fhir/StructureDefinition/" + item.type;

                        var confServer = $scope.selectedTrack.confServer;

                        ecoUtilitiesSvc.findConformanceResourceByUri(url,confServer).then(      //in st johns...
                            function (SD) {
                                profilesCache[type] = SD;
                                $scope.showResourceTable.open(item,SD,$scope.cofScenario,$scope.selectedTrack,receiveTable);
                            }
                        )
                    }
                }

                function receiveTable(table) {
                    drawTree(table);

                }
            };

            function drawTree(table) {
                if (table) {
                    var treeData = cofSvc.makeTree(table);
                    $('#lmTreeView').jstree('destroy');
                    $('#lmTreeView').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...;
                        if (data.node) {
                            $scope.selectedTreeNode = data.node;
                            $scope.$digest();
                        }
                    })

                }

            }


            //when the user selects a new type to add from the list of types in the scenario...
            $scope.selectCofType = function(type) {
                addItem(type)
            };

            //add an item with a given core resource type...
            //note that the cache update is asynchronous...
            function addItem(type) {
                var item = {id : 'id'+new Date().getTime(),  type:type}
                item.baseType = type;
                item.category = 'core'

                //create a default description based on the number of this type in the list
                var ctr = 1;
                $scope.cofTypeList.forEach(function (t) {
                    if (t.type == type){
                        ctr++
                    }
                })

                item.description = type + " " + ctr;

                $scope.cofTypeList.push(item)
                makeGraph();
                $scope.saveGraph(true);


                //load the profile (SD) for the type...
                if ( ! profilesCache[type]) {
                    var url = "http://hl7.org/fhir/StructureDefinition/" + item.type;

                    var confServer = $scope.selectedTrack.confServer;


                    ecoUtilitiesSvc.findConformanceResourceByUri(url,confServer).then(      //st johns
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

                if (scenario) {
                    //first, save the current scenario = allScenario is scoped to the controller...
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
                    loadScenarioGraph(function(){
                        makeGraph();
                    });
                }

            };


            $scope.$watch(function($scope) {return $scope.selectedTrack},function(track,olfV){
            //$scope.$watch('selectedTrack',function(track,olfV){
                if (track && track.scenarios) {
                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true,track)
                            })
                        }
                    });

                    $scope.cofSelectScenario(track.scenarios[0]);
                    $scope.input.scenario = track.scenarios[0];
                    loadScenarioGraph(function(){
                        makeGraph();
                    });

                    //testing
                    $http.get('http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/cc-Patient').then(
                        function(data) {
                            var SD = data.data;
                            cofSvc.makeLogicalModelFromSD(SD,track).then(
                                function(LM) {

                                    $scope.LM = LM;
                                }
                            )
                        }
                    );

                }

            });

            //generate the graph object. Might want to move to a service...

            $scope.fitGraph = function(){
                $timeout(function(){$scope.graph.fit()},500)

            };

            function makeGraph(focusResourceId) {

                var vo = cofSvc.makeGraph($scope.cofTypeList,focusResourceId);
                var graphData = vo.graphData;

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
