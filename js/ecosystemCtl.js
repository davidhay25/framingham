

angular.module("sampleApp")
    .controller('ecosystemCtrl',
        function ($rootScope,$scope,$http,modalService,ecosystemSvc,$window,$timeout,
                  $localStorage,$uibModal,ecoUtilitiesSvc,$filter) {

           // $http.post("/startup",{});  //record access
            $scope.ecosystemSvc = ecosystemSvc;
            $scope.input = {};

            //indexes for the main tabs to allow tabs to be selected from code
            $scope.ui = {}
            $scope.ui.tabHome = 0;
            $scope.ui.tabTrack = 1;
            $scope.ui.tabIG = 2;
            $scope.ui.tabPeople = 3;
            $scope.ui.tabClients = 4;
            $scope.ui.tabServers = 5;
            $scope.ui.tabResults= 6;
            $scope.ui.tabParticipation = 7;
/*
            $http.post('/stats/login',{module:'comMan'}).then(
                function(data){

                },
                function(err){
                    console.log('error accessing clinfhir to register access',err)
                }
            );
*/
            //which track type to display
            $scope.input.trackListDisplay = 'all';     //can be changed by event.type...


            //test results by IG
            $scope.IGTestReport = function(){
                $scope.IGtests = ecosystemSvc.getIGResults()
            }

            $scope.showTrack = function(track,filter) {
                if (filter) {
                    let trackName = track.name.toLowerCase();

                    if (trackName.indexOf(filter.toLowerCase()) > -1) {
                        return true;
                    }
                } else {
                    return true;
                }


            };

            //so the display of the track type can be different to the code
            $scope.trackTypeDisplay = {};


            $scope.trackTypeDisplay.technical = "Technical";
            $scope.trackTypeDisplay.lmreview = "Logical Model Review";
            $scope.trackTypeDisplay.scenario = "Resource graph";


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


                        //now that we have the db, we can record access...
                        $http.post("/startup",{}).then(
                            function(data) {

                            }
                        );  //record access

                        //get the current stats
                        $scope.getStatistics()
                        /*
                        $http.get("/getStats").then(
                            function(data) {
                                console.log(data.data)
                            },
                            function(err) {
                                console.log(err)
                            }
                        )
*/
                        //now get the event configuration from the event database (admin).
                        $http.get("config/admin/").then(
                            function(data) {
                                if (data.data) {
                                    $scope.eventConfig = data.data[0];
                                    if ($scope.eventConfig) {

                                        //sets the type of the event - 'clinical' or 'technical'
                                        if ($scope.eventConfig.type) {
                                            $scope.input.trackListDisplay = $scope.eventConfig.type;
                                        }

                                        if ($scope.eventConfig.navBarStyle) {
                                            $scope.navBarStyle = $scope.eventConfig.navBarStyle;

                                        }
                                        //save the config in the service (if the page is re-loaded
                                        ecosystemSvc.setEventConfig(data.data[0]);
                                        loadData();     //can load all the data for the event ...

                                        //is there a user cached for this event?
                                        $scope.currentUser = ecosystemSvc.getCurrentUser();

                                        if (! $scope.currentUser) {
                                            //no user - need to login
                                            login();
                                        }

                                    } else {
                                        alert("This event is not defined (or there is no 'admin' collection in the database)")
                                    }


                                }
                            },
                            function(err) {
                                alert("There was an error in logging in. Please contact the event organizers. Note that conMan doesn't work in the Brave browser at the moment.")
                                console.log(err)
                            }
                        );
                    },
                    function(err) {
                        console.log(err);
                        //the event code wasn't recognized...
                        var msg = "The event code '"+eventCode+ "' is not correct. Please contact the event organizers for the correct code."
                        modalService.showModal({}, {bodyText:msg})

                    }
                )
            } else {
                $scope.noEventCode = true;
                //no event specified in the query. This will show the error div...
            }


            $scope.getCompleteIGSummary = function() {
                $http.get('/public/report/igresult').then(
                    function(data) {
                        $scope.completeIGSummary = data.data;
                    }
                )
            }

            //retrieve the statistics from the server
            $scope.getStatistics = function() {

                $http.get("/getStats").then(
                    function(data) {

                        $scope.eventStats = data.data

                        if ($scope.eventStats) {
                            $scope['statsCountryData'] = []
                            $scope['statsCountryLabels'] = []
                            $scope['statsUsersData'] = []
                            $scope['statsUsersLabels'] = []

                            //loading the app
                            $scope.eventStats.uniqueCountries.forEach(function (item){
                                $scope['statsCountryData'].push(item.count)
                                $scope['statsCountryLabels'].push( item['_id'])

                            })

                            //unique visitors
                            let hash = {}
                            $scope.eventStats.uniqueUsers.forEach(function (item){  //one entry per ip (user)
                                hash[item.country] = hash[item.country] || 0
                                hash[item.country] ++
                            })
                            Object.keys(hash).forEach(function (k){
                                $scope['statsUsersData'].push(hash[k])
                                $scope['statsUsersLabels'].push(k)
                            })

                            // -----------  count of results
                            $scope.timeData = []
                            $scope.timeLabels = []
                            $scope.timeOptions = {
                                type: 'line',

                                data: {
                                    datasets: [{
                                        fill: false
                                    }]
                                },
                                options: {
                                    elements: {
                                        line: {
                                            fill: false
                                        }
                                    },
                                    scales: {
                                        x: {
                                            type: 'time',
                                            time: {
                                                displayFormats: {
                                                    hour: 'DD'
                                                },
                                                unit: 'hour'
                                            }
                                        }
                                    }
                                }
                            };

                            $scope.eventStats.snapshots.forEach(function (item){
                                $scope['timeData'].push(item.resultCount)
                                $scope['timeLabels'].push( item.date)
                                console.log(item)
                            })


                        }

                        $scope.userPieOptions =  {plugins: {legend: {display : true}}}

                        $scope.countryBarOptions = {scales: {
                                yAxes: [{
                                    stacked: true,
                                    ticks: {
                                        beginAtZero:true
                                    }
                                }],xAxes: [{
                                    stacked: true

                                }]
                            }};

/*
                        $scope['stats-country-labels'] = ['2006', '2007', '2008', '2009', '2010', '2011', '2012'];
                        $scope.series = ['Series A'];

                        $scope['stats-country-data'] = [
                            [65, 59, 80, 81, 56, 55, 40]
                        ];
*/

                    },
                    function(err) {
                        console.log(err)
                    }
                )
            }

            $scope.loginFromNavbar = function() {
                login()
            };

            $scope.selectAllNotes = function(type,notes) {
                $scope.oneTypeAllNotes = notes;
                $scope.oneTypeAllNotesType = type;

            }

            $scope.searchServers = function(type) {
                type = type || "Patient"
                let url = "/server/query/" + type;
                $http.get(url).then(
                    function(data) {
                        console.log(data)
                        $scope.serverQueryResults = data.data;
                    }
                )
            }

            $scope.editServerFromSearch = function(serverId) {
                let ar = $scope.allServers.filter(item => item.id == serverId)
                if (ar.length == 1) {
                    $scope.editServer(ar[0])
                }
                //$scope.editServer = function(svr) {
            }

            // - routines associated with track server list
            $scope.getServersForTrack = function(trackId) {
                let ar = []
                if ($scope.allServers) {
                    $scope.allServers.forEach(function (server){
                        if (server.tracks) {
                            server.tracks.forEach(function (id){
                                if (trackId == id) {
                                    ar.push(server)
                                }
                            })
                        }

                    })
                }
                return ar
            }
            // - load server query for a server

          //  http://clinfhir.com/query.html#https:%2F%2Fterminz.azurewebsites.net%2Ffhir%2F



            $http.get('/artifacts/trackTypes.json').then(
                function(data) {
                    $scope.trackTypes = data.data;

                }
            );
