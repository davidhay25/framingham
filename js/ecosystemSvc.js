angular.module("sampleApp").service('ecosystemSvc', function($q,$http,modalService,$localStorage) {

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
           // console.log(ep.role)
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
       // console.log(key);
        return key;
    };


    var allServers = [];
    var allClients = [];
    var allPersons = [];
    var hashAllPersons = {}

    var allResults = {};// = $localStorage.allResults || {};
    return {


        getPersonSummary : function(person,tracks) {
            var personid = person.id;
            var summary = {results:[],clients:[],servers:[],scenarios:[]}

            //get all the results for this person
            angular.forEach(allResults,function (v,k) {
                console.log(v);
                if (v.asserter && v.asserter.id == personid) {
                    summary.results.push(v)
                }

            })

            //get all the clients that this person is a contact for
            allClients.forEach(function (client) {
                console.log(client)
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
                console.log(server)
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
            })


            return summary;

        },

        getTrackResults : function(track) {
            //get a summary object for a track
            var summary = {total : 0, scenario : {}}
            angular.forEach(allResults,function(value,key) {
                if (value.track.id == track.id) {
                    summary.total ++;


                    var scenarioName = value.scenario.name;
                    var scenarioId = value.scenario.id;
                    summary.scenario[scenarioName] = summary.scenario[scenarioName] || {pass:0,fail:0,partial:0,total:0}
                    var item = summary.scenario[scenarioName];
                    item[value.text]++;         //todo - shoudl change the name of 'text'
                    item.total ++;

                }

            })
            return summary;


        },

        makeResultsDownloadObject : function () {
            var obj = {name:'connectathon 17',results:[]};
            angular.forEach(allResults,function(value,key) {
                var lne = {};
                lne.track = value.track.name;
                lne.scenario = value.scenario.name;
                lne.participants = [];

                var p = {name:value.server.server.name,role:value.server.role.name,systemRole:'server'};
                lne.participants.push(p)
                var p = {name:value.client.client.name,role:value.client.role.name,systemRole:'client'};
                lne.participants.push(p)

                /* - leave for when we want to support multiple partipants...
                value.participants.forEach(function (part) {
                    var p = {name:part.participant.name,role:part.role.name,systemRole:part.systemRole};
                    lne.participants.push(p)
                });

                */
                lne.result = value.text;
                lne.note = value.note;
                obj.results.push(lne)

            });
            return obj;
        },

        makeResultsDownload : function () {
            //make an array for downloading results
            var ar = "";
            angular.forEach(allResults,function(value,key) {
                console.log(value);
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

        addNewClient : function(client) {
            var deferred = $q.defer();

            //replace contact details with id
            if (client.contact) {
                var arContact = angular.copy(client.contact);
                client.contactid = [];//.length = 0;
                arContact.forEach(function (c) {
                    client.contactid.push(c.id)
                })
            }

            $http.post("/client",client).then(
                function(data){
                    //now add the client to the cached list...
                    allClients.push(client);
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
            return allClients;
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
        getAllResults : function() {
            return allResults
/*

            var deferred = $q.defer();
            if (allResults) {
                deferred.resolve(allResults)
            } else {

                //var url = "artifacts/clients.json";
                var url = "/client";

                $http.get(url).then(
                    function(data) {
                        allResults = data.data;//.clients;
                        deferred.resolve(allResults)
                    }
                );
            }
            //return deferred.promise;
            return deferred.promise;
            */
           // return $localStorage.allResults
            //return allResults;
        },

        getAllServers : function() {
            return allServers;
            /*
            var deferred = $q.defer();
            if (allServers) {
                deferred.resolve(allServers)
            } else {
                //var url = "artifacts/servers.json";
                var url = "/server";
console.log('read')
                $http.get(url).then(
                    function(data) {
                        allServers = data.data;//.servers;
                        deferred.resolve(allServers)
                    }
                );
            }
            return deferred.promise;
            */
        },
        addNewServer : function(server) {
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
                    allServers.push(server);
                    deferred.resolve(server)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        getScenarioResult : function(scenario,clientRole,serverRole) {

            var key = makeKey(scenario,clientRole,serverRole)

           // var key = scenario.id + "|" + serverRole.server.id + '|' + serverRole.role.id + "|" +
             //   clientRole.client.id + '|' + clientRole.role.id;



            //var key = scenario.id + "|" + server.server.id + "|" + client.client.id;
            return allResults[key]
        },
        addScenarioResult : function(track,scenario,clientRole,serverRole,result) {
            var key = makeKey(scenario,clientRole,serverRole)

          //  var key = scenario.id + "|" + serverRole.server.id + '-' + serverRole.role.id + "|" +
              //  clientRole.client.id + '-' + clientRole.role.id;

            console.log(key);

            result.id = result.id || 'id'+ new Date().getTime();

            //add the participants to the result. In this somple case there is one client and one server
            //todo - leave this for now - consider multi participant in v2...
            //result.participants = result.participants || []
            //result.participants.length = 0;
            //result.participants.push({systemRole:'client',role: client.role,participant:client.client});
            //result.participants.push({systemRole:'server',role: server.role,participant:server.server});

            //todo - not sure if participant is needed here...
            //result.server = {role: serverRole.role,participant:serverRole.server};  //used for download
            //result.client = {role: clientRole.role,participant:clientRole.client};  //used for download

            result.server = {role: serverRole.role,server:serverRole.server};  //used for download
            result.client = {role: clientRole.role,client:clientRole.client};  //used for download

            result.scenario = scenario;
            result.track = track;

            allResults[key] = result;

            console.log(result);

            var resultToSave = {}
            resultToSave.id = result.id;
            resultToSave.text = result.text;
            resultToSave.note = result.note;
            resultToSave.server = {serverid:serverRole.server.id,roleid:serverRole.role.id};
            resultToSave.client = {clientid:clientRole.client.id,roleid:clientRole.role.id};
            resultToSave.scenarioid = scenario.id;
            resultToSave.trackid = track.id;
            if (result.asserter){
                resultToSave.asserterid = result.asserter.id
            }

            $http.put("/result",resultToSave).then(
                function(){

                }, function(err) {
                    alert('error saving result '+angular.toJson(err))
                }
            )



            //$localStorage.allResults = allResults;
        },
        addServerToScenario : function(scenario,server,role) {
            var deferred = $q.defer();

            //create a link object to save on the server
            var link = {active:true,id:'id'+new Date().getTime(),type:'server',serverid:server.id,scenarioid:scenario.id};
            link.roleid = role.id;


            $http.post("/link",link).then(
                function(data){
                    //now add the client to the cached list...
                    scenario.servers = scenario.servers || [];
                    scenario.servers.push({server:server,role:role,link:link});

                    deferred.resolve(link)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );

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
            urls.push({url:'artifacts/scenarios.json',"name":"scenarios"});
            urls.push({url:'artifacts/roles.json',"name":"roles"});
            urls.push({url:'artifacts/tracks.json',"name":"tracks"});
            urls.push({url:'artifacts/persons.json',"name":"persons"});

            urls.push({url:'/client',"name":"clients"});
            urls.push({url:'/server',"name":"servers"});
            urls.push({url:'/result',"name":"results"});
            urls.push({url:'/person',"name":"persons"});

            //urls.push({url:'artifacts/servers.json',"name":"servers"});
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
                    console.log(vo);
                    //allResults = vo.allResults
                    //the session cache for clients & servers.. todo - there's a race between this and getAllServers()...
                    //allServers = vo.servers;
                    //allClients = vo.clients;

                    allPersons = vo.persons;    //scoped to service
                    hashAllPersons = {};
                    allPersons.forEach(function(p){
                        hashAllPersons[p.id] = p;
                    })


                    var hashServer = {};//vo.servers;
                    vo.servers.forEach(function (server) {
                        hashServer[server.id] = server
                        allServers.push(server);
                    });


                    var hashClient = {};//vo.servers;
                    vo.clients.forEach(function (client) {
                        client.contact =[]
                        if (client.contactid) {
                            client.contactid.forEach(function (personid) {
                                client.contact.push(hashAllPersons[personid])
                            })

                        }

                        hashClient[client.id] = client




                        allClients.push(client);        //scoped to the service...
                    });

                    var hashTrack = {};
                    vo.tracks.forEach(function (track) {
                        hashTrack[track.id] = track
                    });

                    //link scenarios to tracks
                    var hashScenario = {};
                    vo.scenarios.forEach(function (scenario) {
                        hashScenario[scenario.id] = scenario
                    });

                    var hashRole = {};
                    vo.roles.forEach(function (role) {
                        hashRole[role.id] = role
                    });

                    var hashPerson = {};
                    vo.persons.forEach(function (person) {
                        hashPerson[person.id] = person
                    });

                    vo.tracks.forEach(function (track) {
                        track.scenarios = [];
                        track.roles = []
                        track.leads = [];
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
                                    scenario.roles = [];
                                    track.scenarios.push(scenario);
                                    if (scenario.roleIds) {
                                        scenario.roleIds.forEach(function (id) {
                                            var role = hashRole[id];
                                            scenario.roles.push(role);
                                            if (track.roles.indexOf(role) == -1) {
                                                track.roles.push(role);
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
                            $http.get("/result?_dummy="+new Date()).then(
                                function(data) {
                                    var results = data.data;    //the results as saved in the database
                                    results.forEach(function(dataResult){
                                        var result = {id:dataResult.id};
                                        result.text = dataResult.text;
                                        result.note = dataResult.note;
                                        result.track = hashTrack[dataResult.trackid];
                                        result.scenario = hashScenario[dataResult.scenarioid];
                                        result.server = {server: hashServer[dataResult.server.serverid],
                                            role: hashRole[dataResult.server.roleid]};
                                        result.client = {client: hashClient[dataResult.client.clientid],
                                            role: hashRole[dataResult.client.roleid]}

                                        if (dataResult.asserterid) {
                                            result.asserter = hashAllPersons[dataResult.asserterid];
                                        }


                                        var key = result.scenario.id + "|" + result.client.client.id + '|' + result.client.role.id +
                                            "|" + result.server.server.id + '|' + result.server.role.id;
                                        //console.log(key);

                                        allResults[key] = result;
                                    })
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
                    console.log(data)
                },
                function(err) {
                    console.log(err)
                }
            )

            console.log(tran)
        }
    }

});