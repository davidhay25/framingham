
angular.module("sampleApp")
    .controller('jsonTestCtrl',
        function ($scope,$http,ecosystemSvc,cofSvc) {


            var scenario = {}
            $scope.graphs = []


            $scope.loadProfile = function(){
                var url = "http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/au-patient"
                //'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/cc-Patient'
                $http.get(url).then(
                    function(data) {
                        var SD = data.data;
                        var track = {}
                        var newId = 'ATest';
                        cofSvc.makeLogicalModelFromSD(SD,track,newId).then(
                            function(LM) {

                                $scope.convertedProfile = LM;

                                var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/'+newId;
                                $http.put(url,LM).then(
                                    function(){
                                        console.log('saved')
                                    },
                                    function(err){
                                        console.log(err)
                                    }
                                )



                            }
                        )
                    }
                );

            }


            $scope.selectItem = function(item) {
                //console.log(item)
                $scope.selectedItem = item;
                $scope.elements = [];
                item.table.forEach(function (row) {
                    if (row.structuredData) {
                        $scope.elements.push(row)
                    }
                });

                $scope.makeJson();
            };


            var hideLeft = true
            $scope.toggleSize = function() {
                hideLeft = !hideLeft
                if (hideLeft) {
                    $scope.col1Class = 'hidden';
                    $scope.col3Class = 'col-sm-5 col-md-5';
                    $scope.col4Class = 'col-sm-5 col-md-5';
                } else {
                    $scope.col1Class = 'col-sm-2 col-md-2';
                    $scope.col3Class = 'col-sm-4 col-md-4';
                    $scope.col4Class = 'col-sm-4 col-md-4';
                }
            };

            $scope.toggleSize();



            $scope.makeJson = function() {

                var treeData = cofSvc.makeTree($scope.selectedItem.table)

                $scope.json = ecosystemSvc.makeResourceJson($scope.selectedItem.baseType, $scope.selectedItem.id, treeData).resource

                //$scope.json = ecosystemSvc.makeResourceJson($scope.selectedItem.baseType, $scope.selectedItem.id, $scope.selectedItem.table).resource
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
