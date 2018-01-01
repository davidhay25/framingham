angular.module("sampleApp")
    .controller('addServerCtrl',
        function ($scope,ecosystemSvc) {

        $scope.input = {}
        $scope.addServer = function(){





            var server = {id:'id'+new Date().getTime()};
            server.name = $scope.input.name;
            server.description = $scope.input.description;
            server.address = $scope.input.address;
            ecosystemSvc.addNewServer(server).then(
                function(data) {
                    $scope.$close()
                }, function(err) {
                    alert('Error saving server: '+ angular.toJson(err))
                    $scope.$dismiss()
                }
            )

        }
    }
);