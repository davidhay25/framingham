angular.module("demoApp",[])
    .controller('demoCtrl',
        function ($scope,$http) {

            $scope.log = [];
            $scope.state = 'search';
            $scope.input = {new:{}};
            $scope.input.name = '';

            $scope.show = {ar:true,condition:false,med:false}
            //$scope.serverUrl = "http://snapp.clinfhir.com:8081/baseDstu3/";
            $scope.terminologyUrl = 'https://ontoserver.csiro.au/stu3-latest/';

            $scope.dataServers = []
            $scope.dataServers.push({display:'clinFHIR',url:'http://snapp.clinfhir.com:8081/baseDstu3/'});
            $scope.dataServers.push({display:'Hapi R3',url:'http://fhirtest.uhn.ca/baseDstu3/'});

            $scope.getName = function(name){
                if (name) {
                    if (name.text) {
                        return name.text
                    }
                    var display = ""
                    if (name.given) {
                        display = name.given[0]
                    }
                    display += " "+name.family;
                    return display;
                }

            }

            $scope.input.dataServer = $scope.dataServers[0];

            $scope.findSubstance = function(filter){
                //use the conditon.code VS - http://hl7.org/fhir/ValueSet/substance-code
                delete $scope.substances;
                delete $scope.noSubstanceMatch;
                var vs = 'http://hl7.org/fhir/ValueSet/substance-code';
                var url = $scope.terminologyUrl + 'ValueSet/$expand?url='+vs + '&filter=' + filter
                $scope.log.push({method:'GET',url:url})
                $http.get(url).then(
                    function(data) {
                        console.log(data.data);
                        var expansion = data.data.expansion;
                        if (expansion) {
                            if (expansion.contains) {
                                $scope.substances = expansion.contains;
                            } else {
                                $scope.noSubstanceMatch = true;
                            }

                        }


                    }, function(err) {
                        alert(err.data)
                    }
                )
            };

            $scope.selectSubstance = function(concept) {
                $scope.input.new.substanceConcept = concept;
                delete $scope.substances;
                $scope.input.new.substance = concept.display
            };

            $scope.saveAE = function(){
                var ae = {resourceType:'AdverseEvent'};
                ae.subject={reference:'Patient/'+$scope.patient.id};
                ae.description = $scope.input.new.description;
                var date = moment($scope.input.new.date).format();

                ae.date =moment($scope.input.new.date).format();

                if ($scope.input.new.substanceConcept) {
                    var condition = {resourceType:'Condition'};
                    condition.subject={reference:'Patient/'+$scope.patient.id};
                    condition.code = {coding:[]};
                    condition.code.coding.push($scope.input.new.substanceConcept)
                    condition.id = 't'+new Date().getTime();
                    ae.contained = []
                    ae.contained.push(condition)
                    ae.suspectEntity = [{instance:{reference:'#'+condition.id}}];
                }


                console.log(ae)

                var url = $scope.input.dataServer.url + "AdverseEvent";
                $scope.log.push({method:'POST',url:"AdverseEvent"});
                $http.post(url,ae).then(
                    function(data) {
                        alert('Adverse Event has been saved')

                        //add to the local list of Adverse Events so that the display is updated
                        if ($scope.adverseEvents) {
                            $scope.adverseEvents.entry = $scope.adverseEvents.entry || []
                            $scope.adverseEvents.entry.push({resource:ae})
                            $scope.state = 'summary';
                        }

                    },
                    function(err) {
                        alert('There was an error: '+angular.toJson(err))
                    }
                )


            };

            $scope.selectEntry = function(entry){
                $scope.patient = entry.resource;
                $scope.state = 'summary';
                delete $scope.patients;

                var url = $scope.input.dataServer.url + "AdverseEvent?subject=Patient/"+$scope.patient.id+ "&_count=50";
                $scope.log.push({method:'GET',url:url})
                $http.get(url).then(
                    function(data) {
                        $scope.adverseEvents = data.data;
                        console.log($scope.adverseEvents)
                    }, function(err) {
                        alert(err.data)
                    }
                );

                var url = $scope.input.dataServer.url + "Condition?subject=Patient/"+$scope.patient.id+ "&_count=50";
                $scope.log.push({method:'GET',url:url})
                $http.get(url).then(
                    function(data) {
                        $scope.conditions = data.data;
                        console.log($scope.conditions)
                    }, function(err) {
                        alert(err.data)
                    }
                );

                var url = $scope.input.dataServer.url + "MedicationStatement?subject=Patient/"+$scope.patient.id + "&_count=50";
                $scope.log.push({method:'GET',url:url})
                $http.get(url).then(
                    function(data) {
                        $scope.meds = data.data;

                        if ($scope.meds.entry) {
                            $scope.meds.entry.sort(function(a,b){
                                var d1 = getDrugName(a.resource).trim();
                                var d2 = getDrugName(b.resource).trim();
                                //console.log(d1,d2)
                                if (d1 > d2) {
                                    return 1
                                }  else {
                                    return -1
                                }
                            });
                        }



                        console.log($scope.meds)
                    }, function(err) {
                        alert(err.data)
                    }
                );

                function getDrugName(drug) {
                    if (drug.medicationReference) {
                        return drug.medicationReference.display;
                    } else if (drug.medicationCodeableConcept) {
                        return drug.medicationCodeableConcept.text;
                    }
                }

            };

            $scope.showLog = function() {
                $scope.state = 'showlog';
            };

            $scope.searchPatient = function(){
                delete $scope.patient;
                delete $scope.adverseReactions;
                delete $scope.substances;
                delete $scope.input.new.substance;
                $scope.state = 'search'
            };

            $scope.findPatient = function(name) {
                var url = $scope.input.dataServer.url + "Patient?name="+name;
                $scope.log.push({method:'GET',url:"Patient?name="+name})
                $scope.waiting = true;
                $http.get(url).then(
                    function(data) {
                        $scope.patients = data.data;
                        console.log($scope.patients)
                    }, function(err) {
                        alert(err.data)
                    }
                ).finally(function () {
                    $scope.waiting = false;
                })
            }
        });
