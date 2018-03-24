//directile to render a UI for a profile.
//adapted from clinfhir resourcebuilder
angular.module("sampleApp").directive('vsViewer', function ($uibModal,$http  ) {
    return {
        restrict: 'E',
        scope: {
            trigger: '=',
          //  allowsearch: '=',
          //  showcreate : '=',
          //  hidesearch: '=',
           // vsSelected : '&',
            conceptSelected : '&',
            termServer : '='
        },
        template: '<div></div>',

        link : function ($scope, element, attrs) {
            $scope.internalControl = $scope.trigger || {};

            $scope.internalControl.open = function(url) {

                console.log('ping',$scope.termServer,url);
                if (url) {
                    var query = $scope.termServer + "ValueSet?url="+url;

                    console.log(query)
                    $http.get(query).then(
                        function(data) {
                            if (data.data && data.data.entry) {

                                var vs = data.data.entry[0].resource;        //just the first
                                $scope.selectedvs = angular.copy(vs);
                                showModal();
                            }
                        },function(err){
                            console.log(err)
                            $scope.err = "There was no ValueSet with the Url: "+url + " on the Terminology server.";
                            alert( $scope.err);     //todo a more elegant display please...
                        }
                    )
                }


            };



            function showModal() {
                $uibModal.open({

                    templateUrl: 'directive/vsViewer/vsViewer.html',
                    size:'lg',
                    controller: function($scope,selectedvs,termServer,$q) {

                        //$scope.newVS = {canSave : false};
                        $scope.termServer = termServer;
                        //when a concept is selected
                        $scope.selectConcept = function(concept) {
                            $scope.$close(concept)
                        };

                        //when the close button is clicked
                        $scope.close = function(){
                            $scope.$dismiss();

                        };

                       // $scope.selectVSFn = selectVSFn;

                        $scope.tab = {};
                        $scope.tab.tabDescription = true;


                        $scope.results = {};
                        //$scope.results.filter = "diab"; //<< temp
                        $scope.selectedvs = selectedvs;
                        $scope.selectedvsJSON = angular.toJson(selectedvs,true);

                       // $scope.helpTopic = "unknown";
                        $scope.showWaiting = false;

                     //   $scope.setHelpTopic = function(topic){
                       //     $scope.helpTopic = topic;
                       // };



                        //when the user is performing an expansion...
                        $scope.data = [];

                        var getExpansion = function(filter) {
                            var deferred = $q.defer();
                            $scope.query = $scope.termServer +  "ValueSet/"+$scope.selectedvs.id+"/$expand";
                            if (filter) {
                                $scope.query += "?filter="+filter;
                            }

                            $http.get($scope.query).then(
                                function(data) {
                                    var vs = data.data;
                                    deferred.resolve(vs)
                                },
                                function(err) {
                                    deferred.reject(err);
                                }

                            );
                            return deferred.promise;
                        };

                        $scope.expand = function() {

                         //   if (!$scope.selectedvs) {
                           //     alert('You must select a ValueSet before the expansion will work!');
                             //   return;
                          //  }

                            $scope.data = [];
                            $scope.showWaiting = true;

                            var filter = $scope.results.filter;
                            getExpansion($scope.results.filter).then(
                                function(vs) {
                                    //a valueset was returned
                                    if (vs.expansion && vs.expansion.contains) {
                                        $scope.data = vs.expansion.contains;
                                    } else {
                                        alert('The expansion worked fine, but no expanded data was returned')
                                    }
                                }
                            )

                            return;
                            //console.log(filter);

                            if (! filter) {
                                //this should really be behind the service - but it's just to display to the user...
                                $scope.query = $scope.termServer +  "ValueSet/"+$scope.selectedvs.id+"/$expand";
                                $http.get($scope.query).then(
                                    function(data) {
                                        var vs = data.data;
                                    }
                                )


                                GetDataFromServer.getExpandedValueSet($scope.selectedvs.id).then(
                                    function(data1){
                                        $scope.showWaiting = false;
                                        if (data1.expansion) {
                                            $scope.data = data1.expansion.contains;
                                            if (! data1.expansion.contains) {
                                                alert('The expansion worked fine, but no expanded data was returned')
                                            }
                                        } else {
                                            alert('Sorry, no expansion occurred');
                                        }
                                    },function(err){
                                        $scope.showWaiting = false;
                                        console.log(err);
                                        if (err.statusCode == 422) {
                                            alert('There were too many concepts to expand - use a filter.');
                                        } else {
                                            alert('Sorry, there was an error performing the expansion: '+angular.toJson(err));
                                        }

                                    }
                                )
                            } else {
                                //this should really be behind the service - but it's just to display to the user...
                                $scope.query = "ValueSet/"+$scope.selectedvs.id+"/$expand?filter="+filter;
                                GetDataFromServer.getFilteredValueSet($scope.selectedvs.id,filter).then(
                                    function(data1){
                                        //console.log(data1);
                                        $scope.showWaiting = false;
                                        if (data1.expansion) {
                                            $scope.data = data1.expansion.contains;

                                            if (! data1.expansion.contains) {
                                                alert('The expansion worked fine, but no expanded data was returned')
                                            }

                                        } else {
                                            alert('Sorry, no expansion occurred');
                                        }

                                    },
                                    function(err){
                                        $scope.showWaiting = false;
                                        console.log(err);
                                        if (err.status == 422) {
                                            alert('There were too many concepts to expand - make the filter more restrictive.');
                                        } else {
                                            alert('Sorry, there was an error performing the expansion: '+angular.toJson(err));
                                        }
                                    }
                                )
                            }




                        };



                    },
                    resolve : {
                        selectedvs : function() {
                            return $scope.selectedvs;
                        },
                        termServer : function() {
                            return $scope.termServer;
                        }
                    }
                }).result.then(function(selectedConcept){
                        //User clicked save

                    //if there's no handler for selecting a concept, then catch but ignore the exception...
                    try {
                        $scope.conceptSelected()(selectedConcept)
                    } catch (ex){

                    }


                })

            };





        }
    }
});