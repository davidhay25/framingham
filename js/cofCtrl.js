
angular.module("sampleApp")
    .controller('cofCtrl',
        function ($scope,ecosystemSvc,$http,$filter) {

            $scope.input = {};

            var allScenarios = {};

            $scope.deleteRow = function (inx) {
                $scope.cofScenario.rows.splice(inx,1);
                save();
            };

            $scope.addRow = function() {
                var row = {};
                row.dataItem = $scope.input.dataItem;
                row.example = $scope.input.example;
                row.resourceType = $scope.cofType;
                row.path = $scope.input.path;
                row.mult = $scope.selectedPathElement.min + '..' + $scope.selectedPathElement.max;
                if ($scope.rowType) {
                    row.dataType = $scope.rowType;
                } else {
                    row.dataType = $scope.input.rowType;
                }
                row.notes = $scope.input.rowNotes;
                $scope.cofScenario.rows.push(row);

                //save the updated scenario...
                save();

                $scope.input = {};
                delete $scope.selectedPathElement;
                delete $scope.rowTypeOptions;
                delete $scope.rowType;

            };


            function save() {
                var url = "/addScenarioToTrack/"+$scope.cofScenario.id;
                $http.post(url,$scope.cofScenario).then(
                    function(data) {
                        //now, add the new scenario to the track and update

                    }, function(err) {
                        console.log(err)
                        alert('There was an error '+ angular.toJson(err))
                    }
                );

            }

            $scope.showEDSummary = function(type,path) {

                ecosystemSvc.getAllPathsForType(type,true).then(
                    function(vo) {
                        var ed = vo.hash[path];
                        console.log(path,ed,vo.hash)
                        if (ed) {
                            return ed.definition
                        }
                    }
                )

            };

            $scope.selectPath = function (path) {
                console.log(path,$scope.allPathsHash[path])
                delete $scope.rowType;
                delete $scope.rowTypeOptions;


                $scope.selectedPathElement = $scope.allPathsHash[path]; //this is an ED


                if ($scope.selectedPathElement) {
                    var types = $scope.selectedPathElement.type
                    if (types) {
                        if (types.length == 1) {
                            //there's only a single type...

                            $scope.rowType = getRefDisplay(types[0])

                        } else {
                            $scope.rowTypeOptions = []
                            types.forEach(function (typ) {
                                $scope.rowTypeOptions.push(getRefDisplay(typ));
                            })


                        }
                    }

                }

                function getRefDisplay(typ) {
                    var code = typ.code;

                    if (code == 'Reference') {
                        return '--> '+ $filter('getLogicalID')(typ.targetProfile)

                    } else {
                        return code;
                    }


                }
            };

            $scope.selectCofType = function(type) {
                console.log(type)
                $scope.cofType = type;

                ecosystemSvc.getAllPathsForType(type,true).then(
                    function(listOfPaths) {
                        console.log(listOfPaths)
                        $scope.allPaths = listOfPaths.list;

                        $scope.allPaths.sort(function(a,b){
                            if (a > b) { return 1} else {return -1}
                        })

                        $scope.allPathsHash = listOfPaths.hash;
                        $scope.dtDef = listOfPaths.dtDef;       //the definitions for a path (use to get the options)...
                    },function(err) {
                        alert("A type of "+ type +" was selected, but I couldn't locate the profile to get the element paths")
                    }
                )


            };

            $scope.cofSelectScenario = function(scenario) {
                delete $scope.cofType;
                //first, save the current scenario
                if ($scope.cofScenario) {
                    allScenarios[$scope.cofScenario.id] = $scope.cofScenario
                }

                //is the new scenario already have data
                if (allScenarios[scenario.id]) {
                    $scope.cofScenario = allScenarios[scenario.id]
                } else {
                    //don't want the main scenario object to hold the rows... - actually, I think we do...
                    var clone = angular.copy(scenario);
                    delete scenario._id;
                    allScenarios[scenario.id] = scenario; //clone;
                    $scope.cofScenario = scenario;//clone
                }
                $scope.cofScenario.rows = $scope.cofScenario.rows || []
            };


            $scope.$watch('selectedTrack',function(track,olfV){
                if (track && track.scenarios) {
                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true)
                            })
                        }
                    })

                }

            })

    });
