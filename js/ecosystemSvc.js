angular.module("sampleApp").service('ecosystemSvc', function($q,$http) {

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

    var allServers;
    var allClients;
    var allResults = {};

    //get all currently known servers. For now read the json file - todo: persist as fhir resource



    return {


        getAllClients : function() {
            var deferred = $q.defer();
            if (allClients) {
                deferred.resolve(allClients)
            } else {
                $http.get("artifacts/clients.json").then(
                    function(data) {
                        allClients = data.data.clients;
                        deferred.resolve(allClients)
                    }
                );
            }
            return deferred.promise;
        },

        getAllServers : function() {
            var deferred = $q.defer();
            if (allServers) {
                deferred.resolve(allServers)
            } else {
                $http.get("artifacts/servers.json").then(
                    function(data) {
                        allServers = data.data.servers;
                        deferred.resolve(allServers)
                    }
                );
            }
            return deferred.promise;
        },
        getScenarioResult : function(scenario,client,server) {
            var key = scenario.id + "|" + server.id + "|" + client.id;
            return allResults[key]
        },
        addScenarioResult : function(scenario,client,server,result) {
            var key = scenario.id + "|" + server.id + "|" + client.id;
            allResults[key] = result;
        },
        addServerToScenario : function(scenario,server,role) {

            scenario.servers = scenario.servers || [];
            scenario.servers.push({server:server,role:role});

        },
        addClientToScenario : function(scenario,name) {
            scenario.clients = scenario.clients || [];
            var id = new Date().getTime();
            var client = {id:id,name:name};
            scenario.clients.push(client);
            allClients[client.id] = client;
           // allClients.push(client)
        },
        getConnectathonResources : function() {
            //get scenarios
            var deferred = $q.defer();
            var urls = []
            urls.push({url:'artifacts/scenarios.json',"name":"scenarios"});
            urls.push({url:'artifacts/roles.json',"name":"roles"});
            urls.push({url:'artifacts/tracks.json',"name":"tracks"});
            urls.push({url:'artifacts/persons.json',"name":"persons"});
            //urls.push({url:'artifacts/servers.json',"name":"servers"});
            var vo = {}

            var queries = []

            urls.forEach(function (item) {
                queries.push(
                    $http.get(item.url).then(
                        function(data) {
                            vo[item.name] = data.data[item.name]
                        }
                    )
                );
            });

            $q.all(queries).then(
                function(data) {
                    console.log(vo);
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




                    deferred.resolve(vo);
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


            //var url = 'artifacts/endpoints.json';



            //var url = 'artifacts/endpoints.json';
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