
angular.module("sampleApp")
    .controller('lmCheckCtrl',
        function ($rootScope,$scope,ecosystemSvc,$http,$filter,modalService,$timeout) {

            $scope.input = {sample:{}};

            $scope.user = ecosystemSvc.getCurrentUser();


            $scope.$on('logout',function(){

                delete $scope.lmScenario;
            });


            //called when the form is updated. Defined in the scenario builder component. Not sure what is needed here...
            $scope.formWasUpdated = function(table) {

                $scope.saveExample(true);

                /*
                $scope.saveGraph(true);     //save the graph without showing
                if (table) {
                    drawTree(table)
                    makeDocumentDisplay();
                }
*/
            };



            // ------- functions and objects for the table directive...
            $scope.showResourceTable = {};      //needed for the table directive...
            //when the directive is updated with structured data, this function is called with the json version of the resource...
            $scope.fnResourceJson = function(json) {
                $scope.resourceJson = json;

            };


            //this is called by the directive when a reference is selected.
            $scope.addReference = function(row,type,cb) {
                var profileType = $filter('getLogicalID')(type.targetProfile)
                var msg = "This is a reference to a "+profileType+" resource. The specific elements that are important in the" +
                    " context of this model are present as child elements of this one. You can click on the Question mark" +
                    " to the right to see the resource type in the spec.";
                modalService.showModal({}, {bodyText:msg})

            };

            //this is called by the directive when the notes display is toggled. It can be ignored here...
            $scope.setShowNotes = function (show) {};

            //--------------

            $scope.refreshLM = function(){

                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove resource instance",
                    actionButtonText: 'Yes, please remove',
                    bodyText: "Are you sure you wish to refresh the Logical Model? THis will clear all your data..."
                };


                modalService.showModal({}, modalOptions).then(
                    function(){


                        var url = $scope.selectedTrack.LM;
                        if (url) {
                            $http.get(url).then(
                                function(data){
                                    $scope.SD = data.data;
                                    //$scope.item was defined when the scenario was selected...
                                    $scope.item.sample = {};
                                    $scope.item.notes = [];
                                    delete $scope.item.reviewComment ;
                                    $scope.showResourceTable.open($scope.item,$scope.SD,$scope.cofScenario,$scope.selectedTrack);

                                },
                                function(err){
                                    modalService.showModal({}, {bodyText:"The url: "+url+" specified in the track could not be found."})

                                }
                            );
                        } else {
                            alert('No Logical Model defined for this track')
                        }




                    }
                )
            };


            $scope.refreshLMDEP = function(){
                var msg = "Are you sure you wish to refresh the Logical Model";
                modalService.showModal({}, {bodyText:msg}).then(
                    function(){
                        //first we need a hash of path for row id
                        if ($scope.item.table) {    //no table, no data! - shouldn't come to this...
                            var hashRow = {};
                            $scope.item.table.forEach(function(row){
                                hashRow[row.id] = row;
                            })

                            //create a hash of the notes and samples indexed by path. Where there are multiple instances for a path, choose the first..
                            var hashNotes = {};         //a hash by row of notes
                            if ($scope.item.notes) {
                                $scope.item.notes.forEach(function(note){
                                    var row = hashRow[note.id];
                                    //var path =
                                    if (!hashNotes[row.path]) {
                                        hashNotes[row.path] = note;
                                    }
                                })
                            }

                            var hashSamples = {};       //a hash by path of samples
                            if ($scope.item.notes) {
                                $scope.item.notes.forEach(function(note){
                                    var row = hashRow[note.id];
                                    //var path =
                                    if (!hashSamples[row.path]) {
                                        hashSamples[row.path] = note;
                                    }
                                })
                            }

                            //retrieve the LM
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


                        }


                    }
                )
            };

            //will be a default if not specified in the track...
            $scope.termServer = "https://ontoserver.csiro.au/stu3-latest/"; //for the vs viewer directive...
            //$scope.showVSViewerDialog = {};



            //save the current example. $scope.item is the object that the directive is updating...
            $scope.saveExample = function (hideNotification) {

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




                    $http.put("/lmCheck",saveObject).then(
                        function(){
                            if (! hideNotification) {
                                alert('Updated.')
                            } else {
                                console.log('updated')
                                $scope.writeNotification = "Updated";
                                $timeout(function(){
                                    delete $scope.writeNotification
                                },2000);

                            }
                        }, function(err) {
                            alert('error saving result '+angular.toJson(err))
                        }
                    )
                }
            };




            //when a scenario is selected...
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

                            var vo = data.data;
                            if (vo && vo.table && vo.sample) {
                                //yep - this user has started a sample for this scenario...
                              //  $scope.table = vo.table ;

                                $scope.item.sample = vo.sample;
                                $scope.item.notes = vo.notes;
                                $scope.item.table = vo.table;
                                $scope.item.reviewComment = vo.reviewComment ;
                                $scope.showResourceTable.open($scope.item,$scope.SD,$scope.cofScenario,$scope.selectedTrack);

                            } else {
                                $scope.showResourceTable.open($scope.item,$scope.SD,$scope.cofScenario,$scope.selectedTrack);
                            }
                        }
                    )
                }
            };

            //update when the track is selected...
            $scope.$watch(function($scope) {return $scope.selectedTrack},function(track,olfV){
            //$scope.$watch('selectedTrack',function(track,olfV){
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

                }

            })

    });
