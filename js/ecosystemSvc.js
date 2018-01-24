angular.module("sampleApp").service('ecosystemSvc', function($q,$http,modalService,$localStorage,ecoUtilitiesSvc) {

    var serverIP = "http://localhost:8080/baseDstu3/";    //hard code to local server for now...
    var addExtension =  function(resource,url,value) {
        if (angular.isArray(url)) {
            url = url[0];       //stus/3
        }

        resource.extension = resource.extension || []


        var ext = {url:url}
        angular.extend(ext,value);
        resource.extension.push(ext)
    };
    var getExtension = function(resource,url) {
        //return the value of an extension assuming there can be more than 1...
        var extension = [];
        if (resource) {
            resource.extension = resource.extension || []
            resource.extension.forEach(function(ext){
                if (ext.url == url) {extension.push(ext)}
            });
        }
        return extension;
    };
    var extDescriptionUrl = "http://clinfhir.com/StructureDefinition/cf-eco-description";
    var extRoleUrl = "http://clinfhir.com/StructureDefinition/cf-eco-role";
    var extNoteUrl = 'http://clinfhir.com/StructureDefinition/cf-eco-note';
    var tagUrl = 'http://clinfhir.com/NamingSystem/cf-eco-tag';

    //construct an Endpoint resource from an ep internal model..
    var makeResourceFromEP = function(ep){
        var res = {resourceType:'Endpoint',id:ep.id,status:'active'};
        res.name = ep.name;
        res.payloadType = {Coding:[{system:'http://clinfhir.com/NamingSystem/cf-eco-payloadtype/fhir',code:'resource'}]}
        res.address = ep.url;

        if (ep.tags) {
            res.meta = {tag : []}
            ep.tags.forEach(function (tag) {
                res.meta.tag.push({system:tagUrl,code:tag})
            })
        }


        //res.contact = []
        //res.contact.push({value:})

        addExtension(res,'http://clinfhir.com/fhir/StructureDefinition/cfAuthor',
            {valueBoolean:true});
        addExtension(res,extDescriptionUrl,
            {valueString:ep.description});
        addExtension(res,extRoleUrl,
            {valueCode:ep.role});
        if (ep.notes) {
            ep.notes.forEach(function (note) {
                var ext = {url:extNoteUrl,extension:[]}
                ext.extension.push({url:'text',valueString:note.text});
                res.extension.push(ext);    //we know res.extension[] exists at this point...
            })
        }
        return res;

    };

   //construct an internal ep resource from an Endpoint resource...
    var makeEP = function(res) {
        var ep = {};
        ep.id = res.id;
        ep.name = res.name;
        ep.url = res.address;
        var desc = getFirstExtValue(res,extDescriptionUrl)
        if (desc) {
            ep.description = desc.valueString;
        }

        var role = getFirstExtValue(res,extRoleUrl)
        if (role) {
            ep.role = role.valueCode;

        }

        ep.notes = [];
        var extNotes = getExtension(res,extNoteUrl)
        extNotes.forEach(function (ext) {
            var note = {}
            ext.extension.forEach(function (child) {
                note[child.url] = child.valueString;

            });
           ep.notes.push(note)

        });

        ep.tags = [];

        //load any tags that are for the cf ecosystem
        if (res.meta && res.meta.tag) {
            res.meta.tag.forEach(function (tag) {
                if (tag.system == tagUrl ){
                    ep.tags.push(tag.code)
                }
            })
        }
        
        

        return ep;

        function getFirstExtValue(res,url) {
            var ext = getExtension(res,url)
            if (ext.length > 0) {
                return ext[0]
            }

        }

    };

    var makeKey = function(scenario,clientRole,serverRole){
        var key = scenario.id + "|" + clientRole.client.id + '|' + clientRole.role.id + "|"+
            serverRole.server.id + '|' + serverRole.role.id;

        return key;
    };

    var allServers = [];
    var allClients = [];
    var allPersons = [];
    var hashAllPersons = {};
    var eventConfig = {};
    var serverRoleSummary;
    var allResults = {};

    //case insensitive sort
    var ciSort = function(ar,eleName) {
        ar.sort(function(a,b){
            var n1 = a[eleName], n2=b[eleName];
            if (n1 && n2) {
                if (n1.toLowerCase().trim() > n2.toLowerCase().trim()) {
                    return 1
                } else {
                    return -1
                }
            } else {return 0}
        })

    };


    return {
        allResultsCount : function() {
            return Object.keys(allResults).length;
        },
        deleteResult : function(rslt) {
            var deferred = $q.defer();
            //this will set the status of the result (based on the id) to 'deleted'
            $http.delete("/result/"+rslt.id).then(
                function(){
                    delete allResults[rslt.key]
                    deferred.resolve()
                }, function(err) {
                    alert('error deleting result '+angular.toJson(err))
                    deferred.reject()
                }
            )
            return deferred.promise;
        },
        makeServerRoleSummary : function(){
            serverRoleSummary = {};
            eventConfig.serverRoles.forEach(function (r) {
                serverRoleSummary[r.code] = {servers:[]}
            });

            //var summary = angular.copy(eventConfig.serverRoles)
            allServers.forEach(function (svr) {

                if (svr.serverRoles) {
                    for (var i=0; i< svr.serverRoles.length;i++) {
                        var s = svr.serverRoles[i];
                        var code = s.code;      //this is the serverRole;
                        serverRoleSummary[code].servers = serverRoleSummary[code].servers || [];
                        serverRoleSummary[code].servers.push(svr)


                    }
                }
            });
            return serverRoleSummary;

        },
        findServersWithServerRole : function(serverRole) {

            return serverRoleSummary[serverRole.code].servers;

            var ar = [];
            allServers.forEach(function (svr) {

                if (svr.serverRoles) {
                    for (var i=0; i< svr.serverRoles.length;i++) {
                        var s = svr.serverRoles[i];
                        if (s.code == serverRole.code) {
                            ar.push(svr);
                            break;
                        }
                    }
                }
            })
            return ar;
        },
        setEventConfig : function(config) {
            eventConfig = config;
        },
        getEventConfig : function() {
            return eventConfig;
        },
        setCurrentUser : function(user) {
            $localStorage.ecoCurrentUser = user;
            //currentUser = user
        },
        getCurrentUser : function () {
            return $localStorage.ecoCurrentUser;
        },
        clearCurrentUser : function(){
            delete $localStorage.ecoCurrentUser;
        },
        updatePerson : function(person) {
            var deferred = $q.defer();
            $http.post("/person",person).then(
                function(data){
                    //now add (or update) the client to the cached list...
                    var inx = -1;
                    allPersons.forEach(function (p,pos) {
                        if (p.id == person.id) {
                            inx = pos
                        }
                    });
                    if (inx > -1) {
                        allPersons.splice(inx,1)
                    }
                    allPersons.push(person);

                    allPersons.sort(function(a,b){
                        if (a.name < b.name) {
                            return -1
                        } else {
                            return 1
                        }
                    })


                    deferred.resolve(person)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        getPersonSummary : function(person,tracks) {
            var personid = person.id;
            var summary = {results:[],clients:[],servers:[],scenarios:[],person:person};
            summary.primaryTrack = person.primaryTrack;
            summary.toi = person.toi;
            //get all the results for this person
            angular.forEach(allResults,function (v,k) {

                if (v.asserter && v.asserter.id == personid) {
                    summary.results.push(v)
                }

            });

            //get all the clients that this person is a contact for
            allClients.forEach(function (client) {

                if (client.contact) {
                    client.contact.forEach(function (contact) {
                        if (contact.id == personid) {
                            summary.clients.push(client)
                        }
                    })
                }
            });

            //get all the servers that this personis a contact for
            allServers.forEach(function (server) {

                if (server.contact) {
                    server.contact.forEach(function (contact) {
                        if (contact.id == personid) {
                            summary.servers.push(server)
                        }
                    })
                }
            });

            //get all the scenarios for which this person has an association through a client or a server
            tracks.forEach(function (track) {
                track.scenarios.forEach(function (scenario) {
                    if (scenario.clients) {
                        scenario.clients.forEach(function (clientRole) {
                            if (clientRole.client) {
                                summary.clients.forEach(function (cl) {
                                    if (cl.id == clientRole.client.id) {
                                        //this is a client that this user has a relationship with..
                                        summary.scenarios.push({track:track,systemRole:'client',scenario:scenario,clientRole:clientRole})
                                    }
                                })
                            }

                        })
                    }

                })
            });


            return summary;

        },
        makeEventReport : function(tracks){
            //make a report for the whole event...

            //registrations by track...
            var report = {tracks:[],totalWatchers : 0, totalPersons:0, totalResults:0}
            var hashTrack = {}
            tracks.forEach(function (trck) {
                hashTrack[trck.id] = {persons:0,watchers:0,name:trck.name,results:{total:0},personsList:[],watchersList:[],servers:[],clients:[]}


                //go through the scenarios to find the servers...
                var hashServers = {}, hashClients={};
                if (trck.scenarios) {
                    trck.scenarios.forEach(function (scenario) {
                        if (scenario.servers) {
                            scenario.servers.forEach(function (server) {

                                try {
                                    var key = server.server.id + '-' + server.role.id;
                                    if (!hashServers[key] ) {
                                        hashServers[key] = 'x';
                                        hashTrack[trck.id].servers.push(server);
                                    }
                                } catch(ex){
                                    console.log(ex)
                                }

                            })
                        }

                        if (scenario.clients) {
                            scenario.clients.forEach(function (client) {

                                try {
                                    var key = client.client.id + '-' + client.role.id;
                                    if (!hashClients[key] ) {
                                        hashClients[key] = 'x';
                                        hashTrack[trck.id].clients.push(client);
                                    }
                                } catch(ex){
                                    console.log(ex)
                                }

                            })
                        }



                    })
                }




            });


            allPersons.forEach(function (person) {
                if (person.primaryTrack) {
                    var t = hashTrack[person.primaryTrack.id]
                    if (t) {
                        t.persons++;
                        report.totalPersons++;
                        t.personsList.push(person)
                    } else {
                        console.log('Track id ' + person.primaryTrack.id + ' missing.')
                    }
                }

                if (person.toi) {
                    person.toi.forEach(function(trk){
                        var t = hashTrack[trk.id];
                        if (t) {
                            t.watchers ++;
                            report.totalWatchers ++;
                            t.watchersList.push(person)
                        } else {
                            console.log('Track id ' + trk.id + ' missing.')
                        }
                    })
                }
            });

            //examine all the results
            angular.forEach(allResults,function (v,k) {

                var t = hashTrack[v.track.id];
                if (t) {
                    t.results.total++;
                    report.totalResults++
                } else {
                    console.log('Track id ' + v.track.id + ' missing.')
                }
            });





            angular.forEach(hashTrack,function(k,v) {

                report.tracks.push({name:hashTrack[v].name,persons:k.persons,watchers:k.watchers,results:k.results,
                    watchersList:k.watchersList,personsList:k.personsList,servers:k.servers,clients:k.clients})
            });

            return report;

        },

        getTrackResults : function(track) {
            //get a summary object for a track
            var summary = {total : 0, scenario : {},notes:[]}
            summary.resultTotals = {pass:0,fail:0,partial:0,note:0}
            angular.forEach(allResults,function(value,key) {

                if (value.track) {
                    if (value.track.id == track.id) {
                        summary.total ++;


                        var scenarioName = value.scenario.name;
                        var scenarioId = value.scenario.id;
                        summary.scenario[scenarioName] = summary.scenario[scenarioName] || {pass:0,fail:0,partial:0,note:0,total:0}
                        var item = summary.scenario[scenarioName];
                        item[value.text]++;         //todo - should change the name of 'text'
                        item.total ++;
                        summary.resultTotals[value.text]++;

                        if (value.note) {
                            summary.notes.push({asserter:value.asserter,note:value.note,
                                date:value.issued,text:value.text,scenarioName:scenarioName})
                        }
                    }
                } else {
                    alert("There's an invalid result with the id: "+value.id)
                }
            });


            //get all the clients and servers for this track
           // summary.allServerRoles = [];
            //summary.allClientRoles = [];

            summary.uniqueServers = [];
            summary.uniqueClients = [];

            var hashServer = {},hashClient = {};

            track.scenarios.forEach(function (scenario) {
                if (scenario.servers) {
                   scenario.servers.forEach(function (svrRole) {
                        hashServer[svrRole.server.id] = svrRole
                    });

                }

                if (scenario.clients) {
                    scenario.clients.forEach(function (clntRole) {
                        hashClient[clntRole.client.id] = clntRole
                    });

                }
            });


            angular.forEach(hashServer,function(v,k){
                summary.uniqueServers.push(v)
            });

            angular.forEach(hashClient,function(v,k){
                summary.uniqueClients.push(v)
            })



            return summary;


        },

        makeResultsDownloadObject : function (track) {
            //if track specified, then only include results for that track...
            var obj = {name:'connectathon 17',results:[]};
            angular.forEach(allResults,function(value,key) {
                var lne = {};
                lne.track = value.track.name;
                lne.scenario = value.scenario.name;
                lne.type = value.type;
                lne.participants = [];

                if (value.server) {
                    var p = {name:value.server.server.name,role:value.server.role.name,systemRole:'server'};
                    lne.participants.push(p)
                }
                if (value.client) {
                    var p = {name: value.client.client.name, role: value.client.role.name, systemRole: 'client'};
                    lne.participants.push(p)
                }
                /* - leave for when we want to support multiple partipants...
                value.participants.forEach(function (part) {
                    var p = {name:part.participant.name,role:part.role.name,systemRole:part.systemRole};
                    lne.participants.push(p)
                });

                */
                lne.result = value.text;
                lne.note = value.note;

                if (track) {
                    if (value.track.id == track.id) {
                        obj.results.push(lne)
                    }
                } else {
                    obj.results.push(lne)
                }




            });
            return obj;
        },

        makeResultsDownload : function () {
            //make an array for downloading results
            var ar = "";
            angular.forEach(allResults,function(value,key) {

                var lne = quote(value.track.name) + "," + quote(value.scenario.name) + ",";
                lne += value.client.participant.name + " (" + value.client.role.name + "),";
                lne += value.server.participant.name + " (" + value.server.role.name + "),";
                lne += value.text + ",";
                lne += value.note;
                ar += lne + "\n";
            });
            return ar;

            function quote(s) {
                return "'" + s + "'";
            }
        },

        updateClient : function(client,isNewClient) {
            var deferred = $q.defer();

            //replace contact details with id
            if (client.contact) {
                var arContact = angular.copy(client.contact);
                client.contactid = [];//.length = 0;
                arContact.forEach(function (c) {
                    if (c) {
                        client.contactid.push(c.id)
                    }

                })
            }

            $http.post("/client",client).then(
                function(data){


                    if (! isNewClient) {
                        //we'ue updated a client - need to remove it from the list...
                        for (var i=0; i < allClients.length; i++) {
                            var clnt = allClients[i]
                            if (clnt.id == client.id) {
                                allClients.splice(i,1);
                                break;
                            }
                        }
                    }

                    //now add the client to the cached list...

                    allClients.push(client);
                    ciSort(allClients,'name');  //and sort...
                    deferred.resolve(client)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },
        getAllPersons : function(){
            return allPersons;
        },
        getAllClients : function() {
            return  allClients;
/*
            var deferred = $q.defer();
            if (allClients) {
                deferred.resolve(allClients)
            } else {

                //var url = "artifacts/clients.json";
                var url = "/client";

                $http.get(url).then(
                    function(data) {
                        allClients = data.data;//.clients;
                        deferred.resolve(allClients)
                    }
                );
            }
            return deferred.promise;
            */
        },
        getAllResults : function(track,scenario) {
            var allResultsCopy = allResults;

            if (scenario) {
                //we only want the results for this scenario...
                var resp = {};
                angular.forEach(allResultsCopy,function (result,key) {
                    if (result.scenario && result.scenario.id == scenario.id) {

                        resp[key] = result
                    }
                });
                return resp;

            } else if (track) {
                //we want all the results for a track
                var resp = {};
                angular.forEach(allResultsCopy,function (result,key) {
                    if (result.track.id == track.id) {

                        resp[key] = result;
                    }
                });
                return resp;
                
            } else {
                return allResults
            }

        },

        getAllServers : function() {
            return allServers;

        },
        updateServer : function(server,isNewServer) {
            var deferred = $q.defer();

            if (server.contact) {
                var arContact = angular.copy(server.contact);
                server.contactid = [];//.length = 0;
                arContact.forEach(function (c) {
                    server.contactid.push(c.id)
                })
            }

            $http.post("/server",server).then(
                function(data){
                    //now add the client to the cached list...
                    if (! isNewServer) {
                       //we'ue updated a server - need to remove it from the list...
                        for (var i=0; i < allServers.length; i++) {
                            var svr = allServers[i]
                            if (svr.id == server.id) {
                                allServers.splice(i,1);
                                break;
                            }
                        }
                    }
                    allServers.push(server);
                    ciSort(allServers,'name');
                    deferred.resolve(server)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        getScenarioResult : function(scenario,clientRole,serverRole) {
            //get the previous result
            if (clientRole && serverRole) {
                //result is being requested from the client/server tab...
                var key = makeKey(scenario,clientRole,serverRole)
                return allResults[key]
            } else {

            }

        },

        addScenarioResult : function(track,scenario,clientRole,serverRole,result) {

            result.id = result.id || 'id'+ new Date().getTime();

            var key;
            if (clientRole && serverRole) {
                //this has come from the client/server tab...
                key = makeKey(scenario,clientRole,serverRole)
                result.type = 'cs';     //client/server type...
                result.server = {role: serverRole.role,server:serverRole.server};  //used for download
                result.client = {role: clientRole.role,client:clientRole.client};  //used for download


            } else {
                //this has come from the direct tab..
                key = result.id;
                result.type = 'direct';     //direct against the scenario
            }

            result.key = key;       //in case we delete it...

            //add the participants to the result. In this somple case there is one client and one server
            //todo - leave this for now - consider multi participant in v2...
            //result.participants = result.participants || []
            //result.participants.length = 0;
            //result.participants.push({systemRole:'client',role: client.role,participant:client.client});
            //result.participants.push({systemRole:'server',role: server.role,participant:server.server});

            //todo - not sure if participant is needed here...
            //result.server = {role: serverRole.role,participant:serverRole.server};  //used for download
            //result.client = {role: clientRole.role,participant:clientRole.client};  //used for download


            result.scenario = scenario;
            result.track = track;
            result.track.resultTotals = result.track.resultTotals || {};
            result.track.resultTotals[result.text] = result.track.resultTotals[result.text] || 0;
            result.track.resultTotals[result.text]++;

            allResults[key] = result;


            var resultToSave = {};
            resultToSave.id = result.id;
            resultToSave.type = result.type;
            resultToSave.text = result.text;
            resultToSave.note = result.note;
            if (serverRole) {
                resultToSave.server = {serverid:serverRole.server.id,roleid:serverRole.role.id,name:serverRole.server.name};
            }
            if (clientRole) {
                resultToSave.client = {clientid:clientRole.client.id,roleid:clientRole.role.id,name:clientRole.client.name};
            }

            resultToSave.scenarioid = scenario.id;
            resultToSave.trackid = track.id;
            resultToSave.trackers = result.trackers;

            if (result.asserter){
                resultToSave.asserterid = result.asserter.id    //todo - should this be the whole object (like author)???
            }

            if ($localStorage.ecoCurrentUser) {
                resultToSave.author = $localStorage.ecoCurrentUser;    //save the whole object.
            }


            $http.put("/result",resultToSave).then(
                function(){

                }, function(err) {
                    alert('error saving result '+angular.toJson(err))
                }
            )

        },

        addServerToScenario : function(arScenario,server,role) {
            //add the server and role to an array of scenarios...
            var deferred = $q.defer();

            //create a link object to save on the server
           // var link = {active:true,id:'id'+new Date().getTime(),type:'server',serverid:server.id,scenarioid:scenario.id};
           // link.roleid = role.id;

            //make sure the server is not already in this scenario in the given role
            var ar = [];    //this will contain all the scenarios where this server is not actually included
            arScenario.forEach(function (scenario) {
                var canAdd = true;
                scenario.servers = scenario.servers || [];  //this is actually a serverRole - should rename at some point
                scenario.servers.forEach(function (sr) {
                    if (sr.server && sr.server.id == server.id) {
                        //OK, we have the server - is it in the same role??
                        if (sr.role && sr.role.id == role.id) {
                            canAdd = false;
                        }
                    }
                });
                if (canAdd) {
                    ar.push(scenario)
                }
            });

            if (ar.length > 0) {
                var query = [];     //an array of scenarios to be linked

                ar.forEach(function (scenario) {

                    var link = {
                        active: true,
                        id: 'id' + new Date().getTime(),
                        type: 'server',
                        serverid: server.id,
                        scenarioid: scenario.id
                    };
                    link.roleid = role.id;

                    scenario.servers.push({server:server,role:role,link:link});
                    query.push(
                        $http.post("/link", link)
                    )
                });

                $q.all(query).then(function (data) {
                    //success



                }, function (err) {
                    console.log(err)
                });
            } else {
                //nothing to update
                deferred.reject({msg:'There were duplicates'})
            }



            return deferred.promise;

        },
        removeServerFromScenario : function(scenario,serverRole) {
            var deferred = $q.defer();
            //make sure there are no results against this serverRole
            var canDelete = true
            try {
                angular.forEach(allResults,function(v,k){
                    if (v.scenario.id == scenario.id && v.server.server.id == serverRole.server.id &&
                        v.server.role.id == serverRole.role.id) {

                        //if (svr.server.id == serverRole.server.id && svr.role.id == serverRole.role.id) {
                        canDelete = false;
                    }
                });
            } catch(err) {
                console.log(err);
                alert('Unable to check before deletion. Please refresh and try again.')
                return;
            }
            if (!canDelete ) {
                modalService.showModal({},{bodyText:"Sorry, there are results against this Server/Role so it cannot be deleted."})
                return;
            }
            //change the link to inactive and update...
            var link = serverRole.link;
            link.active = false;

            $http.post("/link",link).then(
                function(data){
                    //now remove the server from the cached list...
                    var inx = -1;
                    scenario.servers.forEach(function (svr,pos) {
                        if (svr.server.id == serverRole.server.id && svr.role.id == serverRole.role.id) {
                            inx = pos;
                        }
                    });
                    if (inx > -1) {
                        scenario.servers.splice(inx,1)
                    } else {
                        alert("error - can't find in scenario list")
                    }
                    deferred.resolve(link)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        addClientToScenario : function(scenario,client,role) {
            var deferred = $q.defer();

            //create a link object to save on the server
            var link = {active:true,id:'id'+new Date().getTime(),type:'client',clientid:client.id,scenarioid:scenario.id}
            link.roleid = role.id;
            $http.post("/link",link).then(
                function(data){
                    //now add the client to the cached list...
                    scenario.clients = scenario.clients || [];
                    scenario.clients.push({client:client,role:role,link:link});
                    deferred.resolve(link)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        removeClientFromScenario : function(scenario,clientRole) {
            var deferred = $q.defer();
            //make sure there are no results against this clientRole
            var canDelete = true
            try {
                angular.forEach(allResults,function(v,k){
                    if (v.scenario.id == scenario.id && v.client.client.id == clientRole.client.id &&
                        v.client.role.id == clientRole.role.id) {

                        //if (svr.server.id == clientRole.server.id && svr.role.id == clientRole.role.id) {
                        canDelete = false;
                    }
                });
            } catch(err) {
                console.log(err)
                alert('Unable to check before deletion. Please refresh and try again.')
                return;
            }
            if (!canDelete ) {
                modalService.showModal({},{bodyText:"Sorry, there are results against this Client/Role so it cannot be deleted."})
                return;
            }
            //change the link to inactive and update...
            var link = clientRole.link;
            link.active = false;

            $http.post("/link",link).then(
                function(data){
                    //now remove the server from the cached list...
                    var inx = -1;
                    scenario.clients.forEach(function (clnt,pos) {
                        if (clnt.client.id == clientRole.client.id && clnt.role.id == clientRole.role.id) {
                            inx = pos;
                        }
                    });
                    if (inx > -1) {
                        scenario.clients.splice(inx,1)
                    } else {
                        alert("error - can't find in scenario list")
                    }
                    deferred.resolve(link)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        getConnectathonResources : function() {
            //get scenarios
            var deferred = $q.defer();
            var urls = []
            //urls.push({url:'artifacts/scenarios.json?_dummy='+new Date(),"name":"scenarios"});
            //urls.push({url:'artifacts/roles.json',"name":"roles"});
            //urls.push({url:'artifacts/tracks.json',"name":"tracks"});
            urls.push({url:'artifacts/persons.json',"name":"persons"});

            urls.push({url:'/config/track',"name":"tracks"});
            urls.push({url:'/config/scenario',"name":"scenarios"});
            urls.push({url:'/config/role',"name":"roles"});

            urls.push({url:'/client',"name":"clients"});
            urls.push({url:'/server',"name":"servers"});
            urls.push({url:'/result',"name":"results"});
            urls.push({url:'/person',"name":"persons"});

            var vo = {}

            var queries = []

            urls.forEach(function (item) {
                queries.push(
                    $http.get(item.url).then(
                        function(data) {

                            if (angular.isArray(data.data)) {
                                //server calls return an array...
                                vo[item.name] = data.data
                            } else {
                                vo[item.name] = data.data[item.name]
                            }


                        }
                    )
                );
            });

            $q.all(queries).then(
                function(data) {

                    allClients.length = 0;
                    allServers.length = 0;

                    allPersons = vo.persons;    //scoped to service
                    ciSort(allPersons,'name');



                    hashAllPersons = {};
                    allPersons.forEach(function(p){
                        hashAllPersons[p.id] = p;
                    });

                    var hashServer = {};//vo.servers;
                    vo.servers.forEach(function (server) {
                        hashServer[server.id] = server
                        allServers.push(server);
                    });
                    ciSort(allServers,'name');
                    var hashClient = {};//vo.servers;

                    vo.clients.forEach(function (client) {
                        client.contact =[]
                        if (client.contactid) {
                            client.contactid.forEach(function (personid) {
                                if (hashAllPersons[personid]) {
                                    client.contact.push(hashAllPersons[personid])
                                } else {
                                    console.log("client "+ client.id + " has a contact with the id " + personid + " that can't be found.")
                                }


                            })

                        }

                        hashClient[client.id] = client

                        allClients.push(client);        //scoped to the service...
                    });
                    ciSort(allClients,'name');
                    //create scenario hash
                    var hashScenario = {};
                    vo.scenarios.forEach(function (scenario) {
                        hashScenario[scenario.id] = scenario
                    });

                    var hashTrack = {};
                    vo.tracks.forEach(function (track) {
                        track.resultTotals = {'pass':0,'fail':0,'partial':0,'note':0}
                        hashTrack[track.id] = track

                        //this occurs when the track definition has embedded scenarios, rather than referring to seperate scenarios...
                        if (track.scenarios) {
                            track.scenarios.forEach(function (sc) {
                                hashScenario[sc.id] = sc
                            })
                        }

                    });

                    //link scenarios to tracks


                    var hashRole = {};
                    vo.roles.forEach(function (role) {
                        hashRole[role.id] = role
                    });

                    var hashPerson = {};
                    vo.persons.forEach(function (person) {
                        hashPerson[person.id] = person
                    });

                    vo.tracks.forEach(function (track) {
                        track.scenarios = track.scenarios || [];
                        track.roles = track.roles || [];
                        track.leads = track.leads || [];
                        if (track.leadIds) {
                            track.leadIds.forEach(function (id) {
                                var person = hashPerson[id];
                                if (person) {
                                    track.leads.push(person)
                                } else {
                                    console.log("PersonId "+ id + " missing from track "+ track.id)
                                }
                            })
                        }

                        if (track.scenarioIds) {
                            track.scenarioIds.forEach(function (id) {
                                var scenario = hashScenario[id];
                                if (scenario) {
                                    scenario.roles = scenario.roles || [];
                                    track.scenarios.push(scenario);
                                    if (scenario.roleIds) {
                                        scenario.roleIds.forEach(function (id) {
                                            var role = hashRole[id];
                                            if (role) {
                                                scenario.roles.push(role);
                                                if (track.roles.indexOf(role) == -1) {
                                                    track.roles.push(role);
                                                }
                                            } else {
                                                console.log(" role id:" + id + " missing from track: "+ track.id +  " scenario id: "+ scenario.id )
                                            }



                                        })
                                    }
                                } else {
                                    console.log("track: "+ track.id +  " scenario id: "+ id+ " missing")
                                }

                            })
                        }
                    });

                    //now get the links - servers/clients to scenarios...
                    $http.get("/link").then(
                        function(data) {
                            var links = data.data;
                            links.forEach(function (link) {
                                var scenario = hashScenario[link.scenarioid];
                                var role = hashRole[link.roleid];

                                if (! scenario) {
                                    alert('unknown scenario id '+ link.scenarioid)
                                }

                                if (! role) {
                                    alert('unknown role id '+ link.roleid)
                                }


                                if (scenario && role) {
                                    if (link.type == 'server') {
                                        var server = hashServer[link.serverid]
                                        if (! server) {
                                            alert('unknown server id '+ link.serverid)
                                        } else {
                                            scenario.servers = scenario.servers || []
                                            scenario.servers.push({server:server,role:role,link:link});
                                        }

                                    } else {
                                        //client
                                        var client = hashClient[link.clientid]
                                        if (! client) {
                                            alert('unknown client id '+ link.clientid)
                                        } else {
                                            scenario.clients = scenario.clients || []
                                            scenario.clients.push({client:client,role:role,link:link});
                                        }

                                    }
                                } else {
                                    console.log('no scenario with the id '+ link.scenarioid)
                                }
                            });

                            //and the scores (this could be concurrent with the links)
                            allResults = {};    //scoped to the service...
                            //$http.get("/result?_dummy="+new Date()).then(
                            $http.get("/result").then(
                                function(data) {
                                    var results = data.data;    //the results as saved in the database
                                    results.forEach(function(dataResult){
                                        var result = {id:dataResult.id};
                                        result.text = dataResult.text;
                                        result.type = dataResult.type;
                                        result.note = dataResult.note;
                                        result.trackers = dataResult.trackers;
                                        result.track = hashTrack[dataResult.trackid];
                                        if (!result.track) {
                                            alert("error processing track in result# " + dataResult.id);
                                        }
                                        result.scenario = hashScenario[dataResult.scenarioid];
                                        if (!result.scenario) {
                                            alert("error processing scenario in result# " + dataResult.id);
                                        }

                                        //this is just an error check - should become redundant...
                                        if (result.track && result.scenario) {

                                            result.issued = dataResult.issued;
                                            if (dataResult.server) {
                                                result.server = {server: hashServer[dataResult.server.serverid],
                                                    role: hashRole[dataResult.server.roleid]};

                                                if (!result.server.server || ! result.server.role) {
                                                    alert("Error processing server in result# " + dataResult.id);
                                                    delete result.server;
                                                }

                                            }
                                            if (dataResult.client) {
                                                result.client = {client: hashClient[dataResult.client.clientid],
                                                    role: hashRole[dataResult.client.roleid]}

                                                if (!result.client.client || ! result.client.role) {
                                                    alert("Error processing client in result# " + dataResult.id);
                                                    delete result.client;
                                                }
                                            }

                                            if (dataResult.asserterid) {
                                                result.asserter = hashAllPersons[dataResult.asserterid];
                                            }

                                            //note that the full author is saved. ?should this be the same for the asserter?
                                            if (dataResult.author) {
                                                result.author = hashAllPersons[dataResult.author.id];
                                            }


                                            var key;
                                            if (dataResult.type == 'cs') {
                                                key = result.scenario.id + "|" + result.client.client.id + '|' + result.client.role.id +
                                                    "|" + result.server.server.id + '|' + result.server.role.id;
                                            } else {
                                                key = dataResult.id;
                                            }


                                            result.key = key;       //we need this for the delete...


                                                allResults[key] = result;


                                            //now update the track totals
                                            if (result.track && result.track.resultTotals) {
                                                result.track.resultTotals[result.text]++
                                            } else {
                                                console.log('error processing result: ',dataResult)
                                            }
                                        } else {
                                            //todo - need to alert the user...
                                        }

                                    });
                                    deferred.resolve(vo);
                                },
                                function(err){
                                    alert('error loading results: '+ angular.toJson(err))
                                }
                            );

                        },
                        function(err){
                            alert('error loading links: '+ angular.toJson(err))
                        }
                    );

                }
            );

            return deferred.promise

        },

        addTag : function(tag,ep){
            //add a tag to an endpoint
            ep.tags = ep.tags || []
            ep.tags.push(tag);

            //now add the tag to the resource and save
            var resEP = makeResourceFromEP(ep)
            var url = serverIP + 'Endpoint/'+ep.id;
            //var config = {headers:{'content-type':'application/fhir+json'}}
            //options.headers = {"content-type": "application/json+fhir"};
            return $http.put(url,resEP)


        },
        getEndPoints : function() {
            //return a list of internalEnspoint objects (derives from EndPoint resources)

            var lstTags = [];
            var deferred = $q.defer();
            var url = serverIP + 'Endpoint?_count=100';     //todo need paging

            $http.get(url).then(
                function(data) {
                    var bundle = data.data;
                    var lst = [];
                    bundle.entry.forEach(function (ent) {

                        var ep = makeEP(ent.resource);

                        if (ep.tags) {
                            ep.tags.forEach(function (tag) {
                                if (lstTags.indexOf(tag) == -1) {
                                    lstTags.push(tag)
                                }

                            })
                        }

                        lst.push(ep);
                    })

                    deferred.resolve({endpoints:lst,tags:lstTags})
                    //deferred.resolve(data.data)
                }
            );
            return deferred.promise
        },
        getAllRoles : function(){

            //return a codesystem resource with the role definitions
            var deferred = $q.defer();
            var url = 'artifacts/ecoRoles.json';
            $http.get(url).then(
                function(data) {
                    deferred.resolve(data.data)
                }
            );
            return deferred.promise
           /*

            var roles = {}
            //return all the unique roles in the list
            lstEP.forEach(function(ep){
                roles[ep.role] = 'x'
            })
            var lst = [];
            angular.forEach(roles,function(v,k){
                lst.push(k)
            })

            return lst;

*/
        },

        uploadEP : function(lst) {
            var tran = {resourceType:'Bundle',type:'batch',entry:[]}
            lst.forEach(function (ep,index) {
                //todo - change to use "makeResourceFromEP()"
                var res = {resourceType:'Endpoint',id:'cf-eco-'+index,status:'active'};

                res.name = ep.name;
                res.payloadType = {Coding:[{system:'http://clinfhir.com/NamingSystem/cf-eco-payloadtype/fhir',code:'resource'}]}
                res.address = ep.url;
                //res.contact = []
                //res.contact.push({value:})

                addExtension(res,'http://clinfhir.com/fhir/StructureDefinition/cfAuthor',
                    {valueBoolean:true});
                addExtension(res,extDescriptionUrl,
                    {valueString:ep.description});
                addExtension(res,extRoleUrl,
                    {valueCode:ep.role});
                if (ep.notes) {
                    ep.notes.forEach(function (note) {
                        var ext = {url:extNoteUrl,extension:[]}
                        ext.extension.push({url:'text',valueString:note.text});
                        res.extension.push(ext);    //we know res.extension[] exists at this point...
                    })
                }

                var url = serverIP + 'Endpoint/'+res.id;
                tran.entry.push({resource:res,request:{method:'PUT',url:url}})

            });

            $http.post(serverIP,tran).then(
                function(data){

                },
                function(err) {
                    console.log(err)
                }
            )


        }
    }

});