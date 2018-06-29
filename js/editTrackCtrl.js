angular.module("sampleApp")
    .controller('editTrackCtrl',
        function ($scope,ecosystemSvc,track,allPersons,modalService,isNew,trackTypes,$uibModal) {

            $scope.currentUser = ecosystemSvc.getCurrentUser();
            $scope.allPersons = allPersons;
            $scope.input = {roles:{}};
            $scope.trackTypes = trackTypes;
           // $scope.clone = {};
            $scope.isNew = isNew;

            //$scope.IGs = ecosystemSvc.getIGs()

            $scope.input.termServer = "https://ontoserver.csiro.au/stu3-latest/";
            $scope.input.confServer = "http://snapp.clinfhir.com:8081/baseDstu3/";
            $scope.input.dataServer = "http://snapp.clinfhir.com:8081/baseDstu3/";



            console.log($scope.allRoles)
            //$scope.mdOptions = {iconlibrary:'glyph'}

            $scope.canSave = true;

            if (track) {        //should always be true as the 'addTrack' sets a base track {id: name: roles: scenarioIds: };
               // $scope.clone = angular.copy(track)
                $scope.track = track;
                track.trackType = track.trackType || 'technical' ;      //default to technical
                if (track.leadIds && track.leadIds.length > 0 && $scope.currentUser) {
                    if (track.leadIds[0] !== $scope.currentUser.id) {
                        $scope.canSave = false;
                    }

                    $scope.allPersons.forEach(function (person) {
                        if (person.id == track.leadIds[0]) {
                            $scope.input.trackLead = person;

                        }
                    })
                }

                $scope.input.description = track.description;
                $scope.input.termServer = track.termServer || 'https://ontoserver.csiro.au/stu3-latest/';
                $scope.input.confServer = track.confServer || 'http://fhirtest.uhn.ca/baseDstu3/';
                $scope.input.dataServer = track.dataServer || 'http://fhirtest.uhn.ca/baseDstu3/';
                $scope.input.LM = track.LM;

            }

            $scope.findIGs = function(serverUrl) {
                //console.log('blur')
                $scope.IGs = $scope.IGs || [];
                $scope.IGs.length =0;
                ecosystemSvc.getIGs(serverUrl).then(
                    function (list) {
                        $scope.IGs = list
                        console.log(list)

                        //set the currently selected IG (if any)
                        if (track.IG) {
                            list.forEach(function (item) {
                                if (item.id == track.IG.id) {
                                    $scope.input.IG = item;
                                }
                            })
                        }


                    },

                    function(err) {
                        console.log('Error accessing conformance server ',err)
                    }
                );
            }

            $scope.findIGs($scope.input.confServer)


            $scope.addLink = function() {


                $uibModal.open({
                    templateUrl: 'modalTemplates/addLinkToScenario.html',
                    //size: 'lg',
                    controller: function($scope,links){
                        $scope.input = {};
                        $scope.addLink = function() {
                            links.push({url:$scope.input.linkUrl,description:$scope.input.linkDescription});
                            $scope.$close();
                        }
                    },
                    resolve : {
                        links: function () {          //the default config
                            $scope.track.links = $scope.track.links || []
                            return $scope.track.links;
                        }
                    }
                })

            };
            $scope.removeLink = function(inx){
                $scope.track.links.splice(inx,1)
            };

            $scope.addEndPoint = function(url,description) {
                //console.log(url,description)
                $scope.track.endPoints = $scope.track.endPoints || []
                $scope.track.endPoints.push({url:url,description:description})

                delete $scope.input.epUrl;
                delete $scope.input.epDescription;
            };

            $scope.removeEndPoint = function(inx) {
                $scope.track.endPoints.splice(inx,1)
            };

            $scope.personSelected = function(person){
                console.log(person)
                $scope.track.leads = $scope.track.leads || [];
                $scope.track.leads[0] = person;
                $scope.input.trackLead = person;
                //$scope.selectedPerson = item;
            };

            $scope.save = function(){

                if ($scope.input.trackLead) {
                    $scope.track.leadIds = $scope.track.leadIds || [];
                    $scope.track.leadIds[0] = $scope.input.trackLead.id;
                }

                //track.url = $scope.clone.url;

                $scope.track.termServer = $scope.input.termServer;
                $scope.track.confServer = $scope.input.confServer ;
                $scope.track.dataServer = $scope.input.dataServer;

                $scope.track.LM = $scope.input.LM ;

                if ($scope.input.IG) {
                    $scope.track.IG = {id:$scope.input.IG.id,name:$scope.input.IG.name}
                    $scope.track.IG.url = $scope.track.confServer + "ImplementationGuide/"+$scope.input.IG.id;
                } else {
                    delete $scope.track.IG;
                }

                $scope.$close({track:$scope.track,lead:$scope.input.trackLead})
            };


            $scope.archiveTrack = function(){
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Archive track",
                    actionButtonText: 'Yes, please archive',
                    bodyText: 'Are you sure you wish to archive this Track? After this, it will no longer be listed or available.'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        track.status = 'archived';
                        alert('Not yet implemented')
                       // $scope.$close({track:track,lead:$scope.input.trackLead})
                    }
                )
            }

            $scope.deleteTrack = function(){
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove track",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this Track? After this, it will no longer be listed or available.'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        track.status = 'deleted';
                        $scope.$close({track:track,lead:$scope.input.trackLead})
                    }
                )
            }

        }
    );