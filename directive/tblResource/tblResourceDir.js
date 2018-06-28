//directile to render a UI for a profile.
//adapted from clinfhir resourcebuilder
angular.module("sampleApp").directive('tblResource', function ($filter,$uibModal, ecosystemSvc ) {
    return {
        restrict: 'E',
        scope: {
            trigger: '=',
            termServer: '=',
            reference : '&',
            fnshownotes : '&',
            showvsviewerdialog : '=',
            resourceJson : '&',
            updated : '&'
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


            $scope.internalControl.open = function(item,SD,scenario,track,cb) {

                $scope.disabledDirectSample = true;
                if (track) {
                    if (track.allowDirectSample) {
                        $scope.disabledDirectSample = false;
                    }
                }
                $scope.formTrack = track;

                $scope.hideNotes = true;    //default to hiding notes

                $scope.scenario = scenario;
                if (item) {
                    $scope.input = item;
                    $scope.input.table = $scope.input.table || makeTableArray(SD,track);
                    if (cb) {
                        cb($scope.input.table);
                    }
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

                    //this preserves the 'show only references
                    if ($scope.onlyRefsShown) {
                        $scope.onlyRefsShown = false;       //will be toggled on...
                        $scope.toggleReferences();
                    }

                } else {
                    //clear the display...
                    delete $scope.input;
                }
            };


            $scope.getPopoverText = function(row) {
                var text = "";
                if (row.definition) {
                    text = row.definition
                }

                if (row.comment) {
                    text += '<br/><br/>'+row.comment
                }

                if (row.clinDesc) {
                    text += '<br/><br/>'+row.clinDesc
                }

                if (row.binding && row.binding.url) {
                    text += '<br/><br/>'+row.binding.url
                }



                return text
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
                        row.structuredData.display = target.description;
                        checkParentHasStructuredData(row,inx)
                        makeJson();
                    }
                });
            };

            //if referenceOnly is true, show only references - and pareents of references
            $scope.onlyRefsShown = false
            $scope.toggleReferences = function() {
                var parents = {}
                $scope.onlyRefsShown = ! $scope.onlyRefsShown;
                if ($scope.onlyRefsShown) {
                    $scope.input.table.forEach(function(row){
                        row.lastHiddenStatus = row.isHidden;        //save what the hide status was, so we can restore it...
                        if (! row.isReference) {

                            row.isHidden = true;
                        } else {
                            //this is a reference. need to also show all the parents...
                            var ar = row.path.split('.')

                            switch(ar.length) {
                                case 1:
                                    break;
                                case 2:
                                    var p = ar[0];
                                    parents[p] = true;  //eg in List entry.item will show wntry
                                    break;
                                case 3 :
                                    var p = ar[0] + '.' + ar[1];
                                    break;
                            }
                        }

                    });

                    //now show all the parents
                    $scope.input.table.forEach(function(row){
                        if (parents[row.path]) {
                            row.isHidden = false;
                        }
                    })

                } else {
                    $scope.input.table.forEach(function(row){
                        row.isHidden = row.lastHiddenStatus;
                        delete row.lastHiddenStatus;
                    })
                }

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
                        },
                        'track' : function(){
                            return $scope.formTrack;
                        },
                        'currentJson' : function(){
                            return makeJson();
                        },
                        'item' : function() {
                            return $scope.input;
                        }

                    }}
                ).result.then(function(vo) {
                    $scope.input.sample[row.id] = vo.text;
                    row.structuredData = vo.value;
                    row.sdDt = dt;      //the selected datatype

                    checkParentHasStructuredData(row,inx); //if not off the root, walk back up the list of elements to make sure that the parent has a structuredData element. The Json build needs this...
                    makeJson ();

                    $scope.updated()($scope.input.table);          //send the updated table to the host...

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

            //called by onBlur from adding a note
            $scope.noteAdded = function(){
                $scope.updated()($scope.input.table);
                //console.log('note')
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
                        row.canDelete = true;
                        row.rootParentId = item.id;     //the parent off the root...
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

            //remove a deleted row...
            $scope.deleteDuplicate = function(inx,row) {
                var rootParentId = row.rootParentId;        //if this element has children, then they will have the rootParentId
                $scope.input.table.splice(inx,1);

                //now, delete any child elements
                if (rootParentId) {
                    var newTable = []
                    $scope.input.table.forEach(function(item){

                        if (! item.rootParentId) {
                            //not the child of a duplicated element
                            newTable.push(item)
                        } else {
                            if (item.rootParentId !== rootParentId) {
                                newTable.push(item)
                            }
                        }



                    });
                    $scope.input.table = newTable;
                }


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
            function makeTableArray(SD,track){
                var that = this;
                //var ignoreAll=['id','meta','implicitRules','contained','extension','modifierExtension']
                var ignoreAll=['id','meta','implicitRules','contained','modifierExtension']
                var ignoreRoot = ['language','text'];   //ignore if on the root...
                var ar = [];

                //add a text element as first one if not a lmreview track
                if (track.trackType !== 'lmreview') {
                    var item = {path: 'text',display:'text', id:'text',type:[{code:'Narrative'}],max:'1',mult:'0..1' };
                    item.definition = "The narrative text that describes this resource to a User";
                    ar.push(item);
                }

                SD.snapshot.element.forEach(function (ed,inx) {
                    if (ed.type) {
                        var path = $filter('dropFirstInPath')(ed.path);     //remove the leading segment (the resource type)

                        var ar1 = path.split('.')
                        var include = true;

                        //ignore all elements that end with this string
                        if (ignoreAll.indexOf(ar1[ar1.length-1]) !== -1) {
                            console.log('ignoring '+ path)
                            include = false;
                        }

                        //ignore element if off the root...
                        if (ar1.length == 1 && (ar1[0]== 'language' ||ar1[0]== 'text' )) {
                            include = false;
                            console.log('ignoring '+ path)
                        }

                        if (include) {
                            //item is a ValueObject - one per ED
                            var item = {path: path };
                            item.ed = ed;                   //so we can view the ED for this element
                            item.isOriginal = true;         //to avoid exponential growth when copying...
                            item.id = 'id' + (inx-1);

                            //set the display in the table
                            //item.sliceName = ed.sliceName;
                            item.display = ed.display || ed.path;     //default the display to the path
                            if (ed.sliceName ) {
                                //if this is a sliced element...
                                item.display = ed.sliceName
                            }

                            if (ed.type[0].code == 'BackboneElement') {
                                item.isBBE = true;
                            }

                            item.dt = ed.type[0].code;      //todo - this may be redundant now...
                            item.type = ed.type;
                            item.mustSupport = ed.mustSupport;
                            item.isModifier = ed.isModifier;
                            //item.fhirMapping = getFHIRMapping(ed);

                            if (item.dt == 'code' || item.dt == 'Coding' || item.dt == 'CodeableConcept') {
                                item.isCoded = true;
                            }



                            item.definition = ed.definition;
                            item.comment = ed.comment;

                            item.mult = ed.min + '..'+ed.max;
                            item.max = ed.max;

                            if (ed.min > 0) {
                                item.isRequired = true;
                            }

                            if (ed.max == '*') {
                                item.isMultiple = true;
                            }

                            if (ed.binding && ed.binding.valueSetReference) {
                                item.binding = {url:ed.binding.valueSetReference.reference,strength:ed.binding.strength}
                            }

                            if (item.dt == 'Reference') {
                                item.isReference = true;

                                //need to flag all the parents of a node with a reference for the 'show references only' flag
                                //console.log(item.path);
                                //var ar = item.path.split('.');





                                var type = $filter('getLogicalID')(ed.type[0].targetProfile)
                                item.referenceDisplay = '--> ' + type;
                            }

                            //use in Logical models...
                            if (ed.mapping) {
                                ed.mapping.forEach(function(map){
                                    if (map.identity == 'fhir' && map.map) {
                                        var ar = map.map.split('|');
                                        item.fhirMapping = {map:ar[0],notes:ar[1]};

                                        //get the url of the extension (itself stored as an extension)
                                        var simpleExtensionUrl = 'http://clinfhir.com/fhir/StructureDefinition/simpleExtensionUrl';
                                        var ext = getSingleExtension(ed,simpleExtensionUrl);
                                        if (ext) {
                                            item.fhirMapping.url = ext.valueString;
                                        }


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
                        if (testItem.path.startsWith(path+'.')) {
                        //if (testItem.path.startsWith(path+'.') && testItem.path.length > path.length) {
                            childFound = true;
                        }
                    }

                    if (!childFound) {
                        item.isLeaf = true;
                    }
                });

                
                return ar;

                function getFHIRMappingDEP(ed) {
                    //get the FHIR mapping (if any)
                    var mapping;
                    if (ed.mapping) {
                        ed.mapping.forEach(function (map) {
                            if (map.identity == 'fhir') {
                                var s = map.map;
                                var ar = s.split('|');
                                mapping = ar[0];
                            }
                        })
                    }
                    return mapping;
                }

                function getSingleExtension(resource,url) {
                    //return the value of an extension assuming there is only 1...
                    var extension = {};
                    if (resource) {
                        resource.extension = resource.extension || []
                        resource.extension.forEach(function(ext){
                            if (ext.url == url) {
                                extension = ext
                            }
                        });
                    }
                    return extension;
                }

            }



            function makeJson() {

                var vo = ecosystemSvc.makeResourceJson($scope.input.baseType, $scope.input.id,$scope.input.table);
                $scope.resourceJson()({resource: vo.resource, raw: vo.data});
                return vo.resource;


            }



        }
    }
});