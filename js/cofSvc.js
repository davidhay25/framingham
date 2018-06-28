angular.module("sampleApp").service('cofSvc', function(ecosystemSvc,ecoUtilitiesSvc,$q,$filter,$http) {



    //return an analysis object of an Extension Definition. (derived from Utilities.analyseExtensionDefinition3)
    var analyseExtensionDefinition =  function(SD) {
        //return a vo that contains an analysis of the extension. Used by the profile builder only and extension directive
        // (at this point)
       // var that = this;

        //if this is a complex extension (2 level only) then the property 'complex' has the analysis...
        var vo = {dataTypes: [], multiple: false};
        vo.display = SD.display; //will use this when displaying the element
        vo.name = SD.name;
        vo.isComplexExtension = false;
        vo.context = SD.context;
        vo.publisher = SD.publisher;
        vo.url = SD.url;
        vo.description = SD.description;

        var discriminator;      //if this is sliced, then a discriminator will be set...
        var complex = false;    //will be true if this is a

        if (SD.snapshot) {
            //first off, set the common data about the extension that is found in the first ED
            var ed = SD.snapshot.element[0];
            vo.definition = ed.definition;
            vo.short = ed.short;   //the short name of the extension - whether simple or complex
            if (ed.max == '*') {
                vo.multiple = true;
            }




            //next, let's figure out if this is a simple or a complex extension.
            var arElements = [];
            SD.snapshot.element.forEach(function (element,inx) {
                if (element.path) {
                    var arPath = element.path.split('.')


                    /*
                    The genomics extensions have a slicing element even for a 'simple' extension
                    so, change the criteria to a path >= 3 segments
                    changed March 30, 2107
                    if (element.slicing) {
                        vo.isComplexExtension = true;
                    }
                    */
                    if (arPath.length > 2) {
                        vo.isComplexExtension = true;
                    }


                    //get rid of the id elements and the first one - just to simplify the code...
                    var include = true;
                    if (inx == 0 || arPath[arPath.length-1] == 'id' || element.slicing) {include = false}

                    //get rid of the url and value that are part of the 'parent' rather than the children...
                    if (arPath.length == 2) {
                        //updated as was not getting details for simple extensions...
                        if (arPath[1] == 'url') {include = false}

                        if (vo.isComplexExtension && arPath[1].indexOf('value')>-1){
                            include = false
                        }    //THIS is the parent...


                    }


                    if (include) {
                        arElements.push(element);
                    }
                }

            });





            if (vo.isComplexExtension) {
                //process as if it was a simple extension
                processComplex(arElements,vo)
            } else {
                //process as if it was a simple extension
                processSimple(arElements,vo)
            }


        }


        return vo;

        //process a complex extension. Will only handle a single level hierarchy - ie a list of child extensions
        //probably not too had to make it recursive, but is it worth it? other stuff would need to change as well...
        function processComplex(arElement,vo) {
            vo.children = [];       //these will be the child extensions
            var child = {};         //this is a single child element

            arElement.forEach(function (element) {
                if (element.path) {
                    var arPath = element.path.split('.');
                    if (arPath.length == 2) {
                        //this is defining the start of a new child. create a new object and add it to the children array
                        child = {min: element.min, max: element.max};
                        child.ed = element;     //Hopefully this is the representative ED
                        child.ed.myMeta = {};

                        vo.children.push(child);
                    } else if (arPath.length > 2) {
                        //this will be the definition of the child. we're only interested in the code and the datatype/s
                        var e = arPath[2];
                        if (e.indexOf('value') > -1) {
                            //this is the value definition - ie what types
                            child.ed.type = element.type;
                            child.ed.binding = element.binding;     //the child.ed was set by the 'parent' and won't have the binding...


                            //pull the bound ValueSet out for convenience...
                            if (element.binding) {
                                if (element.binding.valueSetReference) {
                                    //we may need to check whether this is a relative reference...
                                    child.boundValueSet = element.binding.valueSetReference.reference;
                                }
                                if (element.binding.valueSetUri) {
                                    child.boundValueSet = element.binding.valueSetUri;
                                }
                                child.bindingStrength = element.binding.strength;

                            }


                            //see if this is a complex dataType (so we can set the icon correctly)
                            if (element.type) {
                                element.type.forEach(function (typ) {
                                    var code = typ.code;        //the datatype code
                                    if (code) {
                                        //if (/[A-Z]/.test(code)) {  aug2017 - don't know why there is a caps check here...
                                        child.ed.myMeta.isComplex = true;
                                        // }
                                    }
                                })
                            }

                        }

                        if (e.indexOf('url') > -1) {
                            //this is the code of the child
                            child.code = element.fixedUri
                        }

                    }
                }


            });


        }

        //process this as if it were a simple extension
        function processSimple(arElement,vo) {
            arElement.forEach(function (element) {
                //we're only interested in finding the 'value' element to find out the datatypes it can assume...
                if (element.path.indexOf('Extension.value') > -1) {
                    //this defines the value type for the extension

                    //look at the 'type' property to see the supported data types
                    if (element.type) {
                        vo.type = element.type;
                        element.type.forEach(function (typ) {
                            var code = typ.code;        //the datatype code
                            if (code) {

                                vo.dataTypes.push(typ);
                                //vo.dataTypes.push({code:code});
                                //is this a codedd type?
                                if (['CodeableConcept', 'code', 'coding'].indexOf(code) > -1) {
                                    vo.isCoded = true;

                                }

                                /* - no it isn't!  Jun 2017...
                                //if the datatype starts with an uppercase letter, then it's a complex one...
                                if (/[A-Z]/.test( code)){
                                    vo.isComplex = true;    //this really should be 'isComplexDatatype'
                                }
                                */

                                //is this a reference?
                                if (code == 'Reference') {

                                }
                            }
                        })
                    }

                    if (element.binding) {
                        vo.binding = element.binding;
                        if (element.binding.valueSetUri) {
                            vo.boundValueSet = element.binding.valueSetUri
                        } else if (element.binding.valueSetReference){
                            vo.boundValueSet = element.binding.valueSetReference.reference;
                        }

                    }

                }

            })
        }

    };


    return {

        sendToFHIRServer : function(lst,track) {
            var deferred = $q.defer();
            var transBundle = {resourceType:'Bundle',type:'transaction',entry:[]}

            lst.forEach(function(item) {
                var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,item.table);  //create the json for a single entry
                //console.log(vo.resource)

                var transEntry = {resource:vo.resource};
                transEntry.request = {method:'PUT',url:vo.resource.resourceType+'/'+vo.resource.id}
                transBundle.entry.push(transEntry)


            });

            var url = track.dataServer;     //the bundle is posted to the root of the server...
            $http.post(url,transBundle).then(
                function (data) {
                    deferred.resolve(data.data)
                },
                function (err) {
                    deferred.reject(err.data)
                }
            );



            return deferred.promise;


            //create a new bundle to submit as a transaction. excludes logical models
            var that=this;
            var bundle = this.makeDisplayBundle(container.bundle);      //does things like make it a correct document..
            var deferred = $q.defer();

            transBundle.id = bundle.id;     //needed when saving against /Bundle
            bundle.entry.forEach(function(entry) {

                if (entry.isLogical) {
                    console.log('Ignoring Logical Model: ' + entry.resource.resourceType)
                } else {

                    if (entry.resource.resourceType == 'DocumentReference') {
                        //need to set the attackent uri to the location of the bundle...
                        var bundleUrl = appConfigSvc.getCurrentDataServer().url + 'Bundle/'+bundle.id;
                        var resource = entry.resource;
                        if (resource.content) {
                            resource.content[0].attachment.url=bundleUrl;
                        }

                    }

                    var transEntry = {resource:entry.resource};
                    transEntry.request = {method:'PUT',url:entry.resource.resourceType+'/'+entry.resource.id}
                    transBundle.entry.push(transEntry)
                }
            });

            var url = appConfigSvc.getCurrentDataServer().url;

            //post the transaction bundle to the server root so the individual resources are saved...
            $http.post(url,transBundle).then(
                function(data) {

                    var responseBundle = data.data;


                    console.log(responseBundle);


                    //save the bundle directly against the /Bundle endpoint. Use the original bundle...

                    SaveDataToServer.saveResource(bundle).then(
                        function(data){
                            //saveProvenance will resolve the promise...
                            saveProvenance(responseBundle,container.name,note,deferred)


                        },function (err) {
                            //??? add error status to provenance
                            alert('error saving bundle ' + angular.toJson(err))
                            saveProvenance(responseBundle,container.name,note,deferred);
                        }
                    );


                    //the response contains the location where all resources were stored. Create a provenance resource...

                },
                function(err) {
                    alert('Error saving scenario resources\n'+angular.toJson(err));
                }
            );

            return deferred.promise

            //save the provenence resource and resolve the promise. Note that we resolve anyway
            //?? todo what to do if the provenance save fails??
            function saveProvenance(data,name,note,deferred) {
                var prov = that.createProvenance(data,name,note);
                SaveDataToServer.saveResource(prov).then(
                    function(data) {
                        deferred.resolve()
                    },
                    function(err) {
                        alert('error saving provenance ' + angular.toJson(err))

                        deferred.resolve();
                    }
                )
            }


        },


        validateResource: function(resource,track) {
            var deferred = $q.defer();

            if (!track.dataServer || !resource || ! resource.resourceType) {
                deferred.reject({msg:'Validation needs the dataServer configured in the track and a minimal resource'})
            }


            var url = track.dataServer + resource.resourceType + '/$validate'
            $http.post(url,resource).then(
                function(data){
                    deferred.resolve(data.data)
                },
                function(err) {
                    console.log(err)
                    deferred.reject(err.data)
                }
            )
            return deferred.promise;

        },

        makeLogicalModelFromSD : function(profile,track){
            //given a StructureDefinition which is a profile (ie potentially has extensions) generate a logical model by de-referencing the extensions
            //assume R3
            var deferred = $q.defer();

            var confServer = track.confServer || "http://snapp.clinfhir.com:8081/baseDstu3/";       //get from track,

            if (profile && profile.snapshot && profile.snapshot.element) {

                var logicalModel = angular.copy(profile);       //this will be the logical model
                var queries = [];       //the queries to retrieve the extension definition
                logicalModel.snapshot.element.length = 0; //remove the current element definitions
                var elementsToInsert = {};      //A hash of elements to insert. key is parent path, value is [ed]
                var extensionCount = 0;         //a counter to make paths for simple extensions unique

                //remove elements that are actually sub-elements of Complex DataTypes...
                var ar = stripDTChildren(profile.snapshot.element);

                ar.forEach(function (ed) {
                //profile.snapshot.element.forEach(function (ed) {
                    logicalModel.snapshot.element.push(ed)

                    var path = ed.path;
                    var ar = path.split('.');
                    if (ar.indexOf('extension') > -1) {
                        //this is an extension

                        if (ed.type) {
                            var profileUrl = ed.type[0].profile;

                            ed.meta = ed.meta || {};
                            ed.meta = {isExtension : true};  //to colourize it, and help with the build..
                            ed.meta.extensionUrl = profileUrl;


                            if (profileUrl) {   //if there's a profile, then this is a 'real' extension

                                queries.push(ecoUtilitiesSvc.findConformanceResourceByUri(profileUrl,confServer).then(
                                    function (sdef) {
                                        var analysis = analyseExtensionDefinition(sdef);

                                        //console.log(analysis)

                                        if (! analysis.isComplexExtension) {
                                            //note that ed is here by virtue of the magic of closure...
                                            if (! ed.name) {
                                                ed.name = analysis.name;
                                            }

                                            ed.path += '-'+ extensionCount;
                                            extensionCount++;
                                            ed.type = analysis.type;
                                            ed.binding = analysis.binding;

                                           // ed.builderMeta = {isExtension : true};  //to colourize it, and help with the build..
                                            //ed.builderMeta.extensionUrl = profileUrl;



                                            ed.comments = sdef.description;


                                        } else {
                                            //console.log(profileUrl + " is complex")
                                            //console.log(analysis)

                                            ed.type = [{code:'BackboneElement'}]
                                            ed.path += '-'+ed.sliceName;

                                            if (analysis && analysis.children) {
                                                elementsToInsert[ed.path] = []
                                                analysis.children.forEach(function (child) {
                                                    var newED = {};
                                                    newED.path = ed.path + '.' + child.code;
                                                    newED.id = newED.path;
                                                    newED.min = child.min;
                                                    newED.max = child.max;
                                                    newED.type = child.ed.type;
                                                    newED.display = child.code;
                                                    elementsToInsert[ed.path].push(newED)
                                                })
                                            }
                                        }


                                    },
                                    function(err) {
                                        //unable to locate extension
                                        console.log(profileUrl + " not found")
                                    }
                                ))
                            }

                        }

                    }


                });

                if (queries.length > 0) {
                    //yes - execute all the queries and resolve when all have been completed...
                    $q.all(queries).then(
                        function () {
                            //console.log(logicalModel.snapshot.element)

                            console.log(elementsToInsert)
                            //for each of the complex extensions, find the parent in the list then insert the children immediately after.
                            angular.forEach(elementsToInsert,function(value,parentPath){
                                var l = logicalModel.snapshot.element.length;

                                for (var i=0; i< l;i++) {
                                    var el = logicalModel.snapshot.element[i];
                                    var p = el.path;
                                    if (p == parentPath) {
                                        //this is the parent for the child elements at this has pos. insert them after.
                                        for (var j=0; j < value.length; j++) {
                                            logicalModel.snapshot.element.splice(i+j+1,0,value[j])
                                        }
                                        break;
                                    }
                                }
                            });


                            var lst = logicalModel.snapshot.element;
                            //lst = removeExtensions(lst);
                            lst = removeDeletedElements(lst);
                            logicalModel.snapshot.element = lst;

                            //logicalModel.snapshot.element = removeExtensions(logicalModel.snapshot.element)
                            console.log(logicalModel.snapshot.element)

                            deferred.resolve(logicalModel);
                        },
                        function (err) {
                            //return the error and the incomplete model...
                            deferred.reject({err:err,lm:logicalModel})
                        }
                    )

                } else {
                    //no - we can return the list immediately...
                    logicalModel.snapshot.element = removeExtensions(logicalModel.snapshot.element)
                    deferred.resolve(logicalModel)
                }
            } else {
                deferred.reject();
            }

            return deferred.promise;


            function removeExtensions(arED) {
                return arED;        //temp


                var ar = [];
                arED.forEach(function(ed){
                    if (ed.type && ed.type[0].code=='Extension') {

                    } else {
                        ar.push(ed)
                    }
                })
                return ar;
            }


            //remove all the elements that have a max of 0
            function removeDeletedElements(lst) {
                var finished = false;
                while (! finished) {
                    finished = true;
                    var l = lst.length;
                    for (var i=0; i < l; i++) {
                        var element = lst[i];
                        if (element.max === '0') {
                            lst = pruneBranch(element.path,lst);
                            finished = false;
                            break;
                        }
                    }
                }
                return lst;
            }

            //remove all the elements (and their children) with a given path
            function pruneBranch(path,lst) {
                var newLst = []
                lst.forEach(function (item) {

                    if (! item.path.startsWith(path)){      //startsWith defined in ecoSystemSvc
                        newLst.push(item)
                    }
                });
                return newLst;
            }



            //remove all ed's that are 'exploded' children of datatypes - ie Identifier.use.
            //these are added by Forge to allow fixing of child elements and other changes... (so these won't be reflected in the form right now)
            function stripDTChildren(arED) {
                var ar = [],parentBBE;

                var hashBBE = {};      // all of the BackBone elements...
                arED.forEach(function(ed){
                    if (isEDaBBE(ed)) {
                        hashBBE[ed.path] = true;
                    }
                });

                arED.forEach(function(ed,inx){

                    //just clutter the ed
                    delete ed.constraint;
                    delete ed.mapping;
                    delete ed.condition;

                    if (inx == 0) {
                        ar.push(ed);
                    } else {
                        var ar1 = ed.path.split('.');
                        ar1.pop();
                        var p = ar1.join('.');
                        if (hashBBE[p] && (! ed.slicing)) {
                            //add if the parent is a BBE and it's not a slicing element...
                            ar.push(ed);
                        } else {
                            //this is an extension on an element....
                            if ( ed.type[0].profile) {
                                ar.push(ed);
                            }
                        }




                    }

/*
                    var isBBE = isEDaBBE(ed)
                    if (isBBE) {
                        //if a BBE, then add it and set the parent va
                        ar.push(ed);
                        parentBBE = true;
                    } else {
                        //this is not a BBE. It only gets added if the parent was a BBE
                        if (parentBBE) {
                            ar.push(ed);
                        }
                        parentBBE = false;
                    }
                    */
                });




                return ar;


                function isEDaBBE(ed) {
                    if (ed.type) {
                        if (ed.type[0].code == 'BackboneElement') {
                            return true
                        } else {
                            return false;
                        }
                    } else {
                        return true;    //this is the root element - the only one without a type
                    }
                }

            }



        },
        makeGraph: function (lst,focusResourceId) {
            //if focusResourceId, then only show resources with a directreference to that one
            var arNodes = [], arEdges = [];
            var objColours = ecosystemSvc.objColours();
            var nodesWithReferenceFromFocus = {}

            lst.forEach(function (item) {

                var label = item.description + '\n'+ item.type
                var node = {id: item.id, label: label, shape: 'box', item: item};

                if (objColours[item.baseType]) {
                    node.color = objColours[item.baseType];
                }



                //add the focus node to the hash of nodes to keep...
                if (focusResourceId && item.id == focusResourceId) {
                    nodesWithReferenceFromFocus[item.id] = item;
                }
                arNodes.push(node);



                //now get all the references from this node...
                if (item.table) {
                    item.table.forEach(function (row) {
                        if (row.references) {
                            row.references.forEach(function (ref) {
                                var edge = {
                                    id: 'e' + arEdges.length + 1, from: item.id, to: ref.targetItem.id,
                                    label: ref.sourcePath, arrows: {to: true}
                                };

                                if (focusResourceId) {


                                    //if this resorcce (item) has a reference to the target
                                    if  (ref.targetItem.id == focusResourceId) {
                                        nodesWithReferenceFromFocus[item.id] = item;
                                        arEdges.push(edge)
                                    }

                                    //if this is the focus, then include all the resources that it references
                                    if (item.id == focusResourceId) {
                                        nodesWithReferenceFromFocus[ref.targetItem.id] = "x";
                                        arEdges.push(edge)
                                    }



                                } else {
                                    arEdges.push(edge)
                                }
                            })
                        }
                    });
                }
            });

            //now, hide all the nodes that aren't referenced by the focus
            if (focusResourceId) {
                //hide the node

                arNodes.forEach(function(node){

                    if (! nodesWithReferenceFromFocus[node.id]) {
                       // var node = nodes.get(n.id)
                        node.hidden = true;
                        node.physics=false;
                    }
                })
            }


            var nodes = new vis.DataSet(arNodes);


            var edges = new vis.DataSet(arEdges);

            // provide the data in the vis format
            var graphData = {
                nodes: nodes,
                edges: edges
            };

            return {graphData: graphData};

        },
        makeTree : function(table) {
            var arTree = [];

            table.forEach(function (row) {
                var path = row.path;     //this is always unique in a logical model...
                var arPath = path.split('.');
                var item = {data:row};
                item.id = path;

                item.text = arPath[arPath.length-1];
                if (row.structuredData) {
                    item['li_attr'] = {class:'treeNodeHasData'};
                }

                item.icon = '/icons/icon_primitive.png';

                if (row.dt) {
                    var char = row.dt.substr(0,1)
                    if (char == char.toUpperCase()) {
                        item.icon='/icons/icon_datatype.gif';
                    }
                }
                if (row.dt == 'Reference') {
                        item.icon='/icons/icon_reference.png';
                }

                if (row.isBBE) {
                    item.icon='/icons/icon_element.gif';
                }

                if (arPath.length == 1) {
                    //the root
                    item.parent = '#'
                } else {
                    arPath.pop();//
                    item.parent = arPath.join('.');
                }
                arTree.push(item)
            });

            return arTree;
        }
    }
});