/**
 * The controller for the Orion Framingham risk demo
 * When this page is loaded, the user has logged in and is stored in a session cache on the server
 */

angular.module("sampleApp")
    .controller('smartErrorCtrl',
        function ($scope,$http) {

            //retrieve the error information...
            $http.get('/orionerror').then(
                function (data) {
                    console.log(data.data);
                    $scope.error = data.data;

                },function(err) {
                    console.log(err)
                    alert('Unable to retrieve error' )

                }
            )

    });
