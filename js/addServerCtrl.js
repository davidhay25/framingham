angular.module("sampleApp")
    .controller('addServerCtrl',
        function ($scope,ecosystemSvc,modalService,$http,existingServer,tracks,user) {

            $scope.user = user;
            $scope.tracks = tracks;
            $scope.input = {};
            $scope.input.serverRole = {}
            $scope.saveText = "Add new Server";
            $scope.selectedResourceDef = {};
            $scope.selectResourceDef = function(def) {
                $scope.selectedResourceDef = def;
            }

            var serverExists = false;

            $scope.eventConfig = ecosystemSvc.getEventConfig();

            $scope.checkServerExists = function(hideAlert,serverBase) {

                //this is a duplication, but does set the
            //    if ($scope.input.address.substr(-1) !== '/') {
                //    $scope.input.address += '/';
              //  }

                serverBase = serverBase || $scope.input.address

                if (serverBase.substr(-1) !== '/') {
                    serverBase += '/';
                }


                //proxy the query through the server to avoid CORS being needed...
                let url = '/proxyfhir/' + serverBase + 'metadata';
                //url = '/proxyfhir/' + $scope.input.address + 'metadata';
                //url = $scope.input.address + 'metadata';
                $scope.waiting = true;


                $http.get(url).then(
                    function(data) {
                        if (! hideAlert) {
                            modalService.showModal({},{bodyText:"The CapabilityStatement was returned, so we can update the server specific information. See the 'Server Capability' tab"});

                        }

                        serverExists = true;
                        //console.log(data.data);
                        var cs = data.data;
                        $scope.SMART = {};
                        $scope.fhirVersion = cs.fhirVersion;
                        $scope.CS = cs;


                        //update the description from the CS

                        if ($scope.input.description == "") {
                            if (cs.name) {
                                $scope.input.description += cs.name;
                            }

                            if (cs.description) {
                                $scope.input.description += '\n' + cs.description;
                            }
                        }

                        //$scope.input.description = ""




                        getSMARTEndpoints($scope.SMART,cs);

                        $scope.termOps = getTerminologyOps(cs)



                        //extract key data from the CapabilityStatement
                        $scope.serverDetails = {types:[]};

                        if (cs.rest && cs.rest[0].resource) {
                            cs.rest[0].resource.forEach(function (res) {
                                var item = {type:res.type};
                                item.resource = res;
                                if (res.interaction) {
                                    var cap = "";
                                    res.interaction.forEach(function (int) {
                                        if (int.code == 'search-type') {
                                            cap += 'S'
                                        }
                                        if (int.code == 'read') {
                                            cap += 'R'
                                        }
                                        if (int.code == 'create') {
                                            cap += 'W'
                                        }
                                        if (int.code == 'update') {
                                            cap += 'U'
                                        }
                                        if (int.code == 'history-instance') {
                                            cap += 'H'
                                        }
                                    })
                                    item.cap = cap;
                                }
                                $scope.serverDetails.types.push(item);
                            })
                        }


                    },
                    function(err) {
                        modalService.showModal({},{bodyText:"There was no CapabilityStatement returned from "+url+". Are you sure the address is correct?"});
                    }
                ).finally(function () {
                    $scope.waiting = false;
                })
            };


            if (existingServer) {
                //this is an edit
                $scope.serverId = existingServer.id;
                $scope.editingServer = true;
                serverExists = true;
                $scope.saveText = "Update server";//+ existingServer.name;
                $scope.input.name = existingServer.name;
                $scope.input.notes = existingServer.notes;
                $scope.input.description = existingServer.description ;
                $scope.input.address = existingServer.address ;
                $scope.input.proxy = existingServer.proxy ;
                $scope.input.UIaddress = existingServer.UIaddress ;

                $scope.allHooks = existingServer.allHooks;
                $scope.fhirVersion = existingServer.fhirVersion;
                $scope.SMART = existingServer.SMART;

                $scope.input.isTerminology = existingServer.isTerminology

                $scope.input.tracks = {}
                $scope.input.trackCount = 0
                if (existingServer.tracks) {
                    existingServer.tracks.forEach(function (trackId){
                        $scope.input.tracks[trackId] = true;
                        $scope.input.trackCount++
                    })
                };

                if (existingServer.contact) {
                    $scope.input.contact = existingServer.contact[0];
                    $scope.selectedPerson = existingServer.contact[0];
                } else {
                    $scope.input.contact = ecosystemSvc.getCurrentUser();
                    $scope.selectedPerson = ecosystemSvc.getCurrentUser();
                }

                $scope.input.serverRoleCount = 0;
                if (existingServer.serverRoles) {
                    existingServer.serverRoles.forEach(function (sr) {
                        $scope.input.serverRole[sr.code] = true;
                        $scope.input.serverRoleCount++;
                    })
                }

                //console.log($scope.input.serverRole)
                    if ($scope.input.address) {
                        $scope.checkServerExists(true);     //refresh the cap stmt - don't show any message
                    }


            } else {
                //this is new...
                $scope.input.contact = ecosystemSvc.getCurrentUser();
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
            }


            //retrieve all the terminololoy operations supported by this server
            getTerminologyOps = function(cs) {
                let ar = []
                cs.rest.forEach(function(rest){
                    if (rest.mode == 'server') {
                        //check for system level operations
                        if (rest.operation) {
                            rest.operation.forEach(function(op){
                                let item = {type:"system",name:op.name,definition:op.definition,documentation:op.documentation}
                                ar.push(item)
                            })

                            // ar = ar.concat(resource.operation)
                        }

                        //check for type level operations
                        rest.resource.forEach(function (resource){
                            if (['ValueSet','CodeSystem','ConceptMap'].indexOf(resource.type) !== -1) {
                                if (resource.operation) {
                                    resource.operation.forEach(function(op){
                                        let item = {type:resource.type,name:op.name,definition:op.definition,documentation:op.documentation}
                                        ar.push(item)
                                    })

                                   // ar = ar.concat(resource.operation)
                                }

                            }
                        })
                    }
                })
                console.log(ar)

                return ar
            }


            $scope.searchCodeSystemDEP = function(filter) {
                let qry = "proxyfhir/"+$scope.input.address+"CodeSystem"

                $http.get(qry).then(
                    function(data){
                        $scope.allCS = data.data;
                    },
                    function(err) {
                        modalService.showModal({},{bodyText:'There was no valid response to the call '+url})
                    }
                )

            }


            $scope.contactSelected = function(item){
                $scope.selectedPerson = item;
            };

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]

            $scope.loadHooks = function() {
                //check for any CDS hooks

                var url = 'proxyfhir/'+  addSlash($scope.input.address) + 'cds-services';
                $http.get(url).then(
                    function(data){
                        $scope.allHooks = data.data;
                    },
                    function(err) {
                        modalService.showModal({},{bodyText:'There was no valid response to the call '+url})
                    }
                )
            };


            function addSlash(url) {
                if (url.substr(-1) !== '/') {
                    url += '/';
                }
                return url;
            }


            $scope.checkName = function() {
                //if this is an edit, then don't check for dupes!
                if (existingServer) {
                    return true;
                }

                //tabbed out of empty field
                if (! $scope.input.name) {
                    return true;
                }

                var canAdd = true;
                var allServers = ecosystemSvc.getAllServers();
                allServers.forEach(function (svr) {
                    if (svr.name && (svr.name.toLowerCase() == $scope.input.name.toLowerCase())) {
                        modalService.showModal({},{bodyText:"This server name has already been used. Please use another one."});
                        canAdd = false;
                    }
                });
                return canAdd;
            };

            $scope.addServer = function(){

                serverExists = true;       //temp to allow save without server

                if (serverExists) {     //is there a FHIR server at the configured Url?


                    if (! $scope.selectedPerson) {
                        modalService.showModal({},{bodyText:"It looks like you haven't selected a contact person. You can't save unless there is an actual person selected as a contact for this server. "})
                        return;
                    }


                    var isNewServer = true;
                    var server = {id:'id'+new Date().getTime()};
                    if (existingServer) {
                        server.id = existingServer.id;
                        isNewServer = false;
                    }

                    server.tracks = []

                    Object.keys($scope.input.tracks).forEach(function(key){
                        if ($scope.input.tracks[key]) {
                            server.tracks.push(key)
                        }
                    });

                    server.name = $scope.input.name;
                    server.notes = $scope.input.notes;
                    server.description = $scope.input.description;
                    server.address = $scope.input.address;
                    server.proxy = $scope.input.proxy;
                    server.UIaddress = $scope.input.UIaddress;
                    server.contact = [$scope.selectedPerson];
                    server.fhirVersion = $scope.fhirVersion;
                    server.isTerminology = $scope.input.isTerminology;

                    //now the ecosystem roles
                    server.serverRoles = []
                    console.log($scope.input.serverRole);
                    angular.forEach($scope.input.serverRole,function (v,k) {
                        console.log(v,k)
                        if (v) {
                            server.serverRoles.push({code:k})
                        }
                    });


                    //dont't save the server details - makes the resource large
                    delete server.serverDetails;

                    //May2021 - add the full capstmt. When returning the list of tracke, these will be removed...
                    server.capStmt = $scope.CS;



                    if ($scope.allHooks) {
                        server.allHooks = $scope.allHooks;
                    }

                    if ($scope.SMART){
                        server.SMART = $scope.SMART;
                    }

                    ecosystemSvc.updateServer(server,isNewServer).then(
                        function(data) {
                            $scope.$close()
                        }, function(err) {
                            alert('Error saving server: '+ angular.toJson(err))
                            $scope.$dismiss()
                        }
                    )
                } else {
                    alert("You need to check that the server exists...")
                }



            }


            $scope.disableServer = function() {

                if (confirm("Are you sure you wish to remove this server?")) {
                    existingServer.status = 'deleted'
                    ecosystemSvc.updateServer(existingServer,false).then(
                        function () {
                            $scope.$close()
                        }, function (err) {
                            alert(angular.toJson(err))
                        })
                }

            }


            var getSMARTEndpoints = function(config,capstmt) {
                var smartUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
                try {
                    var extensions = capstmt.rest[0].security.extension;
                    extensions.forEach(function(ext) {
                        if (ext.url == smartUrl) {
                            ext.extension.forEach(function(child){
                                switch (child.url) {
                                    case 'authorize' :
                                        config.authorize = child.valueUri;
                                        break;
                                    case 'token' :
                                        config.token = child.valueUri;
                                        break;
                                    case 'register' :
                                        config.register = child.valueUri;
                                        break;


                                }
                            })
                        }
                    })


                } catch(ex) {
                    return ex
                }



            }

    }
);