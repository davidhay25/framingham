//directile to render a UI for a profile.
//adapted from clinfhir resourcebuilder
angular.module("sampleApp").directive('tblResource', function ($filter,$uibModal,$http  ) {
    return {
        restrict: 'E',
        scope: {
            trigger: '=',
            termServer: '=',
            reference : '&',
            fnshownotes : '&',
            showvsviewerdialog : '=',
            resourceJson : '&'
        },
        templateUrl: '../directive/tblResource/tblResourceDir.html',

        link : function ($scope, element, attrs) {

            $scope.fhirBasePath = "http://hl7.org/fhir/";       //root of the spec.

            $scope.internalControl = $scope.trigger || {};
            $scope.showOnlyPopulated = false;       //true if only elements with data are being displayed...


            //this function is called to display a specific resource;
            //'item' is the 'container' element in the host app
            //'SD' is a StructureDefinition. If can be a Logical Model. There should be no extensions.
            //'scenario' is the current scenario...

            $scope.internalControl.open = function(item,SD,scenario) {

                $scope.hideNotes = true;    //default to hiding notes

                $scope.scenario = scenario;
                if (item) {
                    $scope.input = item;
                    $scope.input.table = $scope.input.table || makeTableArray(SD);
                    makeJson();
                    $scope.input.sample = $scope.input.sample || {};
                    $scope.input.notes = $scope.input.notes || {};

                    //allows the caller to set the initial state of the notes display
                    if (item.showNotes) {
                        $scope.hideNotes = false;
                    }

                    //this preserves the display when called with different models...
                    if ($scope.showOnlyPopulated) {
                        $scope.hideAllWithoutSample()
                    } else {
                        $scope.collapse();
                    }
                } else {
                    //clear the display...
                    delete $scope.input;
                }

            };



            $scope.showNotes = function(show) {
                if (show) {
                    //show the notes. Also trigger an 'event' to notify the containing app
                    $scope.hideNotes = false;
                    $scope.fnshownotes()(true)

                } else {
                    //hide the notes. Also trigger an 'event' to notify the containing app
                    $scope.hideNotes = true;
                    $scope.fnshownotes()(false)

                }
            };

            //the user clicked the add reference link - notify the hosting app to select the target...

            $scope.addReference = function(row,type,inx){
                $scope.reference()(row,type,function(target){
                    //if there's a target then update the structuredData...
                    if (target) {
                        row.structuredData = {reference: target.type + "/"+ target.id};     //needed for building the resource
                        checkParentHasStructuredData(row,inx)
                        makeJson();
                    }
                });
            };

            $scope.radio = {};

            $scope.editSample = function(row,dt,inx) {


                var datatype = row.type[0].code;

                if (row.type.length > 1) {
                    if (! dt) {
                        alert("Please select a datatype to use")
                        return;

                    } else {
                        datatype = dt;
                    }
                }

                $uibModal.open({
                    templateUrl: 'modalTemplates/getDatatypeValue.html',
                    size: 'lg',
                    controller: 'getDatatypeValueCtrl',
                    resolve : {
                        'datatype' : function(){
                            return datatype;
                        },
                        'row' : function(){
                            return row
                        },
                        'scenario' : function(){
                            return $scope.scenario;
                        },
                        'resourceType' : function(){
                            return $scope.input.type;
                        }

                    }}
                ).result.then(function(vo) {
                    $scope.input.sample[row.id] = vo.text;
                    row.structuredData = vo.value;
                    row.sdDt = dt;      //the selected datatype

                    checkParentHasStructuredData(row,inx); //if not off the root, walk back up the list of elements to make sure that the parent has a structuredData element. The Json build needs this...
                    makeJson ();

                })
            };

            function checkParentHasStructuredData(row,inx){
                //if not off the root, walk back up the list of elements to make sure that the parent has a structuredData element. The Json build needs this...
                var ar = row.path.split('.');
                var eleDepth = ar.length;       //the depth of the element...
                if (eleDepth > 1) {
                    //this is not off the root...
                    var parentFound = false;
                    while (! parentFound) {
                        inx --;

                        //this is a safeguard - shouldn't really execute this...
                        if (inx == -1) {
                            console.log('safety guard!');
                            parentFound = true
                        } else {
                            var ar = $scope.input.table[inx].path.split('.');
                            if (ar.length == (eleDepth -1)) {
                                //this is the parent node. Make sure it has a structuredData value...
                                //todo ?sheck for multiplicity
                                $scope.input.table[inx].structuredData = [{}]
                                parentFound = true
                            }
                        }




                    }

                }
            }


            //called by the vsViewer when a concept is selected form an expansion...
            $scope.conceptSelectedDEP = function(concept) {
                var display = concept.display + " ("+ concept.code + " - "+ concept.system + ")";
                $scope.input.sample[$scope.currentItem.id] = display;//angular.toJson(concept)

            };

            //make a copy of an item
            $scope.duplicate = function(item) {
                var path = item.path;       //path to duplicate (along with children)

                //find the place to start inserting. This is after the last child with a matching path
                var inx = 0;
                $scope.input.table.forEach(function(row,pos){
                    if (row.path.startsWith(path)) {
                        inx = pos;
                    }
                });
                inx++;

                var clone = angular.copy($scope.input.table);
                clone.forEach(function(row){
                    //if (row.path.startsWith(path)) {
                    if (row.path.startsWith(path) && row.isOriginal) {
                        row.id = 'id' + new Date().getTime() + Math.floor(Math.random()*1000)
                        delete row.isOriginal;
                        delete row.references;
                        delete row.structuredData;
                        //now change the path in the row by incrementing the suffix..
                      /*  var newPath = row.path;
                        var ar = newPath.split('_');
                        ar[1]++;        //we assume that the last character is a number
                        row.path = ar.join('_');

*/
                        $scope.input.table.splice(inx,0,row);
                        inx++;
                    }

                })
            };

            //$scope.hideWOSampleDisplay = true;
            $scope.hideAllWithoutSample = function() {
                var visibleRows = []
                $scope.showOnlyPopulated = true;
                //$scope.hideWOSampleDisplay = false
                $scope.input.table.forEach(function(row){
                    if ((! $scope.input.sample[row.id]) && (! $scope.input.notes[row.id])  && (! row.references || row.references.length == 0) ) {
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
                $scope.showOnlyPopulated = false;
                //$scope.hideWOSampleDisplay = true
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
                var startShow = false;

                for (var i=0; i < $scope.input.table.length; i++) {
                    var row = $scope.input.table[i];

                    if (row.id == item.id) {
                        startShow = true;
                    }
               // }
               // $scope.input.table.forEach(function(row,pos){
                    if (startShow && row.id !== item.id) {
                        //we've started the show. As soon as the paths no longer match, then exit...
                       // if (row.path.length > path.length) {
                            if (row.path.startsWith(path) && (row.path !== path)) {
                                //this is a child - unhide it
                                row.isHidden = false;
                            } else {
                                //past the child nodes - stop the show
                                startShow = false;
                                break;
                            }
                       // }


                    }



                }
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

            //construct the initial table from the SD...
            function makeTableArray(SD){
                var ignore=['id','meta','implicitRules','language','text','contained','extension','modifierExtension']
                var ar = []

                //add a text element as first one
                var item = {path: 'text',id:'text',type:[{code:'Narrative'}],max:'1',mult:'0..1' };
                item.definition = "The narrative text that describes this resource to a User";
                ar.push(item);

                SD.snapshot.element.forEach(function (ed,inx) {
                    if (ed.type) {
                        var path = $filter('dropFirstInPath')(ed.path);     //remove the leading segment (the resource type)

                        var ar1 = path.split('.')
                        if (ignore.indexOf(ar1[ar1.length-1]) == -1) {
                            //if (ignore.indexOf(path) == -1) {

                            //path += '_0';         //add a suffix - this will be used to keep paths unique when copying..

                            //item is a ValueObject - one per ED
                            var item = {path: path };
                            item.isOriginal = true;         //to avoid exponential growth when copying...
                            item.id = 'id' + (inx-1);

                            if (ed.type[0].code == 'BackboneElement') {
                                item.isBBE = true;
                            }

                            item.dt = ed.type[0].code;      //todo - this may be redundant now...
                            item.type = ed.type;
                            item.mustSupport = ed.mustSupport;
                            item.isModifier = ed.isModifier;

                            if (item.dt == 'code' || item.dt == 'Coding' || item.dt == 'CodeableConcept') {
                                item.isCoded = true;
                            }



                            item.definition = ed.definition;
                            item.mult = ed.min + '..'+ed.max;
                            item.max = ed.max;
                            if (ed.max == '*') {
                                item.isMultiple = true;
                            }

                            if (ed.binding && ed.binding.valueSetReference) {
                                item.binding = {url:ed.binding.valueSetReference.reference,strength:ed.binding.strength}
                            }

                            if (item.dt == 'Reference') {
                                item.isReference = true;
                                var type = $filter('getLogicalID')(ed.type[0].targetProfile)
                                item.referenceDisplay = '--> ' + type;
                            }

                            //use in Logical models...
                            if (ed.mapping) {
                                ed.mapping.forEach(function(map){
                                    if (map.identity == 'fhir' && map.map) {
                                        var ar = map.map.split('|');
                                        item.fhirMapping = {map:ar[0],notes:ar[1]};
                                    }
                                })
                            }



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




                return ar;
            }

            function makeJson() {

                try {
                    //hide exceptions for now...
                    var data = []
                    //var resource = {resourceType:$scope.input.type};
                    var resource = {resourceType: $scope.input.baseType, id: $scope.input.id};
                    var previousEle = {};
                    var parentElement, grandParentElement;
                    $scope.input.table.forEach(function (row, index) {
                        if (row.structuredData) {
                            data.push(row);

                            var path = row.path;
                            var ar = path.split('.');
                            switch (ar.length) {
                                case 1:
                                    //this is off the root
                                    var eleName = ar[0];
                                    if (eleName.indexOf('[x]') > -1) {
                                        eleName = eleName.substr(0, eleName.length - 3) + _capitalize(row.sdDt);
                                    }

                                    parentElement = row.structuredData; //because it could be a parent...
                                    if (row.max == 1) {
                                        resource[eleName] = parentElement;
                                    } else {
                                        resource[eleName] = resource[eleName] || [];
                                        resource[eleName].push(parentElement)
                                    }
                                    break;
                                case 2: {
                                    //if the
                                    var parentEleName = ar[0];      //the parent element name

                                    //var parent = resource[parentEleName];


                                    var eleName = ar[1];
                                    if (eleName.indexOf('[x]') > -1) {
                                        eleName = eleName.substr(0, eleName.length - 3) + _capitalize(row.sdDt);
                                    }

                                    // grandParentElement = {}; //because it could be a grand parent...
                                    // grandParentElement[eleName] = row.structuredData;

                                    //var node = parentElement[0];
                                    //node[eleName] = row.structuredData;


                                    grandParentElement = parentElement[0]; //because it could be a grand parent...
                                    grandParentElement[eleName] = row.structuredData;

                                    /*
                                                                    if (row.max == 1) {
                                                                        parentElement[eleName] = grandParentElement;
                                                                    } else {
                                                                        parentElement[eleName] =  resource[eleName] || [];
                                                                        parentElement[eleName].push(grandParentElement)
                                                                    }
                                    */
                                    break;
                                }
                            }

                        }
                    });


                    $scope.resourceJson()({resource: resource, raw: data})


                } catch (ex) {
                    console.log(ex)
                }


                function _capitalize(str) {
                    return (str.charAt(0).toUpperCase() + str.slice(1));
                }
            }



        }
    }
});