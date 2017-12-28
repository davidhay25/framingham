

angular.module("sampleApp")
    .controller('ecosystemCtrl',
        function ($scope,$http,modalService,ecosystemSvc,$window,$localStorage,$uibModal) {

            $scope.input = {};

            ecosystemSvc.getAllServers().then(
                function (data) {
                    $scope.allServers = data;
                    console.log($scope.allServers)
                }
            );


            //retieve to whole 'tree' of tracks -> scenarios -> roles
            ecosystemSvc.getConnectathonResources().then(
                function(vo) {
                    console.log(vo)
                    $scope.tracks = vo.tracks;
                }
            );

            $scope.showTestResult = function(scenario,client,server) {
                console.log(scenario,client,server)
                var result = ecosystemSvc.getScenarioResult(scenario,client,server) || {text: 'Enter result'}
                return result.text
            };


            $scope.addTestResult = function(scenario,client,server) {

                console.log(scenario,client,server)
                var result = $window.prompt("What was the result?");
                if (result) {
                    ecosystemSvc.addScenarioResult(scenario,client,server,{text:result})
                }


            };

            $scope.addServerToScenario = function(scenario) {
                //todo expand to a full server object...

                $uibModal.open({
                    templateUrl: 'modalTemplates/addServerToScenario.html',
                    //size: 'lg',
                    controller: 'addServerToScenarioCtrl',
                    resolve : {
                        allServers: function () {          //the default config
                            return $scope.allServers;
                        },
                        scenario: function () {          //the default config
                            return scenario;
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)
                    ecosystemSvc.addServerToScenario(scenario,vo.server,vo.role)
                });


            };

            //generate an array of all the scenarios that a server participates in...
            $scope.getScenariosForServer = function(svr){
                var scenarios = [];
                if ($scope.tracks) {
                    $scope.tracks.forEach(function(track){
                        if (track.scenarios) {
                            track.scenarios.forEach(function(scenario){
                                if (scenario.servers) {
                                    scenario.servers.forEach(function (svr1) {
                                        if (svr1.id == svr.id) {
                                            scenarios.push(track.name + " / "+  scenario.name)
                                        }
                                    })
                                }
                            })
                        }
                    });
                }


                return scenarios;
            };

            $scope.addClientToScenario = function(scenario) {
                //todo expand to a full server object...
                var ip = $window.prompt("Enter Client name","client 1");
                if (ip) {
                    ecosystemSvc.addClientToScenario(scenario,ip)
                }

            };

            $scope.selectTrack = function(track) {
                delete $scope.selectedScenario;
                delete $scope.selectedRole;
                $scope.selectedTrack = track;

            };

            $scope.selectScenario = function(scenario) {
                delete $scope.selectedScenario;
                $scope.selectedScenario = scenario;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };


            $scope.addTag = function(ep) {
                var tag = $window.prompt("enter tag")
                if (tag) {
                    ecosystemSvc.addTag(tag,ep).then(
                        function(data) {
                            console.log(data)
                        },
                        function(err) {
                            console.log(err)
                        }
                    )
                }
            };

            ecosystemSvc.getEndPoints().then(
                function(vo) {
                    $scope.endpoints = vo.endpoints;
                    $scope.tags = vo.tags;

                }
            );

            ecosystemSvc.getAllRoles().then(
                function(cs) {

                    $scope.csAllRoles = cs;

                    //console.log(cs)
                }
            );

            $scope.setFilter = function() {
                console.log($scope.input.filterRole)
            };

            $scope.canShow = function(ep) {
                var canShow = true;
                if ($scope.input.filterRole) {
                    canShow = false;
                    console.log(ep,$scope.input.filterRole.code)

                    if ($scope.input.filterRole && $scope.input.filterRole.code) {
                        if (ep.role == $scope.input.filterRole.code) {
                            canShow = true;
                        }
                    }
                }

                return canShow;

            };

            //$scope.


            function showError(msg) {
                var err = msg || 'Error accessing platform';
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    //actionButtonText: 'Yes, please create',
                    headerText: msg,
                    bodyText: 'There was an error retrieving data from the platform. This can be caused when your login expires, please re-log in and try again. '
                };


                modalService.showModal({}, modalOptions);
            }

    });
