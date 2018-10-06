
angular.module("sampleApp")
    .controller('cofCtrl',
        function ($scope,ecosystemSvc,ecoUtilitiesSvc,$http,$filter,$window,$timeout,$uibModal,cofSvc,
                  modalService,$q) {

            $scope.input = {};
            $scope.cofTypeList = [];


            //var elementsByType = {};        //hash of all elements for a given type
            var profilesCache = {};          //cache for SDsss
            var allScenarios = {};


            $scope.findPatient = function(name) {
                $scope.lstSelectedPatients = []
                var svr = $scope.selectedTrack.dataServer;
                var url = svr + "Patient?name="+name
                $http.get(url).then(
                    function(data) {
                        console.log(data)

                        if (data.data.entry) {
                            data.data.entry.forEach(function(entry) {
                                var resource = entry.resource;
                                if (resource.name) {
                                    var name = resource.name[0].text;
                                    if (!name) {
                                        name = "";
                                        if (resource.name[0].given) {
                                            resource.name[0].given.forEach(function(gName){
                                                name += gName + " ";
                                            });
                                            if (resource.name[0].family) {
                                                name += resource.name[0].family;
                                            }

                                        }

                                    }


                                    $scope.lstSelectedPatients.push({name:name,resource:resource})
                                }
                            })
                        }
                    }
                )
            };

            //when a patient is selected from the server. consider it linked, and don't allow changes
            $scope.selectPatient = function(itemPatient) {
//console.log(itemPatient)
                var item = {id : itemPatient.resource.id, type:'Patient'}
                item.baseType = 'Patient';
                item.category = 'core';
                item.narrativeStatus = 'generated';     //default to automatically building the text...
                item.description = itemPatient.name;
                item.linked = true;     //so this won;t be updated to the server
                item.linkedResource = itemPatient.resource;
                $scope.graphHasLinkedPatient = true;

                $scope.cofTypeList.push(item)
                makeGraph();

                //makeDocumentDisplay();  //if there is a Composition, sets up the document tab...

                $scope.saveGraph(true);
                $scope.lstSelectedPatients = []


            }


            //Select an instance for the patient. Assume there is only 1.
            $scope.selectPatientInstanceResource = function(){

                //find the linked patient
                var patientItem;       //a
                var patientResource;
                $scope.cofTypeList.forEach(function (item) {
                    if (item.baseType == 'Patient' && item.linked) {
                        patientResource = item.linkedResource;
                        patientItem = item;
                        console.log(patientResource)
                    }
                });

                if (patientResource) {

                    var url = $scope.selectedTrack.dataServer + "Patient/"+patientResource.id + '/$everything';
                    $http.get(url).then(
                        function(data) {
                            console.log(data.data)
                            $uibModal.open({
                                templateUrl: 'modalTemplates/selectPatientResource.html',
                                size: 'lg',
                                controller: 'selectPatientResourceCtrl',
                                resolve: {
                                    patient: function () {
                                        return patient
                                    },
                                    allResources: function () {
                                        return data.data
                                    }
                                }
                            }).result.then(function (resource) {
                                console.log(resource)

                                var item = {id : resource.id, type:resource.resourceType}
                                item.baseType = resource.resourceType;
                                item.category = 'core';
                                item.narrativeStatus = 'generated';     //default to automatically building the text...
                                item.description = resource.resourceType;
                                item.linked = true;     //so this won;t be updated to the server
                                item.linkedResource = resource;

                                var row = {references:[]};
                                var ref = {};
                                ref.targetItem = {id:patientResource.id};
                                ref.sourcePath = "Subject";     //todo may not be correct...
                                row.references.push(ref)
                                item.table = [row];


                                $scope.cofTypeList.push(item);


                                //there must be a reference to the Patient (or it would not have been in the list

                                /*
                                if (item.table) {
                    item.table.forEach(function (row) {
                        if (row.references) {
                            row.references.forEach(function (ref) {
                                var edge = {
                                    id: 'e' + arEdges.length + 1, from: item.id, to: ref.targetItem.id,
                                    label: ref.sourcePath, arrows: {to: true}
                                };


                                * */




                                makeGraph();

                                //makeDocumentDisplay();  //if there is a Composition, sets up the document tab...

                                $scope.saveGraph(true);
                                $scope.lstSelectedPatients = []
                            });

                        }
                    )




                }


                //find the linked patient
                var patient;
                $scope.cofTypeList.forEach(function (item) {
                    if (item.baseType == 'Patient' && item.linked) {
                        patient = item.linkedResource;
                        console.log(patient)
                    }

                })

                if (patient) {
                    var url = $scope.selectedTrack.dataServer + "Patient/"+patient.id + '/$everything';
                    $http.get(url).then(
                        function(data) {
                            console.log(data.data)
                        }
                    )
                }


            }


            $scope.fit3DGraphNOTUSED = function() {

                var vo = cofSvc.makeGraph($scope.cofTypeList);
                console.log(vo)
                var graphData = vo.graphData;

                console.log(graphData)
                var Graph = ForceGraph3D()
                (document.getElementById("3d-graph"));

                var nodes = []// [{"id": "Myriel", "group": 1}, {"id": "Napoleon", "group": 2}]
                var links = []//[{source: "Myriel", target: "Napoleon", value: 10}]

                angular.forEach(graphData.nodes._data,function(node){

                    nodes.push({id:node.id,name:node.label})
                });

                // $scope.graphData.nodes._data['0'] = "Patient";
                angular.forEach(graphData.edges._data,function(edge){
                    if (graphData.nodes._data[edge.to]){
                        links.push({source:edge.from,target:edge.to})
                    }

                });

                links[0].linkOpacity = 1;

                console.log(nodes,links)

                Graph
                    .cooldownTicks(300)
                    .nodeLabel('name')
                    .linkLabel('label')
                    .nodeAutoColorBy('group')
                    .forceEngine('ngraph')
                    .linkOpacity(1)
                    .nodeResolution(4)

                    .graphData({nodes: nodes, links: links});

            }

            //the variable to access methods in the directive...
            $scope.formControl = {};

            //invoke the addSample method in the directive from the tree
            $scope.addSampleFromTree = function(id,dt){
                $scope.formControl.addSample(id,dt);
            };

            $scope.addReferenceFromTree = function(id,type){
                //var rType = $filter('referenceType')(type.targetProfile);
                //alert(rType)
                $scope.formControl.addReference(id,type);
            };

            $scope.duplicateFromTree = function(id){
                $scope.formControl.duplicateRow(id);
            };

            $scope.getTreeDescription = function(ed) {
                var text = "";
                if (ed) {
                    if (ed.definition) {
                        text = ed.definition
                    }

                    if (ed.comment) {
                        text += '<br/><br/>'+ed.comment
                    }

                    if (ed.clinDesc) {
                        text += '<br/><br/>'+ed.clinDesc
                    }

                    if (ed.binding) {
                        if (ed.binding.valueSetReference) {
                            text += '<br/><br/><strong>ValueSet:</strong> '+ed.binding.valueSetReference.reference
                        }
                        if (ed.binding.valueSetUrl) {
                            text += '<br/><br/><strong>ValueSet: </strong>'+ed.binding.valueSetUrl
                        }

                        if (ed.binding.strength) {
                            text += "  ("+ed.binding.strength + ")"
                        }

                    }
                }




                return text
            };

            //save the resources to the data server. This can only be called when a data server is defined in the track
            $scope.saveToFHIRServer = function(cofTypeList){

                var cnt = 0;
                cofTypeList.forEach(function (item) {
                    if (! item.linked) {
                        cnt++
                    }
                });

                if (cnt == 0) {
                    modalService.showModal({}, {bodyText:'Sorry, there are no resources you can save'})
                    return;
                }

                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Store resource instances on data server",
                    actionButtonText: "Yes, let's do this!",
                    bodyText: 'Are you sure you wish to save these '+cnt+' resources on the data server',
                    secondaryText :" Server Url: "+ $scope.selectedTrack.dataServer
                };

                modalService.showModal({}, modalOptions).then(
                    function(){
                       cofSvc.sendToFHIRServer(cofTypeList,$scope.selectedTrack ).then(
                           function (data) {
                               console.log(data)
                               alert('Resources saved. (Note that even resources that failed validation may be partially saved)');
                               $scope.isDirty = false;
                               $scope.saveGraph(true);  //updates the isDirty   flag
                           },
                           function (oo) {
                               //returns an OperationOutcome
                                $scope.submitErrorOO = oo;
                               //alert(angular.toJson(err.data))      //todo - actually should be an OO
                               console.log(oo)
                           }
                       )
                    }
                )

            };

            $scope.dismissError = function(){
                delete $scope.submitErrorOO;
            }

            $scope.showOOSummary = function(oo) {
                var display = ""
                display = "<strong>Validation Results</strong>"
                if (oo.issue) {
                    display += '<ul>';
                    oo.issue.forEach(function (iss) {

                        display += "<li><strong>"+ iss.severity + ":</strong> "+  iss.diagnostics + '</li>'
                    })
                    display += '</ul>';
                }



                return display


            }
            $scope.clearValidationResultDEP = function(){
                clearValidation()
            };

            //validate all the resource instances - update the server model
            $scope.validateAll = function(lstItem){

                //reset all the validation results...
                lstItem.forEach(function (item) {
                    item.validation={isValid:'unknown'}
                });
                var arQuery = [];

                lstItem.forEach(function (item) {
                    if (! item.linked) {    //linked items are not checked or updated
                        var treeData = cofSvc.makeTree(item.table);
                        var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);

                        console.log(item.baseType,vo.resource)
                        if (vo && vo.resource) {
                            var dateValidated = new Date()

                            arQuery.push (cofSvc.validateResource(vo.resource,$scope.selectedTrack).then(
                                function(data) {
                                    item.validation={isValid:'yes',oo:data,date:dateValidated}
                                    console.log('valid')
                                },
                                function(err) {
                                    item.validation={isValid:'no',oo:err,date:dateValidated}
                                }
                            ))
                        } else {
                            console.log("Cant get Json for "+item.id);
                        }

                    }


                });


                $q.all(arQuery).then(function(data){
                    console.log(data);
                    $scope.saveGraph(true)
                   //alert('done')
                },function(err){
                    console.log(err);
                })

            };

            $scope.validateResource = function(resource) {

                if (! resource) {
                    alert('Please select a resource first');
                    return;
                }

                //clearValidation();
                var dateValidated = new Date();
                cofSvc.validateResource(resource,$scope.selectedTrack).then(
                    function(data) {
                        $scope.currentItem.validation={isValid:'yes',oo:data,date:dateValidated}
                        console.log(data)
                    },
                    function(err) {
                        $scope.currentItem.validation={isValid:'no',oo:err,date:dateValidated}
                    }
                ).finally(
                    function(){
                        $scope.saveGraph(true);
                    }
                )

            }

            function clearValidationDEP() {
                delete $scope.validationResult;
                delete $scope.validationSuccess;
            }

            //------- document stuff - ? move to service or...
            function makeDocumentDisplay(){
                $scope.document = {items:[]}
                $scope.cofTypeList.forEach(function(item){

                    switch (item.type) {
                        case 'Composition' :
                            $scope.document.composition = angular.copy(item);
                            if (item.sample) {
                                $scope.document.compositionText = item.sample['text']
                            }
                            break;
                        case 'Patient' :
                            $scope.document.patient = angular.copy(item);
                            //find the patient text....
                            if (item.sample) {
                                $scope.document.patientText = item.sample['text']
                            }
                            break;
                        default :
                            $scope.document.items.push(item)
                            break;
                    }
                });

                $scope.document.bundle = ecosystemSvc.makeDocumentBundle($scope.document)

                //console.log($scope.document);
                var hashSample = {};


                //get all the sections
                if ($scope.document.composition && $scope.document.composition.sample) {


                    //add the sample text to the row to make the rendering display easier...
                    $scope.document.composition.table.forEach(function (row) {
                        if ($scope.document.composition.sample[row.id]) {
                            row.sample = $scope.document.composition.sample[row.id];
                        }
                    })

                }
            }

            //when an item is selected in the document list of resources (if there is a Composition resource)
            $scope.selectItemInList = function(entry) {
                console.log(entry)
                $scope.selectedEntry = entry;
            };

            //element edit functions (sclinical description, muliiplicity - in the scenario designer)
            $scope.editElement = function(row) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addModelElement.html',
                    size : 'lg',
                    controller: 'addElementCtrl',
                    resolve: {
                        row : function(){
                            return row
                        },
                        tableCopy : function(){
                            return $scope.localTableCopy
                        }
                    }
                }).result.then(function(updatedRow){
                    //console.log(updatedRow)
                   row = updatedRow;
                    $scope.saveGraph(true)
                });

            };

            //add an element to a model. Currently not used, but don't remove yet..
            $scope.addElement = function(inx){
                console.log(inx)

                $uibModal.open({
                    templateUrl: 'modalTemplates/addModelElement.html',
                    size : 'lg',
                    controller: 'addElementCtrl',
                    resolve: {
                        row : function(){
                            return null
                        },
                        tableCopy : function(){

                            return $scope.localTableCopy
                        }
                    }
                }).result.then(function(row){
                    console.log(row)
                    $scope.localTableCopy.splice(inx+1,0,row)
                    $scope.saveGraph(true)
                });

            };

            //filter graph by setting focus
            $scope.filteredGraph = false;
            $scope.setFocus = function() {
                $scope.filteredGraph = ! $scope.filteredGraph



                console.log($scope.currentItem);
                if ($scope.filteredGraph) {
                    makeGraph($scope.currentItem.id,$scope.hiddenPatient)
                } else {
                    makeGraph(null,$scope.hiddenPatient)
                }
            };

            //filter graph by hide patient
            $scope.hiddenPatient = false;
            $scope.hidePatient = function() {
                $scope.hiddenPatient = ! $scope.hiddenPatient

                var focusId = null;
                if ($scope.currentItem && $scope.filteredGraph) {
                    focusId = $scope.currentItem.id;
                }


                if ($scope.hiddenPatient) {
                    makeGraph(focusId,true)
                } else {
                    makeGraph(focusId)
                }
            };

            //when a profile is selected from the list of scenario.selectedProfiles
            $scope.selectCofProfile = function(profileDef) {
                var url = profileDef.sourceReference.reference;
                var baseType;

                var name = $filter('getLogicalID')(url);    //assume the the profile name is unique

                //we need to retrieve the profile now so we can determine the base type (needed for referencing)
                if (profilesCache[name]) {
                    //there's an entry in the cache - ie the user has already selected one of these in this session...
                    //this works for CC - may need to be more flexible for others (like STU-2 argonaut)
                    baseType = profilesCache[name].type;
                    addToTypeList(baseType,name,url)
                } else {
                    //this is the first time this SD has been selected - retrive if
                    var confServer = $scope.selectedTrack.confServer;
                    ecoUtilitiesSvc.findConformanceResourceByUri(url,confServer).then(      //in st johns...
                        function (SD) {

                            cofSvc.makeLogicalModelFromSD(SD,$scope.selectedTrack).then(
                                function(LM) {
                                    profilesCache[name] = LM;
                                    //this works for CC - may need to be more flexible for others (like STU-2 argonaut)
                                    baseType = SD.type;
                                    addToTypeList(baseType,name,url)

                                }
                            )
                        }
                    )
                }


                function addToTypeList(baseType,name,url) {
                    //var name = $filter('getLogicalID')(url) + '-'+baseType;

                    var item = {id : 'id'+new Date().getTime(), type:name};
                    item.description = name + '-' + $scope.cofTypeList.length;
                    item.type = name;
                    item.url = url;     //the canonical url of the profile...
                    item.baseType = baseType;
                    item.category = 'profile';
                    $scope.editDescription(item);

                    $scope.cofTypeList.push(item)
                }



            }


            //testing! - horrible code
            $scope.getProfileDEP = function(key){
                var item = {id : 'id'+new Date().getTime()};
                item.category = 'profile';

                switch (key) {
                    case 'LM' :
                        item.description = 'cc-Patient';
                        //item.url = url;     //needed for LM
                        item.baseType = 'Patient';
                        item.type='cc-Patient'
                        profilesCache['cc-Patient'] = $scope.LM;
                        break;
                    case 'LMEnc' :
                        item.description = 'cc-Encounter';
                        item.type='cc-Encounter'
                        profilesCache['cc-Encounter'] = $scope.LMEnc;
                        //item.url = url;     //needed for LM
                        item.baseType = 'Encounter';
                        break;
                }

                $scope.cofTypeList.push(item)
                makeGraph();


            };

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


                function doImport(graph) {
                    $scope.cofTypeList = graph.items;
                    $scope.input.scenarioNotes = graph.scenarioNotes;
                    makeGraph();
                    makeDocumentDisplay()
                    $scope.saveGraph(true)
                }


            };

            $scope.resourceNoteUpdated = function() {
                $scope.saveGraph(true)
            };

            //called when the form is updated
            $scope.formWasUpdated = function(table,row) {

                delete $scope.currentItem.validation;

                //$scope.selectedTreeNode

                /* don't delete yet - not sure if we want the text to be automatically updated
                console.log($scope.currentItem);

                if ($scope.currentItem.narrativeStatus == 'generated') {

                    var vo = ecosystemSvc.makeResourceJson($scope.currentItem.baseType,$scope.currentItem.id,$scope.currentItem.table);
                    if (vo && vo.resource) {

                        var text = ecosystemSvc.makeResourceText(vo.resource);
                        console.log(text);
                        if (text) {
                            $scope.currentItem.sample['text'] = text;


                            //$scope.currentItem.table['text']
                            //structuredData

                        }

                    }

                }

                */

                $scope.saveGraph(true);     //save the graph without showing

                //drawTree(table);            //update the tree view

                if (table) {
                    drawTree(table)
                    //update the structured data in teh selected node - this is just for the display actually...
                    if ($scope.selectedTreeNode) {
                        $scope.selectedTreeNode.data.structuredData = row.structuredData;
                    }
                    makeDocumentDisplay();
                }

            };

            $scope.showDescription = function(md) {
                return $filter('markDown')(md);
            };

            $scope.selectCoreType = function(){
                $uibModal.open({
                    templateUrl: 'modalTemplates/selectCoreType.html',
                    size : 'lg',
                    controller: function($scope,lst) {
                        var fullList = angular.copy(lst)

                        $scope.lst = angular.copy(fullList);//[];

                        $scope.input = {};
                        $scope.setFilter = function(filter) {
                            if (filter !== "") {
                                filter = filter.toLowerCase()

                                $scope.lst.length = 0;
                                fullList.forEach(function (item) {
                                    var name = item.name.toLowerCase();
                                    if (name.indexOf(filter) > -1) {
                                        $scope.lst.push(item)
                                    }
                                })
                            } else {
                                $scope.lst.length = 0;
                                fullList.forEach(function (item) {

                                    $scope.lst.push(item)
                                })

                            }

                        };

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

            //a function that generates a tree view of a resource...
            function drawResourceTree(resource) {
                var treeData = cofSvc.makeResourceTree(resource);

                $('#graphResourceTree').jstree('destroy');
                $('#graphResourceTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                )

            }

            //when the directive is updated with structured data, this function is called with the json version of the resource...
            $scope.fnResourceJson = function(json) {
                $scope.resourceJson = json;
                if (json) {
                    drawResourceTree($scope.resourceJson.resource)
                }
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
                $scope.isDirty = true;
                var user = ecosystemSvc.getCurrentUser();
                if (user) {
                   // $scope.currentItem.dirty = true;
                    var saveObject = {};
                    saveObject.isDirty = $scope.isDirty;
                    saveObject.userid = user.id;
                    saveObject.scenarioid = $scope.cofScenario.id;
                    saveObject.trackid = $scope.selectedTrack.id;
                    saveObject.id = user.id + "-" + $scope.cofScenario.id;
                    saveObject.items = $scope.cofTypeList;      //all of the items (ie the resource instances
                    saveObject.scenarioNotes = $scope.input.scenarioNotes;

                    //can produce a circular structure error. why am I doing this anyway? (answer: as a check for later)
                    /**/
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
                delete $scope.graphHasLinkedPatient;
                if (user && user.id && $scope.cofScenario) {
                    var url = '/scenarioGraph/' + user.id + "/" + $scope.cofScenario.id;

                    $http.get(url).then(
                        function (data) {

                            var vo = data.data;
                            $scope.isDirty = vo.isDirty;
                            if (vo && vo.items) {
                                $scope.cofTypeList = vo.items;
                                $scope.input.scenarioNotes = vo.scenarioNotes;

                                //now see if there is a linked patient. If there is, we'll add a link that allows their resources to be linked as well

                                vo.items.forEach(function (item) {
                                    if (item.baseType == 'Patient' && item.linked) {
                                        $scope.graphHasLinkedPatient = true;
                                    }
                                });



                                makeDocumentDisplay();

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
                        $scope.showResourceTable.open();    //clear the table display

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
                var item = $scope.currentItem;
                if (item) {
                    if (item.table) {
                        var treeData = cofSvc.makeTree(item.table);

                    }
                    makeGraph();
                    $scope.saveGraph(true);

                    var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);
                    if (vo) {
                        $scope.resourceJson()({resource: vo.resource, raw: vo.data});
                        return vo.resource;
                    } else {
                        return {error:'Error building Json'}
                    }
                }






            };

            $scope.editDescription = function(item) {

                var description = $window.prompt("Enter a short description for this resource",item.description);
                if (description) {
                    item.description = description;
                    makeGraph();
                }
            };

            //select an item from the list of items (resource instances already added). The SD may have been loaded for this type (async) into profilesCache
            $scope.selectItem = function(item) {
               // clearValidation();
                delete $scope.linkedItemDisplay;
                delete $scope.linkedItemResource;
                $scope.currentItem = item;

                if (item.linked) {      //an item linked from the server. not editable.
                    $scope.showResourceTable.open();        //will reset the table display
                    $scope.linkedItemDisplay = "This is a linked item and cannot be edited"
                    $scope.linkedItemResource = item.linkedResource;
                    return;
                }

                var type = item.type;

                if (profilesCache[type]) {
                    //the SD is in the cache. Note that a Profile is loaded into the cache when first selected
                    $scope.showResourceTable.open(item,profilesCache[type],$scope.cofScenario,$scope.selectedTrack,receiveTable);

                } else {
                    //A LM will have a resolvable reference to the SD. A core resource won't

                    if (item.category == 'profile') {
                        //this is a profile. Retrieve the SD, then build a LM from that...
                        //item.url is a canonical url...

                        var confServer = $scope.selectedTrack.confServer;
                        ecoUtilitiesSvc.findConformanceResourceByUri(item.url,confServer).then(      //in st johns...
                            function (SD) {

                                cofSvc.makeLogicalModelFromSD(SD,$scope.selectedTrack).then(
                                    function(LM) {
                                        profilesCache[name] = LM;
                                        //this works for CC - may need to be more flexible for others (like STU-2 argonaut)
                                        $scope.showResourceTable.open(item,LM,$scope.cofScenario,$scope.selectedTrack,receiveTable);
                                    },
                                    function(err){
                                        alert(err)
                                    }
                                )
                            }
                        )

                    } else if (item.url) {
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

                //called when the form directive has created the table...
                function receiveTable(table) {
                    drawTree(table);
                    $scope.localTableCopy = table;      //used in teh designer...
                }
            };

            function drawTree(table) {
                if (table) {
                    var treeData = cofSvc.makeTree(table);
                    $('#lmTreeView').jstree('destroy');
                    $('#lmTreeView').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        if (data.node) {
                            $scope.selectedTreeNode = data.node;

                            //get the row that corresponds to this node. Used by the tree to decide if the row can be dupliacted...
                            delete $scope.selectedTreeRow;
                            if ($scope.currentItem.table) {
                                $scope.currentItem.table.forEach(function (row) {
                                    if (row.id == $scope.selectedTreeNode.data.id) {
                                        $scope.selectedTreeRow = row;
                                    }
                                })
                            }

                            //console.log($scope.currentItem.table);


                            $scope.$digest();
                        }
                    })


                    //$scope.resourceTree = $('#lmTreeView').jstree(true).get_json('#', {flat:false})

//console.log($scope.resourceTree)

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
                item.category = 'core';
                item.narrativeStatus = 'generated';     //default to automatically building the text...

                //create a default description based on the number of this type in the list
                var ctr = 1;
                $scope.cofTypeList.forEach(function (t) {
                    if (t.type == type){
                        ctr++
                    }
                })

                item.description = type + " " + ctr;

                var description = $window.prompt("Enter a short description for this resource",item.description);
                if (description) {
                    item.description = description;
                }


                $scope.cofTypeList.push(item)
                makeGraph();

                makeDocumentDisplay();  //if there is a Composition, sets up the document tab...

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

                    //does the new scenario already have data
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

                    //https://fhir.hl7.org.uk/STU3/StructureDefinition/CareConnect-Patient-1




/*
                        $http.get('https://fhir.hl7.org.uk/STU3/StructureDefinition/CareConnect-Encounter-1').then(
                            function(data) {
                                var SD = data.data;
                                cofSvc.makeLogicalModelFromSD(SD,track).then(
                                    function(LM) {

                                        $scope.LMEnc = LM;
                                    }
                                )
                            }
                        );

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
*/

                }

            });

            //generate the graph object. Might want to move to a service...

            $scope.fitGraph = function(){
                $timeout(function(){$scope.graph.fit()},500)

            };

            function makeGraph(focusResourceId,hidePatient) {

                var vo = cofSvc.makeGraph($scope.cofTypeList,focusResourceId,hidePatient);
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
