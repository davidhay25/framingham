angular.module("sampleApp")
    .controller('downloadCtrl',
        function ($scope,object) {

            $scope.downloadType = "Results"

            $scope.downloadLinkJsonContent = window.URL.createObjectURL(new Blob([angular.toJson(object, true)],
                {type: "text/text"}));
            $scope.downloadLinkJsonName = "connectathonResults";

        }
    );