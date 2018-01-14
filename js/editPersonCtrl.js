angular.module("sampleApp")
    .controller('editPersonCtrl',
        function ($scope,ecosystemSvc,person,tracks) {
            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.input = {}
            $scope.saveText = "Add Person";
            $scope.titleText = "Add new person";

            $scope.tracks = [{name:''}];

            tracks.forEach(function (trck) {
                $scope.tracks.push(trck);
            });

            var inputPerson;
            if (person) {
                //this is an update
                inputPerson = person;
                $scope.input.name = person.name;
                $scope.input.organization = person.organization;
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
                $scope.saveText = "Update Person";
                $scope.titleText = "Edit existing person";
            } else {
                inputPerson = {id:'id'+new Date().getTime(),contact:[]};
            }


            $scope.updatePerson = function(){

                inputPerson.name = $scope.input.name;
                inputPerson.organization = $scope.input.organization;
                inputPerson.contact.length = 0;
                inputPerson.contact.push({type:'email',value: $scope.input.email});


                if ($scope.input.primaryTrack && $scope.input.primaryTrack.id) {
                    inputPerson.primaryTrack = {id:$scope.input.primaryTrack.id,name:$scope.input.primaryTrack.name}
                } else {
                    delete inputPerson.primaryTrack;
                }


                ecosystemSvc.updatePerson(inputPerson).then(
                    function(data) {
                        $scope.$close()
                    }, function(err) {
                        alert('Error saving person: '+ angular.toJson(err))
                        $scope.$dismiss()
                    }
                )

            }
        }
    );