/**
 * The controller for the Orion Framingham risk demo
 * When this page is loaded, the user has logged in and is stored in a session cache on the server
 */

angular.module("sampleApp")
    .controller('orionCtrl',
        function ($scope,$http,modalService,$timeout,$window,moment) {

            $scope.input = {};

            $scope.riskColourClass = []
            $scope.riskColourClass.push({value:6,klass:'risk-low'})
            $scope.riskColourClass.push({value:11,klass:'risk-med'})
            $scope.riskColourClass.push({value:100,klass:'risk-high'})

            function getColourClass(value) {
                for (var i=0;i < $scope.riskColourClass.length;i++) {
                    if (value < $scope.riskColourClass[i].value ) {
                        return $scope.riskColourClass[i].klass;
                        break;
                    }
                }
            }

            $scope.getLog = function(){
                if ($scope.log){
                    delete $scope.log;
                } else {
                    $http.get('/orion/getLog').then(
                        function (data) {
                            if (data.data) {
                                $scope.log = data.data;
                                //console.log($scope.log)

                            } else {
                                alert('Error getting current user')
                            }

                        },function(err) {
                            alert('Error getting current user')
                        }
                    );
                }
            };
            $scope.clearLog = function() {
                $http.post('/orion/clearLog').then(
                    function(){
                        delete $scope.log;
                    })
            };



            $http.get('/orion/getAllData?identifier=ORION|AAAA-0200-7').then(
                function (data) {
                   console.log(data.data)

                },function(err) {
                    alert('Error getting current user')
                }
            );

            //return;

            //get the details for the currently logged in user (remember we have authenticated when this page loads)
            $scope.waiting = true;
            $http.get('/orion/currentUser').then(
                function (data) {
                    if (data.data) {
                        $scope.currentUser = data.data.user;
                        console.log( $scope.currentUser);

                        var userId = $scope.currentUser.primaryActor.resolvingIdentifier.id;
                        var userIdNs = $scope.currentUser.primaryActor.resolvingIdentifier.namespace;
                        $scope.userIdentifier = userId + "@" + userIdNs;

                        //now we can get the lists for the currently logged in user
                        $http.get('/orion/getUserLists?userIdentifier='+$scope.userIdentifier).then(
                            function (data) {
                                console.log(data);
                                $scope.listBundle = data.data.bundle;
                              //  $scope.input.list = $scope.lists[0];
                              //  getListContent($scope.input.list.name)
                            }, function(err) {
                                alert('Error getting provider lists\n' + angular.toJson(err))
                            }
                        ).finally(function(){
                            $scope.waiting = false;
                        });



                    } else {
                        alert('Error getting current user')
                    }

                },function(err) {
                    alert('Error getting current user')
                }
            );

            //retrieve the contents (patients) in the list. Then, for each patient
            $scope.getListContent = function(entry){
                delete $scope.log;
                delete $scope.selectedPatient;
                delete $scope.listContentsBundle;

                $scope.waiting = true;
                $http.get('/orion/getListContents?listId='+entry.resource.id).then(
                    function (data) {
                        $scope.listContentsBundle = data.data.bundle;    //This is a bundle of Patient resources
                        console.log($scope.listContentsBundle)

                        var saveRisk = false;
                        /* temp
                        //get the risk score for each person in the list
                        $scope.listContents.forEach(function (item) {

                            $http.get('/orion/getRisk?identifier='+ $scope.identifier+"&saveRisk="+saveRisk).then(
                                function (data) {
                                    //console.log(data.data)
                                    item.riskCalc = data.data;
                                   //console.log(item)
                                }
                            )
                        })

                        */

                    }, function(err){
                        alert('error getting list contents: '+ angular.toJson(err))
                    }
                ).finally(function(){
                    $scope.waiting = false;
                });
            };


            $scope.item = {};       //hash of items based on resource.id
            $scope.moment=moment;

            $scope.selectPatient = function(patient){
                console.log(patient)

                delete $scope.risk;
                delete $scope.rawData;
                delete $scope.riskObservation;
                delete $scope.reference ;
                delete $scope.riskClass;
                delete $scope.assess;
                delete $scope.missingData;
                delete $scope.totalPoints;

                $scope.selectedPatient = patient;

                var identifier = patient.identifier[0];
                var oIdentifier = identifier.value + "@" + identifier.system;
                var fIdentifier = identifier.system + "|" + identifier.value;

                $scope.waiting = true;
                $http.get('/orion/getRisk?identifier='+ fIdentifier+"&saveRisk="+false).then(
                    function (data) {
                        //console.log(data.data)




                        var riskCalc = data.data;

                        if (riskCalc.err) {
                            alert(riskCalc.err)
                        } else {
                            if (riskCalc.missingData) {
                                $scope.missingData = riskCalc.missingData;
                            } else {
                                $scope.risk =  riskCalc.risk;
                                $scope.rawData = riskCalc.data;
                                $scope.riskObservation = riskCalc.obs;
                                $scope.reference = riskCalc.ref;
                                $scope.riskClass =  getColourClass(riskCalc.risk) +  " rounded-box";
                                $scope.assess =  riskCalc.assess;
                                $scope.totalPoints = riskCalc.totalPoints;
                            }
                        }


                    }, function(err) {
                        alert (angular.toJson(err))
                    }
                ).finally(function(){
                    $scope.waiting = false;
                })


            };

            //call the server to get the risk for this identifier. saveRisk (bool)will cause an assessment observation to be saved,
            $scope.getRiskDEP = function(identifier,saveRisk) {
                delete $scope.orionUser;
                delete $scope.env ;
                delete $scope.risk;
                delete $scope.rawData ;
                delete $scope.riskObservation ;
                delete $scope.reference;
                delete $scope.riskClass;

                saveRisk = false;

                //gets the risk for a single patient,
                $http.get('/orion/getRisk?identifier='+ $scope.identifier+"&saveRisk="+saveRisk).then(
                    function (data) {
                        console.log(data.data)
                        if (data.data) {
                            if (data.data.err) {
                               alert(data.data.err)
                            }
                            //even if there was an error, there may be something to show...
                            $scope.orionUser = data.data.user;
                            $scope.env = data.data.env;
                            $scope.risk =  data.data.risk;
                            $scope.rawData = data.data.data;
                            $scope.riskObservation = data.data.obs;
                            $scope.reference = data.data.ref;
                            $scope.riskClass = "risk-low rounded-box";
                            $scope.assess =  data.data.assess;




                           // $scope.newObservation =

                        } else {
                            alert('No data returned')
                        }

                    }).finally(function (){
                    $scope.waiting = false
                })
            };

            //create a set of sample data for the currently selected patient...
            $scope.writeSample = function() {


                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    actionButtonText: 'Yes, please create',
                    headerText: 'Create Sample Data',
                    bodyText: 'Are you sure you want to create some sample data for this patient?'
                };


                modalService.showModal({}, modalOptions).then(
                    function() {
                        console.log('creating...')
                        var patient = $scope.selectedPatient;

                        var identifier = patient.identifier[0];     //there will always be the orion identifier as the first entry...
                        var fIdentifier = identifier.system + "|" + identifier.value;

                        //create the sample data
                        $scope.waiting = true;
                        $http.post('/orion/createDemoData?identifier='+ fIdentifier).then(
                            function (data) {
                                if (data.data && data.data.err) {
                                    alert('Error creating sample:\n'+angular.toJson(data.data.err))
                                } else {
                                    $scope.selectPatient(patient);      //re-read and perform analusys
                                }
                            }).finally(function(){
                                $scope.waiting = false;
                            }
                        )
                    }
                )
            };

            //write the Assessment observation
            $scope.saveRiskObs = function(obs) {

                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    actionButtonText: 'Yes, please create',
                    headerText: 'Save Observation',
                    bodyText: 'Are you sure you want to save this Risk Observation?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        console.log('saving...')

                        //save the observation...
                        $scope.waiting = true;
                        $http.post('/orion/fhir/Observation',$scope.riskObservation).then(
                            function (data) {
                                if (data.data && data.data.err) {
                                    alert('Error creating sample:\n'+angular.toJson(data.data.err))
                                } else {


                                    //add to the list of assessments
                                    var newEntry = {resource:{}};
                                    newEntry.resource.effectiveDateTime = new Date().getTime();
                                    newEntry.resource.valueQuantity = {value:$scope.risk};
                                    $scope.assess.push(newEntry)
                                    alert('Risk observation has been saved.')


                                }
                            }).finally(function(){
                                $scope.waiting = false;
                            }
                        )
                    }
                )
            }



