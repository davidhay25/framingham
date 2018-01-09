

angular.module("sampleApp")
    .controller('ecosystemCtrl',
        function ($scope,$http,modalService,ecosystemSvc,$window,$localStorage,$uibModal,ecoUtilitiesSvc) {

            $scope.input = {};

            Chart.defaults.global.colors = ['#00cc00','#cc3300','#ffff99','#6E94FF']; //for the stacked bar chart...

            $http.get("config/admin/").then(
                function(data) {
                    console.log(data.data)
                    if (data.data) {
                        $scope.eventConfig = data.data[0];
                        ecosystemSvc.setEventConfig(data.data[0]);
                    }
                }
            );

            $scope.input.currentUser = ecosystemSvc.getCurrentUser();
            $scope.userSelected = function(item){
                $scope.input.currentUser = item;
                ecosystemSvc.setCurrentUser(item)
            };

            $scope.clearUser = function(){
                ecosystemSvc.clearCurrentUser();
                delete $scope.input.currentUser

            };

            ecosystemSvc.getConnectathonResources().then(
                function(vo) {
                    console.log(vo)
                    //console.log(angular.toJson(vo))


                    console.log(ecoUtilitiesSvc.getObjectSize(vo));

                    $scope.tracks = vo.tracks;

                    $scope.allClients =   ecosystemSvc.getAllClients();
                    $scope.allServers = ecosystemSvc.getAllServers();
                    $scope.allPersons = ecosystemSvc.getAllPersons();



                }
            );

            $scope.wikiPageUrl = "http://wiki.hl7.org/index.php?title=FHIR_Connectathon_17";

            $scope.ecosystemSvc = ecosystemSvc;

            $scope.selectServerRole = function(serverRole){
                //find servers with this serverRole set
                $scope.serversWithServerRole = ecosystemSvc.findServersWithServerRole(serverRole);
            };

            $scope.selectServerWithServerRole = function(server) {
                $scope.selectedServer = server;
            }

            $scope.selectScenarioDirect = function (scenario) {
                $scope.selectedScenarioDirect = scenario;
            }

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

            $scope.editTrack = function(track) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editTrack.html',
                    size: 'lg',
                    controller: 'editTrackCtrl',
                    resolve : {

                        track: function () {          //the default config
                            return $scope.selectedTrack;
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


                console.log($scope.resultsSummary)
                //set the scenario list

                //set the options for the stacked bar chart
                $scope.barSeries = ['Pass', 'Fail','Partial','Note'];
                $scope.barOptions = {scales: {
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            beginAtZero:true
                        }
                    }],xAxes: [{
                        stacked: true

                    }]
                }};
                $scope.barLabels = [];
                var arPass=[], arFail=[],arPartial=[], arNote =[]
                track.scenarios.forEach(function (scenario) {
                    $scope.barLabels.push(scenario.name)
                    var scenarioSummary = $scope.resultsSummary.scenario[scenario.name];
                    if (scenarioSummary) {
                        arPass.push(scenarioSummary.pass)
                        arFail.push(scenarioSummary.fail)
                        arPartial.push(scenarioSummary.partial)
                        arNote.push(scenarioSummary.note)
                    } else {
                        arPass.push(0)
                        arFail.push(0)
                        arPartial.push(0)
                        arNote.push(0)
                    }
                    console.log(scenarioSummary)

                });

                //$scope.barLabels = ['Scenario1', 'Scenario2', 'Scenario3', 'Scenario4'];
                $scope.barData = [arPass,arFail,arPartial,arNote]
/*
                $scope.barData = [
                    [7, 4, 4, 5],  //pass
                    [5, 3, 7, 5], //fail
                    [8, 3, 3, 5]
                ];



                angular.forEach($scope.resultsSummary.scenario,function(value,key){
                    // $scope.chartLabels.push(key)

                })
                */

/*
                //set the chart values...
                $scope.chartLabels = [];// ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
                $scope.chartData = []; //[300, 500, 100];
                $scope.chartOptions = {legend:{display:true}};

                angular.forEach($scope.resultsSummary.scenario,function(value,key){
                   // $scope.chartLabels.push(key)
                })
*/
            };

            $scope.selectScenarioResults = function(scenario) {
                //in the results tab, select a scenario...
                $scope.selectedScenarioSummary = scenario;
                //set the chart values...
                $scope.chartLabels = [];
                $scope.chartData = [];
                $scope.chartColors = []; //'#00cc00', '#cc3300', '#ffff99']
                $scope.chartOptions = {legend:{display:true}};
                console.log(summary)

                var summary = $scope.resultsSummary.scenario[scenario.name];
                if (summary) {
                    if (summary.pass > 0) {
                        $scope.chartLabels.push('pass ');// + summary.pass);
                        $scope.chartData.push(summary.pass)
                        $scope.chartColors.push('#00cc00')
                    }
                    if (summary.fail > 0) {
                        $scope.chartLabels.push('fail ');// + summary.fail);
                        $scope.chartData.push(summary.fail)
                        $scope.chartColors.push('#cc3300')
                    }
                    if (summary.partial > 0) {
                        $scope.chartLabels.push('partial ');// + summary.pass);
                        $scope.chartData.push(summary.partial)
                        $scope.chartColors.push('#ffff99')
                    }
                    if (summary.note > 0) {
                        $scope.chartLabels.push('note ');// + summary.pass);
                        $scope.chartData.push(summary.note)
                        $scope.chartColors.push('#6E94FF')
                    }
                    
                }

            };


            $scope.showTestResult = function(scenario,client,server) {
                var result = ecosystemSvc.getScenarioResult(scenario,client,server) || {text: 'Enter result'}
                return "<span class='"+result.text+"'>" + result.text + "</span>"
            };

            $scope.showTestResultNote = function(scenario,client,server) {

                var result = ecosystemSvc.getScenarioResult(scenario,client,server);// || {note: ''}
                if (result) {
                    var display = "";
                    if (result.asserter) {
                        display += "<div>Asserter: " + result.asserter.name + "</div>"
                    }
                    if (result.author) {
                        display += "<div>Author: " + result.author.name + "</div>"
                    }
                    if (result.note) {
                        display += "<div><br/>" + result.note + "</div>"
                    }


                    return display;
                } else {
                    return "";
                }

                //return result.note
            };


            //add the result from a simple (one client, one server) scenario...
            $scope.addTestResult = function(track,scenario,client,server,previous) {
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
                            if (previous) {
                                return previous
                            } else {
                                //assumes this is from client/server
                                return ecosystemSvc.getScenarioResult(scenario,client,server)
                            }

                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)

                    ecosystemSvc.addScenarioResult(track,scenario,client,server,vo);
                    //update the results summary
                    $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track

                });

            };

            $scope.editTestResult = function(result) {
                console.log(result);
               // return;
                if (result.type == 'direct') {
                    //this result is directly against a scenario...
                    $scope.addTestResult(result.track,result.scenario,null,null,result)
                } else {
                    //this is from client/server
                    $scope.addTestResult(result.track,result.scenario,result.client,result.server,result)
                   // $scope.addTestResult = function(track,scenario,client,server,previous)
                }
            };

            $scope.addServerToScenario = function(scenario) {
                //todo expand to a full server object...

                $uibModal.open({
                    templateUrl: 'modalTemplates/addServerToScenario.html',
                    size: 'lg',
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

            $scope.editClient = function(clnt) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addClient.html',
                    //size: 'lg',
                    controller: 'addClientCtrl',
                    resolve : {
                        existingClient: function () {          //the default config
                            return clnt;
                        }
                    }

                })
            };

            $scope.editServer = function(svr) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addServer.html',
                    //size: 'lg',
                    controller: 'addServerCtrl',
                    resolve : {
                        existingServer: function () {          //the default config
                            return svr;
                        }
                    }

                })
            };

            $scope.download = function(downloadThingType,track) {
                var object;
                switch (downloadThingType) {
                    case 'results' :
                        object = ecosystemSvc.makeResultsDownloadObject(track);  //a simplified object
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
                    size: 'lg',
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

            $scope.getScenariosForClient = function(client){

                var scenarios = [];
                if ($scope.tracks) {
                    $scope.tracks.forEach(function(track){
                        if (track.scenarios) {
                            track.scenarios.forEach(function(scenario){
                                if (scenario.clients) {
                                    scenario.clients.forEach(function (clnt) {
                                        if (clnt.client.id == client.id) {
                                            scenarios.push(track.name + " / "+  scenario.name + " / " + clnt.role.name)
                                        }
                                    })
                                }
                            })
                        }
                    });
                }


                return scenarios;

            }

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

            //========  previous functions =========

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
