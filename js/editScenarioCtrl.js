angular.module("sampleApp")
    .controller('editScenarioCtrl',
        function ($scope,ecosystemSvc,scenario,modalService,allResourceTypes,library,$uibModal,isNew,track) {


            $scope.saveText = 'Update';
            if (isNew) {
                $scope.saveText = 'Add';
            }

            $scope.scenario = scenario;
            $scope.library = library;
            $scope.input = {roles:{}};
            $scope.track = track;

            if (scenario && scenario.roleIds) {
                scenario.roleIds.forEach(function (id) {

                    $scope.input.roles[id] = true;
                })
            }

            $scope.allRoles = ecosystemSvc.getAllRoles();

            $scope.addNewRole = function(name,description) {
                if (name) {
                    ecosystemSvc.addNewRole(name,description).then(
                        function(role){
                            //so the role has been added - link it to the current scenario
                            scenario.roleIds = scenario.roleIds || [];
                            scenario.roleIds.push(role.id);
                            $scope.input.roles[role.id] = true;

                            delete $scope.input.newRoleName;
                        },
                        function(err) {
                            alert(err)
                        }
                    )
                }

            };


/*
            if (scenario && library && scenario.cfScenario) {
                for (var i=0; i<library.length;i++) {
                    var item = library[i];
                    if (item.name == $scope.scenario.cfScenario.name) {
                        $scope.input.selectedLibraryItem = item;
                        $scope.selectedLibrary = item;
                        break;
                    }
                }
            }
            */

            $scope.libraryItemSelectedDEP = function(item){

                $scope.selectedLibrary = item;
                $scope.scenario.cfScenario = {name:item.name};
            };

            $scope.selectHxItemDEP = function(hx) {


                var vo = ecosystemSvc.makeGraph(hx.bundle);


                var container = document.getElementById('resourceGraph');
                var options = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };

                $scope.graph = new vis.Network(container, vo.graphData, options);


            };

            scenario.scenarioTypes = scenario.scenarioTypes || []
            scenario.links = scenario.links || []



            $scope.allResourceTypes = angular.copy(allResourceTypes);

            $scope.deleteStep = function(inx) {
                $scope.scenario.steps.splice(inx,1)
            }

            $scope.moveStepUp = function(inx) {
                var steps = $scope.scenario.steps.splice(inx,1)
                $scope.scenario.steps.splice(inx-1,0,steps[0])
            };

            $scope.moveStepDn = function(inx) {
                var steps = $scope.scenario.steps.splice(inx,1)
                $scope.scenario.steps.splice(inx+1,0,steps[0])
            };

            $scope.addStep = function(step){
                $scope.scenario.steps = $scope.scenario.steps || []
                $scope.scenario.steps.push(step);
                delete $scope.input.newStep;
            };

            $scope.addType = function(type,inx) {

                scenario.scenarioTypes.push(type.name);
                delete $scope.input.resource;
                $scope.allResourceTypes.splice(inx,1)

            };


            $scope.selectProfile = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addProfileToScenario.html',
                    controller: 'addProfileToScenarioCtrl',
                    size:'lg',
                    resolve : {
                        track: function () {          //the default config
                            return track;
                        },
                        scenario: function () {          //the default config
                            return scenario;
                        }
                    }
                }).result.then(function(vo){

                })
            };

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
                            return scenario.links;
                        }
                    }
                }).result.then(function(vo){

                })

            };
            $scope.removeLink = function(inx){
                scenario.links.splice(inx,1)
            };

            $scope.addLM = function() {

                $uibModal.open({
                    templateUrl: 'modalTemplates/addLMToScenario.html',
                    controller: function($scope,lms,track,ecoUtilitiesSvc){

                        $scope.track = track;
                        var confServer = track.confServer;

                        $scope.selectModel = function(model) {

                            $scope.input.lmUrl = model.url;
                            $scope.input.lmDescription = model.purpose;
                        }

                        //load all the LM's on the conf server
                        if (confServer) {
                            var url = confServer + "StructureDefinition?kind=logical&identifier=http://clinfhir.com|author";
                            ecoUtilitiesSvc.performQueryFollowingPaging(url).then(
                                // $http.get(url).then(
                                function (bundleModels) {

                                    if (bundleModels.entry) {
                                        var lst = []
                                        bundleModels.entry.forEach(function (entry) {
                                            lst.push({url:entry.fullUrl,name:entry.resource.name, purpose:entry.resource.purpose})
                                        });

                                        lst.sort(function(a,b){
                                            if (a.name < b.name) {
                                                return -1
                                            } else {
                                                return 1
                                            }
                                        });

                                        $scope.models = lst
                                    }



                                },
                                function (err) {
                                    alert('Error loading models: ' + angular.toJson(err));
                                }
                            )
                        }

                        $scope.input = {};
                        $scope.addNewLM = function() {
                            lms.push({url:$scope.input.lmUrl,description:$scope.input.lmDescription});
                            $scope.$close();
                        }
                    },
                    resolve : {
                        lms: function () {          //the default config
                            scenario.lms = scenario.lms || []
                            return scenario.lms;
                        }, track: function() {
                            return $scope.track;
                        }
                    }
                }).result.then(function(vo){

                })

            };
            $scope.removeLM = function(inx){
                scenario.lms.splice(inx,1)
            };


            $scope.removeType = function(inx){
                scenario.scenarioTypes.splice(inx,1)
            };


            $scope.updateScenarioRoles = function(){
                $scope.scenario.roleIds = [];
                $scope.scenario.roles = [];                //the role objects are only linked to the scenario in the app - not the db
                $scope.allRoles.forEach(function (role) {
                    if ($scope.input.roles[role.id]) {
                        $scope.scenario.roleIds.push(role.id);
                        $scope.scenario.roles.push(role)
                    }
                });
            };

            $scope.updateScenario = function(){
                if (! $scope.scenario.name) {
                    alert("The scenario name is required.")
                    return;
                }

                scenario.roleIds = [];
                scenario.roles = [];                //the role objects are only linked to the scenario in the app - not the db
                $scope.allRoles.forEach(function (role) {
                    if ($scope.input.roles[role.id]) {
                        scenario.roleIds.push(role.id)
                        scenario.roles.push(role)
                    }
                });

                if (scenario.roleIds.length == 0 && track.trackType == 'technical') {


                    var msg = "###No roles selected. \n You haven't selected any roles. You need to do this before you can record any test results for this scenario. "
                    msg += 'Generally, you need at least 2 roles - the client and the server. \n \n  Roles are common across all ' +
                        'scenarios in the event, so you can either select existing ones, or create ones specific to this ' +
                        'scenario/track.'

                    var modalOptions = {
                        closeButtonText: "No, I changed my mind",
                        headerText: "Delect track",
                        actionButtonText: 'Yes, please remove',
                        bodyText: 'Are you sure you wish to remove this Scenario? After this, it will no longer be listed or available.'
                    };

                    modalService.showModal({}, {bodyText:msg})


                    //alert("You haven't selected any roles. You need to do this before you can record any test results for this scenario. ")
                    return;
                }

                if (scenario.scenarioTypes) {
                    scenario.scenarioTypes.sort();
                }

                $scope.$close(scenario)
            };

            $scope.makeExampleDEP = function() {
                $scope.exampleScenario = {resourceType:'ExampleScenario',process:[{step:[]}]}


            };

            $scope.deleteScenario = function(){
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Delect track",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this Scenario? After this, it will no longer be listed or available.'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        track.status = 'archived';
                        alert('Not yet implemented')
                        // $scope.$close({track:track,lead:$scope.input.trackLead})
                    }
                )
            }

            $scope.archiveScenario = function(){
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Archive track",
                    actionButtonText: 'Yes, please archive',
                    bodyText: 'Are you sure you wish to archive this Scenario? After this, it will no longer be listed or available.'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        track.status = 'archived';
                        alert('Not yet implemented')
                        // $scope.$close({track:track,lead:$scope.input.trackLead})
                    }
                )
            }

            function cfLibraryHistorySummary(hx){
                $scope.hxSummary = []
                hx.forEach(function (item) {
                    var hashResource = {}

                })

            }
        }
    );