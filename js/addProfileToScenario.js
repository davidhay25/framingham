angular.module("sampleApp")
    .controller('addProfileToScenarioCtrl',
        function ($scope,track,scenario,$http) {
            var IGRef = track.IG;
            $scope.track = track;
            $scope.input = {};
            $scope.scenario = scenario;

            //load the profiles from the IG reference that is passed in. Should always be present...
           // if (IGRef) {
                var url = IGRef.url;
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)

                        //pull out the profiles
                        var lst = []
                        var IG = data.data;
                        IG.package.forEach(function (package) {
                            package.resource.forEach(function (resource) {
                                if (resource.acronym == 'profile') {
                                    lst.push(resource)
                                }
                            })
                        });

                        lst.sort(function(a,b){
                            if (a.name > b.name) {
                                return 1
                            } else {
                                return -1
                            }
                        });
                        $scope.profiles = lst;

                        //now set the profiles that are already included...
                        if (scenario && scenario.selectedProfiles) {
                            $scope.input.selected = {};
                            scenario.selectedProfiles.forEach(function (profile) {
                                var url = profile.sourceReference.reference;
                                for (var i=0; i< $scope.profiles.length; i++) {
                                    if ($scope.profiles[i].sourceReference.reference == url) {
                                        $scope.input.selected[i] = true;
                                        break;
                                    }
                                }
                            })
                        }
                    },
                    function(err) {
                        console.log(err)
                    }
                );

          //  }

            $scope.save = function(){
                scenario.selectedProfiles = [];
                console.log($scope.input.selected);
                angular.forEach($scope.input.selected,function(v,k){
                    console.log(v,k)
                    if (v) {
                        scenario.selectedProfiles.push($scope.profiles[k])
                    }

                })

                console.log(scenario.selectedProfiles)
                $scope.$close();

            }

        }
    );