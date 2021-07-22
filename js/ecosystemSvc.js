angular.module("sampleApp").service('ecosystemSvc',
    function($q,$http,modalService,$localStorage,ecoUtilitiesSvc,$filter,moment) {

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

    let profilesCache={} ;

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

    var makeSafeString = function(s) {
        if (s) {
            s = s.replace(/"/g, "'");
            s = s.replace(/,/g, "-");
            //return s;
            return '"' + s + '"';
        } else {
            return "";
        }
    }

    var makeKey = function(scenario,clientRole,serverRole){
        var key = scenario.id + "|" + clientRole.client.id + '|' + clientRole.role.id + "|"+
            serverRole.server.id + '|' + serverRole.role.id;

        return key;
    };

    var allServers = [];
    var allClients = [];
    var allPersons = [];
    var allRoles = [];
    var hashAllPersons = {};
    var eventConfig = {};
    var serverRoleSummary;
    var allResults = {};
    let allIGs = []


    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(search, pos) {
            return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
        };
    }

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

    //copied from builderSvc - could be in a common module
    var objColours ={};
    objColours.Patient = '#93FF1A';
    objColours.Composition = '#E89D0C';
    objColours.List = '#ff8080';
    objColours.Observation = '#FFFFCC';
    objColours.Practitioner = '#FFBB99';
    objColours.MedicationStatement = '#ffb3ff';
    objColours.CarePlan = '#FF9900';
    objColours.Sequence = '#FF9990';
    objColours.CareTeam = '#FFFFCC';
    objColours.Condition = '#cc9900';
    objColours.LogicalModel = '#ff8080';

    objColours.Organization = '#FF9900';
    objColours.ProviderRole = '#FFFFCC';
    objColours.Location = '#cc9900';
    objColours.HealthcareService = '#FFFFCC';
    objColours.MedicationDispense = '#FFFFCC';
    objColours.Composition = '#FFFFCC';
    objColours.Medication = '#FF9900';
    objColours.ActivityDefinition = '#FF9990';
    objColours.PlanDefinition = '#93FF1A';

    //logical models (like Dosage). Might extend to complex datatypes for expanding logical models later on...
    var typeChildren = {}
    $http.get("artifacts/typeChildren.json").then(
        function(data) {
            typeChildren = data.data;
        }
    );

    var textDisplayTemplate;
    $http.get('/artifacts/textDisplayTemplate.json').then(
        function(data) {
            textDisplayTemplate = data.data;

        }
    );

    var pathsCache = {};    //cache for paths by type - ?save in browser cache
    //var reportedTrackWithNoConfserver  = {};      //a
    var IGCacheByServer = {};   //Implementation Guides by server

    return {

        //create a report on results where a track has datasets defined
        createDSReportSummary : function (track) {
            let hash = {}
            if (! track.dataSets || ! track.scenarios) {
                //has to have both datasets and scenarios
                return hash;
            }

            //create the list of all servers that have a result
            //iterate through all the results to get the set of servers used...
            let hashAllResults = this.getAllResults(track)

            //create a hash from the allServers list
            let hashServers = {}
            allServers.forEach(function (svr) {
                hashServers[svr.id] = {server:svr,used:false};
            })

            //find all the servers where there is a result in this track
            Object.keys(hashAllResults).forEach(function(rkey) {
                let result = hashAllResults[rkey]
                hashServers[result.server.id].used = true
            })

            //create a new list that only has the new servers..
            let reportServers = [];
            Object.keys(hashServers).forEach(function (key) {
                if (hashServers[key].used) {
                    reportServers.push(hashServers[key].server)
                }

            })



            let arScenarioId = []       //an array of all the scenarioId's in this track

            //next create the hash keyed on scenarioid + dataset name -
            track.scenarios.forEach(function (scenario) {
                arScenarioId.push(scenario.id)
                track.dataSets.forEach(function (ds) {
                    let key = scenario.id + ds.name
                    let content = {}
                    reportServers.forEach(function (server) {
                        content[server.id] = []    //this will be an array of results for this server
                    })
                    hash[key] = {results:content,scenario:{name:scenario.name},dataSet:{name:ds.name}}
                })
            })




            //now, for each result for each scenario, place an entry in the servers array
            Object.keys(hashAllResults).forEach(function(rkey) {
                let result = hashAllResults[rkey]

                if (result.scenario && result.server && arScenarioId.indexOf(result.scenario.id) > -1) {
                    //this result is for a scenario of interest (ie in this track). Does it reference a dataset?
                    if (result.dataSet) {
                        //yes it does! now we figure out the server and place the result in the right hash element & array
                        let key = result.scenario.id + result.dataSet.name;
                        let line = hash[key]
                        line.results[result.server.id].push(result)
                    }
                }
                
            })

            console.log(hash)

            return {hash: hash,servers: reportServers};

        },



        setProfilesCache : function(cache) {
            profilesCache = cache;
        },

        getIGs : function() {
            return allIGs
        },

        getIGsHash : function() {
            let hash = {}
            if (allIGs && allIGs.length > 0) {
                allIGs.forEach(function (IG) {
                    hash[IG.id] = IG
                })
            }
            return hash
        },

        addIG : function(ig){
            var deferred = $q.defer();
            $http.post("/ig",ig).then(
                function(data){
                    let ar = []


                    allIGs.forEach(function (item) {
                        if (item.id !== ig.id) {
                            ar.push(item)
                        }
                    })

                    ar.push(ig)

                    ciSort(ar,name)
                    allIGs = ar;

                    deferred.resolve(ig)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;

        },

        getIGsDEP : function(serverUrl) {
            var deferred = $q.defer();
            //get all the Implementation Guides on the conformance server
            if (IGCacheByServer[serverUrl]) {
                deferred.resolve(IGCacheByServer[serverUrl]) 
            } else {
                IGCacheByServer[serverUrl] = [];
                var url = serverUrl + 'ImplementationGuide?_count=100';
                $http.get(url).then(
                    function(data) {
                        if (data.data.entry && data.data.entry.length > 0) {

                            data.data.entry.forEach(function (entry) {
                                //?? filter by CF created ??
                                IGCacheByServer[serverUrl].push(entry.resource)
                                
                            })
                        }
                        deferred.resolve(IGCacheByServer[serverUrl])
                    },
                    function(err) {
                        deferred.reject(err)
                    }
                )
            }
            
            return deferred.promise;
        },

        makeDocumentBundle : function(document) {
            //alert('need to fix resource creation' - circular dependencies error...)
            return;
            //construct a document bundle
            var clinFHIRRoot = 'http://clinfhir.com/fhir/';
            var that = this;
            var bundle = {resourceType:'Bundle',type:'document'};
            bundle.id = 'id'+new Date().getTime();
            bundle.identifier = {system:clinFHIRRoot+'NamingSystem',value:'id'+ new Date()};

            bundle.entry = [];
            bundle.entry.push(getEntry(document.composition));
            bundle.entry.push(getEntry(document.patient));
            document.items.forEach(function (item) {
                bundle.entry.push(getEntry(item));
            });

            return bundle;


            function getEntry(item){
                if (item) {
                    var treeData = cofSvc.makeTree($scope.input.table);
                    var vo = that.makeResourceJson(item.baseType,item.id,treeData);
                    if (vo) {
                        var url = "http://clinfhir.com/fhir/"+item.baseType + "/"+item.id;
                        var entry = {fullUrl:url};
                        entry.resource = vo.resource;
                        return entry;
                    } else {
                        return {resourceType:item.baseType,error:'Error creating Json'}
                    }

                }
            }
        },

        makeResourceJson : function (resourceType,id,inTree) {
            //note: calling returns must call var treeData = cofSvc.makeTree($scope.input.table) and pass in as inTree; first!!


            if (!inTree) {
                return {};
            }



            console.log(profilesCache,resourceType)
            //this is a hash of the ed's in the root profiles by path. Used in slicong to ensure the element is multiple
            var hashRootProfile = {}
            if (profilesCache && profilesCache[resourceType] && profilesCache[resourceType].snapshot && profilesCache[resourceType].snapshot.element) {
                profilesCache[resourceType].snapshot.element.forEach(function(entry){
                    hashRootProfile[entry.path] = entry;
                })
                console.log(hashRootProfile)
            }


            var showLog = false;        //for debugging...

            var hashBranch = {};    //will be a hierarchical tree
            var hashById = {};

            //work on a copy as the tree is mutated...
            var tree = angular.copy(inTree);





            try {

                //fri - mark all nodes that are extensions
                tree.forEach(function (branch) {
                    hashById[branch.id] = branch;       //used by simeple extension...
                    if (branch.data && branch.data.ed && branch.data && branch.data.ed.extension) {
                        if (branch.data.ed.extension.length > 0) {
                            //console.log(branch.data.ed.extension[0])

                            branch.data.ed.extension.forEach(function (ex) {
                                if (ex.url == "http://clinfhir.com/fhir/StructureDefinition/simpleExtensionUrl") {
                                    branch.data.extensionUrl = ex.valueString;
                                }
                            })

                        }
                    }
                });


                //now look for complex extensions. The 'parent' is an extension of type 'Backbone element'
                //If any are found, then their child element values are 'collapsed' into the value for the parent & removed
                for (var i = 0; i < tree.length; i++) {
                    var br = tree[i];
                    if (br.data && br.data.extensionUrl) {
                        if (br.data.ed && br.data.ed.type) {
                            if (br.data.ed.type[0].code == 'BackboneElement') {
                                //this is a complex extension. find all the elements where this id is the parent
                                var strucData = {url: br.data.extensionUrl, extension: []}    //the structured value for the extension

                                var parentId = br.id;
                                for (var j = 0; j < tree.length; j++) {
                                    var child = tree[j]
                                    if (child.parent == parentId) {
                                        //this is a direct child (assume only 1 level of nesting
                                        //console.log(child)
                                        var data = child.data.structuredData;
                                        var typ = 'value' + _capitalize(child.data.dt)
                                        if (data) {
                                            var childData = {url: child.text};
                                            childData[typ] = data;
                                            strucData.extension.push(childData);
                                            delete child.data.structuredData;   //this makes it an empty node, so it will be removed later on...
                                        }
                                    }
                                }

                                br.data.structuredData = strucData;
                                br.data.isComplexExtension = true;
                                console.log(br)
                            }
                        }
                    }
                }


                //run through a pattern of creating a hierarchy, then removing all empty leaf nodes.
                //need to complete until all leaf nodes are removed (can take multiple iterations
                var cleaning = true;
                var cnt = 0;        //a safety mechanism to avoid getting locked in a loop
                while (cleaning) {
                    hashBranch = {};    //will be a hierarchical tree
                    hashBranch['#'] = {id: '#', branch: {data: {}}, children: []};

                    cleaning = false;
                    cnt++;

                    //build a version of the hierarchy...
                    tree.forEach(function (branch) {
                        var branchEntry = {id: branch.id, branch: branch, children: []};
                        hashBranch[branch.id] = branchEntry;
                        if (branch.parent) {
                            var parent = hashBranch[branch.parent];
                            parent.children.push(branchEntry)
                        }
                    });

                    //now create a hash of all empty leaf nodes...
                    var idsToDelete = {}
                    angular.forEach(hashBranch, function (v, k) {

                        //todo text node doesn't have data for some reason....
                        v.branch.data = v.branch.data || {};
                        if (v.children.length == 0 && !v.branch.data.structuredData) {
                            if (k !== '#') {
                                idsToDelete[k] = true;
                                cleaning = true;    //if any are found, then re-set the flag so there will be another iteration
                            }
                        }
                    });

                    //if there were any leaf nodes found, build a new table with non-empty nodes
                    if (cleaning) {
                        var newTree = [];
                        tree.forEach(function (branch) {
                            if (!idsToDelete[branch.id]) {
                                newTree.push(branch)
                            }
                        });
                        tree = newTree;
                    }

                    //the safety...
                    if (cnt > 10) {
                        cleaning = false;
                        console.log('forced quit...')
                    }
                }


                if (showLog) {
                    console.log(hashBranch)
                }

                var displayList = [];

                /* Don't delete for the moment - may be useful in debugging...

                //create a display for the object passed to the rendering routine...

                angular.forEach(hashBranch,function(v,k){
                    var item = {id:v.id,path:v.branch.text,children:[]}
                    v.children.forEach(function(child){

                        var o = hashBranch[child.id]

                        item.children.push({id:child.id,path:o.branch.text})


                    })
                    displayList.push(item)
                })

    */


                //render the resource
                var resource = {resourceType: resourceType}
                resource.extension = [];        // add the root extension so it's at the top...
                if (id) {
                    resource.id = id;
                }


                var simpleElements = {};        //a hash os simple elements. Needed to fix extensions on them...
                addChildren(resource, hashBranch['#'], resource);

                //if there are no extensions, then remove the element...
                if (resource.extension.length == 0) {
                    delete resource.extension;
                }

                //need to fix extensions on simple types


                return {resource: resource, displayList: displayList};

            } catch (ex) {
                console.log(ex);
                let msg = 'There was an error creating the Resource Json and it will be empty. The error can be ignored (but do tell David Hay)';
                msg += ex.message;
                return {resource: {msg:msg}, displayList: displayList};
            }



            function addChildren(obj,node,parentOfObj) {
                if (showLog) {console.log('invoking function',node.branch.text, obj,node)}

                var addElement = true;
                var structuredData = angular.copy(node.branch.data.structuredData) || {}
                topEleName = node.branch.text;      //the name of the node we are adding

                //added 2019-01-09 to support slicing...
                if (node && node.branch && node.branch.data) {
                    let fhirMapping = node.branch.data.fhirMapping
                    //console.log(fhirMapping)
                    if (fhirMapping && fhirMapping.map) {
                        let ar = fhirMapping.map.split('.')
                        let mappedName = ar[ar.length-1];
                        if (mappedName !== 'extension') {

                           // if ()
                            topEleName = mappedName;
                            //see if the path in the root profile is multiple.
                            if (hashRootProfile && hashRootProfile[fhirMapping.map])  {
                                if (hashRootProfile[fhirMapping.map].max == '*') {
                                    node.branch.data.isMultiple = true;
                                    console.log('mult')
                                }

                            }
                        }
                    }
                }


                if (topEleName && topEleName.indexOf('[x]') > -1) {
                    //topEleName = topEleName.substr(0, topEleName.length - 3) + _capitalize(node.branch.data.sdDt);
                    topEleName = topEleName.substr(0, topEleName.length - 3) + _capitalize(node.branch.data.dt);
                }

                //fri
                //if there's an extensionUrl (added above), then change the name to 'extension'
                if (node.branch.data.extensionUrl) {
                    topEleName = 'extension';




                    //var oldStructuredData = angular
                    if (node.branch.data.isComplexExtension) {
                        //complex extensions have the complete structured data (including children) set above
                        structuredData = angular.copy(node.branch.data.structuredData)
                    } else {
                        structuredData = {url: node.branch.data.extensionUrl};
                        var typ = 'value' + _capitalize(node.branch.data.dt);     //datatype

                        structuredData[typ] = angular.copy(node.branch.data.structuredData)
                    }


                    //if the parent is a simple datatype, then the name is _{elementname}
                    var parent = hashById[node.branch.parent];
                    //console.log(parent)

                    if (parent) {
                        var ldt = parent.data.dt;
                        if (ldt) {
                            var t = ldt.substr(0,1)
                            if (t.toLowerCase() == t) {
                                //console.log('is lc')
                                topEleName = "_"+  parent.data.display;
                                var id = new Date().getTime()
                                parentOfObj[topEleName] = {"id":id,extension:[structuredData]};  //assume only 1...
                                addElement = false;     //prevent the extension from being added directlt yo the element...
                            }
                        }
                    }



                }

                if (addElement) {
                    if (topEleName) {


                        //determine if this is a multiple element, or a single object...
                        var isMultiple = false;
                        if (node.branch.data.isMultiple || topEleName == 'extension') {
                            isMultiple = true;
                        }


                        //todo - this isn't being set correctly in the LM...
                        if (node.branch.data.ed && node.branch.data.ed.base) {
                            if (node.branch.data.ed.base.max == '*') {
                                isMultiple = true;
                            }
                            console.log(node.branch.data.ed.base,structuredData)
                        }
/*

                        //if there's already a value with this name, then convert it to an array. Used for slicing
                        //todo THis shoul dreally be properly fixed by setting the base correcrtly...
                        if (obj[topEleName]) {
                            let tmp = obj[topEleName];
                            delete obj[topEleName];
                            obj[topEleName] = [tmp]
                            isMultiple = true
                        }

                        */

                        if (isMultiple) {
                            console.log(obj[topEleName])
                            obj[topEleName] = obj[topEleName] || []

                            //there's an error where the code is not property recognizing that this element
                            //is multiple eg Composition.section.entry. This fixes it (todo - see if the root issue can be fixed)
                            //Discard the original value...
                            if (! angular.isArray(obj[topEleName])){
                                let t = obj[topEleName];
                                obj[topEleName] = [];
                                //obj[topEleName].push(t)
                            }


                            obj[topEleName].push(structuredData)

                        } else {




                            obj[topEleName] = structuredData;
                            //addChildren(structuredData,newChild)
                        }
                    } else {
                        structuredData = obj
                    }
                    if (node.children.length > 0) {
                        node.children.forEach(function (child,inx) {
                            if (showLog) {console.log('processing child#' + inx,child)};
                            addChildren(structuredData,child,obj)

                        })
                    }
                }
                if (showLog) {console.log(obj,topEleName)};
                //If there is no "node.branch.text", then this is the first invokation - the resource root.
                //set the "structuredData" object to the root, so that subsequent children are added to it directly...



            }



            function _capitalize(str) {
                if (str) {
                    return (str.charAt(0).toUpperCase() + str.slice(1));
                }

            }

        },

        makeResourceJsonV2DEP : function (resourceType,id,inTree) {
            var showLog = true;        //for debugging...

            var hashBranch = {};    //will be a hierarchical tree
            hashBranch['#'] = {id:'#',branch:{data:{}},children:[]};

            //work on a copy as the tree is mutated...
            var tree = angular.copy(inTree);

            //run through a pattern of creating a hierarchy, then removing all empty leaf nodes.
            //need to complete until all leaf nodes are removed (can take multiple iterations
            var cleaning = true;
            var cnt = 0;        //a safety mechanism to avoid getting locked in a loop
            while (cleaning) {
                var hashBranch = {};    //will be a hierarchical tree
                hashBranch['#'] = {id:'#',branch:{data:{}},children:[]};

                cleaning = false;
                cnt++;

                //build a version of the hierarchy...
                tree.forEach(function (branch) {
                    var branchEntry= {id:branch.id,branch:branch,children:[]};
                    hashBranch[branch.id] = branchEntry;
                    if (branch.parent) {
                        var parent = hashBranch[branch.parent];
                        parent.children.push(branchEntry)
                    }
                });



                //now create a hash of all empty leaf nodes...
                var idsToDelete = {}
                angular.forEach(hashBranch,function(v,k){
                    console.log(v.branch)
                    //todo text node doesn't have data for some reason....
                   // v.branch.data = v.branch.data || {}

                    if (v.children.length == 0 && ! v.branch.data.structuredData) {
                        if (k !== '#') {
                            idsToDelete[k] = true;
                            cleaning = true;    //if any are found, then re-set the flag so there will be another iteration
                        }
                    }
                });



                //if there were any leaf nodes found, build a new table with non-empty nodes
                if (cleaning) {
                    var newTree = [];
                    tree.forEach(function (branch) {
                        if (! idsToDelete[branch.id]) {
                            newTree.push(branch)
                        }
                    });
                    tree = newTree;
                }

                //the safety...
                if (cnt > 10) {
                    cleaning = false;
                    console.log('forced quit...')
                }
            }


            if (showLog) {console.log(hashBranch)}

            var displayList =[]
            /* Don't delete for the moment - may be useful in debugging...

            //create a display for the object passed to the rendering routine...

            angular.forEach(hashBranch,function(v,k){
                var item = {id:v.id,path:v.branch.text,children:[]}
                v.children.forEach(function(child){

                    var o = hashBranch[child.id]

                    item.children.push({id:child.id,path:o.branch.text})


                })
                displayList.push(item)
            })

*/


            //render the resource
            var resource = {resourceType:resourceType}
            addChildren(resource,hashBranch['#']);

            return {resource: resource,displayList:displayList};





                function addChildren(obj,node) {

                    if (showLog) {console.log('invoking function',node.branch.text, obj,node)}

                    var structuredData = angular.copy(node.branch.data.structuredData) || {}
                    topEleName = node.branch.text
                    if (showLog) {console.log(obj,topEleName)};
                    //If there is no "node.branch.text", then this is the first invokation - the resource root.
                    //set the "structuredData" object to the root, so that subsequent children are added to it directly...
                    if (topEleName) {
                        if (node.branch.data.isMultiple) {
                            obj[topEleName] = obj[topEleName] || []
                            obj[topEleName].push(structuredData)

                        } else {
                            obj[topEleName] = structuredData;
                            //addChildren(structuredData,newChild)
                        }
                    } else {
                        structuredData = obj
                    }
                    if (node.children.length > 0) {
                        node.children.forEach(function (child,inx) {
                            if (showLog) {console.log('processing child#' + inx,child)};
                            addChildren(structuredData,child)

                        })
                    }
                }

        },

        makeResourceJsonV1DEP : function (type,id,table) {
            //construct the json for a single resource based on the table from the tblResourceDir

            if (! table) {
                return {resource:{resourceType:type,id:id},data:[]};

            }

            try {
                //hide exceptions for now...
                var data = []
                //var resource = {resourceType:$scope.input.type};
                var resource = {resourceType: type, id: id};
                var previousEle = {};
                var parentElement, grandParentElement;
                table.forEach(function (row, index) {
                    if (row.structuredData) {
                        data.push(row);

                        var structuredDataClone =row.structuredData;// angular.copy(row.structuredData);
                        var path = row.realPath || row.path;
                        var ar = path.split('.');
                        switch (ar.length) {
                            case 1:
                                //this is off the root
                                var eleName = ar[0];
                                if (eleName.indexOf('[x]') > -1) {
                                    eleName = eleName.substr(0, eleName.length - 3) + _capitalize(row.sdDt);
                                }

                                parentElement = structuredDataClone;// row.structuredData; //because it could be a parent...
                                //check for an extension off the root
                                if (row.fhirMapping && row.fhirMapping.map) {

                                    var ar = row.fhirMapping.map.split('.');
                                    if (ar[0] == 'extension') {
                                    //if (row.ed.meta && row.ed.meta.isExtension){

                                        //this is an extension
                                        resource.extension = resource.extension || [];
                                        var ext = {}
                                        ext.url = row.fhirMapping.url
                                        var dt = row.type[0].code;
                                        dt = 'value' + dt.charAt(0).toUpperCase() + dt.substr(1);
                                        ext[dt] = structuredDataClone;//row.structuredData;
                                        resource.extension.push(ext)
                                    } else {
                                        //this isn't
                                        if (row.max == 1) {
                                            resource[eleName] = parentElement;
                                        } else {
                                            resource[eleName] = resource[eleName] || [];
                                            resource[eleName].push(parentElement)
                                        }
                                    }
                                } else {
                                    //there's no mapping - save the data under the element name
                                    //... but not if the structuredData is an empty array - as this will be a BBE - like Patient.contact
                                    //???? should we look for a BBE specifically???
                                    if (angular.isArray(row.structuredData) && row.structuredData.length ==0) {
                                        //this is the empty array for the bbe
                                        resource[eleName] = parentElement;
                                    } else {
                                        //
                                        if (row.max == 1) {
                                            resource[eleName] = parentElement;
                                        } else {
                                            resource[eleName] = resource[eleName] || [];
                                            resource[eleName].push(parentElement)
                                        }
                                    }
                                }

                                break;
                            case 2: {
                                //if the

                               // break;
                                var parentEleName = ar[0];      //the parent element name

                                //var parent = resource[parentEleName];


                                var eleName = ar[1];
                                if (eleName.indexOf('[x]') > -1) {
                                    eleName = eleName.substr(0, eleName.length - 3) + _capitalize(row.sdDt);
                                }

                                // grandParentElement = {}; //because it could be a grand parent...
                                // grandParentElement[eleName] = row.structuredData;

                                //var node = parentElement[0];
                                //node[eleName] = row.structuredData;

                                var grandParentElement;
                                if (parentElement) {
                                    //for now, we assume this is an array. We want the latest element..
                                    if (parentElement.length == 0) {
                                        //var el = {}
                                        grandParentElement = {};
                                        parentElement.push(grandParentElement)
                                    } else {
                                        grandParentElement = parentElement[parentElement.length -1 ]
                                    }
                                    grandParentElement[eleName] = structuredDataClone;//angular.copy(row.structuredData);
                                    /*
                                    grandParentElement = parentElement[0]; //because it could be a grand parent...
                                    if (grandParentElement) {
                                        grandParentElement[eleName] = row.structuredData;
                                    }
                                    */
                                }


                                /*
                                                                if (row.max == 1) {
                                                                    parentElement[eleName] = grandParentElement;
                                                                } else {
                                                                    parentElement[eleName] =  resource[eleName] || [];
                                                                    parentElement[eleName].push(grandParentElement)
                                                                }
                                */
                                break;
                            }
                        }
                    }
                });

                return {resource: resource,data:data};

            } catch (ex) {
                console.log(ex)
                return {error: ex}
            }

            function _capitalize(str) {
                return (str.charAt(0).toUpperCase() + str.slice(1));
            }

        },

        makeResourceText : function(currentJson) {
            //generate the text for a resource from the structured data.
            if (currentJson) {
                var json = angular.fromJson(currentJson);
                var baseType = json.resourceType;
                var arDisplay = [];
                textDisplayTemplate.forEach(function (lne) {
                    if (lne.type == baseType) {
                        var v = json[lne.path];
                        if (v) {
                            if (angular.isArray(v)) {
                                v.forEach(function (el) {
                                    arDisplay.push("<div>" + lne.display + " "+ fromDT(lne.dt,el) + "</div>")
                                })
                            } else {
                                arDisplay.push("<div>" + lne.display + " "+ fromDT(lne.dt,v)+ "</div>")
                            }

                        }
                    }
                });

                var text = arDisplay.join('\n');

               // text = "<div xmlns='http://www.w3.org/1999/xhtml'>"+ text + "</div>"

                console.log(text)



                return text;

                function fromDT(dt,v) {
                    if (! dt) {
                        return v;
                    }


                    var txt="";
                    switch (dt) {
                        case "Identifier" :
                            return v.system + "|" + v.value;
                            break;
                        case "cc" :
                            if (v.text) { return v.text;}
                            if (v.Coding) {
                                var vv = v.Coding[0];       //firts one only
                                return vv.display;
                            }


                            break;
                        case "reference" :
                            return v.display;
                            break;
                        case "dateTime" :
                            return moment(v).format('YYYY-MM-DD h:mm a');
                            break;
                        case "HumanName" :
                            if (v.text) {
                                return v.text
                            } else {
                                if (v.given) {
                                    v.given.forEach(function(s) {txt += s + " "})
                                }
                                if (v.family) {
                                    txt += v.family + " ";
                                }

                                return txt;
                            }


                            break;
                    }
                }
            }

        },

        makeAllScenarioSummaryDEP : function(allScenarioGraphs,tracks) {
            //allScenarioGraphs are and index of all the graphs in the database collection 'scenarioGraph'. Only has id, name, userdid & scenarioid
            var deferred = $q.defer();
            var that = this;

            //construct a hash of scenarioId from the tracks...
            var hashScenarioId = {};
            tracks.forEach(function (track) {
                track.scenarios.forEach(function (scenario) {
                    hashScenarioId[scenario.id] = {track:track,scenario:scenario}
                })
            });




            var queries = []


            //now construct the summary object...
            var hashResourceType = {};
            allScenarioGraphs.forEach(function (graph) {

                var vo = hashScenarioId[graph.scenarioid];

               // graph.user = that.getPersonWithId(graph.userid);


                if (vo) {

                    queries.push(processOneGraph(graph,vo))

                    /*
                    if (graph.items) {
                        graph.items.forEach(function (item) {
                            hashResourceType[item.type] = hashResourceType[item.type] || [];

                            if (item.notes && item.table) {
                                //there are notes for this item (== resource)
                                //create a hash of id for this item
                                var hashId = {};
                                item.table.forEach(function (row) {
                                    hashId[row.id] = row;
                                });

                                angular.forEach(item.notes, function (note, id) {

                                    var lne = {
                                        user: graph.user,
                                        path: hashId[id].path,
                                        note: note,
                                        scenario: vo.scenario,
                                        track: vo.track
                                    };
                                    hashResourceType[item.type].push(lne)
                                })

                            }

                        })
                    } */
                }
            });




            if (queries.length > 0) {
                //hashResourceType gets updated by processOneGraph()
                $q.all(queries).then(
                    function(){
                        angular.forEach(hashResourceType,function(value,key){
                            value.sort(function(a,b){
                                if (a.path < b.path) {
                                    return -1
                                } else {return 1}
                            })
                        })
                        deferred.resolve(hashResourceType)
                    },
                    function(err) {
                        //shouldn't be any errors ATM
                        deferred.resolve(hashResourceType)
                    }
                )




            } else {
                deferred.resolve(hashResourceType)
            }





            return deferred.promise;

            //return hashResourceType;

            function processOneGraph(graph,vo) {
                var deferred = $q.defer();
                var url = "oneScenarioGraph/"+graph.id;
                $http.get(url).then(
                    function(data) {
                        var completeGraph = data.data;  //includes the items...
                        completeGraph.user = that.getPersonWithId(graph.userid);
                        updateSummary(completeGraph,vo);
                        deferred.resolve();
                    }, function(err) {
                        //just swallow errors for now
                        deferred.resolve();
                    }
                );


                return deferred.promise;

            }

            function updateSummary(graph,vo) {
                if (graph.items) {
                    graph.items.forEach(function (item) {
                        hashResourceType[item.type] = hashResourceType[item.type] || [];

                        if (item.notes && item.table) {
                            //there are notes for this item (== resource)
                            //create a hash of id for this item
                            var hashId = {};
                            item.table.forEach(function (row) {
                                hashId[row.id] = row;
                            });

                            angular.forEach(item.notes, function (note, id) {

                                var lne = {
                                    user: graph.user,
                                    path: hashId[id].path,
                                    note: note,
                                    scenario: vo.scenario,
                                    track: vo.track
                                };
                                hashResourceType[item.type].push(lne)
                            })

                        }

                    })
                }
            }


        },
        objColours : function(){
            return objColours;
        },
        getPersonWithId : function(id) {
            return hashAllPersons[id]
        },
        getScenarioWithId : function(id) {
            console.log(this.eventConfig);
        },

        getAllPathsForType: function (typeName,explode,track) {

            var that = this;

            var confServer = "http://fhirtest.uhn.ca/baseDstu3/"; //default to HAPI...
            if (track &&  track.confServer) {
                confServer = track.confServer;

            } else {
               console.log('no conf server specified, using default: '+ confServer)

            }

            var deferred = $q.defer();
            //return all the possible paths for a base type...
            //derived from logicalmodelsvc

            if ( pathsCache[typeName]) {

                deferred.resolve(pathsCache[typeName])

            } else {
                var url = "http://hl7.org/fhir/StructureDefinition/" + typeName;

                ecoUtilitiesSvc.findConformanceResourceByUri(url,confServer).then(
                    function (SD) {
                        if (SD && SD.snapshot && SD.snapshot.element) {
                            var lst = [], hash={}, dtDef = {};
                            SD.snapshot.element.forEach(function (ed) {
                                var path = ed.path;

                                var ar = path.split('.');
                                ar.splice(0,1);
                                path = ar.join('.')

                                lst.push(path)
                                hash[path] = ed;
                                if (ed.type && explode) {
                                    //see if this is a FHIR logical model (like dosage). If so, add the child nodes
                                    //may want to do this for codeableconcept and others as well...
                                    var typ = ed.type[0].code;
                                    if (typeChildren[typ]) {
                                        typeChildren[typ].forEach(function(child){
                                            lst.push(path + "." + child.name)
                                            hash[path] = ed;
                                        })
                                    }
                                }
                            });

                            var vo = {list:lst,hash:hash,dtDef:typeChildren};
                            pathsCache[typeName] = vo;
                            deferred.resolve(vo);
                        }

                    }, function (err) {
                        var msg = "I was unable to retrieve the conformance resource: " + url + " from " + confServer +
                            ". Is it on-line, and accepting CORS requests?";
                        modalService.showModal({},{bodyText:msg})
                       // alert("error with query: " + url + "\n" + angular.toJson(err));
                        deferred.reject();
                    }
                );

            }

            return deferred.promise;

        },
        updateTrackRoles : function(track) {
            var hash = {};      //hash of the roles in the track...
            track.roles = track.roles || []
            track.roles.length = 0;
            track.scenarios.forEach(function(scenario){
                scenario.roles.forEach(function(role){
                    if (!hash[role.id]) {
                        hash[role.id] = role;
                        track.roles.push(role)
                    }
                })
            })

        },
        addNewRole : function(roleName,roleDescription,type,track) {
            var deferred = $q.defer();
            var role = {name:roleName,description:roleDescription, id:'role-'+new Date().getTime()};
            role.role=type;

            if (track) {
                role.trackId = track.id;
            }
            //console.log(role)

            $http.post("/config/role",role).then(
                function(data){
                    allRoles.push(role);
                    deferred.resolve(role)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },
        getAllRoles : function() {
            return allRoles;
        },
        allResultsCount : function() {
            return Object.keys(allResults).length;
        },
        deleteResultDEP : function(rslt) {
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
            if (eventConfig && eventConfig.serverRoles) {
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
            }

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
            //get the key to the current event from eventConfig
            var key = eventConfig.key;
            $localStorage.ecoCurrentUser = $localStorage.ecoCurrentUser || {};

            //save the user object...
            $localStorage.ecoCurrentUser[key] = user


        },

        setCurrentUserAndDbDEP : function(vo){
            if (vo) {
                $localStorage.ecoCurrentUserAndDb = vo;
            } else {
                delete $localStorage.ecoCurrentUserAndDb;
            }

        },

        getCurrentUser : function () {
            if (eventConfig) {
                var key = eventConfig.key;      //the current event...
                if ($localStorage.ecoCurrentUser) {
                    if ($localStorage.ecoCurrentUser[key]) {
                        return $localStorage.ecoCurrentUser[key];// .name;
                    }

                }
            }

        },
        getCurrentUserAndDbDEP : function () {
            //if ($localStorage.ecoCurrentUserAndDb) {
                return $localStorage.ecoCurrentUserAndDb;
            //}

        },

        clearCurrentUser : function(){

            if ($localStorage.ecoCurrentUser) {
                var key = eventConfig.key;      //the current event...
                delete $localStorage.ecoCurrentUser[key];
                /*
                if ($localStorage.ecoCurrentUser[key]) {

                    return $localStorage.ecoCurrentUser[key];// .name;
                }
                */

            }
            //delete $localStorage.ecoCurrentUserAndDb;
        },
        updatePerson : function(person) {
            var that = this;
            var deferred = $q.defer();
            delete person.tokens;                           //authtokens - like touchstone
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
                    that.setCurrentUser(person);     //update the copy in $localStorage this is a top level property


                    allPersons.sort(function(a,b){
                        if (a.name < b.name) {
                            return -1
                        } else {
                            return 1
                        }
                    });
                    deferred.resolve(person)
                }, function(err) {
                    console.log(err);
                    deferred.reject(err)
                }
            );
            return deferred.promise;
        },

        //get the summary for a single person
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

        getIGResults : function() {
            //generate a summary for all IGs
            let result = {}
            allIGs.forEach(function (IG) {
                result[IG.id] = angular.copy(IG)
                result[IG.id].results = []
            })

            angular.forEach(allResults,function(value,key) {
                if (value.IG) {
                    let igId = value.IG.id //the id of the IG
                    let detail = {}
                    if (value.asserter) {
                        detail.asserter = {name: value.asserter.name, id : value.asserter.id};
                    } else {
                        detail.asserter = {name:'Unknown'}
                    }

                    detail.result = value.text;
                    detail.note = value.note;
                    detail.id = value.id;       //the Id of the test
                    detail.track = {name:value.track.name}
                    detail.scenario = {name:value.scenario.name}
                    if (value.server) {
                        detail.server = {name:value.server.name}
                    }
                    if (value.client) {
                        detail.client = {name:value.client.name}
                    }

                    result[igId].results.push(detail)
                }
            })
            return result
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

                        let note = value.note || "";
                      //  if (value.note) {
                            summary.notes.push({asserter:value.asserter,note:note,
                                date:value.issued,text:value.text,scenarioName:scenarioName})
                       // }
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

        makeServersDownloadObject : function () {

            var download = "Name,Url,Description,Notes\n";

            allServers.forEach(function (svr){
                let lne = ""
                lne += makeSafeString(svr.name) + ','
                lne += makeSafeString(svr.address) + ','
                lne += makeSafeString(svr.description) + ','
                lne += makeSafeString(svr.nodes)

                download += lne + "\n";
            })

          return download


        },

        makeResultsDownloadObject : function (track) {
            //if track specified, then only include results for that track...
            let report = []
            var download = "Scenario,DataSet,Server,Client,Asserter,Result,Note,IG\n";


            //(key,result) in ecosystemSvc.getAllResults(selectedTrack)

            angular.forEach(this.getAllResults(track),function(result,key) {

                let lne = ""

                if (result.scenario) {
                    lne += makeSafe(result.scenario.name) + ",";
                } else {
                    lne += ","
                }

                if (result.dataSet) {
                    lne += makeSafe(result.dataSet.name) + ",";
                } else {
                    lne += ","
                }

                if (result.server) {
                    lne += makeSafe(result.server.name) + ",";
                } else {
                    lne += ","
                }

                if (result.client) {
                    lne += makeSafe(result.client.name) + ",";
                } else {
                    lne += ","
                }

                if (result.asserter) {
                    lne += makeSafe(result.asserter.name) + ",";
                } else {
                    lne += ","
                }


                lne += makeSafe(result.text) + ",";
                lne += makeSafe(result.note) + ",";


                if (result.IG) {
                    lne += makeSafe(result.IG.name)
                } else {
                    //it's the last col...  lne += ","
                }


                download += lne + "\n";

            })

            return download;


            function makeSafe(s) {
                if (s) {
                    s = s.replace(/"/g, "'");
                    s = s.replace(/,/g, "-");
                    //return s;
                    return '"' + s + '"';
                } else {
                    return "";
                }
            }
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

        addScenarioResult : function(track,scenario,result) {
            //addScenarioResult : function(track,scenario,clientRole,serverRole,result) {
            result.id = result.id || 'id'+ new Date().getTime();
            let allPersons = this.getAllPersons();

            result.scenario = scenario;
            result.track = track;
            result.track.resultTotals = result.track.resultTotals || {};
            result.track.resultTotals[result.text] = result.track.resultTotals[result.text] || 0;
            result.track.resultTotals[result.text]++;

            //allResults[key] = result;
            allResults[result.id] = result;

            var resultToSave = {};
            resultToSave.id = result.id;
            resultToSave.type = result.type;
            resultToSave.text = result.text;
            resultToSave.note = result.note;
            resultToSave.IG = result.IG;
            resultToSave.dataSet = result.dataSet;
            resultToSave.serverRole = result.serverRole.name
            resultToSave.clientRole = result.clientRole.name

            if (result.server) {
                //result.server is the server object
                let serverStore = {serverid : result.server.id, name : result.server.name}; //don't want the full server object
                resultToSave.server = serverStore; //serverid:result.server.server.id,roleid:result.server.role.id,name:result.server.server.name};
            }

            if (result.client) {
                let clientStore = {clientid: result.client.id, name:result.client.name}
                resultToSave.client = clientStore;
            }


            resultToSave.scenarioid = scenario.id;
            resultToSave.trackid = track.id;
            resultToSave.trackers = result.trackers;
            if (result.asserter){
                resultToSave.asserterid = result.asserter.id    //todo - should this be the whole object (like author)???
                let person = hashAllPersons[resultToSave.asserterid]
                if (person) {
                    resultToSave.asserter = {id:resultToSave.asserterid,name:person.name,contact:person.contact}
                }


            }



            $http.put("/result",resultToSave).then(
                function(){

                }, function(err) {
                    alert('error saving result '+angular.toJson(err))
                }
            )

        },

        addServerToScenarioDEP : function(arScenario,server,role) {
            //add the server and role to an array of scenarios...
            var deferred = $q.defer();

            //create a link object to save on the server

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
        removeServerFromScenarioDEP : function(scenario,serverRole) {
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

        addClientToScenarioDEP : function(scenario,client,role) {
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

        removeClientFromScenarioDEP : function(scenario,clientRole) {
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
            urls.push({url:'artifacts/persons.json',"name":"persons"});

            urls.push({url:'/config/track?ts='+ new Date().getTime(),"name":"tracks"});
            urls.push({url:'/config/scenario',"name":"scenarios"});
            urls.push({url:'/config/role',"name":"roles"});

            urls.push({url:'/IG',"name":"igs"});

            urls.push({url:'/client',"name":"clients"});
            urls.push({url:'/server',"name":"servers"});
            urls.push({url:'/result',"name":"results"});
            urls.push({url:'/person',"name":"persons"});

           // urls.push({url:'/scenarioGraph',"name":"scenarioGraph"});

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

                    //all scoped to the service...
                    allClients.length = 0;
                    allServers.length = 0;
                    allRoles.length = 0;
                    allPersons = vo.persons;    //scoped to service
                    ciSort(allPersons,'name');

                    console.log(vo.igs)
                    allIGs = vo.igs;
                    ciSort(allIGs,'name')
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


                        //the scenario object in the server can have a stale copy of the servers & clients associated with it...
                        delete scenario.servers;
                        delete scenario.clients;

                        hashScenario[scenario.id] = scenario
                    });

                    var hashTrack = {};
                    vo.tracks.forEach(function (track) {

                        track.trackType = track.trackType || 'technical' ;      //default to technical

                        track.resultTotals = {'pass':0,'fail':0,'partial':0,'note':0}
                        hashTrack[track.id] = track

                        //this occurs when the track definition has embedded scenarios, rather than referring to seperate scenarios...
                        if (track.scenarios) {
                            track.scenarios.forEach(function (sc) {
                                hashScenario[sc.id] = sc
                            })
                        }

                    });
                    ciSort(vo.tracks,'name');


                    //link scenarios to tracks
                    var hashRole = {};


                    allRoles = vo.roles;

                    vo.roles.forEach(function (role) {
                        hashRole[role.id] = role
                    });

                    var hashPerson = {};
                    vo.persons.forEach(function (person) {
                        hashPerson[person.id] = person
                    });

                    vo.tracks.forEach(function (track) {
                        track.scenarios = track.scenarios || [];
                        track.roles = []; //track.roles || [];
                        track.leads = []; // track.leads || [];
                        if (track.leadIds) {
                            track.leadIds.forEach(function (id) {
                                var person = hashPerson[id];
                                if (person) {
                                    track.leads.push(person)
                                } else {
                                    //can't find the person references as the track lead - warn and empty the yrack lead...
                                    console.log("PersonId "+ id + " missing from track "+ track.id)
                                    track.leadIds.length = 0;
                                }
                            })
                        }

                        if (track.scenarioIds) {
                            track.scenarioIds.forEach(function (id) {
                                var scenario = hashScenario[id];
                                if (scenario) {
                                    //scenario.roles = scenario.roles || [];
                                    scenario.roles = [];    //don't really want to store the role objects in the db...
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
                                    console.log("track: "+ track.id +  " scenario id: "+ id+ " missing. The scenario may have been deleted.")
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
                                    alert('unknown scenario id getting link '+ link.scenarioid)
                                }

                                if (! role) {
                                    alert('unknown role id getting link'+ link.roleid)
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
                                    console.log('missing link or scenario')
                                }
                            });

                            //and the scores (this could be concurrent with the links)
                            allResults = {};    //scoped to the service...

                            $http.get("/result").then(
                                function(data) {
                                    var results = data.data;    //the results as saved in the database
                                    results.forEach(function(dataResult){
                                        var result = {id:dataResult.id};
                                        result.text = dataResult.text;
                                        result.type = dataResult.type;
                                        result.note = dataResult.note;
                                        result.trackers = dataResult.trackers;
                                        result.IG = dataResult.IG;
                                        result.serverRole = dataResult.serverRole;
                                        result.clientRole = dataResult.clientRole;
                                        result.dataSet = dataResult.dataSet;

                                        if (dataResult.server) {
                                            result.server = hashServer[dataResult.server.serverid];
                                        }

                                        if (dataResult.client) {
                                            result.client = hashClient[dataResult.client.clientid];
                                        }

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


                                            /*
                                            if (dataResult.client) {
                                                result.client = {client: hashClient[dataResult.client.clientid],
                                                    role: hashRole[dataResult.client.roleid]}

                                                if (!result.client.client || ! result.client.role) {
                                                    alert("Error processing client in result# " + dataResult.id);
                                                    delete result.client;
                                                }
                                            }
*/
                                            if (dataResult.asserterid) {
                                                result.asserter = hashAllPersons[dataResult.asserterid];
                                            }

                                            //note that the full author is saved. ?should this be the same for the asserter?
                                            if (dataResult.author) {
                                                result.author = hashAllPersons[dataResult.author.id];

                                            }


                                            //no longer supporting the 'cs' - clientserver type of test
                                            let key =  dataResult.id;
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

        addTagDEP : function(tag,ep){
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
        getEndPointsDEP : function() {
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

    }

});