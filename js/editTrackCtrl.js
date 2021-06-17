angular.module("sampleApp")
    .controller('editTrackCtrl',
        function ($scope,ecosystemSvc,event,track,allPersons,modalService,isNew,trackTypes,$uibModal,$http) {

            $scope.currentUser = ecosystemSvc.getCurrentUser();
            $scope.allPersons = allPersons;
            $scope.input = {roles:{}};
            $scope.trackTypes = trackTypes;
            $scope.isNew = isNew;

            $scope.allIGs = []; ecosystemSvc.getIGs()

            function setAvailableIgs() {
                $scope.allIGs.length = 0;
                ecosystemSvc.getIGs().forEach(function (ig) {
                    let ar = $scope.track.IGs.filter(item => item.id == ig.id);
                    if (ar.length == 0) {
                        $scope.allIGs.push(ig)
                    }
                })
            }

            $scope.addIG = function(ig) {
                $scope.track.IGs = $scope.track.IGs || []
                $scope.track.IGs.push(ig)
                setAvailableIgs()
            }

            $scope.removeIG = function(ig) {
                let ar = []
                $scope.track.IGs.forEach(function (tig) {
                    if (tig.id !== ig.id) {
                        ar.push(tig)
                    }
                })
                $scope.track.IGs.length = 0;
                $scope.track.IGs = ar;
                setAvailableIgs()
            }

            //default servers...
            $scope.input.termServer = "https://ontoserver.csiro.au/stu3-latest/";
            $scope.input.confServer = "http://snapp.clinfhir.com:8081/baseDstu3/";
            $scope.input.dataServer = "http://snapp.clinfhir.com:8081/baseDstu3/";

            $http.get('./artifacts/servers.json').then(
                function(data) {
                    //console.log(data.data)
                    $scope.servers = data.data
                }
            );

            $scope.selectServer = function(key){

                $uibModal.open({
                    templateUrl: 'modalTemplates/namedServerList.html',
                    //size: 'lg',
                    controller: function($scope,servers){
                        $scope.servers = servers;
                        $scope.select = function(svr) {

                            $scope.$close(svr);
                        }
                    },
                    resolve : {
                        servers: function () {          //the default config

                            return $scope.servers
                        }
                    }
                }).result.then(
                    function(data) {
                        //console.log(data)
                        $scope.input[key] = data.url;
                    }
                )

            }

            $scope.canSave = true;
            $scope.canDelete = false;       //can only delete if there is a track lead, and the track lead is the vcurrent user


            //temp for cms cleanup
            if (event.key == 'cms') {
                $scope.canDelete = true;
            }



            if (track) {        //should always be true as the 'addTrack' sets a base track {id: name: roles: scenarioIds: };
                $scope.track = track;
                $scope.track.IGs = $scope.track.IGs || []
                setAvailableIgs();      //IG's not already associated with this track...
                $scope.exportTrack = angular.copy(track);   //a copy of the track to use as an export. Delete the non-design stuff
                $scope.exportTrack.exportedTrack = true;    //so the imported knows it is legit
                delete $scope.exportTrack.persons;
                delete $scope.exportTrack.scenarioIds;
                delete $scope.exportTrack.resultTotals;
                delete $scope.exportTrack.toi;
                delete $scope.exportTrack.clients;
                delete $scope.exportTrack.servers;

                if ($scope.exportTrack.scenarios) {
                    $scope.exportTrack.scenarios.forEach(function (scenario) {
                        delete scenario.clients;
                        delete scenario.servers;
                    })
                }


                if (track.IG) {
                    $scope.allIGs.forEach(function (ig) {
                        if (ig._id == track.IG._id) {
                            $scope.input.IG = ig;
                        }
                    })
                }


                /*
                //if the event type has been set to clincial, then all tracks should be scenario - will probably drop 'lmreview'
                if (event && event.type) {
                    if (event.type == 'clincial') {
                        track.trackType = 'scenario';
                    }
                }
*/
                track.trackType = 'technical' ;//track.trackType || 'technical' ;      //default to technical

                if (track.leadIds && track.leadIds.length > 0 && $scope.currentUser) {
                    if (track.leadIds[0] !== $scope.currentUser.id) {
                        $scope.canSave = false;
                    } else {
                        $scope.canDelete = true;    //the current user is the track lead...
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

            } else {
                $scope.track = {trackSubType : "igreview"}
            }


            $scope.addLink = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addLinkToScenario.html',
                    //size: 'lg',
                    controller: function($scope,links){
                        $scope.input = {};
                        $scope.addLink = function() {
                            links.push({url:$scope.input.linkUrl,name:$scope.input.linkName,description:$scope.input.linkDescription});
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




            //a specific query (like a different terminology) for specific valuesets
            $scope.addExpandQuery = function(vsUrl,query) {
                $scope.track.expandQuery = $scope.track.expandQuery || []
                $scope.track.expandQuery.push({vsUrl:vsUrl,query:query})

                delete $scope.input.eqVsUrl;
                delete $scope.input.eqQuery;

            };

            $scope.removeExpandQuery = function(inx) {
                $scope.track.expandQuery.splice(inx,1)
            };

            $scope.addEndPoint = function(url,description) {
                //console.log(url,description)
                $scope.track.endPoints = $scope.track.endPoints || []
                $scope.track.endPoints.push({url:url,description:description})


                delete $scope.input.eqPath;
                delete $scope.input.eqQuery;
            };

            $scope.removeEndPoint = function(inx) {
                $scope.track.endPoints.splice(inx,1)
            };




            $scope.personSelected = function(person){
               // console.log(person)
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

                //need to re-order the scenarioIds based on the order of the scenarios...

                //var clone = angular.copy($scope.track)
                //$scope.track.scenarios.length = 0;

                if ($scope.track.scenarioIds && $scope.track.scenarios) {
                    $scope.track.scenarioIds.length = 0;

                    $scope.track.scenarios.forEach(function (scenario) {
                        $scope.track.scenarioIds.push(scenario.id)
                    })
                }



                //track.url = $scope.clone.url;
/*
                $scope.track.termServer = $scope.input.termServer;
                $scope.track.confServer = $scope.input.confServer ;
                $scope.track.dataServer = $scope.input.dataServer;

                $scope.track.LM = $scope.input.LM ;
*/
                if ($scope.input.IG) {
                    $scope.track.IG = $scope.input.IG

                   // $scope.track.IG = {id:$scope.input.IG.id,name:$scope.input.IG.name}
                   // $scope.track.IG.url = $scope.track.confServer + "ImplementationGuide/"+$scope.input.IG.id;


                } else {
                    delete $scope.track.IG;
                }

                $scope.$close({track:$scope.track,lead:$scope.input.trackLead})

                //$scope.track.subType =
/*
                if ($scope.track.trackType == "scenario" || $scope.track.allowGraph) {
                    //load the supported resource types
                    let url = $scope.track.confServer + 'metadata';
                    $http.get(url).then(
                        function (data) {
                            let cs = data.data;
                            $scope.track.supportedResources = []
                            //console.log(cs)
                            if (cs.rest) {
                                cs.rest.forEach(function(rest){
                                    if (rest.resource) {
                                        rest.resource.forEach(function (resource) {
                                            $scope.track.supportedResources.push({name:resource.type})
                                        })
                                    }
                                });
                                //console.log($scope.track.supportedResources)
                            }

                        },
                        function(err) {
                            alert('Error retrieving CapabilityStatement: '+url)
                        }
                    ).finally(function(){
                        $scope.$close({track:$scope.track,lead:$scope.input.trackLead})
                    })



                } else {
                    $scope.$close({track:$scope.track,lead:$scope.input.trackLead})
                }
*/

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
            };

            $scope.moveScenarioUp = function(inx) {
                var id = track.scenarios.splice(inx,1);
                track.scenarios.splice(inx-1,0,id[0]);
            };
            $scope.moveScenarioDn = function(inx) {
                var id = track.scenarios.splice(inx,1);
                track.scenarios.splice(inx+1,0,id[0]);
            };

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
            };


            $scope.copyToClipboard = function() {
                //copy to the clipboard

                //https://stackoverflow.com/questions/29267589/angularjs-copy-to-clipboard
                var copyElement = document.createElement("span");
                copyElement.appendChild(document.createTextNode(angular.toJson($scope.exportTrack),2));
                copyElement.id = 'tempCopyToClipboard';
                angular.element(document.body.append(copyElement));

                // select the text
                var range = document.createRange();
                range.selectNode(copyElement);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);

                // copy & cleanup
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
                copyElement.remove();

                alert("The Json has been copied to the clipboard.")

            }

        }
    );