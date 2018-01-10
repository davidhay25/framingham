
angular.module("sampleApp")
    .controller('ecoDashboardCtrl',
        function ($scope,$http,$interval,moment) {

        $interval(checkSite,5000)
        $interval(updateLastSeen,1000)

        //update when last seen
        function updateLastSeen() {
            $scope.age = moment().diff($scope.lastAccessed,'seconds')

            //if it's 30 seconds since the last access, call an error
            if ($scope.age > 30) {
                notResponding()
            }
        }

        //make a REST query against the site
        function checkSite() {
            var url = "config/admin/";
            $http.get(url).then(function(){
                $scope.lastAccessed = new moment().format();
            },function (err) {

            })
        }


        function notResponding() {
            $scope.notResponding = true;
            $scope.stoppedAt = new moment().format();
        }

    });
