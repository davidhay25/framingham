/**
 * The controller for the Orion Framingham risk demo
 * When this page is loaded, the user has logged in and is stored in a session cache on the server
 */

angular.module("sampleApp")
    .controller('smartQueryCtrl',
        function ($scope,$http) {

            $scope.input = {}

            //retrieve the scope information...
            $http.get('/serverdata').then(
                function (data) {
                    console.log(data.data);
                    $scope.scope = data.data.scope;
                    $scope.capStmt = data.data.capStmt
                    $scope.idToken = data.data.idToken;
                    $scope.fullToken = data.data.fullToken;

                },function(err) {
                    console.log(err)
                    alert('Unable to retrieve server scope' )

                }
            )

            $scope.executeQuery = function(srch) {
                $scope.waiting = true;
                $http.get('/orionfhir/'+srch).then(
                    function (data) {

                        $scope.resultsBundle = data.data;

                    },function(err) {
                        console.log(err)
                        alert('Error executing query: ' +srch + "\n" + angular.toJson(err.data) )
                        $scope.error = err;
                    }
                ).finally(
                    function(){
                        $scope.waiting = false;
                    }
                );
            }


    });
