angular.module("sampleApp")
    .controller('addClientCtrl',
        function ($scope,ecosystemSvc) {

        $scope.input = {}
            $scope.addClient = function(){
                var client = {id:'id'+new Date().getTime()};
                client.name = $scope.input.name;
                client.description = $scope.input.description;
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