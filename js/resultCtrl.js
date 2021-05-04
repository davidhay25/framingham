angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,ecosystemSvc, scenario, server, client, previousResult, track) {

            $scope.input = {};
            $scope.previousResult = previousResult;

            //console.log(allServers)

            $scope.scenario = scenario;
            $scope.server = server;
            $scope.client = client;

            //$scope.trackers = [];

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.allServers = ecosystemSvc.getAllServers();//[]
/*
            //get the roles, then create a list of allRoles for this track
            $scope.allRoles = []
            let ar = ecosystemSvc.getAllRoles();
            if (ar && ar.length > 0) {
                ar.forEach(function (role) {
                    if ((role.trackId == track.id) && (role.role == 'server')) {
                        $scope.allRoles.push(role)
                    }
                })
            }

*/


            $scope.IGs = track.IGs;

            if (track && track.IGs) {
                //default to the first
                $scope.input.selectedIG = track.IGs[0]
            }

            $scope.input.radioModel = '';

            if (previousResult) {
/*
                if (previousResult.trackers) {
                    $scope.trackers = previousResult.trackers;
                }
*/

                $scope.input.note = previousResult.note;
                $scope.input.radioModel = previousResult.text;

                if (previousResult.server && $scope.allServers.length > 0) {
                    let ar = $scope.allServers.filter(item => item.id = previousResult.server.id)
                    if (ar.length > 0) {
                        $scope.input.selectedServer = ar[0]
                    }
                }

                if (previousResult.IG && track.IGs) {
                    let ar = track.IGs.filter(item => item.id == previousResult.IG.id)
                    if (ar.length > 0) {
                        $scope.input.selectedIG = ar[0]
                    }
                }

                if( previousResult.asserter) {
                    $scope.selectedPerson = previousResult.asserter;
                    $scope.input.asserter = previousResult.asserter;
                }
            } else {
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
                $scope.input.asserter = ecosystemSvc.getCurrentUser();
            }

            //console.log(previousResult)




            $scope.addNewTrackerDEP = function() {
                $scope.trackers.push({url:$scope.input.newTracker})

            };

            $scope.asserterSelected = function(item){
                $scope.selectedPerson = item;
                console.log($scope.selectedPerson);//, $model, $label, $event)
                //typeahead-on-select($item, $model, $label, $event)
            };


            $scope.serverSelectedDEP = function(item){
                $scope.selectedServer = item;
                console.log($scope.selectedServer);//, $model, $label, $event)
                //typeahead-on-select($item, $model, $label, $event)
            };


            if (previousResult) {
               // $scope.input.note = previousResult.note;
               // $scope.input.radioModel = previousResult.text;
                //$scope.input.selectedIG = previousResult.IG

            }

            $scope.save = function() {
                var result = {}
                result.text = $scope.input.radioModel;
                result.note = $scope.input.note;
                result.asserter = $scope.selectedPerson;
                result.type = 'direct'
                //result.trackers = $scope.trackers;

                result.server = $scope.input.selectedServer;


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