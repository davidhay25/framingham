
angular.module("sampleApp")
    .controller('lmCheckCtrl',
        function ($scope,ecosystemSvc,$http,$filter) {

            $scope.input = {sample:{}};
            var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/ARForm-1';  //todo testing

            $http.get(url).then(
                function(data){
                    $scope.SD = data.data;
                    $scope.table = makeTableArray($scope.SD)
                });

            $scope.editSample = function(inx) {
                //console.log(inx,$scope.input.sample);
                //console.log($scope.input.sample[inx])
                var currentValue = $scope.input.sample[inx];
                var item = $scope.table[inx];
            };

            function makeTableArray(SD){
                var ar = []
                SD.snapshot.element.forEach(function (ed,inx) {
                    if (ed.type) {
                        var item = {path: $filter('dropFirstInPath')(ed.path) };
                        item.id = inx-1;
                        item.dt = ed.type[0].code;
                        item.definition = ed.definition;
                        item.mult = ed.min + '..'+ed.max;

                        if (item.dt == 'Reference') {
                            var type = $filter('getLogicalID')(ed.type[0].targetProfile)
                            item.referenceDisplay = '--> ' + type;
                        }

                        ar.push(item)
                    }
                });
                return ar;
            }

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
