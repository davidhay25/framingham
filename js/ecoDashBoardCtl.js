
angular.module("sampleApp")
    .controller('ecoDashboardCtrl',
        function ($scope,$http,$interval,moment) {



        $scope.changeInterval = function(){
            $interval.cancel(checkSite);

        };

        $scope.delay = 30000;       //delay between checks in milliseconds

        var checkSite = $interval(checkSite,$scope.delay)
            $interval(updateLastSeen,1000)

        //update when last seen
        function updateLastSeen() {
            $scope.age = moment().diff($scope.lastAccessed,'seconds')

            //if it's 30 seconds since the last access, call an error
            if ($scope.age > 40) {
                notResponding()
            }
        }

        //make a REST query against the site
        function checkSite() {
            var url = "heartbeat?tmp="+new Date().getTime();
            $http.get(url).then(function(){
                $scope.lastAccessed = new moment().format();
            },function (err) {

            })
        }


        function notResponding() {
            if (! $scope.notResponding) {
                $scope.notResponding = true;
                $scope.stoppedAt = new moment().format();
            }

        }

    });
