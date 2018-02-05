angular.module("sampleApp")
    .controller('editTrackCtrl',
        function ($scope,ecosystemSvc,track,allPersons,modalService) {

            $scope.currentUser = ecosystemSvc.getCurrentUser();
            $scope.allPersons = allPersons;
            $scope.input = {};
            $scope.clone = {};

            //$scope.mdOptions = {iconlibrary:'glyph'}

            $scope.canSave = true;

            if (track) {
                $scope.clone = angular.copy(track)
                $scope.track = track;
                if (track.leadIds && track.leadIds.length > 0) {
                    if (track.leadIds[0] !== $scope.currentUser.id) {
                        $scope.canSave = false;
                    }

                    $scope.allPersons.forEach(function (person) {
                        if (person.id == track.leadIds[0]) {
                            $scope.input.trackLead = person;

                        }
                    })
                }

                $scope.input.description = track.description;
            }

            $scope.personSelected = function(person){
                console.log(person)
                $scope.track.leads = $scope.track.leads || [];
                $scope.track.leads[0] = person;
                $scope.input.trackLead = person;
                //$scope.selectedPerson = item;
            };

            $scope.save = function(){

                if ($scope.input.trackLead) {
                    track.leadIds = track.leadIds || [];
                    track.leadIds[0] = $scope.input.trackLead.id;
                }
                //track.description = $scope.input.description;
                track.url = $scope.clone.url;
                $scope.$close({track:track,lead:$scope.input.trackLead})
            }

            $scope.deleteScenario = function(){
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove track",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this Track?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        track.status = 'deleted';
                        $scope.$close({track:track,lead:$scope.input.trackLead})
                    }
                )
            }

        }
    );