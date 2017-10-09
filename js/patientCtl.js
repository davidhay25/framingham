/**
 * The controller for the Orion Framingham risk demo
 * When this page is loaded, the user has logged in and is stored in a session cache on the server
 */

angular.module("sampleApp")
    .controller('patientCtrl',
        function ($scope,$http,modalService,$timeout,$window,moment) {

            $scope.level;

            $scope.input = {};
            $scope.balance = 0
            $scope.update = function(amt) {
                var expenses = 0;
                $scope.balance = $scope.input.salary;
                ['rent','comms','tobacco','alcohol'].forEach(function (item) {
                    var amt = $scope.input[item];
                    if (amt) {
                        expenses += $scope.input[item];
                        $scope.balance -= $scope.input[item];
                    }
                });

                if (expenses >=$scope.input.salary ) {
                    $scope.level = 4
                } else
                if (expenses <= ($scope.input.salary/2)) {
                    $scope.level = 1
                } else if (expenses >=  (($scope.input.salary/4) *3)) {
                    $scope.level = 3
                } else {
                    $scope.level = 2
                }

               // $scope.balance = $scope.input.salary - $scope.input.rent;// -$scope.input.comms -$scope.input.tobacco -$scope.input.alcohol

            };

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

            $scope.save = function() {
                if ($scope.input.tobacco > 0) {

                    var modalOptions = {
                        closeButtonText: "No, I'd rather you didn't",
                        actionButtonText: 'Sure, no problem',
                        headerText: 'Save Smoker Observation',
                        bodyText: 'I see you are a smoker (based on your tobacco spending). Do you mind if I update your medical records?'
                    };

                    modalService.showModal({}, modalOptions).then(
                        function() {
                            var obs = {resourceType:'Observation',status:'final'};
                            obs.code = {coding:[{system:'http://loinc.org',code:'72166-2'}],text:'Smoker'};
                            obs.subject = {reference:'Patient/'+ $scope.patient.id}
                            obs.effectiveDateTime = moment().format();
                            obs.valueString = '1';  //https://s.details.loinc.org/LOINC/72166-2.html?sections=Comprehensive

                            $scope.waiting = true;
                            $http.post('/orion/fhir/Observation',obs).then(
                                function (data) {
                                    if (data.data && data.data.err) {
                                        alert('Error creating sample:\n' + angular.toJson(data.data.err))
                                    } else {
                                        alert('Medical record has been updated')
                                    }
                                }
                            )
                        },
                        function() {
                            alert("OK, we'll keep this between the two of us.")
                        }
                    )
                }
            };



            $http.get('/orion/currentPatient').then(
                function (data) {
                    if (data.data) {
                        console.log( data.data);
                        $scope.patient = data.data;

                    } else {
                        alert('Error getting current patient')
                    }

                },function(err) {
                    alert('Error getting current patient')
                }
            );



    });
