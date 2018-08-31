angular.module("sampleApp")
    .controller('jsonTestCtrl',
        function ($scope,$http,ecosystemSvc,cofSvc) {


            $scope.input = {};
            var hashPersons = {}
            var hashScenario = {}


            function makeResource(tree) {
                //first

            }

            $scope.showItem = function(item) {
                console.log(item)
                delete $scope.itemResourceJson;
                delete $scope.error
                $scope.currentItem = item;



                if (item.table) {


                    var treeData = cofSvc.makeTree(item.table);
                    console.log(treeData)
                    var treeData = cofSvc.makeTree($scope.input.table);
                    let vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);

                    console.log(vo)
                    if (vo && vo.resource) {
                        $scope.itemResourceJson = vo.resource;
                    }
                    if (vo && vo.error) {
                        $scope.error = vo.error;

                        $scope.error.arTrace = vo.error.stack.split('\n');
                        //console.log($scope.error)

                    }
                } else {
                    $scope.error = {message : "No elements"}
                }


            };

            $scope.showGraph = function(graph) {
                delete $scope.currentItem;
                delete $scope.itemResourceJson;
                delete $scope.error;

                $http.get('/oneScenarioGraph/'+graph.id).then(
                    function(data) {
                        console.log(data.data)
                        $scope.graph = data.data;
                    }
                );
            };

            $http.get('/person').then(
                function(data) {
                    var allPersons = data.data;
                    allPersons.forEach(function(person){
                        hashPersons[person.id] = person
                    })

                    $http.get('/config/scenario').then(
                        function(data) {
                            data.data.forEach(function (scenario) {
                                hashScenario[scenario.id] = scenario;
                            });


                            console.log(hashPersons)
                            $http.get('/scenarioGraph').then(
                                function(data) {
                                    console.log(data)
                                    $scope.graphs = data.data;
                                    $scope.graphs.forEach(function (graph) {
                                        graph.user = hashPersons[graph.userid]
                                        graph.scenario = hashScenario[graph.scenarioid]
                                        console.log(graph.user)
                                    })
                                }
                            );
                        }
                    )
                }
            )
        }
    )
