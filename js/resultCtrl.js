angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,ecosystemSvc, scenario, server, client, previousResult, track) {

            $scope.input = {};
            $scope.previousResult = previousResult;

            $scope.scenario = scenario;
            $scope.server = server;
            $scope.client = client;
            $scope.previousResult = previousResult;
            $scope.trackers = [];

            $scope.IGs = track.IGs;

            if (track && track.IGs) {
                //default to the first
                $scope.input.selectedIG = track.IGs[0]
            }

            $scope.input.radioModel = '';

            if (previousResult) {

                if (previousResult.trackers) {
                    $scope.trackers = previousResult.trackers;
                }


                if( previousResult.asserter) {
                    $scope.selectedPerson = previousResult.asserter;
                    $scope.input.asserter = previousResult.asserter;
                }
            } else {
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
                $scope.input.asserter = ecosystemSvc.getCurrentUser();
            }

            console.log(previousResult)

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]


            $scope.addNewTracker = function() {
                $scope.trackers.push({url:$scope.input.newTracker})

            };

            $scope.asserterSelected = function(item){
                $scope.selectedPerson = item;
                console.log($scope.selectedPerson);//, $model, $label, $event)
                //typeahead-on-select($item, $model, $label, $event)
            };




            if (previousResult) {
                $scope.input.note = previousResult.note;
                $scope.input.radioModel = previousResult.text;
                $scope.input.selectedIG = previousResult.IG

            }

            $scope.save = function() {
                var result = {}
                result.text = $scope.input.radioModel;
                result.note = $scope.input.note;
                result.asserter = $scope.selectedPerson;
                result.trackers = $scope.trackers;
                if ($scope.input.selectedIG) {
                    result.IG = {name:$scope.input.selectedIG.name,id : $scope.input.selectedIG.id}
                }
                if (previousResult) {
                    result.id = previousResult.id;
                }

                $scope.$close(result);
            }

        }
    );