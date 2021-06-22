angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,ecosystemSvc, scenario, server, client, previousResult, track) {

            $scope.input = {};
            $scope.previousResult = previousResult;

            $scope.scenario = scenario;
            $scope.server = server;
            $scope.client = client;

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.allServers = ecosystemSvc.getAllServers();//[]
            $scope.allClients = ecosystemSvc.getAllClients()

            if (track && track.dataSets) {
                $scope.dataSets = track.dataSets

                if (previousResult && previousResult.dataSet) {
                    for (var i = 0; i < $scope.dataSets.length; i++) {
                        if ($scope.dataSets[i].name == previousResult.dataSet.name) {
                            $scope.input.selectedDS = $scope.dataSets[i]
                            break;
                        }
                    }


                }
            }

            if (track && track.IGs) {
                $scope.IGs = track.IGs;

                //default to the first
                $scope.input.selectedIG = track.IGs[0]
            }

            $scope.input.radioModel = '';

            if (previousResult) {


                $scope.input.note = previousResult.note;
                $scope.input.radioModel = previousResult.text;

                if (previousResult.server && $scope.allServers.length > 0) {
                    let ar = $scope.allServers.filter(item => item.id == previousResult.server.id)
                    if (ar.length > 0) {
                        $scope.input.selectedServer = ar[0]
                    }
                }

                if (previousResult.client && $scope.allClients.length > 0) {
                    let ar = $scope.allClients.filter(item => item.id == previousResult.client.id)
                    if (ar.length > 0) {
                        $scope.input.selectedClient = ar[0]
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

            $scope.asserterSelected = function(item){
                $scope.selectedPerson = item;
                console.log($scope.selectedPerson);//, $model, $label, $event)

            };







            $scope.save = function() {
                var result = {}
                result.text = $scope.input.radioModel;
                result.note = $scope.input.note;
                result.asserter = $scope.selectedPerson;
                result.type = 'direct'
                result.dataSet = $scope.input.selectedDS
                //result.trackers = $scope.trackers;

                result.server = $scope.input.selectedServer;

                result.client = $scope.input.selectedClient;

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