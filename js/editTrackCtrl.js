angular.module("sampleApp")
    .controller('editTrackCtrl',
        function ($scope,ecosystemSvc,track) {
            if (track) {
                $scope.track = track;

                $scope.input = {};
                $scope.input.description = track.description;


                $scope.save = function(){
                    track.description = $scope.input.description;
                    $scope.$close()
                }
            }
        }
    );