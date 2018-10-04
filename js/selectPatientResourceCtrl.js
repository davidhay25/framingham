
angular.module("sampleApp")
    .controller('selectPatientResourceCtrl',
        function ($scope,$http,patient,allResources) {
            $scope.patient = patient
            $scope.allResources = allResources;


            //get a list of all the resource types
            $scope.types = {}
            allResources.entry.forEach(function (entry) {
                var type = entry.resource.resourceType;
                $scope.types[type] = $scope.types[type] || {display:type,resources:[]}
                $scope.types[type].resources.push(entry.resource)
            })

            console.log($scope.types)

            $scope.selectType = function(type) {
                delete $scope.selectedResource;
                console.log(type)
                $scope.selectedType = type;

            };
            $scope.showResource = function(resource){
                $scope.selectedResource = resource
            }

            $scope.selectResource = function(){
                $scope.$close($scope.selectedResource)
            }

    });
