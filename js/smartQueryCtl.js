/**
 * The controller for the Orion Framingham risk demo
 * When this page is loaded, the user has logged in and is stored in a session cache on the server
 */

angular.module("sampleApp")
    .controller('smartQueryCtrl',
        function ($scope,$http,$q) {

            $scope.input = {}

            //retrieve the scope information...
            $http.get('/serverdata').then(
                function (data) {
                    console.log(data.data);
                    $scope.scope = data.data.scope;
                    $scope.capStmt = data.data.capStmt
                    $scope.idToken = data.data.idToken;
                    $scope.fullToken = data.data.fullToken;
                    $scope.config = data.data.config;


                },function(err) {
                    console.log(err)
                    alert('Unable to retrieve server scope' )

                }
            );


            $scope.standardQueries = function(patientId){
                if ($scope.config && $scope.config.defaultQueries) {
                    var queries = [];
                    $scope.sqResults = {}
                    $scope.config.defaultQueries.forEach(function(defQ){
                        var qry = defQ.url.replace("{patientId}",patientId);
                        queries.push(
                            $http.get('/orionfhir/'+qry).then(
                                function (data) {

                                    $scope.sqResults[defQ.display]=(data.data);

                                },function(err) {
                                    console.log(qry,err)
                                    //alert('Error executing query: ' +srch + "\n" + angular.toJson(err.data) )
                                    //$scope.error = err;
                                }
                            )
                        )
                    });
                    $scope.execSQ = true;
                    $q.all(queries).then(
                        function(){
                            console.log($scope.sqResults)
                            $scope.execSQ = false;
                            $scope.sqComplete = true;
                        },
                        function(err) {
                            $scope.execSQ = false;
                            console.log('$q.all',err)
                        }
                    )
                }
            };

            $scope.selectQueryResult = function(qry) {
                console.log(qry)
                $scope.selectedResults = $scope.sqResults[qry.display]
                $scope.selectedResultsDisplay = qry.display;    //todo shoudl track type in config

            };

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
