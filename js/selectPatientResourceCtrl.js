
angular.module("sampleApp")
    .controller('selectPatientResourceCtrl',
        function ($scope,$http,patient,allResources,currentList) {
            $scope.patient = patient
            $scope.selectedResources = []


            //only show resources not currently in the list
            var hash = {};
            if (currentList) {
                currentList.forEach(function (item) {
                    hash[item.id] = item;
                })
            }


            //select a resource...
            $scope.selectOneResource = function(resource) {
                console.log(resource)
                $scope.selectedResources.push(resource)
                //remove from the list of options
                for (var i=0; i< $scope.selectedTypeObject.resources.length; i++) {
                    var r = $scope.selectedTypeObject.resources[i]
                    console.log(r)
                    if (r.id == resource.id) {
                        $scope.selectedTypeObject.resources.splice(i,1);
                        console.log('deleting at '+i)
                        break;
                    }
                }

            };

            $scope.removeOneResource = function(inx) {
                var ar = $scope.selectedResources.splice(inx,1)
                $scope.selectedTypeObject.resources.push(ar[0])
            }

            $scope.allResources = {entry:[]}
            allResources.entry.forEach(function (entry) {
                var resourceId = entry.resource.id;
                if (!hash[resourceId]) {
                    $scope.allResources.entry.push(entry)
                }


            })


            function buildTypes() {
                console.log($scope.allResources.entry.length)
                $scope.types = {}
                $scope.allResources.entry.forEach(function (entry) {
                    var type = entry.resource.resourceType;
                    $scope.types[type] = $scope.types[type] || {display:type,resources:[]}
                    $scope.types[type].resources.push(entry.resource)
                })
            }
            buildTypes();

           // console.log($scope.types)

            $scope.selectType = function(typeObject) {
                //$scope.currentType = type;
                delete $scope.selectedResource;
                //console.log(type)
                $scope.selectedTypeObject = typeObject;


            };
            $scope.showResource = function(resource){
                $scope.selectedResource = resource
            }

            $scope.selectResources = function(){
                //$scope.$close([$scope.selectedResource])
                $scope.$close($scope.selectedResources)
            }

    });
