
angular.module("sampleApp")
    .controller('lmCheckCtrl',
        function ($scope,ecosystemSvc,$http,$filter) {

            $scope.input = {sample:{}};

            $scope.user = ecosystemSvc.getCurrentUser();
            console.log($scope.user);

            if (!String.prototype.startsWith) {
                String.prototype.startsWith = function(search, pos) {
                    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
                };
            }

            var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/ARForm-1';  //todo testing

            $scope.termServer = "https://ontoserver.csiro.au/stu3-latest/"; //for the vs viewer directive...
            $scope.showVSViewerDialog = {};



            $scope.saveExample = function () {

                var user = ecosystemSvc.getCurrentUser();
                if (user) {
                    var saveObject = {};
                    saveObject.userid = user.id;
                    saveObject.scenarioid = $scope.lmScenario.id;
                    saveObject.table = $scope.table;
                    saveObject.sample = $scope.input.sample;    //this has display only. Will need another array for structured...

                    console.log(saveObject);

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
                //console.log(scenario)
                $scope.lmScenario = scenario;

                //retrieve any existing example by this user for this scenario..
                var user = ecosystemSvc.getCurrentUser();
                if (user) {
                    var url = '/lmCheck/'+user.id + "/"+$scope.lmScenario.id;

                    $http.get(url).then(
                        function(data) {
                            console.log(data.data)
                            var vo = data.data;
                            if (vo) {
                                //yep - this user has started a sample for this scenario...
                                $scope.table = vo.table ;
                                $scope.input.sample = vo.sample;
                            }

                        }
                    )
                }






            };


            $scope.hideWOSampleDisplay = true;
            $scope.hideAllWithoutSample = function() {
                var visibleRows = []
                $scope.hideWOSampleDisplay = false
                $scope.table.forEach(function(row){
                    if (! $scope.input.sample[row.id]) {
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

            $scope.showAll = function() {
                $scope.hideWOSampleDisplay = true
                $scope.table.forEach(function(row){
                    row.isHidden = false;
                })
            };


            //hide children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.hideChildren = function(item) {
                var path = item.path;       //path to duplicate (along with children)
                item.childrenHidden = true;
                $scope.table.forEach(function(row,pos){
                    if (row.path.startsWith(path) && (row.path.length > path.length)) {
                        row.isHidden = true;
                    }
                });
            };

            //show children based on the path... todo - ?hide based on parent/child? more complicated...
            $scope.showChildren = function(item) {
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
                        row.id = new Date().getTime() + Math.random(1000)
                        delete row.isOriginal;
                        $scope.table.splice(inx,0,row);
                        inx++;
                    }

                })
            };

            $scope.editSample = function(inx) {
                //console.log(inx,$scope.input.sample);
                //console.log($scope.input.sample[inx])
                var currentValue = $scope.input.sample[inx];
                $scope.currentItem = $scope.table[inx];


                if ($scope.currentItem.binding) {
                    $scope.showVSViewerDialog.open($scope.currentItem.binding.url);
                }
            };

            //called by the vsViewer when a concept is selected form an expansion...
            $scope.conceptSelected = function(concept) {
                var display = concept.display + " ("+ concept.code + " - "+ concept.system + ")";
                $scope.input.sample[$scope.currentItem.id] = display;//angular.toJson(concept)

            };

            function makeTableArray(SD){
                var ar = []
                SD.snapshot.element.forEach(function (ed,inx) {
                    if (ed.type) {
                        var item = {path: $filter('dropFirstInPath')(ed.path) };
                        item.isOriginal = true;         //to avoid exponential growth when copying...
                        item.id = inx-1;
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


            /* $scope.showValueSet = function(uri,type) {


                //treat the reference as lookup in the repo...
                GetDataFromServer.getValueSet(uri).then(
                    function(vs) {

                        $scope.showVSBrowserDialog.open(vs);

                    }, function(err) {
                        alert(err)
                    }
                ).finally (function(){
                    $scope.showWaiting = false;
                });
            };*/

            $scope.$watch('selectedTrack',function(track,olfV){

                //retrieve the SD for the model...
                $http.get(url).then(
                    function(data){
                        $scope.SD = data.data;
                        $scope.table = makeTableArray($scope.SD)
                    });

                if (track && track.scenarios) {
                    //ensure that all the paths for all the resources in all scenarios are in the cache
                    track.scenarios.forEach(function(trck){
                        if (trck.scenarioTypes) {
                            trck.scenarioTypes.forEach(function(type){
                                ecosystemSvc.getAllPathsForType(type,true)
                            })
                        }
                    })

                }

            })

    });
