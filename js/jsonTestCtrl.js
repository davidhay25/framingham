
angular.module("sampleApp")
    .controller('jsonTestCtrl',
        function ($scope,$http,ecosystemSvc) {


            var scenario = {}
            $scope.graphs = []


            $scope.selectItem = function(item) {
                console.log(item)
                $scope.selectedItem = item;
                $scope.elements = [];
                item.table.forEach(function (row) {
                    if (row.structuredData) {
                        $scope.elements.push(row)
                    }
                });

                $scope.makeJson();
            };


            $scope.makeJson = function() {
                $scope.json = ecosystemSvc.makeResourceJson($scope.selectedItem.baseType, $scope.selectedItem.id, $scope.selectedItem.table).resource
            };

            $scope.selectGraph = function (graph) {
                $scope.selectedGraph = graph;
                delete $scope.selectedItem;
                delete $scope.elements;

                console.log(graph)
            };

            $http.get('/config/scenario').then(
                function(data) {
                    console.log(data)
                    data.data.forEach(function (scen) {
                        scenario[scen.id] = scen;
                    })

                    $http.get('/scenarioGraph').then(
                        function(data) {
                            console.log(data.data)

                            data.data.forEach(function (item) {
                                var url = '/oneScenarioGraph/'+item.id;
                                $http.get(url).then(
                                    function(data) {
                                        var graph = data.data;
                                        graph.scenario = scenario[graph.scenarioid]
                                        $scope.graphs.push(graph)
                                    }
                                )
                            })
                        }
                    )
                }
            )



    });
