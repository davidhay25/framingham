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


/*
            $http.get('/orion/getAllData?identifier=ORION|AAAA-0200-7').then(
                function (data) {
                   console.log(data.data)

                },function(err) {
                    alert('Error getting current user')
                }
            );
            */

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
                    showError('Error getting current user')
                    //alert('Error getting current user')
                }
            );

            //retrieve the contents (patients) in the list.
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
                        showError('error getting list contents')
                       // alert('error getting list contents: '+ angular.toJson(err))
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
                        console.log(data.data)

                        var riskCalc = data.data;
                        $scope.riskCalc = data.data;


                        if ($scope.riskCalc.err) {
                            alert($scope.riskCalc.err)
                        } else {
                            if ($scope.riskCalc.missingData) {
                                $scope.missingData = $scope.riskCalc.missingData;
                            } else {
                                $scope.risk =  $scope.riskCalc.risk;
                                $scope.rawData = $scope.riskCalc.data;
                                $scope.riskObservation = $scope.riskCalc.obs;
                                $scope.reference = $scope.riskCalc.ref;
                                $scope.riskClass =  getColourClass(riskCalc.risk) +  " rounded-box";
                                $scope.assess =  $scope.riskCalc.assess;
                                $scope.totalPoints = $scope.riskCalc.totalPoints;

                                $scope.riskCalc.jsonObservations.entry.sort(function(a,b){
                                    if (a.resource.effectiveDateTime > b.resource.effectiveDateTime) {
                                        return -1
                                    } else {return 1}
                                })

                            }
                        }


                    }, function(err) {
                        //could be missing data...

                        if (err && err.data) {
                            $scope.missingData = err.data.missingData
                        } else {
                            showError('Error getting user data')
                        }

                        console.log(err)


                        //alert (angular.toJson(err))
                    }
                ).finally(function(){
                    $scope.waiting = false;
                })


            };

            //generate the result display in a more himan readible form...
            $scope.getResultDisplay = function(key,value) {
                console.log(key,value)
                var disp

                //the value for smoker is a number (thanks LOINC!) so convert it to something nicer...
                if (key == 'smoker') {
                    if (value.value.value == '4' ) {
                        disp = 'No'
                    } else {
                        disp = 'Yes'
                    }
                } else {
                    var disp = value.value.value
                    if (value.value.unit)    {
                        if (value.value.unit == 'a') {      //this is teh UCUM code for years
                            disp += " yrs";
                        } else {
                            disp += " " +value.value.unit;
                        }



                    }

                }
                return disp;

            }

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

            function showError(msg) {
                var err = msg || 'Error accessing platform';
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    //actionButtonText: 'Yes, please create',
                    headerText: msg,
                    bodyText: 'There was an error retrieving data from the platform. This can be caused when your login expires, please re-log in and try again. '
                };


                modalService.showModal({}, modalOptions);
            }

    });
