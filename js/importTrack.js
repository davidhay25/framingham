angular.module("sampleApp")
    .controller('importTrackCtrl',
        function ($scope,$http,$uibModal,cofSvc,modalService,$q) {


            $scope.import = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/importTrack.html',
                    size: 'lg',
                    controller: function($scope){
                        $scope.input = {};
                        $scope.progress = []
                        let track = null;
                        let queries = []
                        $scope.import = function() {
                            try {
                                track = angular.fromJson($scope.input.json)
                            } catch (e) {
                                alert("Unable to parse the json.");
                                return;
                            }

                            if (!track.exportedTrack) {
                                alert("The json must be an export from an existing track.");
                                return;
                            }

                            console.log(track);
                            $scope.progress.push('Cleaning Track')
                            track.leads = [];
                            track.scenarioIds = [];
                            track.id = 'id' + new Date().getTime();

                            //re-identify scenarios...
                            if (track.scenarios) {
                                $scope.progress.push('Saving scenarios')

                                track.scenarios.forEach(function (scenario,inx) {
                                    scenario.id = 'id'+new Date().getTime() + '-' + inx;
                                    delete scenario._id;
                                    track.scenarioIds.push(scenario.id);

                                    //save the scenario here
                                    queries.push(new function(){
                                        let deferred = $q.defer();
                                        let url = "/config/scenario";
                                        $http.post(url,scenario).then(
                                            function() {
                                                $scope.progress.push('Saved scenario ' + scenario.name)
                                                deferred.resolve()},
                                            function(err) {
                                                $scope.progress.push('Failed scenario ' + scenario.name)
                                                $scope.progress.push(angular.toJson(err.data))
                                                deferred.reject()}
                                        )
                                        return deferred.promise
                                    });


                                    //------



                                })

                            }

                            //save the track
                            queries.push(new function(){
                                delete track.scenarios;     //the scenario objects are like a cache. scenarioIds are what count...
                                delete track._id;
                                let deferred = $q.defer();
                                let url = "/config/track";
                                $http.post(url,track).then(
                                    function() {
                                        $scope.progress.push('Saved track')
                                        deferred.resolve()},
                                    function(err) {
                                        $scope.progress.push('Failed track ')
                                        $scope.progress.push(angular.toJson(err.data))
                                        deferred.reject()}
                                )
                                return deferred.promise

                            });

console.log(queries)
                            //process all the queries
                            $q.all(queries).then(
                                function() {
                                    alert('Track and any associated scenarios have been imported')
                                    delete $scope.input.json;

                                },
                                function(ex) {
                                    alert('Error saving track:'+ angular.toJson(ex))
                                }
                            )


                            //$scope.$close(svr);
                        }
                    }



                }).result.then(
                    function(data) {



                        console.log(data)

                    })
            }

        })