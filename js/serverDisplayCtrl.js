angular.module("sampleApp")
    .controller('serverDisplayCtrl',
        function ($scope,$http,ecosystemSvc,$timeout) {

/*
            $scope.selectTrackServers = function (ts) {
                $scope.selectedTrackServers = ts
            }
*/
            //update the hash of servers for a track
            $scope.updateTrackServerListDEP = function () {
                $scope.hashTrackServers = {}
                if ($scope.allServers && $scope.hashTracks) {
                    $scope.allServers.forEach(function (svr) {
                        if (svr.tracks && svr.tracks.length > 0) {
                            svr.tracks.forEach(function (trackId) {

                                let track = $scope.hashTracks[trackId]
                                if (track) {
                                    $scope.hashTrackServers[trackId] = $scope.hashTrackServers[trackId] || {track:track,servers:[]}

                                    $scope.hashTrackServers[trackId].servers.push(svr)
                                }
                            })

                        }
                        console.log($scope.hashTrackServers)

                    })
                }

            }

/*
            //wait a couple of seconds for the track list to be created
            $timeout(function () {
                $scope.updateTrackServerList()
            },2000)
*/

            $scope.getElapsed = function(svr) {
                let elapsed = ""
                if (svr.status) {
                    elapsed = moment().diff(moment(svr.status.date))
                    return elapsed;
                }

            }

            $scope.getCapabilityStatement = function (svr) {
                //let deferred = $q.defer();
                svr.waiting = true;

                if (! svr.address) {
                    alert("Must have a url address")
                    return
                }

                if (svr.address.slice(-1) !== '/') {
                    svr.address = svr.address + "/"
                }

                let url = '/proxyfhir/' + svr.address + 'metadata';
                delete svr.status;
                //console.log(svr)
                $http.get(url).then(
                    function(data) {
                        setServerStatus(svr,data.status)
                    },
                    function(err) {
                        setServerStatus(svr,err.status)
                    }
                ). finally(function (){
                    svr.waiting = false;
                })


                function setServerStatus(svr,status) {

                    svr.status = {date: new Date().getTime(),status:status}

                    ecosystemSvc.updateServer(svr,false).then(
                        function(data) {
                            $scope.updateServersLastChecked();  //update the elapsed on all servers - in parent controller...
                        }, function(err) {
                            alert('Error updating server: '+ angular.toJson(err))

                        }
                    )

                }

            }

        })