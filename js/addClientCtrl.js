angular.module("sampleApp")
    .controller('addClientCtrl',
        function ($scope,ecosystemSvc) {

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]



            $scope.input = {}

            $scope.contactSelected = function(item){
                $scope.selectedPerson = item;
                console.log(item);//, $model, $label, $event)
                //typeahead-on-select($item, $model, $label, $event)
            }


            $scope.addClient = function(){
                var client = {id:'id'+new Date().getTime()};
                client.name = $scope.input.name;
                client.description = $scope.input.description;
                client.contact = [$scope.selectedPerson]
                ecosystemSvc.addNewClient(client).then(
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