angular.module("sampleApp")
    .controller('adminCtrl',
        function ($scope,$http,ecosystemSvc) {


            $scope.saveTrackLeads = function() {
                let url = "/admin/makeTrackLeadCollection"
                $http.post(url,$scope.admin_trackLeads).then(
                    function() {
                        alert('trackLeads collection created')
                    },
                    function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            $scope.adminTrackLeads = function() {
                let hashLeads = {}

                $scope.tracks.forEach(function (track) {
                    if (track.leadIds) {
                        track.leadIds.forEach(function (leadId){
                            let person = ecosystemSvc.getPersonWithId(leadId)
                            if (person) {
                                hashLeads[person.id] = person

                            }
                        })

                    }
                })

                $scope.admin_trackLeads = [];
                Object.keys(hashLeads).forEach(function (key){
                    $scope.admin_trackLeads.push(hashLeads[key])
                })



            }

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