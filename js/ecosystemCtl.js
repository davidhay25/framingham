

angular.module("sampleApp")
    .controller('ecosystemCtrl',
        function ($scope,$http,modalService,ecosystemSvc,$window,$localStorage,$uibModal) {

            $scope.input = {};

/*
            $scope.chartLabels = ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
            $scope.chartData = [300, 500, 100];
            $scope.chartOptions = {legend:{display:true}}
*/

            ecosystemSvc.getConnectathonResources().then(
                function(vo) {
                    console.log(vo)
                    $scope.tracks = vo.tracks;

                    $scope.allClients =  ecosystemSvc.getAllClients();
                    $scope.allServers = ecosystemSvc.getAllServers();
                    $scope.allPersons = ecosystemSvc.getAllPersons();
                }
            );

            $scope.ecosystemSvc = ecosystemSvc;


            $scope.editPerson = function(person) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editPerson.html',
                    controller: 'editPersonCtrl',
                    resolve : {

                        person: function () {          //the default config
                            return person;
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)

                    //ecosystemSvc.addScenarioResult(track,scenario,client,server,vo)
                });
            }

            $scope.removeServerFromScenario = function (scenario,server) {
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove server",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this server in this role from the scenario?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        ecosystemSvc.removeServerFromScenario(scenario,server);
                        //alert('delete')
                    }
                );
            };
            $scope.removeClientFromScenario = function (scenario,client) {
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove client",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this client in this role from the scenario?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        ecosystemSvc.removeClientFromScenario(scenario,client);
                        //alert('delete')
                    }
                );
            }

            $scope.selectPerson = function(person) {

                var summary = ecosystemSvc.getPersonSummary(person,$scope.tracks);
                $scope.personSummary = summary;
                console.log(summary)
            };

            $scope.selectTrackResults = function(track) {
                //in the results tab, select a track...
                $scope.selectedTrackSummary = track;
                $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track


                //set the scenario list


                //set the chart values...
                $scope.chartLabels = [];// ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
                $scope.chartData = []; //[300, 500, 100];
                $scope.chartOptions = {legend:{display:true}};

                angular.forEach($scope.resultsSummary.scenario,function(value,key){
                   // $scope.chartLabels.push(key)
                })

            };

            $scope.selectScenarioResults = function(scenario) {
                //in the results tab, select a scenario...
                $scope.selectedScenarioSummary = scenario;
                //set the chart values...
                $scope.chartLabels = [];// ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
                $scope.chartData = []; //[300, 500, 100];
                $scope.chartColors = []; //'#00cc00', '#cc3300', '#ffff99']
                $scope.chartOptions = {legend:{display:true}};
                console.log(summary)

                var summary = $scope.resultsSummary.scenario[scenario.name];
                if (summary) {
                    if (summary.pass > 0) {
                        $scope.chartLabels.push('pass ' + summary.pass);
                        $scope.chartData.push(summary.pass)
                        $scope.chartColors.push('#00cc00')
                    }
                    if (summary.fail > 0) {
                        $scope.chartLabels.push('fail ' + summary.fail);
                        $scope.chartData.push(summary.fail)
                        $scope.chartColors.push('#cc3300')
                    }
                    if (summary.partial > 0) {
                        $scope.chartLabels.push('partial ' + summary.pass);
                        $scope.chartData.push(summary.partial)
                        $scope.chartColors.push('#ffff99')
                    }





                    /*
                    angular.forEach(summary,function(v,k){
                        $scope.chartLabels.push(k)
                        $scope.chartData.push(v)
                       // $scope.chartData.push(v)
                    })
                    */
                }



            };


            $scope.showTestResult = function(scenario,client,server) {
                //console.log(scenario,client,server)
                var result = ecosystemSvc.getScenarioResult(scenario,client,server) || {text: 'Enter result'}

                //var colorClass = 'green'

                return "<span class='"+result.text+"'>" + result.text + "</span>"
            };

            $scope.showTestResultNote = function(scenario,client,server) {
                //console.log(scenario,client,server)
                var result = ecosystemSvc.getScenarioResult(scenario,client,server) || {note: ''}
                return result.note
            };


            //add the result from a simple (one client, one server) scenario...
            $scope.addTestResult = function(track,scenario,client,server) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/result.html',
                    controller: 'resultCtrl',
                    resolve : {

                        scenario: function () {          //the default config
                            return scenario;
                        },
                        track: function () {          //the default config
                            return track;
                        },
                        server: function () {          //the default config
                            return server;
                        },
                        client: function () {          //the default config
                            return client;
                        },
                        previousResult : function() {
                            return ecosystemSvc.getScenarioResult(scenario,client,server)
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)

                    ecosystemSvc.addScenarioResult(track,scenario,client,server,vo)
                });

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

            $scope.addNewClient = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addClient.html',
                    //size: 'lg',
                    controller: 'addClientCtrl'

                }).result.then(function(vo){
                    console.log(vo)

                });
            };
            $scope.addNewServer = function() {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addServer.html',
                    //size: 'lg',
                    controller: 'addServerCtrl'

                }).result.then(function(vo){
                    console.log(vo)

                });
            };

            $scope.download = function(downloadThing) {
                var object;
                switch (downloadThing) {
                    case 'results' :
                        object = ecosystemSvc.makeResultsDownloadObject();  //a simplified object
                        //object = ecosystemSvc.makeResultsDownload();  //csv option not working...
                        break;
                }

                if (! object) {
                    alert('no download specified');
                    return
                }
                $uibModal.open({
                    templateUrl: 'modalTemplates/download.html',
                    //size: 'lg',
                    controller: 'downloadCtrl',
                    resolve : {
                        object: function () {          //the default config
                            return object;
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)
                    //ecosystemSvc.addServerToScenario(scenario,vo.server,vo.role)
                });

            };

            $scope.addClientToScenario = function(scenario) {
                //todo expand to a full server object...

                $uibModal.open({
                    templateUrl: 'modalTemplates/addClientToScenario.html',
                    //size: 'lg',
                    controller: 'addClientToScenarioCtrl',
                    resolve : {
                        allClients: function () {          //the default config
                            return $scope.allClients;
                        },
                        scenario: function () {          //the default config
                            return scenario;
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)
                    ecosystemSvc.addClientToScenario(scenario,vo.client,vo.role)
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
                                        if (svr1.server.id == svr.id) {
                                            scenarios.push(track.name + " / "+  scenario.name + " / " + svr1.role.name)
                                        }
                                    })
                                }
                            })
                        }
                    });
                }


                return scenarios;
            };

            $scope.getScenariosForClient = function(clnt){
                return []

            }

            $scope.addClientToScenarioDEP = function(scenario) {
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
