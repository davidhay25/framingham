angular.module("sampleApp")
    .controller('getDatatypeValueCtrl',
        function ($scope,$q,ecosystemSvc,modalService,$http,datatype,getDatatypeValueSvc,row,$filter,scenario,resourceType) {
            $scope.datatype = datatype;
            $scope.row = row;
            $scope.input = {};
            $scope.scenario = scenario;
            $scope.resourceType = resourceType;
            var vsToRenderAsList = [];
            getCCToRenderAsList()

            //todo this should come from the track - need to figure out the best way to get that here...
            var termServer ='https://ontoserver.csiro.au/stu3-latest/';

            //some datatypes require pre-processing....
            if (datatype == 'code') {
                //get all the options for the valueset and display in a set of radio buttons
                if (row.binding && row.binding.url) {
                    var url = termServer + "ValueSet/$expand?url="+row.binding.url;
                    getExpandedVS(url);

                }
            } else if (datatype == 'CodeableConcept' || datatype == 'Coding') {
                if (row.binding && row.binding.url) {
                    $scope.binding = row.binding;

                    $scope.vsUrl = row.binding.url;
                    var id = $filter('getLogicalID')($scope.vsUrl)
                    console.log(id);
                    if (vsToRenderAsList.indexOf(id) > -1) {
                        $scope.renderCCAsList = true;
                        var url = termServer + "ValueSet/$expand?url="+row.binding.url
                        getExpandedVS(url);     //sets $scope.expandedValueSet
                    } else {


                    }
                }
            } else if (datatype == 'UsageContext') {
                var url = termServer + "ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/usage-context-type"
                getExpandedVS(url);     //sets $scope.expandedValueSet
                console.log($scope.expandedValueSet);

            }

            function getExpandedVS(url) {
                $scope.waiting = true;
                $http.get(url).then(
                    function(data) {
                        console.log(data)
                        $scope.expandedValueSet = data.data
                    },
                    function(err) {
                        console.log(err)
                    }
                ).finally(
                    function(){
                        $scope.waiting = false;
                    }
                )
            }

            $scope.expandCC = function(text){
                delete $scope.expandedValueSet;
                delete $scope.selectedConceptProperties;
                delete $scope.selectedConceptValue;

                var url = termServer + "ValueSet/$expand?url="+row.binding.url;
                if (text) {
                    url += "&filter="+text
                }
                getExpandedVS(url);     //sets $scope.expandedValueSet
            };

            var getConceptDescription = function(concept) {
                var deferred = $q.defer();

                var url = termServer + "CodeSystem/$lookup?system="+concept.system + "&code="+ concept.code;
                $http.get(url).then(
                    function (data) {
                        //find the Fully specified name & synomyms...
                        var fsn,synonym=[];
                        var parameter = data.data;
                        if (parameter.parameter) {
                            parameter.parameter.forEach(function (param) {
                                if (param.name == 'designation') {
                                    var obj = condensePart(param.part);     //creat an object from the part
                                    if (obj.use && obj.use.code == '900000000000003001' ) {
                                        fsn = obj.value;
                                        console.log(fsn)
                                        concept.display = fsn;
                                    }
                                }
                            })
                        }

                        deferred.resolve(concept)

                    }, function (err) {
                        deferred.reject(err)
                    }
                )
                return deferred.promise;

            }
            //split the part array into an object...
            var condensePart = function(part) {
                var obj = {};
                part.forEach(function (p) {
                    var value = p.valueCode || p.valueCoding || p.valueString;
                    obj[p.name] = value;
                });
                return obj;
            };



            $scope.ccSelectedFromList = function(concept) {
                console.log(concept)
                $scope.selectedConceptValue = {value:{Coding:[concept]},text:concept.display}
            };


            //called when a concept is initially selected, and also when a parent or child is selected...
            $scope.selectConcept = function(concept) {
                $scope.waiting = true;
                $scope.selectedConceptValue = {value:{Coding:[concept]},text:concept.display}

                if ($scope.input.dt && $scope.input.dt.cc) {
                    delete $scope.input.dt.cc.text;
                }

                delete $scope.expandedValueSet;
                delete $scope.selectedConceptProperties;

                //get the details for the selected code....
                var url = termServer + "CodeSystem/$lookup?system="+concept.system + "&code="+ concept.code;
                $http.get(url).then(
                    function (data) {

                        processLookup(data.data).then(
                            function(obj) {

                                obj.concept = concept;      //the selected concept...
                                console.log(obj)
                                $scope.selectedConceptProperties = obj
                                // - display not good...makeGraph(obj)
                            }, function(err) {
                                console.log(err)
                            }
                        )

                    },
                    function(err) {
                        alert('Error with call: '+url)
                    }
                ).finally(function(){
                    $scope.waiting = false;
                })
            };

            //generate a graph of the relationships - obj = {concept:, parent:, child: }
            function makeGraph(obj){
                var arNodes = [], arEdges = [];

                //the selected concept
                var node = {id: 'conceptId', label: obj.concept.display, shape: 'box'};
                arNodes.push(node);

                //the parents
                obj.parent.forEach(function(p,inx){
                    var pNode = {id: 'p'+inx, label: p.display, shape: 'box'};
                    arNodes.push(pNode);
                    var edge = {
                        id: 'e' + arEdges.length + 1, from: pNode.id, to: 'conceptId',
                         arrows: {to: true}
                    };
                    arEdges.push(edge)
                })

                //the children
                obj.child.forEach(function(child,inx){
                    var cNode = {id: 'child'+inx, label: child.display, shape: 'box'};
                    arNodes.push(cNode);
                    var edge = {
                        id: 'e' + arEdges.length + 1, from: 'conceptId', to: cNode,
                        arrows: {to: true}
                    };
                    arEdges.push(edge)
                });



/*
                lst.forEach(function (item) {

                    var node = {id: item.id, label: item.type, shape: 'box', item: item};

                    if (objColours[item.baseType]) {
                        node.color = objColours[item.baseType];
                    }

                    arNodes.push(node);

                    if (item.table) {
                        item.table.forEach(function (row) {
                            if (row.references) {
                                row.references.forEach(function (ref) {
                                    var edge = {
                                        id: 'e' + arEdges.length + 1, from: item.id, to: ref.targetItem.id,
                                        label: ref.sourcePath, arrows: {to: true}
                                    };

                                    arEdges.push(edge)
                                })
                            }
                        })
                    }

                });
*/
                var nodes = new vis.DataSet(arNodes);
                var edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                var graphData = {
                    nodes: nodes,
                    edges: edges
                };


                var container = document.getElementById('ccGraph');
                var options = {
                    layout: {
                        hierarchical: {
                            enabled: true,
                            direction: "UD",
                            sortMethod: "hubsize"
                        }
                    },
                    interaction: {dragNodes :false},
                    physics: {
                        enabled: false
                    }
                };

                $scope.graph = new vis.Network(container, graphData, options);

            }


            //process the result from the CodeSystem/$lookup operation into an easy to use object, including parents & children...
            var processLookup = function(result) {
                var deferred = $q.defer();


                var obj = {child:[],parent:[]}
                if (result && result.parameter) {
                    result.parameter.forEach(function(param){
                        switch (param.name) {
                            case 'property' :
                                //find the type & value of the property
                                var type,value;
                                param.part.forEach(function (part) {
                                    if (part.name == 'code') {
                                        type = part.valueCode;
                                    } else if (part.name == 'value') {
                                        value = part.valueCode;
                                    }

                                });
                                //the value of the propeerty is added to the object - 'child' and 'parent'
                                if (type && value) {
                                    if (obj[type]) {
                                        obj[type].push({code:value, system:'http://snomed.info/sct'})  //todo assume snomed - could be others..
                                    }
                                }
                                break;
                        }
                    })
                }


                //now get the display values for the parents & children
                var query = [];
                obj.child.forEach(function (concept) {
                    query.push(getConceptDescription(concept))
                });

                obj.parent.forEach(function (concept) {
                    query.push(getConceptDescription(concept))
                });


                $q.all(query).then(
                    function(data) {
                        console.log(data);
                        deferred.resolve(obj)
                    },
                    function(err) {
                        console.log(err);
                        deferred.reject(err)
                    }
                );

                return deferred.promise;


            }

            $scope.save = function() {
                //console.log($scope.input.dt);
                var vo;

                //If this was a cc, then already have value...
                if ($scope.selectedConceptValue) {
                    vo = $scope.selectedConceptValue
                } else {
                    //return a populated datatype & a display for data entered in the modal  {value: text:}
                    vo = getDatatypeValueSvc.getDTValue(datatype,$scope.input.dt)

                }


                //console.log(vo);





                $scope.$close(vo);
            };

            //Valuesets in the core spec that are CodeableConcepts, but with a small number of options...
            function getCCToRenderAsList() {
                
                vsToRenderAsList.push('condition-severity');
                vsToRenderAsList.push('condition-category');
                vsToRenderAsList.push('condition-certainty');
                vsToRenderAsList.push('list-empty-reason');
                vsToRenderAsList.push('list-item-flag');
                vsToRenderAsList.push('basic-resource-type');


                //these 3 are from extensions - this passes in the full url - todo - does this need review??
                //I think that past DSTU-2 the urls' should all resolve directly...
                vsToRenderAsList.push('ReligiousAffiliation');
                vsToRenderAsList.push('Ethnicity');
                vsToRenderAsList.push('investigation-sets');
                vsToRenderAsList.push('observation-interpretation');
                vsToRenderAsList.push('marital-status');
                vsToRenderAsList.push('ActPharmacySupplyType');
                vsToRenderAsList.push('Confidentiality');
                vsToRenderAsList.push('composition-status');
                vsToRenderAsList.push('observation-status');
                vsToRenderAsList.push('observation-category');

                vsToRenderAsList.push('condition-status');
                vsToRenderAsList.push('administrative-gender');
                vsToRenderAsList.push('reason-medication-not-given-codes');
                vsToRenderAsList.push('care-plan-activity-category');
                vsToRenderAsList.push('location-physical-type');

                vsToRenderAsList.push('endpoint-connection-type');
            }

        }
    );