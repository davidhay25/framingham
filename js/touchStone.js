angular.module("sampleApp")
    .controller('touchStoneCtrl',
        function ($scope,$http,$uibModal,ecosystemSvc) {

//https://touchstone.aegis.net/touchstone/userguide/html/continuous-integration/api.html.

            //User: rettema@gmail.com

            //Password: FH!Rt34t

            $scope.authenticate = function() {

                var user = ecosystemSvc.getCurrentUser()



                var email;
                if (user.contact) {
                    user.contact.forEach(function (contact) {
                        if (contact.type=='email') {
                            email = contact.value;
                        }
                    })
                }

                if (!email) {
                    alert('There must be an email for a user to be able to log into Touchstone');
                    return;
                }

                $uibModal.open({
                    templateUrl: 'modalTemplates/touchStonelogin.html',
                    controller: function($scope){

                        $scope.password = "FH!Rt34t";       //just while developing...

                        $scope.login = function(){
                            $scope.$close($scope.password)
                        }
                    }

                }).result.then(function(password){


                    //var url = "https://touchstone.aegis.net/touchstone/api/authenticate";
                    var url = "ts/authenticate";
                    var body = {email:email,password:password}
                    $http.post(url,body).then(
                        function(data) {
                            console.log(data.data)
                            $scope.apiKey = data.data['API-Key']

                        },
                        function(err) {
                            alert('Sorry, that password was incorrect')
                            console.log(err.data)
                        }
                    )
                });

            };

            //retrieve the results for the current user from touchstone
            var getTestResults = function() {
                //get the results from touchstone. locate the server based on the IP




                //https://touchstone.aegis.net/touchstone/userguide/html/continuous-integration/api.html.
                //var tsAPIUrl =

            }

        }
    );