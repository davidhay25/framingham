angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,scenario,server,client,previousResult) {

            $scope.input = {};
            $scope.previousResult = previousResult;
            $scope.radioModel = '';

            if (previousResult) {
                $scope.input.note = previousResult.note;
                $scope.radioModel = previousResult.text;
            }

            $scope.save = function() {
                var result = {}
                result.text = $scope.radioModel;
                result.note = $scope.input.note;
                if (previousResult) {
                    result.id = previousResult.id;
                }

                $scope.$close(result);
            }

        }
    );