
angular.module("sampleApp")
    .controller('loginCtrl',
        function ($scope,$http) {

            $scope.input = {};

            $http.get('/config').then(
                function (data) {

                    $scope.environments = data.data;
                    $scope.input.environment = $scope.environments[0]
                }
            );

            $scope.authenticate = function() {
                var url = $http.get('/orion/authUri').then(
                    function(url) {
                       // console.log(url)
                        $window.open(url)
                    }
                )

            };

    })
