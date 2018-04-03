//directile to render a UI for a profile.
//adapted from clinfhir resourcebuilder
angular.module("sampleApp").directive('tblResource', function ($filter,$uibModal,$http  ) {
    return {
        restrict: 'E',
        scope: {
            trigger: '=',
            termServer: '='
        },
        templateUrl: '../directive/tblResource/tblResourceDir.html',

        link : function ($scope, element, attrs) {
            $scope.internalControl = $scope.trigger || {};

            //$scope.input = {};
            $scope.showVSViewerDialog = {};
            $scope.editSample = function(inx) {
                //console.log(inx,$scope.input.sample);
                //console.log($scope.input.sample[inx])
                var currentValue = $scope.input.sample[inx];
                $scope.currentItem = $scope.input.table[inx];


                if ($scope.currentItem.binding) {
                    $scope.showVSViewerDialog.open($scope.currentItem.binding.url);
                }
            };

            //called by the vsViewer when a concept is selected form an expansion...
            $scope.conceptSelected = function(concept) {
                var display = concept.display + " ("+ concept.code + " - "+ concept.system + ")";
                $scope.input.sample[$scope.currentItem.id] = display;//angular.toJson(concept)

            };

            $scope.internalControl.open = function(item,SD) {
                console.log(item)
                if (item) {
                    $scope.input = item;
                    $scope.input.table = $scope.input.table || makeTableArray(SD);
                    $scope.input.sample = $scope.input.sample || {};
                    $scope.input.notes = $scope.input.notes || {};
                    $scope.collapse();
                } else {
                    delete $scope.input;
                }

            };

            $scope.hideWOSampleDisplay = true;
            $scope.hideAllWithoutSample = function() {
                var visibleRows = []
                $scope.hideWOSampleDisplay = false
                $scope.input.table.forEach(function(row){
                    if ((! $scope.input.sample[row.id]) && (! $scope.input.notes[row.id])   ) {
                        row.isHidden = true;
                    } else {
                        visibleRows.push(row.path);
                    }
                });

                //for each visible row, step up the hierarchy. makinf sure that the parents are visible
                visibleRows.forEach(function(path){
                    var ar = path.split('.')
                    while (ar.length > 0) {
                        var np = ar.join('.')
                        console.log(np)
                        $scope.input.table.forEach(function(row){
                            if (row.path == np) {
                                row.isHidden = false
                            }
                        });
                        ar.pop()
                    }
                })
            };

            $scope.showAll = function() {
                $scope.hideWOSampleDisplay = true
                $scope.input.table.forEach(function(row){
                    row.isHidden = false;
                })
            };

            //hide children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.hideChildren = function(item) {
                var path = item.path;       //path to duplicate (along with children)
                item.childrenHidden = true;
                $scope.input.table.forEach(function(row,pos){
                    if (row.path.startsWith(path) && (row.path.length > path.length)) {
                        row.isHidden = true;
                    }
                });
            };

            //show children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.showChildren = function(item) {
                var path = item.path;       //path to duplicate (along with children)
                item.childrenHidden = false;
                $scope.input.table.forEach(function(row,pos){
                    if (row.path.startsWith(path) && (row.path.length > path.length)) {
                        row.isHidden = false;
                    }
                });
            };

            //collapse down to top level elements only...
            $scope.collapse = function () {
                //hide all the rows that are not at the top

                //first create a hash of all elements that have children
                var arHasChildren = {};
                $scope.input.table.forEach(function(row) {
                    var ar = row.path.split('.');
                    if (ar.length == 2) {
                        var root = ar[0]
                        arHasChildren[root] = true;
                    }
                })


                $scope.input.table.forEach(function(row){
                    var ar = row.path.split('.');
                    //console.log(row.path);
                    if (ar.length == 1) {
                        row.isHidden = false;
                        var root = ar[0]
                        if (arHasChildren[root]) {
                            row.childrenHidden = true;
                        }


                    } else {
                        row.isHidden = true;
                    }
                })
            };

            function makeTableArray(SD){
                var ignore=['id','meta','implicitRules','language','text','contained','extension','modifierExtension']
                var ar = []
                SD.snapshot.element.forEach(function (ed,inx) {
                    if (ed.type) {
                        var item = {path: $filter('dropFirstInPath')(ed.path) };
                        item.isOriginal = true;         //to avoid exponential growth when copying...
                        item.id = 'id' + (inx-1);
                        item.dt = ed.type[0].code;
                        if (item.dt == 'code' || item.dt == 'Coding' || item.dt == 'CodeableConcept') {
                            item.isCoded = true;
                        }
                        item.definition = ed.definition;
                        item.mult = ed.min + '..'+ed.max;
                        if (ed.max == '*') {
                            item.isMultiple = true;
                        }

                        if (ed.binding && ed.binding.valueSetReference) {
                            item.binding = {url:ed.binding.valueSetReference.reference,strength:ed.binding.strength}
                        }

                        if (item.dt == 'Reference') {
                            var type = $filter('getLogicalID')(ed.type[0].targetProfile)
                            item.referenceDisplay = '--> ' + type;
                        }

                        if (ed.mapping) {
                            ed.mapping.forEach(function(map){
                                if (map.identity == 'fhir' && map.map) {
                                    var ar = map.map.split('|');
                                    item.fhirMapping = {map:ar[0],notes:ar[1]};
                                }
                            })
                        }
                        //console.log(ed.mapping,item);

                        if (ignore.indexOf(item.path) == -1) {
                            ar.push(item);
                        }


                    }
                });

                //now determine if each item is a leaf (has no children). This is a brute force approach...
                ar.forEach(function(item){
                    var path = item.path;
                    var childFound = false;
                    for (var i=0; i < ar.length; i++) {
                        var testItem = ar[i];
                        if (testItem.path.startsWith(path) && testItem.path.length > path.length) {
                            childFound = true;
                        }
                    }

                    if (!childFound) {
                        item.isLeaf = true;
                    }
                });
//console.log(ar,SD)
                return ar;
            }



        }
    }
});