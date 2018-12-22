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
                            let roleSuffix = '-' + new Date().getTime();    //to ensure roleId is unique...

                            //re-identify scenarios...
                            if (track.scenarios) {
                                //roles are in a separate collection references by _id. scenario.roles is a cache...
                                hashRole = {};      //all roles for all scenarios in this track
                                track.scenarios.forEach(function (scenario,inx) {
                                    if (scenario.roles) {
                                        scenario.roleIds = [];
                                        scenario.roles.forEach(function (role) {
                                           // delete role._id;
                                            hashRole[role.id] = role;
                                            scenario.roleIds.push(role.id + roleSuffix)     //update the id
                                        });
                                        delete scenario.roles;      //this is a cache
                                    }
                                });

                                //save all the roles
                                angular.forEach(hashRole,function(role){
                                    role.id = role.id + roleSuffix;
                                    role.trackId = track.id;
                                    queries.push(addEntity('role',role));
                                });



                                $scope.progress.push('Saving scenarios')

                                track.scenarios.forEach(function (scenario,inx) {
                                    scenario.id = 'id'+new Date().getTime() + '-' + inx;
                                    delete scenario._id;
                                    track.scenarioIds.push(scenario.id);


                                    queries.push(addEntity('scenario',scenario));
                                    /*
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
                                    */

                                })

                            }

                            //save the track
                            delete track.scenarios;     //the scenario objects are like a cache. scenarioIds are what count...
                            //
                            //
                            // delete track._id;
                            queries.push(addEntity('track',track));
                            /*

                            queries.push(new function(){


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
                            */

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
                        };

                        function addEntity(type,obj) {
                            let deferred = $q.defer();
                            let url = "/config/"+type;
                            delete obj._id
                            $http.post(url,obj).then(
                                function() {
                                    $scope.progress.push('Saved ' + type + obj.name)
                                    deferred.resolve()},
                                function(err) {
                                    $scope.progress.push('Failed ' + type + obj.name)
                                    $scope.progress.push(angular.toJson(err.data))
                                    deferred.reject()}
                            )
                            return deferred.promise
                        }


                    }



                }).result.then(
                    function(data) {



                        console.log(data)

                    })
            }

        })