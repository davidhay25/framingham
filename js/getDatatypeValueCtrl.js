angular.module("sampleApp")
    .controller('getDatatypeValueCtrl',
        function ($scope,ecosystemSvc,modalService,$http,datatype,getDatatypeValueSvc,row,$filter) {
            $scope.datatype = datatype;
            $scope.row = row;
            $scope.input = {};
            var vsToRenderAsList = [];
            getCCToRenderAsList()

            //todo this should come from the track - need to figure out the best way to get that here...
            var termServer ='https://ontoserver.csiro.au/stu3-latest/';

            //some datatypes require pre-processing....
            if (datatype == 'code') {
                //get all the options for the valueset and display in a set of radio buttons
                if (row.binding && row.binding.url) {
                    var url = termServer + "ValueSet/$expand?url="+row.binding.url
                    getExpandedVS(url);

                }
            } else if (datatype == 'CodeableConcept') {
                if (row.binding && row.binding.url) {
                    $scope.vsUrl = row.binding.url;
                    var id = $filter('getLogicalID')($scope.vsUrl)
                    console.log(id);
                    if (vsToRenderAsList.indexOf(id) > -1) {
                        $scope.renderCCAsList = true;
                        var url = termServer + "ValueSet/$expand?url="+row.binding.url
                        getExpandedVS(url);     //sets $scope.expandedValueSet
                    }
                }
            }

            function getExpandedVS(url) {
                $http.get(url).then(
                    function(data) {
                        console.log(data)
                        $scope.expandedValueSet = data.data
                    },
                    function(err) {
                        console.log(err)
                    }
                )
            }

            $scope.expandCC = function(text){
                delete $scope.expandedValueSet;

                var url = termServer + "ValueSet/$expand?url="+row.binding.url;
                if (text) {
                    url += "&filter="+text
                }

                getExpandedVS(url);     //sets $scope.expandedValueSet

            };

            $scope.selectConcept = function(concept) {
                var dt = {Coding:[concept]}
                $scope.$close({value:dt,text:concept.display});
            };

            $scope.vsLookupDEP = function (text, vs) {
                $scope.waiting = true;
                delete $scope.ooError;
                console.log(text,vs)
                if (vs) {
                    var id = vs.id;
                    $scope.waiting = true;
                    return GetDataFromServer.getFilteredValueSet(id, text).then(
                        function (data, statusCode) {
                            if (data.expansion && data.expansion.contains) {
                                var lst = data.expansion.contains;
                                return lst;
                            } else {
                                return [
                                    {'display': 'No expansion'}
                                ];
                            }
                        }, function (vo) {
                            var statusCode = vo.statusCode;
                            $scope.ooError = vo.data;       //will display in builderDataEntry
                        }
                    ).finally(function () {
                        $scope.waiting = false;
                    });

                } else {
                    return [{'display': 'Select the ValueSet to query against'}];
                }
            }


            $scope.save = function() {
                console.log($scope.input.dt);

                //return a populated datatype & a display for data entered in the modal  {value: text:}
                var vo = getDatatypeValueSvc.getDTValue(datatype,$scope.input.dt)

                console.log(vo);



                $scope.$close(vo);
            }

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