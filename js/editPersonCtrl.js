angular.module("sampleApp")
    .controller('editPersonCtrl',
        function ($scope,ecosystemSvc,person,tracks) {
            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.input = {}
            $scope.saveText = "Add Person";
            $scope.titleText = "Add new person";

            //$scope.tracks = [{name:''}];


            function cleanTrackList() {
                $scope.tracks = [];
                tracks.forEach(function (trck) {
                    let canAdd = true;
/*
                    if ($scope.input.primaryTrack && $scope.input.primaryTrack.id == trck.id) {
                        canAdd = false
                    }
                    */
                    if ($scope.tracksOfInterest) {
                        if ($scope.tracksOfInterest.filter(item => item.id == trck.id).length > 0) {
                            canAdd = false
                        }
                    }



                    if (canAdd) {
                        $scope.tracks.push(trck);
                    }

                });

                $scope.tracks.sort(function(a,b){
                    if (a.name > b.name) {
                        return 1
                    } else {
                        return -1
                    }
                });

            }
            //cleanTrackList(person)



            var inputPerson;
            $scope.tracksOfInterest = [];



            if (person) {
                //this is an update
                $scope.person = person;
                inputPerson = person;
                $scope.input.name = person.name;
                $scope.input.organization = person.organization;
                $scope.input.touchStoneUser = person.touchStoneUser;
                person.contact = person.contact || []
                person.contact.forEach(function (c) {
                    switch (c.type) {
                        case 'email':
                            $scope.input.email = c.value;
                            break;
                    }
                });


                if (person.primaryTrack) {
                    for (i=0; i < tracks.length;i++) {
                        t = tracks[i]
                        if (t.id && (t.id == person.primaryTrack.id)) {
                            $scope.input.primaryTrack = t;
                            break;
                        }
                    }
                }

                if (person.toi) {
                    person.toi.forEach(function (track) {
                        $scope.tracksOfInterest.push(track)
                    })
                }

                cleanTrackList(person)

                $scope.saveText = "Update Person";
                $scope.titleText = "Edit existing person";
            } else {
                inputPerson = {id:'id'+new Date().getTime(),contact:[]};
            }


            $scope.addTOI = function(track) {
                if ($scope.input.primaryTrack && $scope.input.primaryTrack.id == track.id) {
                    alert('This is already the primary track')
                    delete $scope.input.interestTrack
                    return;
                }
                $scope.tracksOfInterest.push(track);
                //delete $scope.input.newTOI;
                cleanTrackList(person)
                delete $scope.input.interestTrack
            }

            $scope.removeTOI = function(inx) {
                $scope.tracksOfInterest.splice(inx,1)
                cleanTrackList(person)
            }

            $scope.updatePerson = function(){

                inputPerson.name = $scope.input.name;
                inputPerson.organization = $scope.input.organization;
                //inputPerson.touchStoneUser = $scope.input.touchStoneUser;

                inputPerson.contact.length = 0;
                inputPerson.contact.push({type:'email',value: $scope.input.email});


                if ($scope.input.primaryTrack && $scope.input.primaryTrack.id) {
                    inputPerson.primaryTrack = {id:$scope.input.primaryTrack.id,name:$scope.input.primaryTrack.name}
                } else {
                    delete inputPerson.primaryTrack;
                }

                if ($scope.tracksOfInterest.length > 0) {
                    inputPerson.toi = [];
                    $scope.tracksOfInterest.forEach(function (track) {
                        inputPerson.toi.push({id:track.id,name:track.name})
                    })
                }


                ecosystemSvc.updatePerson(inputPerson).then(
                    function(data) {
                        $scope.$close(data)
                    }, function(err) {
                        alert('Error saving person: '+ angular.toJson(err));
                        $scope.$dismiss()
                    }
                )

            }
        }
    );