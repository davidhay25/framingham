
angular.module("sampleApp")
    .controller('lmCheckCtrl',
        function ($rootScope,$scope,ecosystemSvc,$http,$filter,modalService) {

            $scope.input = {sample:{}};

            $scope.user = ecosystemSvc.getCurrentUser();
            console.log($scope.user);

            $scope.$on('logout',function(){
                console.log ('logout');
                delete $scope.lmScenario;
            });

            $scope.showResourceTable = {};      //needed for the table directive...
            //when the directive is updated with structured data, this function is called with the json version of the resource...
            $scope.fnResourceJson = function(json) {
                $scope.resourceJson = json;
                console.log($scope.item);
            };

            if (!String.prototype.startsWith) {
                String.prototype.startsWith = function(search, pos) {
                    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
                };
            }


            //this is called by the directive when a reference is selected.
            $scope.addReference = function(row,type,cb) {
                var msg = "This is a reference to a "+type+" resource. The specific elements that are important in the" +
                    " context of this model are present as child elements of this one. You can click on the Question mark to see the resource type in the spec";
                modalService.showModal({}, {bodyText:msg})

            };

            //this is called by the directive when the notes display is toggled. It can be ignored here...
            $scope.setShowNotes = function (show) {};



          //  $scope.$on('elastic:resize', function(event, element, oldHeight, newHeight) {
              //  console.log(event)
           // });

            //var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/ARForm-1';  //todo testing

            //will be a default if not specified in the track...
            $scope.termServer = "https://ontoserver.csiro.au/stu3-latest/"; //for the vs viewer directive...
            //$scope.showVSViewerDialog = {};



            //save the current example. $scope.item is the object that the directive is updating...
            $scope.saveExample = function () {

                var user = ecosystemSvc.getCurrentUser();
                if (user) {
                    var saveObject = {};
                    saveObject.userid = user.id;
                    saveObject.scenarioid = $scope.lmScenario.id;
                    saveObject.id = user.id + "-" + $scope.lmScenario.id;
                    saveObject.reviewComment = $scope.item.reviewComment;
                    saveObject.table = $scope.item.table;       //the list of rows...
                    saveObject.sample = $scope.item.sample;    //the sample data (hash by row id)
                    saveObject.notes = $scope.item.notes;       //notes (hash by row id)


                    //console.log(saveObject);

                    $http.put("/lmCheck",saveObject).then(
                        function(){
                            alert('Updated.')
                        }, function(err) {
                            alert('error saving result '+angular.toJson(err))
                        }
                    )
                }
            };




            $scope.lmCheckSelectScenario = function(scenario) {


                var type = $scope.SD.snapshot.element[0].path;

                $scope.item = {type:type,showNotes:true};
                $scope.lmScenario = scenario;

                //retrieve any existing example by this user for this scenario..
                var user = ecosystemSvc.getCurrentUser();
                if (user && user.id && $scope.lmScenario) {
                    var url = '/lmCheck/'+user.id + "/"+$scope.lmScenario.id;

                    $http.get(url).then(
                        function(data) {
                            console.log(data.data)
                            var vo = data.data;
                            if (vo && vo.table && vo.sample) {
                                //yep - this user has started a sample for this scenario...
                              //  $scope.table = vo.table ;

                                $scope.item.sample = vo.sample;
                                $scope.item.notes = vo.notes;
                                $scope.item.reviewComment = vo.reviewComment ;

                                $scope.showResourceTable.open($scope.item,$scope.SD,$scope.cofScenario);

                            } else {
                                $scope.showResourceTable.open($scope.item,$scope.SD,$scope.cofScenario);
                            }
                        }
                    )
                }
            };


            //$scope.hideWOSampleDisplay = true;
            $scope.hideAllWithoutSampleDEP = function() {
                var visibleRows = []
                $scope.hideWOSampleDisplay = false
                $scope.table.forEach(function(row){
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
                        $scope.table.forEach(function(row){
                            if (row.path == np) {
                                row.isHidden = false
                            }
                        });
                        ar.pop()
                    }
                })
            };

            $scope.showAllDEP = function() {
                $scope.hideWOSampleDisplay = true
                $scope.table.forEach(function(row){
                    row.isHidden = false;
                })
            };


            //hide children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.hideChildrenDEP = function(item) {
                var path = item.path;       //path to duplicate (along with children)
                item.childrenHidden = true;
                $scope.table.forEach(function(row,pos){
                    if (row.path.startsWith(path) && (row.path.length > path.length)) {
                        row.isHidden = true;
                    }
                });
            };

            //show children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.showChildrenDEP = function(item) {
                var path = item.path;       //path to duplicate (along with children)
                item.childrenHidden = false;
                $scope.table.forEach(function(row,pos){
                    if (row.path.startsWith(path) && (row.path.length > path.length)) {
                        row.isHidden = false;
                    }
                });
            };

            //make a copy of an item
            $scope.duplicate = function(item) {
                var path = item.path;       //path to duplicate (along with children)

                //find the place to start inserting. This is after the last child with a matching path
                var inx = 0;
                $scope.table.forEach(function(row,pos){
                    if (row.path.startsWith(path)) {
                        inx = pos;
                    }
                });
                inx++;

                var clone = angular.copy($scope.table);
                clone.forEach(function(row){
                    if (row.path.startsWith(path) && row.isOriginal) {
                        row.id = 'id' + new Date().getTime() + Math.floor(Math.random()*1000)
                        delete row.isOriginal;
                        $scope.table.splice(inx,0,row);
                        inx++;
                    }

                })
            };

            $scope.editSampleDEP = function(inx) {
                //console.log(inx,$scope.input.sample);
                //console.log($scope.input.sample[inx])
                var currentValue = $scope.input.sample[inx];
                $scope.currentItem = $scope.table[inx];


                if ($scope.currentItem.binding) {
                    $scope.showVSViewerDialog.open($scope.currentItem.binding.url);
                }
            };

            //called by the vsViewer when a concept is selected form an expansion...
            $scope.conceptSelectedDEP = function(concept) {
                var display = concept.display + " ("+ concept.code + " - "+ concept.system + ")";
                $scope.input.sample[$scope.currentItem.id] = display;//angular.toJson(concept)

            };

            function makeTableArrayDEP(SD){
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


                        ar.push(item)
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


            $scope.$watch('selectedTrack',function(track,olfV){


                if (track && track.scenarios) {
                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    //retrieve the SD for the model...

                    if (track.termServer) {
                        $scope.termServer = track.termServer;
                    }

                    delete $scope.table;
                    delete $scope.input.sample;
                    delete $scope.lmScenario;
                    delete $scope.input.notes;


                    var url = track.LM;
                    if (url) {
                        $http.get(url).then(
                            function(data){
                                $scope.SD = data.data;
                            },
                            function(err){
                                modalService.showModal({}, {bodyText:"The url: "+url+" specified in the track could not be found."})

                            }
                        );
                    }
/*
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true)
                            })
                        }
                    })
                    */

                }

            })

    });
