
angular.module("sampleApp")
    .controller('smartLoginCtrl',
        function ($scope,$http,$window) {

            $scope.input = {selectedProfile:{}};

            //load the profiles. This will be moved to a browser cache...
            $http.get('/artifacts/smartProfiles.json').then(
                function (data) {
                    $scope.smartProfiles = data.data.profiles;
                    //console.log($scope.smartProfiles)
                }
            );


            $scope.input = {};
            $scope.input.scope = "openid profile patient/*.*";


            $scope.selectProfile = function(profile) {
                $scope.input.scope = profile.defaultScope;
                $scope.input.selectedProfile = profile;
            }


            $scope.login = function(profile) {
                //check that the scope is appropriate
                if (! $scope.input.selectedProfile.clientIdConfig) {
                    //cannot use openid
                    if ($scope.input.scope.indexOf('openid') > -1) {
                        alert("You must have a 'clientIdConfig' property to use openid")
                        return;
                    }
                }



                $scope.input.state = 'login';
                $http.post('/setup',profile).then(
                    function (data) {

                        //after successful login, move to the auth endpoint on the server
                        $window.location.href = "/auth?scope=" + $scope.input.scope;

                    }, function(err) {
                        alert(angular.toJson(err))
                    }
                );
            }

            $scope.setProfileDEP = function() {


                $http.get('/setup').then(
                    function (data) {
                        $scope.config = data.data;
                        console.log($scope.config)
                    }
                );
            }

    })
