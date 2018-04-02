angular.module("sampleApp")
    .controller('editRoleCtrl',
        function ($scope,ecosystemSvc,track,role) {

            $scope.role = role;
            $scope.canSave = true;


            $scope.save = function(){
                $scope.$close({role:$scope.role})
            };



        }
    );