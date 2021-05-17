angular.module("sampleApp")
    .controller('downloadCtrl',
        function ($scope,object,name) {

            $scope.downloadType = "Results"

            $scope.downloadLinkCsvContent = window.URL.createObjectURL(new Blob([object],
                {type: "text/csv"}));
            $scope.downloadLinkCsvName = name; //"connectathonResults";

        }
    );