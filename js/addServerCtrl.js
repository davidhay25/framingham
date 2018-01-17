angular.module("sampleApp")
    .controller('addServerCtrl',
        function ($scope,ecosystemSvc,modalService,$http,existingServer) {

            $scope.input = {};
            $scope.input.serverRole = {}
            $scope.saveText = "Add new Server";

            var serverExists = false;

            $scope.eventConfig = ecosystemSvc.getEventConfig();

            if (existingServer) {
                //this is an edit
                serverExists = true;
                $scope.saveText = "Update server";//+ existingServer.name;
                $scope.input.name = existingServer.name;
                $scope.input.description = existingServer.description ;
                $scope.input.address = existingServer.address ;
                $scope.allHooks = existingServer.allHooks;
                $scope.SMART = existingServer.SMART;

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

            } else {
                //this is new...
                $scope.input.contact = ecosystemSvc.getCurrentUser();
                $scope.selectedPerson = ecosystemSvc.getCurrentUser();
            }

            $scope.checkContactSelectionDEP = function() {
                if (! $scope.input.contact) {
                    modalService.showModal({},{bodyText:"It looks like you haven't selected a person. You can't save unless there is an actual person selected as a contact for this server. "})
                }
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

            $scope.checkServerExists = function() {


                if ($scope.input.address.substr(-1) !== '/') {
                    $scope.input.address += '/';
                }

                url = $scope.input.address + 'metadata';
                $scope.waiting = true;
                $http.get(url).then(
                    function(data) {
                        modalService.showModal({},{bodyText:"The CapabilityStatement was returned, so we can update the server specific information"});
                        serverExists = true;
                        //console.log(data.data);
                        var cs = data.data;
                        $scope.SMART = {}
                        getSMARTEndpoints($scope.SMART,cs);
                        //console.log(SMART)


                        //extract key data from the CapabilityStatement
                        $scope.serverDetails = {types:[]};

                        if (cs.rest && cs.rest[0].resource) {
                            cs.rest[0].resource.forEach(function (res) {
                                var item = {type:res.type};
                                if (res.interaction) {
                                    var cap = ""
                                    res.interaction.forEach(function (int) {
                                        if (int.code == 'read') {
                                            cap += 'R'
                                        }
                                        if (int.code == 'create') {
                                            cap += 'W'
                                        }
                                        if (int.code == 'update') {
                                            cap += 'U'
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

            $scope.checkName = function() {
                //if this is an edit, then don't check for dupes!
                if (existingServer) {
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

                    server.name = $scope.input.name;
                    server.description = $scope.input.description;
                    server.address = $scope.input.address;
                    server.contact = [$scope.selectedPerson];

                    //now the ecosystem roles
                    server.serverRoles = []
                    console.log($scope.input.serverRole);
                    angular.forEach($scope.input.serverRole,function (v,k) {
                        console.log(v,k)
                        if (v) {
                            server.serverRoles.push({code:k})
                        }
                    });

                    if ($scope.serverDetails) {
                        server.serverDetails = $scope.serverDetails;
                    }

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