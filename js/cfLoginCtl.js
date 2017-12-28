
angular.module("sampleApp")
    .controller('cfLoginCtrl',
        function ($scope,$http) {

            $scope.input = {un:'dhay',pw:'test'};

            $scope.login = function(un,pw) {
                var details = {};
                var url = "/cf/login";

                details.un = $scope.input.un;
                details.pw = $scope.input.pw;
                $http.post(url,details)

            }

    });
