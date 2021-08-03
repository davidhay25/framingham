angular.module("sampleApp")
    .controller('adminCtrl',
        function ($scope,$http) {

            //todo - should only be done if there are no results for this track ? check first
            $scope.admin_deleteTrack = function(track) {
                console.log(track)


                let url =  `/admin/deleteTrack/${track.id}`
                $http.put(url,{}).then(
                    function (data) {
                        $scope.refresh();
                    },
                    function(err) {
                        alert(angular.toJson(err.data))
                    }
                )


                // keep for when finished... $scope.refresh();

            }
        }
    )