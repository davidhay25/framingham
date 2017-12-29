angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,scenario,server,client,previousResult) {

            $scope.input = {};

            $scope.radioModel = '';

            if (previousResult) {
                $scope.input.note = previousResult.note;
                $scope.radioModel = previousResult.text;
            }

            $scope.save = function() {
                var vo = {}
                vo.text = $scope.radioModel;
                vo.note = $scope.input.note;
                $scope.$close(vo);
            }

        }
    );