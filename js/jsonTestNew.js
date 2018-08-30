angular.module("sampleApp")
    .controller('jsonTestCtrl',
        function ($scope,$http,ecosystemSvc,cofSvc) {


            $scope.input = {};
            var hashPersons = {}
            var hashScenario = {}



            var makeResource = function(inTree,resourceType) {
                var hashBranch = {};    //will be a hierarchical tree
                hashBranch['#'] = {id:'#',branch:{},children:[]};

                //work on a copy as the tree is mutated...
                var tree = angular.copy(inTree);

                //run through a pattern of creating a hierarchy, then removing all empty leaf nodes.
                //need to complete until all leaf nodes are removed (can take multiple iterations

                var cleaning = true;
                var cnt = 0;        //a safety mechanism to avoid getting locked in a loop
                while (cleaning) {
                    var hashBranch = {};    //will be a hierarchical tree
                    hashBranch['#'] = {id:'#',branch:{},children:[]};

                    cleaning = false;
                    cnt++;

                    //build a version of the hierarchy...
                    tree.forEach(function (branch) {
                        var branchEntry= {id:branch.id,branch:branch,children:[]};
                        hashBranch[branch.id] = branchEntry;
                        if (branch.parent) {
                            var parent = hashBranch[branch.parent];
                            //console.log(parent)
                            //parent.children.push(angular.copy(branch))
                            parent.children.push(branchEntry)
                        }
                    });
                    //console.log(hashBranch)

                    //now create a hash of all empty leaf nodes...
                    var idsToDelete = {}
                    angular.forEach(hashBranch,function(v,k){
                        if (v.children.length == 0 && ! v.branch.data.structuredData) {
                            if (k !== '#') {
                                idsToDelete[k] = true;
                                cleaning = true;    //if any are found, then re-set the flag so there will be another iteration
                            }
                        }
                    });

                    //if there were any leaf nodes found, build a new table with non-empty nodes
                    if (cleaning) {
                        var newTree = [];
                        tree.forEach(function (branch) {
                            if (! idsToDelete[branch.id]) {
                                newTree.push(branch)
                            }
                        });
                        tree = newTree;
                    }

                    //the safety...
                    if (cnt > 10) {
                        cleaning = false;
                        console.log('forced quit...')
                    }
                }


                console.log(hashBranch)


                var displayObj = angular.copy(hashBranch)
                
                })


                var resource = {resourceType:resourceType}
                addChildren(resource,hashBranch['#']);
                $scope.itemResourceJson = resource;
                
                function addChildren(obj,node) {

                    if (node.branch && node.branch.data && node.branch.data.path) {
                        //if (node.branch && node.branch.data && node.branch.data.path && node.branch.data.structuredData) {
                        var ar = node.branch.data.path.split('.')
                        var topEleName = ar[ar.length-1];

                        obj[topEleName] = node.branch.data.structuredData
                    }

                    if (node.children.length > 0) {
                        node.children.forEach(function (child) {

                            var ar = child.branch.data.path.split('.')
                            var eleName = ar[ar.length-1]; //child.branch.data.path;

                            //console.log('40',child,eleName)

                            var structuredData = angular.copy(child.branch.data.structuredData)

                            if (child.children.length == 0) {
                                //console.log(eleName,structuredData)
                                //if the child has no children, then only add if there is a value
                                if (structuredData) {
                                    if (child.branch.data.isMultiple) {
                                        obj[eleName] = obj[eleName] || []

                                        obj[eleName].push(structuredData)
                                    } else {
                                        obj[eleName] = structuredData;
                                    }
                                }
                            } else {

                                //if there are child nodes, then there needs to be a 'parent' for the children
                                structuredData = structuredData || {}

                                if (child.branch.data.isMultiple) {
                                    obj[eleName] = obj[eleName] || []


                                    obj[eleName].push(structuredData)

                                    if (child.children.length > 0) {
                                        child.children.forEach(function (newChild,inx) {
                                           // var ar = obj[eleName]
                                          //  var newObj = ar[inx]

                                            //console.log('53',structuredData,newChild)
                                            addChildren(structuredData,newChild)

                                        })
                                    }

                                } else {
                                    //console.log('60',obj,eleName)
                                    obj[eleName] = structuredData;
                                    //addChildren(structuredData,newChild)
                                }

                            }








                        })
                    }
                }
                

            };


            $scope.showItem = function(item) {
                console.log(item)
                delete $scope.itemResourceJson;
                delete $scope.error
                $scope.currentItem = item;



                if (item.table) {

                    var treeData = cofSvc.makeTree(item.table);
                    makeResource(treeData,item.baseType)
                    //console.log(treeData)

                    let vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,item.table);

                    //console.log(vo)
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
                                       // console.log(graph.user)
                                    })
                                }
                            );
                        }
                    )
                }
            )
        }
    )