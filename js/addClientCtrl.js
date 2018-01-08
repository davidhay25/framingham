angular.module("sampleApp")
    .controller('addClientCtrl',
        function ($scope,ecosystemSvc,existingClient,modalService) {

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
            $scope.saveText = "Add new Client";

            $scope.input = {}

            $scope.canAdd = false;

            if (existingClient) {
                //this is an edit
                $scope.canAdd = true;
                $scope.saveText = "Update client";
                $scope.input.name = existingClient.name;
                $scope.input.description = existingClient.description ;

                if (existingClient.contact) {
                    $scope.contact = existingClient.contact[0];
                    $scope.selectedPerson = existingClient.contact[0];
                } else {
                    $scope.contact = ecosystemSvc.getCurrentUser();
                    $scope.selectedPerson = ecosystemSvc.getCurrentUser();
                }

            } else {
                //this is new...
                $scope.contact = ecosystemSvc.getCurrentUser();
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
            }

            //when a contact is selected in the UI
            $scope.contactSelected = function(item){
                $scope.selectedPerson = item;
            };


            $scope.checkName = function() {
                //if this is an edit, then don't check for dupes!
                if (existingClient) {
                    return true;
                }

                $scope.canAdd = true
                var allClients = ecosystemSvc.getAllClients();
                allClients.forEach(function (clnt) {
                    if (clnt.name && (clnt.name.toLowerCase() == $scope.input.name.toLowerCase())) {
                        modalService.showModal({},{bodyText:"This client name has already been used. Please use another one."});
                        $scope.canAdd = false;
                    }
                });
                //return canAdd;
            };

            $scope.addClient = function(){


                var isNewClient = true;
                var client = {id:'id'+new Date().getTime()};
                if (existingClient) {
                    client.id = existingClient.id;
                    isNewClient = false;
                }


                client.name = $scope.input.name;
                client.description = $scope.input.description;
                client.contact = [$scope.selectedPerson]
                ecosystemSvc.updateClient(client,isNewClient).then(
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