/*
            $scope.selectItem = function(disp) {
                $scope.selectedResource = disp.resource;// $scope.mdResource[id];
                $scope.selectedInternal = disp.display; //$scope.hashMedicationDispense[id];

                //-------- make tree
                var treeData = resourceCreatorSvc.buildResourceTree($scope.selectedResource);

                //show the tree structure of this resource version
                $('#builderResourceTree').jstree('destroy');
                $('#builderResourceTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('loaded.jstree', function () {
                    $('#builderResourceTree').jstree('close_all');
                })

                //------- make graph

                makeGraph($scope.selectedResource);

                $scope.redrawChart = function(){
                    $timeout(function(){
                        if ($scope.chart) {
                            $scope.chart.fit();

                        }
                    },1000)
                };

            };

            $scope.read = function(nhi) {
                delete $scope.sealed;
                delete $scope.selectedResource;
                delete $scope.medicationDispense;


                if (nhi) {

                    $scope.waiting = true;

                    var url = '/orion/'+nhi.toUpperCase();

                    $http.get(url).then(
                        function (data) {

                            var length = 0;
                            if (data.data && data.data.entry) {
                                length = data.data.entry.length
                            }

                            //the nature of the links being returns seems to vary...
                            if(data.data && data.data.link) {
                                data.data.link.forEach(function(link){
                                    if (link.relation == "orionhealth:describe-patient-sealed" && length == 0) {
                                        $scope.sealed = true;
                                    }

                                    if (link.url == '/fhir/1.0/explain/patientsealed') {
                                        $scope.sealed = true;
                                    }


                                })
                            }


                            console.log(data.data)


                            $scope.bundle = data.data;
                            processBundle(data.data)
                        }
                    ).finally(function(){
                        $scope.waiting = false;
                    }
                )
                } else {
                    modalService.showModal({}, {bodyText : "You must specify an NHI"})
                }

            }

            function makeGraph(res) {


                //not entirely sure about the 'hashReferenced' property...
                var clone = angular.copy(res);
                delete clone.hashReferenced;

                var bundle = resourceCreatorSvc.convertContainedToBundle(clone);


                var vo = builderSvc.makeGraph(bundle) ;  //todo - may not be the right place...

                var container = document.getElementById('resourceGraph');
                var options = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };


                $scope.chart = new vis.Network(container, vo.graphData, options);
            }

            function processBundle(bundle){
                $scope.hashAllResources = {};       //hash of all resources keyed by resource type
                $scope.mdResource = {};
                $scope.hashMedicationDispense = {};
                $scope.medicationDispense = [];        //will be an array of medicationDispense
                if (bundle && bundle.entry) {
                    bundle.entry.forEach(function (entry) {


                        var resource = entry.resource;

                        var resourceType = resource.resourceType;
                        $scope.hashAllResources[resourceType] = $scope.hashAllResources[resourceType] || []

                        //set the contained resources as a hash
                        resource.hashReferenced = {};   //this makes it explicit that these are 'real' resources...
                        resource.contained.forEach(function (res) {
                            //each entry in the contained array is a resource.
                            resource.hashReferenced[res.id] = res;
                        });

                        var item = {resource : resource}    //the actual resource
                        item.display = makeDisplayObject(resource);
                        $scope.hashAllResources[resourceType].push(item)



                     //   $scope.medicationDispense.push(md);
                     //   $scope.hashMedicationDispense[md.id] = md;
                    })
                }
            }

            function makeDisplayObject(resource) {
                switch (resource.resourceType) {
                    case 'Encounter':
                        return makeEncounterDisplay(resource);
                        break;
                    case 'MedicationDispense' :
                        return makeMedicationDispenseDisplay(resource);
                        break;

                }
            }


            function makeEncounterDisplay(resource) {
                var display = {};
                display.period = resource.period;
                display.class = resource.class;
                if (resource.reason) {
                    display.reason = getSummaryOfCC(resource.reason[0])
                }


                return display;
            }


            function getSummaryOfCC(cc) {
                var display = "";
                if (cc) {
                    if (cc.text) {
                        display = cc.text;
                    } else {
                        if (cc.coding && cc.coding[0]) {
                            display = cc.coding[0].display;
                        }
                    }
                }
                return display;
             }

            function makeMedicationDispenseDisplay(resource){
                //now create the internal object. We know the structure we are dealing with...
                var md = {};
                md.id = resource.id;

               // var clone = angular.copy(resource)
               // delete clone.hashReferenced;

               // $scope.mdResource[md.id] = clone;

                md.medication = {display: "No medication specified"}
                try {
                    //we know that there will be a medication reference here, but just in case
                    var medRef = resource.medicationReference.reference.substr(1);      //this will be the key in the hash
                    md.medication = resource.hashReferenced[medRef].code.coding[0];
                } catch (ex) {
                    if (resource.medicationCodeableConcept && resource.medicationCodeableConcept.coding) {
                        md.medication = resource.medicationCodeableConcept.coding[0];
                    }
                }




                md.quantity = resource.quantity;
                md.dispensed = resource.whenHandedOver;





                if (resource.dosageInstruction) {
                    md.dose = resource.dosageInstruction[0];
                }
                return md;
            }

*/


    });
