angular.module("sampleApp")
    .controller('downloadCtrl',
        function ($scope,object) {

            $scope.downloadType = "Results"

            $scope.downloadLinkCsvContent = window.URL.createObjectURL(new Blob([object],
                {type: "text/csv"}));
            $scope.downloadLinkCsvName = "connectathonResults";

/*
            $scope.downloadLinkJsonContent = window.URL.createObjectURL(new Blob([angular.toJson(object, true)],
                {type: "text/text"}));
            $scope.downloadLinkJsonName = "connectathonResults";
*/
        }
    );