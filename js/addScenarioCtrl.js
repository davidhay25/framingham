angular.module("sampleApp")
    .controller('addClientCtrl',
        function ($scope,ecosystemSvc,track,existingScenario,modalService) {


            $scope.saveText = "Add new Scenario";

            $scope.input = {};

            $scope.canAdd = false;

            if (existingScenario) {
                //this is an edit


            } else {
                //this is new...

            }


            $scope.addScenario = function(){


                ecosystemSvc.updateClientD(client,isNewClient).then(
                    function(data) {
                        $scope.$close()
                    }, function(err) {
                        alert('Error saving client: '+ angular.toJson(err))
                        $scope.$dismiss()
                    }
                )

            }
        }
    );