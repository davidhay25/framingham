
angular.module("sampleApp")
    .controller('lmCheckCtrl',
        function ($scope,ecosystemSvc,$http,$filter) {

            $scope.input = {sample:{}};

            if (!String.prototype.startsWith) {
                String.prototype.startsWith = function(search, pos) {
                    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
                };
            }

            var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/ARForm-1';  //todo testing

            $scope.termServer = "https://ontoserver.csiro.au/stu3-latest/"; //for the vs viewer directive...
            $scope.showVSViewerDialog = {};


            //retrieve the SD for the model...
            $http.get(url).then(
                function(data){
                    $scope.SD = data.data;
                    $scope.table = makeTableArray($scope.SD)
                });

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
