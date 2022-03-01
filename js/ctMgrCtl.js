
angular.module("sampleApp")
    .controller('ctMgrCtrl',
        function ($scope,$http) {

            $scope.events = ['cms','test1','test']
            //$scope.events = ['test1','test']

            $scope.input = {}
            $scope.input.code = $scope.events[0];
            $scope.allIGs = []      //all IGs in this event

            $scope.availableIGs = []
            $scope.input.Roletype = 'client'    //default type


            function buildFullIGList() {
                //construct the list of all IG's for this event from the IGs in the tracks
                $scope.hashAllIGs = {}      //This will become
                if ($scope.config.tracks) {
                    $scope.config.tracks.forEach(function (track) {
                        if (track.IGs) {
                            track.IGs.forEach(function (ig) {

                                if (! $scope.hashAllIGs[ig.id]) {
                                    $scope.hashAllIGs[ig.id] = ig
                                }

                            })
                        }
                    })
                }
            }

            function loadEvent (code) {
                delete $scope.selectedTrack;
                console.log('Loading ' + code)
                $scope.waiting = true;
                $http.get('/admin/getConfig/'+code).then(
                    function(data) {
                        console.log(data.data)
                        $scope.config = data.data
                        buildFullIGList()
                    },
                    function (err) {
                        alert(angular.toJson(err))
                    }
                ).finally(function(){
                    $scope.waiting = false;
                })
            }
            loadEvent($scope.input.code)

            $scope.selectEvent = function(code) {
                loadEvent (code)
            }

            $scope.newEvent = function() {
                let key = prompt("Enter the event key")
                if (key) {
                    $scope.input.code = key;
                    delete $scope.selectedTrack;
                    //may allow servers to be added through the UI in the future
                    let config = {key:key,tracks:[],servers:[],clients:[]}
                    //config.servers.push({name:'HAPI R4',description:'The HAPI reference server',address : "http://hapi.fhir.org/baseR4/",UIaddress : "http://hapi.fhir.org/"})

                    $scope.config = config
                    console.log(config)
                }

            }

                /*
            $http.get('/IG').then(
                function(data) {
                    console.log(data.data)
                    $scope.allIGs = data.data;
                }
            )
            */
/*
            $http.get('/admin/servers').then(
                function(data) {
                    console.log(data.data)
                    $scope.allServers = data.data;
                }
            )
            */

            $scope.selectTrack = function (track) {
                $scope.selectedTrack = track
             //   setAvailableIgs()

            }

            //========== add / remove scenarios
            $scope.addScenario = function() {
                $scope.selectedTrack.scenarios = $scope.selectedTrack.scenarios || []
                $scope.selectedTrack.scenarios.push({name:$scope.input.Scenarioname,description:$scope.input.Scenariodescription,id : 'scn' + new Date().getTime()})
                delete $scope.input.Scenarioname;
                delete $scope.input.Scenariodescription
            }
            $scope.removeScenario = function(inx) {
                $scope.selectedTrack.scenarios.splice(inx,1)
            }

            //=========== add / remove roles

            $scope.addRole = function(type) {
                //let type = $scope.input.Roletype;
                let typeName = type + "Roles"
                $scope.selectedTrack[typeName] = $scope.selectedTrack[typeName] || []

                $scope.selectedTrack[typeName].push({name:$scope.input.Rolename, description:$scope.input.Roledescription})

                //$scope.selectedTrack.roles = $scope.selectedTrack.roles || []
                //$scope.selectedTrack.roles.push({name:$scope.input.Rolename,type:$scope.input.Roletype, description:$scope.input.Roledescription})

                delete $scope.input.Rolename;
                delete $scope.input.Roledescription
                $scope.input.Roletype = 'client'
            }
            $scope.removeRole = function(type,inx) {
                let typeName = type + "Roles"

                $scope.selectedTrack[typeName].splice(inx,1)
            }

            //========= add / remove links
            $scope.addLink = function() {
                $scope.selectedTrack.links = $scope.selectedTrack.links || []
                $scope.selectedTrack.links.push({url:$scope.input.linkUrl,description:$scope.input.linkDescription,
                    isBundle:$scope.input.linkIsBundle,name:$scope.input.linkName})
                delete $scope.input.linkUrl;
                delete $scope.input.linkDescription
                delete $scope.input.linkName
            }
            $scope.removeLink = function(inx) {
                $scope.selectedTrack.links.splice(inx,1)
            }



            //========= add / remove datasets
            $scope.addDS = function() {
                $scope.selectedTrack.dataSets = $scope.selectedTrack.dataSets || []
                $scope.selectedTrack.dataSets.push({name:$scope.input.DSname,description:$scope.input.DSdescription,link:$scope.input.DSlink})
                delete $scope.input.DSname;
                delete $scope.input.DSdescription
                delete $scope.input.DSlink
            }
            $scope.removeDS = function(inx) {
                $scope.selectedTrack.dataSets.splice(inx,1)
            }

            // ========== tracks
            $scope.addTrack = function() {
                let name = prompt("Enter the track name")
                if (name) {
                    $scope.selectedTrack = {id : 'trk' + new Date().getTime()}
                    $scope.selectedTrack.trackSubType = "igreview"
                    $scope.selectedTrack.name = name

                    //all tracks have a generic client & server
                    $scope.selectedTrack.clientRoles = [{name:'Client',description:'Generic client'}]
                    $scope.selectedTrack.serverRoles = [{name:'Server',description:'Generic server'}]

                    //and a generic scenario so testing results can be recorded
                    $scope.selectedTrack.scenarios = [{name:"General",description:"General testing",id : 'scn' + new Date().getTime()}]

                    $scope.config.tracks = $scope.config.tracks || []
                    $scope.config.tracks.push($scope.selectedTrack)
                }


            }
            $scope.removeTrack = function(inx) {
                if (confirm("Are you want to remove this track?")) {
                    $scope.config.tracks.splice(inx,1)
                    delete $scope.selectedTrack
                }

            }


/*
            function setAvailableIgs() {
                $scope.selectedTrack.igs = $scope.selectedTrack.igs || []
                $scope.availableIGs.length = 0;
                $scope.allIGs.forEach(function (ig) {
                    let ar = $scope.selectedTrack.igs.filter(item => item.id == ig.id);
                    if (ar.length == 0) {
                        $scope.availableIGs.push(ig)
                    }
                })
            }

            */

            // =========== IGs
            $scope.addIG = function() {
                $scope.selectedTrack.IGs = $scope.selectedTrack.IGs || []

                //see if this IG is already known, using the name as the key
                let newIG;
                let IGname = $scope.input.IGname;
                Object.keys($scope.hashAllIGs).forEach(function (key) {
                    let ig = $scope.hashAllIGs[key]
                    if (ig.name == IGname) {
                        newIG = ig;
                    }
                })

                if (newIG) {
                    //this IG (based on the name) was added to another track
                    $scope.selectedTrack.IGs.push(newIG)
                } else {
                    //this is a new IG
                    let ig = {name:$scope.input.IGname,description:$scope.input.IGdescription,link:$scope.input.IGlink}
                    ig.id = 'ig-'+ new Date().getTime()
                    //$scope.selectedTrack.IGs = $scope.selectedTrack.IGs || []
                    $scope.selectedTrack.IGs.push(ig)
                    $scope.hashAllIGs[ig.id] = ig
                }


                delete $scope.input.IGname;
                delete $scope.input.IGdescription;
                delete $scope.input.IGlink;


            }

            $scope.removeIG = function(inx) {

                $scope.selectedTrack.IGs.splice(inx,1)
                buildFullIGList()
                //setAvailableIgs()
            }


            $scope.save = function () {


                //default servers for all events
                $scope.config.servers = []
                $scope.config.servers.push({name:'HAPI R4',description:'The HAPI reference server',address : "http://hapi.fhir.org/baseR4/",UIaddress : "http://hapi.fhir.org/"})

                //default client for all events
                $scope.config.clients = []
                $scope.config.clients.push({name:'POSTMan',description:'Generic REST client'})



                //create the list of all IG
                $scope.config.IGs = []
                Object.keys($scope.hashAllIGs).forEach(function (key) {
                    $scope.config.IGs.push($scope.hashAllIGs[key])
                })

                $http.put('/admin/putConfig/'+$scope.input.code,$scope.config).then(
                    function(data) {
                        alert("Config has been saved")

                    }, function(err) {
                        alert('error')
                    }
                )
            }

    });
