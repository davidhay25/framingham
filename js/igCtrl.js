angular.module("sampleApp")
    .controller('igCtrl',
        function ($scope,ecosystemSvc,IG) {
            $scope.input = {}

            if (IG) {
                $scope.input.name = IG.name ;
                $scope.input.description = IG.description ;
                $scope.input.package = IG.package ;
                $scope.input.version = IG.version ;
                $scope.input.link = IG.link ;
            }

            $scope.save = function () {
                let ig = {}
                if (IG) {
                    ig.id = IG.id
                } else {
                    ig.id = "id" + new Date().getTime();
                }

                ig.name = $scope.input.name;
                ig.description = $scope.input.description;
                ig.package = $scope.input.package;
                ig.version = $scope.input.version;
                ig.link = $scope.input.link;
                ecosystemSvc.addIG(ig).then(
                    function (ig) {
                        $scope.$close();
                    },
                    function (err) {
                        alert(angular.toJson(err))
                    }
                )


            }

        });
