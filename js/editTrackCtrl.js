angular.module("sampleApp")
    .controller('editTrackCtrl',
        function ($scope,ecosystemSvc,track,allPersons,modalService,isNew) {

            $scope.currentUser = ecosystemSvc.getCurrentUser();
            $scope.allPersons = allPersons;
            $scope.input = {roles:{}};
           // $scope.clone = {};
            $scope.isNew = isNew;


            console.log($scope.allRoles)
            //$scope.mdOptions = {iconlibrary:'glyph'}

            $scope.canSave = true;

            if (track) {        //should always be true as the 'addTrack' sets a base track {id: name: roles: scenarioIds: };
               // $scope.clone = angular.copy(track)
                $scope.track = track;
                if (track.leadIds && track.leadIds.length > 0 && $scope.currentUser) {
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


            $scope.addEndPoint = function(url,description) {
                console.log(url,description)
                $scope.track.endPoints = $scope.track.endPoints || []
                $scope.track.endPoints.push({url:url,description:description})
            };

            $scope.removeEndPoint = function(inx) {
                $scope.track.endPoints.splice(inx,1)
            };

            $scope.personSelected = function(person){
                console.log(person)
                $scope.track.leads = $scope.track.leads || [];
                $scope.track.leads[0] = person;
                $scope.input.trackLead = person;
                //$scope.selectedPerson = item;
            };

            $scope.save = function(){

                if ($scope.input.trackLead) {
                    $scope.track.leadIds = $scope.track.leadIds || [];
                    $scope.track.leadIds[0] = $scope.input.trackLead.id;
                }

                //track.url = $scope.clone.url;

                $scope.$close({track:$scope.track,lead:$scope.input.trackLead})
            };

            $scope.deleteTrack = function(){
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