/*
            $scope.showTrackTypeDescription = function(type){
                return trackTypes[type];
            };
            */

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
                            return $scope.eventConfig;
                        }
                    }
                }).result.then(function(vo){

                    if (vo.user) {
                        //this was an existing user...
                        //var person = vo.person;
                        ecosystemSvc.setCurrentUser(vo.user);
                        $scope.currentUser = ecosystemSvc.getCurrentUser();

                    } else if (vo.newUser) {
                        ecosystemSvc.updatePerson(vo.newUser).then(
                            function(data) {
                                ecosystemSvc.setCurrentUser(vo.newUser);
                                $scope.currentUser = ecosystemSvc.getCurrentUser();

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



            $scope.chartLabels = [];
            $scope.chartData = [];
            $scope.chartColors = []; //'#00cc00', '#cc3300', '#ffff99']
            $scope.chartOptions = {legend:{display:true}};


            $scope.editIG = function (IG) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editIG.html',
                    controller: 'igCtrl',
                    resolve : {
                        IG: function(){
                            return IG;
                        }
                    }
                }).result.then(function(){
                    $scope.allIGs = ecosystemSvc.getIGs()
                })
            }

            $scope.getScenarioDescription = function(scenario) {
                return $filter('markDown')(scenario.description)
            };

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
                        }, track : function(){
                            return $scope.selectedTrack
                        }, readOnly : function(){
                            return false
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

            $scope.editScenario = function(scenario,readOnly) {
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
                        }, track : function(){
                            return $scope.selectedTrack
                        }, readOnly : function(){
                            return readOnly
                        }
                    }
                }).result.then(function(editedScenario){
                    var url = "/config/scenario";

                    var clone = angular.copy(editedScenario);

                    delete clone._id;
                    delete clone.roles;        //don't want the role objects in the db...
                    $http.post(url,clone).then(
                        function(data) {



                            //update all roles for the track - just for the display...
                            //updateRolesListInTrack($scope.selectedTrack);
                            ecosystemSvc.updateTrackRoles($scope.selectedTrack)

                            if (clone.status == 'deleted') {
                                $scope.refresh();

                                //need to set the $scope.selectedTrack as it will be showing the 'old' set of scenarios
                                //I don';t know why I need to do this TTTT ...
                                var inx = -1
                                $scope.selectedTrack.scenarios.forEach(function (sc,pos) {
                                    if (sc.id == clone.id) {
                                        inx = pos
                                    }
                                });

                                if (inx > -1) {
                                    $scope.selectedTrack.scenarios.splice(inx,1)
                                }

                                /*
                                $scope.tracks.forEach(function (trck) {
                                    if (trck.id == $scope.selectedTrack.id) {
                                        $scope.selectedTrack = trck;
                                    }
                                })
*/

                                ////selectedTrack.scenarios - displau
                                //selectTrack($scope.selectedTrack)
                                //$scope.selectedTrack = track;

                            }


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

                login();





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
                return desc;
                /* don't limit length for now...
                if (desc) {
                    if (desc.length > 50) {
                        desc = desc.substr(0,47)+ '...'
                    }
                    return desc;
                } else {
                    return ""
                }
                */
            };

            $scope.getSvrNotes = function(svr) {
                var notes = svr.notes;
                return notes;
                /*
                if (notes) {
                    if (notes.length > 50) {
                        notes = notes.substr(0,47)+ '...'
                    }
                    return notes;
                } else {
                    return ""
                }
                */
            };

            $scope.deleteResultDEP = function(rslt) {
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
                let now = new Date().getTime()
                ecosystemSvc.getConnectathonResources().then(
                    function(vo) {


                        $scope.allIGs = ecosystemSvc.getIGs()




                        console.log("object size: " + ecoUtilitiesSvc.getObjectSize(vo));

                        $scope.tracks = vo.tracks;

                        //used to display track by name in server tracks listing
                        $scope.hashTracks = {}
                        $scope.tracks.forEach(function(track){
                            $scope.hashTracks[track.id] = track
                        })


                        $scope.allClients =  ecosystemSvc.getAllClients();
                        $scope.allServers = ecosystemSvc.getAllServers();
                        $scope.allPersons = ecosystemSvc.getAllPersons();
                        $scope.filteredAllPersons = angular.copy($scope.allPersons)
                        $scope.serverRoleSummary = ecosystemSvc.makeServerRoleSummary();

                        let ms = new Date().getTime() - now;
                        console.log("Load time: "+ ms + "ms")

                        if (cb) {
                            cb()
                        }

                    }
                );
            };


            //refresh the 'all notes function.
            $scope.refreshAllNotesSummaryDEP = function(){
                var url = '/scenarioGraph'
                $http.get(url).then(
                    function(data) {
                        var allScenarioGraphs = data.data;
                        ecosystemSvc.makeAllScenarioSummary(allScenarioGraphs,$scope.tracks).then(
                            function(data) {
                                $scope.hashAllScenarioNotes = data;

                            }
                        );

                    } )} ;



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

            $scope.makeEventReport = function() {
                $scope.eventReport = ecosystemSvc.makeEventReport($scope.tracks)

                console.log($scope.eventReport)

/*

                function makePartPie() {


                    var summary = $scope.resultsSummary.scenario[scenario.name];
                    if (summary) {
                        if (summary.pass > 0) {
                            $scope.chartLabels.push('pass ');// + summary.pass);
                            $scope.chartData.push(summary.pass)
                            $scope.chartColors.push('#00cc00')
                        }
                        if (summary.fail > 0) {

                        }
                    }

                } */

                $scope.partChartOptions = {legend:{display:true,position:'left'}};

                //sorting by primary only
                $scope.partChartData = [];
                $scope.partChartLabels = [];
                var clone = angular.copy($scope.eventReport.tracks);
                clone.sort(function(a,b){
                    if (a.persons == b.persons) {
                        return 0
                    } else if (a.persons > b.persons) {
                        return -1
                    } else {
                        return 1
                    }
                })

                clone.forEach(function(track){
                    var primary = track.persons;
                        $scope.partChartData.push(primary);
                        $scope.partChartLabels.push(track.name + " ("+primary + ")");

                });

                console.log( $scope.partChartData)

                //primary plus watchers
                $scope.partChartDataAll = [];
                $scope.partChartLabelsAll = [];
                var cloneAll = angular.copy($scope.eventReport.tracks);


                cloneAll.forEach(function(track){
                    track.all = track.persons + track.watchers;
                })

                cloneAll.sort(function(a,b){
                    if (a.all == b.all) {
                        return 0
                    } else if (a.all > b.all) {
                        return -1
                    } else {
                        return 1
                    }
                });

                cloneAll.forEach(function(track){
                    var all = track.all;
                    $scope.partChartDataAll.push(all);
                    $scope.partChartLabelsAll.push(track.name + " ("+track.persons + ' / ' + track.watchers + ")");

                });



            };

            $scope.selectServerRole = function(serverRole){
                //find servers with this serverRole set
                $scope.serversWithServerRole = ecosystemSvc.findServersWithServerRole(serverRole);
            };

            $scope.selectServerWithServerRole = function(server) {
                $scope.selectedServer = server;
            };

            //selects a track in the list of scenarios part of the list of test results
            $scope.selectScenarioDirect = function (scenario) {
                $scope.selectedScenarioDirect = scenario;
            };

            //create a count of number of tests per scenario. used when displaying the list of scenarios in the track list of results
            $scope.makeScenarioTestCount = function() {
                $scope.hashScenarioTestCount = {}
                //let hash = {}
                let hashResultsThisTrack = ecosystemSvc.getAllResults($scope.selectedTrack,null)
                if (hashResultsThisTrack) {
                    angular.forEach(hashResultsThisTrack,function(result,key){
                        console.log(result)
                        if (result.scenario) {
                            let scenarioId = result.scenario.id
                            $scope.hashScenarioTestCount[scenarioId] = $scope.hashScenarioTestCount[scenarioId] || 0
                            $scope.hashScenarioTestCount[scenarioId] ++
                        }


                    })
               /*     arResultsThisTrack.forEach(function (result){
                        hash[result.scenaroid] = hash[result.scenaroid] || 0
                        hash[result.scenaroid] ++
                    })
                    */
                }
                //return hash
            }

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

                    //setCurrentUser

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
                            return track;
                        },
                        allPersons : function() {
                            return $scope.allPersons;
                        },
                        isNew : function() {
                            return isNew
                        },
                        trackTypes : function(){
                            return $scope.trackTypes;
                        },
                        event : function() {
                            return $scope.eventConfig;
                        }
                    }
                }).result.then(function(vo){
                    //var url = "/config/track";
                    var url = "/track";     //this will only update selected fields to avoid clobbering the scenario list


                    var clone = angular.copy(vo.track);


                    $scope.selectedTrack = vo.track;   //this updates the current page. The whole clone thing may be redundant...
                    //need to update the $scope.tracks array as well
                    for (var i=0; i < $scope.tracks.length; i++) {
                        if ($scope.tracks[i].id == vo.track.id) {
                            console.log('updating local track')
                            $scope.tracks[i] = vo.track;
                            break;
                        }
                    }




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

            $scope.removeClientFromScenarioDEP = function (scenario,client) {
                var modalOptions = {
                    closeButtonText: "No, I changed my mind",
                    headerText: "Remove client",
                    actionButtonText: 'Yes, please remove',
                    bodyText: 'Are you sure you wish to remove this client in this role from the scenario?'
                };

                modalService.showModal({}, modalOptions).then(
                    function() {
                        ecosystemSvc.removeClientFromScenario(scenario,client);

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

                    delete $scope.DSReportSummary;
                    delete $scope.DSReportServers;
                    let vo = ecosystemSvc.createDSReportSummary(track)
                    if (vo.hash) {
                        $scope.DSReportSummary = vo.hash   //temp for dev
                        $scope.DSReportServers = vo.servers;
                    }



                    $scope.selectedTrackSummary = track;
                    $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track


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
                }).result.then(function(result){
                    //

                    ecosystemSvc.addScenarioResult(track,scenario,result);
                    //update the results summary

                    $scope.resultsSummary = ecosystemSvc.getTrackResults(track); //get a summary object for the results for a track
                    $scope.selectedTrackReport =  ecosystemSvc.getTrackResults(track);      //summary of this track...


                });

            };

            //invoked when adding a new test result
            $scope.editTestResult = function(result) {

                //NOTE: only supporting direct now - can likely remove the cs stuff...
                if (result.type == 'direct') {
                    //this result is directly against a scenario... -
                    $scope.addTestResult(result.track,result.scenario,null,null,result)
                } else {
                    //this is from client/server
                    $scope.addTestResult(result.track,result.scenario,result.client,result.server,result)
                   // $scope.addTestResult = function(track,scenario,client,server,previous)
                }
            };

            $scope.addServerToScenarioDEP = function(scenario) {
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
                        },
                        tracks: function () {          //the default config
                            return $scope.tracks;
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
                let fileName = "Connectathon"
                switch (downloadThingType) {
                    case 'results' :
                        fileName = "ConnectathonResults"
                        object = ecosystemSvc.makeResultsDownloadObject(track);  //a csv file
                        break;
                    case 'servers' :
                        fileName = "ConnectathonServers"
                        object = ecosystemSvc.makeServersDownloadObject();  //a csv file
                        break;

                }



                if (! object) {
                    alert('no download specified');
                    return
                }
                $uibModal.open({
                    templateUrl: 'modalTemplates/download.html',
                    controller: 'downloadCtrl',
                    resolve : {
                        object: function () {          //the default config
                            return object;
                        },
                        name : function() {
                            return fileName;
                        }
                    }
                })

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

            //a track is slected from the list...
            $scope.selectTrack = function(track,showTab) {
                delete $scope.selectedScenario;
                delete $scope.selectedRole;
                delete $scope.input.selectedTrackTOIPerson;
                delete $scope.input.selectedTrackPerson;
                delete $scope.selectedScenarioDirect;
//console.log(track)
                $scope.selectedTrack = track;
                $scope.makeScenarioTestCount()      //The count of results per track

              //  $scope.DSReportSummary = ecosystemSvc.createDSReportSummary(track)   //temp for dev

                //so we can show the track summary in the testing sub-tab
                $scope.resultsSummary = ecosystemSvc.getTrackResults(track);

                if (track.url) {
                    $scope.iframeUrl = track.url;
                } else {
                    $scope.iframeUrl = "about:blank";
                }


                $scope.selectedTrackReport =  ecosystemSvc.getTrackResults(track);      //summary of this track...

                //update the associated IG's (when adding a track the full IG object is added to the track - but it can change...)
                //this isn't the smartest thing to do, bit for now this should correct it...
                if ($scope.selectedTrack.IGs && ($scope.selectedTrack.IGs.length > 0)) {
                    let hash = ecosystemSvc.getIGsHash();
                    let arIG = [];    //will be the new array of IG objects
                    $scope.selectedTrack.IGs.forEach(function(IG){
                        arIG.push(hash[IG.id])
                    })
                    $scope.selectedTrack.IGs = arIG;
                }


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

                if (showTab) {
                    $scope.input.mainTabActive = $scope.ui.tabTrack;
                    //alert(showMessage)
                }

            };

            $scope.selectScenario = function(scenario) {
                delete $scope.selectedScenario;
                $scope.selectedScenario = scenario;
            };

            $scope.selectRole = function(role) {
                $scope.selectedRole = role;
            };



    });
