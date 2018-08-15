angular.module("demoApp",[])
    .controller('demoCtrl',
        function ($scope,$http) {

            $scope.log = [];
            $scope.state = 'search';
            $scope.input = {new:{}};
            $scope.input.name = 'hay';
            $scope.serverUrl = "http://snapp.clinfhir.com:8081/baseDstu3/";
            $scope.terminologyUrl = 'https://ontoserver.csiro.au/stu3-latest/';

            $scope.findSubstance = function(filter){
                //use the conditon.code VS - http://hl7.org/fhir/ValueSet/substance-code
                delete $scope.substances;
                var vs = 'http://hl7.org/fhir/ValueSet/substance-code';
                var url = $scope.terminologyUrl + 'ValueSet/$expand?url='+vs + '&filter=' + filter
                $scope.log.push({method:'GET',url:url})
                $http.get(url).then(
                    function(data) {
                        console.log(data.data);
                        var expansion = data.data.expansion;
                        if (expansion) {
                            $scope.substances = expansion.contains;
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
            }

            $scope.saveAE = function(){
                var ae = {resourceType:'AdverseEvent'};
                ae.subject={reference:'Patient/'+$scope.patient.id};
                ae.description = $scope.input.new.description;
                var date = moment($scope.input.new.date).format();

                ae.date =moment($scope.input.new.date).format();
                console.log(ae)

                var url = $scope.serverUrl + "AdverseEvent";
                $scope.log.push({method:'POST',url:"AdverseEvent"});
                $http.post(url,ae).then(
                    function(data) {
                        alert('Adverse Event has been saved')

                        //add to the local list of Adverse Events so that the display is updated
                        if ($scope.adverseEvents) {
                            $scope.adverseEvents.entry = $scope.adverseReactions.entry || []
                            $scope.adverseEvents.entry.push({resource:ae})
                        }

                    },
                    function(err) {
                        alert('There was an error: '+angular.toJson(ae))
                    }
                )


            };

            $scope.selectEntry = function(entry){
                $scope.patient = entry.resource;
                $scope.state = 'summary';

                var url = $scope.serverUrl + "AdverseEvent?subject=Patient/"+$scope.patient.id;
                $scope.log.push({method:'GET',url:"AdverseEvent?subject=Patient/"+$scope.patient.id})
                $http.get(url).then(
                    function(data) {
                        $scope.adverseEvents = data.data;
                        console.log($scope.adverseEvents)
                    }, function(err) {
                        alert(err.data)
                    }
                )
            };

            $scope.showLog = function() {
                $scope.state = 'showlog';
            };

            $scope.searchPatient = function(){
                delete $scope.patient;
                delete $scope.adverseReactions;
                $scope.state = 'search'
            };

            $scope.findPatient = function(name) {
                var url = $scope.serverUrl + "Patient?name="+name;
                $scope.log.push({method:'GET',url:"Patient?name="+name})
                $http.get(url).then(
                    function(data) {
                        $scope.patients = data.data;
                        console.log($scope.patients)
                    }, function(err) {
                        alert(err.data)
                    }
                )
            }
        });
