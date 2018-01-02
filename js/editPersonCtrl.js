angular.module("sampleApp")
    .controller('editPersonCtrl',
        function ($scope,ecosystemSvc,person) {
            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.input = {}
            $scope.saveText = "Add Person";
            $scope.titleText = "Add new person";

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
                })
                $scope.saveText = "Update Person"
                $scope.titleText = "Edit existing person";
            } else {
                inputPerson = {id:'id'+new Date().getTime(),contact:[]};
            }


            $scope.updatePerson = function(){

                inputPerson.name = $scope.input.name;
                inputPerson.organization = $scope.input.organization;
                inputPerson.contact.length = 0;
                inputPerson.contact.push({type:'email',value: $scope.input.email});

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