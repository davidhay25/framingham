

angular.module("sampleApp")
    .controller('ecosystemCtrl',
        function ($rootScope,$scope,$http,modalService,ecosystemSvc,$window,$localStorage,$uibModal,ecoUtilitiesSvc) {

            $http.post("/startup",{});  //record access
            $scope.ecosystemSvc = ecosystemSvc;
            $scope.input = {};

            //is there an event in the url?
            var eventCode;
            var url = $window.location.href;
            var ar = url.split('?');
            if (ar.length == 2) {
                var search = ar[1];     //the search string - eg ?event=mihin
                var ar1 = search.split('&');
                ar1.forEach(function (qry) {
                    var param = qry.split('=');
                    if (param[0] == 'event') {
                        eventCode = param[1]
                        eventCode = eventCode.replace('#','');
                    }
                })
            }

            if (eventCode) {
                //the url specifies an event. Set the event in the server session so all subsequent queries go to that server...
                $http.post('/public/setEvent',{key:eventCode}).then(
                    function (data) {
                        //now get the event configuration from the event database (admin).
                        $http.get("config/admin/").then(
                            function(data) {
                                if (data.data) {
                                    $scope.eventConfig = data.data[0];

                                    if ($scope.eventConfig) {
                                        if ($scope.eventConfig.navBarStyle) {
                                            $scope.navBarStyle = $scope.eventConfig.navBarStyle;
                                        }
                                    }

                                    //save the config in the service (if the page is re-loaded
                                    ecosystemSvc.setEventConfig(data.data[0]);
                                    loadData();     //can load all the data for the event ...

                                    //is there a user cached for this event?
                                    var user = ecosystemSvc.getCurrentUser();

                                    if (! user) {
                                        //no user - need to login
                                        login();
                                    }
                                }
                            },
                            function(err) {
                                alert('There was an error in logging in. Please contact the event organizers.')
                                console.log(err)
                            }
                        );
                    },
                    function(err) {
                        //the event code wasn't recognized...
                        var msg = "The event code '"+eventCode+ "' is not correct. Please contact the event organizers for the correct code."
                        modalService.showModal({}, {bodyText:msg})

                    }
                )
            } else {
                $scope.noEventCode = true;
                //no event specified in the query. This will show the error div...
            }

            $scope.loginFromNavbar = function() {
                login()
            };

            function clearSession() {
                delete $scope.selectedTrack;
                $scope.$broadcast('logout');

            }


            //the user login functionality
            function login() {
                clearSession();
                $uibModal.open({
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl',
                    resolve : {
                        eventConfig: function(){
                            //
                            return $scope.eventConfig;
                        }
                    }
                }).result.then(function(vo){
                    console.log(vo)
                    if (vo.user) {
                        //this was an existing user...
                        var person = vo.person;
                        ecosystemSvc.setCurrentUser(vo.user);
                       // $scope.input.currentUser = vo.user;

                    } else if (vo.newUser) {
                        ecosystemSvc.updatePerson(vo.newUser).then(
                            function(data) {
                                ecosystemSvc.setCurrentUser(vo.newUser);
                                //ecosystemSvc.setCurrentUserAndDb({event:vo.event,person:vo.newPerson});
                               // $scope.input.currentUser = vo.newPerson;
                               // loadData();
                            }, function(err) {
                                alert('Error saving person: '+ angular.toJson(err));
                            }
                        )

                    }


                    /* temp...
                                                    if (vo.newPerson) {
                                                        ecosystemSvc.updatePerson(vo.newPerson).then(
                                                            function(data) {
                                                                ecosystemSvc.setCurrentUserAndDb({event:vo.event,person:vo.newPerson});
                                                                $scope.input.currentUser = vo.newPerson;
                                                                loadData();
                                                            }, function(err) {
                                                                alert('Error saving person: '+ angular.toJson(err));
                                                            }
                                                        )

                                                    } else {
                                                        var person = vo.person;
                                                        ecosystemSvc.setCurrentUserAndDb(vo);
                                                        $scope.input.currentUser = person;
                                                        var db = vo.item;
                                                        loadData();
                                                    }
                                                    */





                })
            }


            Chart.defaults.global.colors = ['#00cc00','#cc3300','#ffff99','#6E94FF']; //for the stacked bar chart...



            //a list of all resources... Used for the scenario definition...
            $http.get('/artifacts/allResources.json').then(
                function(data) {
                    $scope.allResources = data.data;
                    $scope.allResources.sort(function(a,b){
                        if (a.name < b.name) {
                            return -1;
                        } else {
                            return 1
                        }
                    })
                },function(err) {
                    console.log(err)
                }
            );

/*
            //load the library. Hard code to hapi for now...
            var url = 'http://fhirtest.uhn.ca/baseDstu3/DocumentReference?type=http://clinfhir.com/docs|builderDoc';
            console.log(url)
            ecoUtilitiesSvc.performQueryFollowingPaging(url).then(
                function(bundle) {
                    console.log(bundle)

                    $scope.library = []
                    bundle.entry.forEach(function(entry){
                        var dr = entry.resource;
                        if (dr && dr.content && dr.content[0] && dr.content[0].attachment && dr.content[0].attachment.data) {
                            var item = {name:dr.description}
                            try {
                                item.bundle = angular.fromJson(atob(dr.content[0].attachment.data));
                                //get the history (if any)
                                if (dr.content.length > 1) {
                                    var hx = angular.fromJson(atob(dr.content[1].attachment.data))
                                    item.history = hx.history;
                                }
                                $scope.library.push(item)
                            } catch (ex) {
                                console.log('error loading library item: ',ex)
                            }
                        }
                    });
                    console.log($scope.library);
                },
                function(err) {
                    console.log(err)
                }
            );

            */


            //get the current user and db (if any)
           // var currentState = ecosystemSvc.getCurrentUserAndDb();
           // console.log(currentState)

            //login is called when there is no configured user. the call GET config/admin/ will return a list of connectathon events...
            function loginDEP(err){
                $uibModal.open({
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl',
                    resolve : {
                        keys: function(){
                            //
                            return err.data;
                        }
                    }
                }).result.then(function(vo){
                    //the person has logged in and selected a database. The database key is set in the session on teh server
                   if (vo.newPerson) {
                       ecosystemSvc.updatePerson(vo.newPerson).then(
                           function(data) {
                               ecosystemSvc.setCurrentUserAndDb({event:vo.event,person:vo.newPerson});
                               $scope.input.currentUser = vo.newPerson;
                               loadData();
                           }, function(err) {
                               alert('Error saving person: '+ angular.toJson(err));
                           }
                       )

                   } else {
                       var person = vo.person;
                       ecosystemSvc.setCurrentUserAndDb(vo);
                       $scope.input.currentUser = person;
                       var db = vo.item;
                       loadData();
                   }



                });

            }

            $scope.addScenario = function() {
                var scenario = {id: 'id'+new Date().getTime()};

                $uibModal.open({
                    templateUrl: 'modalTemplates/editScenario.html',
                    size : 'lg',
                    controller: 'editScenarioCtrl',
                    resolve : {
                        scenario: function () {          //the default config
                            return scenario;
                        },allResourceTypes : function(){
                            return $scope.allResources
                        },library : function(){
                            return $scope.library;
                        }, isNew : function(){
                            return true
                        }
                    }
                }).result.then(function(scenario){
                    var url = "/addScenarioToTrack/"+$scope.selectedTrack.id;
                    $http.post(url,scenario).then(
                        function(data) {
                            //now, add the new scenario to the track and update
                            $scope.selectedTrack.scenarios.push(scenario);

                            //alert('scenario added to track')
                        }, function(err) {
                            console.log(err)
                            alert('There was an error '+ angular.toJson(err))
                        }
                    )

                });
            };

            $scope.editScenario = function(scenario) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editScenario.html',
                    size : 'lg',
                    controller: 'editScenarioCtrl',
                    resolve : {
                        scenario: function () {          //the default config
                            return scenario;
                        },allResourceTypes : function(){
                            return $scope.allResources
                        },library : function(){
                            return $scope.library;
                        }, isNew : function(){
                            return false
                        }
                    }
                }).result.then(function(editedScenario){
                    var url = "/config/scenario";

                    var clone = angular.copy(editedScenario);

                    delete clone._id;
                    delete clone.roles;        //don't want the role objects in the db...
                    $http.post(url,clone).then(
                        function(data) {
                            //alert('scenario updated')

                            //update all roles for the track - just for the display...
                            //updateRolesListInTrack($scope.selectedTrack);
                            ecosystemSvc.updateTrackRoles($scope.selectedTrack)


                            /*
                            var hashRoles = {}
                            $scope.selectedTrack.roles.length = 0;
                            $scope.selectedTrack.scenarios.forEach(function (sc) {
                                sc.roles.forEach(function (role) {
                                    if (! hashRoles[role.id]) {
                                        hashRoles[role.id] = role;
                                        $scope.selectedTrack.roles.push(role)
                                    }
                                })
                            })
                            */

                        }, function(err) {
                            console.log(err)
                            alert('err: '+ angular.toJson(err))
                        }
                    )

                });
            };


            //update the roles associated with a track, based on the scenario/roles link...
            function updateRolesListInTrackDEP(track) {
                var hashRoles = {}
                $scope.selectedTrack.roles.length = 0;
                $scope.selectedTrack.scenarios.forEach(function (sc) {
                    sc.roles.forEach(function (role) {
                        if (! hashRoles[role.id]) {
                            hashRoles[role.id] = role;
                            $scope.selectedTrack.roles.push(role)
                        }
                    })
                })
            }

            $scope.userSelectedDEP = function(item){
                $scope.input.currentUser = item;
                ecosystemSvc.setCurrentUser(item)
            };

            $scope.clearUser = function(){
                ecosystemSvc.clearCurrentUser();
               // delete $scope.input.currentUser
                login();


                /*
                $http.get('/public/logout').then(
                    function(data) {
                        console.log(data.data)
                        login({data:data.data});
                    }
                );
*/
                //


            };

            $scope.showHooksSummary = function(svr){
                if (svr.allHooks && svr.allHooks.services) {
                    var disp = ""
                    svr.allHooks.services.forEach(function(hook){
                        disp += "<div><strong>"+hook.name+": </strong>"+hook.description+"</div>"
                    })
                    return disp;
                }
            }

            $scope.getSvrDescription = function(svr) {
                var desc = svr.description;
                if (desc) {
                    if (desc.length > 50) {
                        desc = desc.substr(0,47)+ '...'
                    }
                    return desc;
                } else {
                    return ""
                }

            };

            $scope.deleteResult = function(rslt) {
                //var text = rslt.text;
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Delete result",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to delete this result?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        ecosystemSvc.deleteResult(rslt).then(
                            function(){
                                rslt.track.resultTotals[rslt.text]--;   //for the analysis by track
                            }
                        );
                    }
                );
            };

            $scope.refresh = function(hideMessage){
                loadData(function(){
                    if (!hideMessage) {
                        var msg = "Data has been refreshed."
                        modalService.showModal({}, {bodyText:msg})
                    }



                    //redraw charts (will handle nulls)
                    $scope.selectTrackResults($scope.selectedTrack);
                    $scope.selectScenarioResults($scope.selectedScenarioSummary);


                })
            };

            //load all the configuration & results for the current event...
            var loadData = function(cb){
                ecosystemSvc.getConnectathonResources().then(
                    function(vo) {


                        console.log(ecoUtilitiesSvc.getObjectSize(vo));

                        $scope.tracks = vo.tracks;

                        $scope.allClients =  ecosystemSvc.getAllClients();
                        $scope.allServers = ecosystemSvc.getAllServers();
                        $scope.allPersons = ecosystemSvc.getAllPersons();
                        $scope.filteredAllPersons = angular.copy($scope.allPersons)
                        $scope.serverRoleSummary = ecosystemSvc.makeServerRoleSummary();


                        if (cb) {
                            cb()
                        }

                    }
                );
            };

            $scope.canShowPerson = function(person,filter) {
                var name = person.name;
                if (name) {
                    var org = person.organization;
                    var regex = new RegExp(filter, "i");

                    if ((name && name.search(regex) >-1) || (org && org.search(regex) >-1)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            };

            //$scope.wikiPageUrl = "http://wiki.hl7.org/index.php?title=FHIR_Connectathon_17";

            $scope.makeEventReport = function() {
                $scope.eventReport = ecosystemSvc.makeEventReport($scope.tracks)
            };

            $scope.selectServerRole = function(serverRole){
                //find servers with this serverRole set
                $scope.serversWithServerRole = ecosystemSvc.findServersWithServerRole(serverRole);
            };

            $scope.selectServerWithServerRole = function(server) {
                $scope.selectedServer = server;
            };

            $scope.selectScenarioDirect = function (scenario) {
                $scope.selectedScenarioDirect = scenario;
            };

            $scope.editPerson = function(person) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editPerson.html',
                    controller: 'editPersonCtrl',
                    resolve : {

                        person: function () {          //the default config
                            return person;
                        },
                        tracks : function() {
                            return $scope.tracks;
                        }
                    }
                }).result.then(function(vo){
                    $scope.selectPerson(vo);
                });
            };


            $scope.addTrack = function(){
                var track = {id: 'id'+new Date().getTime(),name:'New Track',roles:[],scenarioIds:[]};
                $scope.editTrack(track,true);

            };


            $scope.editRole = function(role) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editRole.html',
                    //size: 'lg',
                    controller: 'editRoleCtrl',
                    resolve: {
                        track: function () {          //the default config
                            return $scope.selectedTrack; //$scope.selectedTrack;
                        },
                        role: function () {
                            return role;
                        }
                    }
                }).result.then(function (vo) {
                    if (vo.role) {
                        var url = "/config/role";
                        var clone = angular.copy(vo.role);
                        delete clone._id;

                        $http.post(url,clone).then(
                            function(){


                            },function(err) {
                                alert('error: '+ angular.toJson(err))
                            }
                        )

                    }

                })
            };






            $scope.editTrack = function(track,isNew) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editTrack.html',
                    size: 'lg',
                    controller: 'editTrackCtrl',
                    resolve : {
                        track: function () {          //the default config
                            return track; //$scope.selectedTrack;
                        },
                        allPersons : function() {
                            return $scope.allPersons;
                        },
                        isNew : function() {
                            return isNew
                        }
                    }
                }).result.then(function(vo){
                    var url = "/config/track";
                    var clone = angular.copy(vo.track);
                    delete clone._id;
                    delete clone.scenarios;
                    delete clone.leads;
                    $http.post(url,clone).then(
                        function(){
                            if (isNew) {
                                $scope.refresh()
                            }

                            if (clone.status == 'deleted') {
                                $scope.refresh();
                            }

                        },function(err) {
                            alert('error: '+ angular.toJson(err))
                        }
                    )

                });
            };


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
                $scope.input.currentUser = person;




            };

            $scope.selectTrackResults = function(track) {
                //in the results tab, select a track...
                if (track) {
                    $scope.selectedTrackSummary = track;
                    $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track



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


                    });

                    $scope.barData = [arPass,arFail,arPartial,arNote]
                }


            };

            $scope.selectScenarioResults = function(scenario) {
                //in the results tab, select a scenario...
                if (scenario) {
                    $scope.selectedScenarioSummary = scenario;
                    //set the chart values...
                    $scope.chartLabels = [];
                    $scope.chartData = [];
                    $scope.chartColors = []; //'#00cc00', '#cc3300', '#ffff99']
                    $scope.chartOptions = {legend:{display:true}};


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


                    ecosystemSvc.addScenarioResult(track,scenario,client,server,vo);
                    //update the results summary
                    $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track

                    $scope.selectedTrackReport =  ecosystemSvc.getTrackResults(track);      //summary of this track...


                });

            };

            $scope.editTestResult = function(result) {

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


                    if (vo.allScenarios) {
                        //want to add the server to all scenarios. todo ?? does this need to use $q.all ??

                        ecosystemSvc.addServerToScenario($scope.selectedTrack.scenarios,vo.server,vo.role)
/*
                        $scope.selectedTrack.scenarios.forEach(function(scn){
                            ecosystemSvc.addServerToScenario(scn,vo.server,vo.role).then(
                                function(){

                                },
                                function(err) {
                                    alert(angular.toJson(err))
                                }
                            )
                        })
                        */

                    } else {
                        ecosystemSvc.addServerToScenario([scenario],vo.server,vo.role)
                    }



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
                    size: 'lg',
                    controller: 'addServerCtrl',
                    resolve : {
                        existingServer: function () {          //the default config
                            return svr;
                        }
                    }

                }).result.then(
                    function(vo) {
                        $scope.serverRoleSummary = ecosystemSvc.makeServerRoleSummary();
                    }
                )
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
                delete $scope.input.selectedTrackPerson;
                $scope.selectedTrack = track;
                $scope.selectedTrackReport =  ecosystemSvc.getTrackResults(track);      //summary of this track...

                //add the interested people to this track...
                $scope.selectedTrack.persons = []
                $scope.selectedTrack.toi = []
                $scope.allPersons.forEach(function (person) {
                    if (person.primaryTrack) {
                        if (person.primaryTrack.id == $scope.selectedTrack.id) {
                            $scope.selectedTrack.persons.push(person);
                        }
                    }
                    if (person.toi) {
                        person.toi.forEach(function (trck) {
                            if (trck.id == $scope.selectedTrack.id) {
                                $scope.selectedTrack.toi.push(person);
                            }
                        })
                    }


                });

                //and those with this as a Track Of Interest






            };

            $scope.selectScenario = function(scenario) {
                delete $scope.selectedScenario;
                $scope.selectedScenario = scenario;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };

            //========  previous functions =========
/*
            $scope.addTag = function(ep) {
                var tag = $window.prompt("enter tag")
                if (tag) {
                    ecosystemSvc.addTag(tag,ep).then(
                        function(data) {

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

            */

    });
