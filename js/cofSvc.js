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

        makePatientReference : function(patientId,patientDescription,item) {
            //if the resource has a reference named 'subject' or 'patient' then create a reference
            //create a row for the table to reference the Patient...
            //not used
            var row = {references:[]};

            var ref = {};
            ref.targetItem = {id:patientItem.linkedResource.id,description:patientItem.description};
            ref.sourcePath = "Subject";     //todo may not be correct...

            row.references.push(ref);


            item.table = [row];

        },
        makeResourceTree : function(resource) {
            //makes a tree of a resourc einstance
            //pass in a resource instance...
            if (! resource) {
                //function is called when clicking on the space between resources...
                return;
            }
            var tree = [];
            var idRoot = 0;
            //console.log(resource)
            function processNode(tree, parentId, element, key, level,pathRoot) {

                if (angular.isArray(element)) {
                    var aNodeId1 = getId()
                    var newLevel = level++;
                    var data = {key:key, element:element,level:newLevel,path:pathRoot+'.'+key}
                    var newNode1 = {id: aNodeId1, parent: parentId, data:data, text: key, state: {opened: true, selected: false}};
                    tree.push(newNode1);

                    newLevel++
                    element.forEach(function (child, inx) {
                        processNode(tree, aNodeId1, child, '[' + inx + ']',newLevel,pathRoot+'.'+key);
                    })

                } else if (angular.isObject(element)) {
                    var newLevel = level++;
                    var oNodeId = getId();
                    var data = {key:key, element:element,level:newLevel,path:pathRoot+'.'+key}
                    var newNode2 = {id: oNodeId, parent: parentId, data: data, text: key, state: {opened: true, selected: false}};



                    tree.push(newNode2);

                    //var newLevel = level++;
                    newLevel++
                    angular.forEach(element, function (child, key1) {
                        processNode(tree, oNodeId, child, key1,newLevel,pathRoot+'.'+key);

                    })
                } else {
                    //a simple element
                    if (key == 'div') {

                    } else {

                        //console.log(key,element)
                        //http://itsolutionstuff.com/post/angularjs-how-to-remove-html-tags-using-filterexample.html
                        //strip out the html tags... - elemenyt is not always a string - bit don't care...
                        try {
                            if (element.indexOf('xmlns=')>-1) {
                                element = element.replace(/<[^>]+>/gm, ' ')
                            }
                        } catch (ex) {

                        }



                        var display = key + " " + '<strong>' + element + '</strong>';
                        var data = {key:key, element:element,level:level,path:pathRoot+'.'+key}
                        //data.element = element;
                        var newNode = {
                            id: getId(),
                            parent: parentId,
                            data:data,
                            text: display,
                            state: {opened: true, selected: false}
                        };
                        tree.push(newNode);
                    }
                }
            }


            var rootId = getId();
            var rootItem = {id: rootId, parent: '#', text: resource.resourceType, state: {opened: true, selected: true}}
            tree.push(rootItem);

            angular.forEach(resource, function (element, key) {
                processNode(tree, rootId, element, key, 1,resource.resourceType);
            });

            //var parentId = '#';
            return tree;

            //generate a new ID for an element in the tree...
            function getId() {
                idRoot++;
                return idRoot;

            }

        },
        makeBundle : function(lst,type,track) {
            //make a sample bundle that represents the resources in the graph
            var that = this;
            var bundle = {resourceType:'Bundle',type:type,entry:[]}

            lst.forEach(function(item) {
                console.log(item)
                if (item.table && ! item.linked) {      //items must have data and not be linked...
                    var treeData = that.makeTree(item.table);
                    var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);  //create the json for a single entry
                    //console.log(vo.resource)
                    if (vo && vo.resource) {
                        var entry = {};
                        if (track.dataServer) {
                            entry.fullUrl = track.dataServer + vo.resource.resourceType+'/'+vo.resource.id
                        }

                        entry.resource = vo.resource;
                        entry.request = {method:'PUT',url:vo.resource.resourceType+'/'+vo.resource.id}

                        bundle.entry.push(entry)
                    } else {
                        console.log("Can't get Json for "+item.id + '. Not added to bundle')
                    }
                }

            });
            return bundle;


        },
        sendToFHIRServer : function(lst,track) {
            //todo - refactor to use makeBundle
            var deferred = $q.defer();
            var transBundle = {resourceType:'Bundle',type:'transaction',entry:[]}
            var that = this;

            lst.forEach(function(item) {
                console.log(item)
                if (item.table && ! item.linked) {      //items must have data and be linked...
                    var treeData = that.makeTree(item.table);
                    var vo = ecosystemSvc.makeResourceJson(item.baseType, item.id,treeData);  //create the json for a single entry
                    //console.log(vo.resource)
                    if (vo && vo.resource) {
                        var transEntry = {resource:vo.resource};
                        transEntry.request = {method:'PUT',url:vo.resource.resourceType+'/'+vo.resource.id}
                        transBundle.entry.push(transEntry)
                    } else {
                        console.log("Can't get Json for "+item.id + '. Not added to bundle')
                    }
                }

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

/*
            ??? None of this is actually being used

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
*/

        },


        validateResource: function(resource,track) {
            var deferred = $q.defer();

            if (!track.confServer || !resource || ! resource.resourceType) {
                deferred.reject({msg:'Validation needs the dataServer configured in the track and a minimal resource'})
            }


            var url = track.confServer + resource.resourceType + '/$validate'
            $http.post(url,resource).then(
                function(data){
                    //see if there are any 'error' issues - if so, then reject...
                    var valid = true;
                    var oo = data.data; //returns an OperationOutcome


                    if (oo.issue) {
                        oo.issue.forEach(function (iss) {
                            if (iss.severity == 'error' || iss.severity == 'fatal') {
                                valid = false;
                            }

                        })
                    }

                    if (valid) {
                        deferred.resolve(oo)
                    } else {
                        deferred.reject(oo)
                    }




                },
                function(err) {
                    console.log(err)
                    deferred.reject(err.data)
                }
            )
            return deferred.promise;

        },

        makeLogicalModelFromSD : function(profile,track,newId){
            //given a StructureDefinition which is a profile (ie potentially has extensions) generate a logical model by de-referencing the extensions
            //assume R3
            var deferred = $q.defer();

            var errors = [];        //errors during processing...

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
                            //ed.meta.realPath = 'extension';     //for the json builder



                            if (profileUrl) {   //if there's a profile, then this is a 'real' extension

                                ed.mapping = [{identity:'fhir',map:'extension'}];
                                //set the url of the extension - itself stored as an extension on the ED (this is the way that the LM does it)
                                var simpleExtensionUrl = 'http://clinfhir.com/fhir/StructureDefinition/simpleExtensionUrl';
                                ed.extension = ed.extension || []
                                ed.extension.push({url:simpleExtensionUrl,valueString:profileUrl})


                                queries.push(ecoUtilitiesSvc.findConformanceResourceByUri(profileUrl,confServer).then(
                                    function (sdef) {
                                        var analysis = analyseExtensionDefinition(sdef);

                                        console.log(profileUrl,analysis)

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
                                            //this is a complex extension...

                                            //console.log(profileUrl + " is complex")
                                            //console.log(analysis)

                                            ed.type = [{code:'BackboneElement'}]
                                            ed.path += '-'+ed.sliceName;

                                            if (analysis && analysis.children) {
                                                elementsToInsert[ed.path] = []
                                                analysis.children.forEach(function (child) {
                                                    var newED = {meta:{}};



                                                    newED.path = ed.path + '.' + child.code;
                                                    newED.id = newED.path;
                                                    newED.min = child.min;
                                                    newED.max = child.max;
                                                    newED.type = child.ed.type;
                                                    newED.display = child.code;

                                                    if (child.boundValueSet) {
                                                        newED.binding = {valueSetReference: {reference:child.boundValueSet}};
                                                        newED.binding.strength = child.bindingStrength
                                                    }
/*

                                                     if (ed.binding && ed.binding.valueSetReference) {
                                item.binding = {url:ed.binding.valueSetReference.reference,strength:ed.binding.strength}
                            }

                                                    "binding": {
                                                        "url": "http://hl7.org/fhir/ValueSet/administrative-gender",
                                                            "strength": "required"
                                                    },
*/
                                                    elementsToInsert[ed.path].push(newED)
                                                })
                                            }
                                        }


                                    },
                                    function(err) {
                                        //unable to locate extension
                                        errors.push(profileUrl + " not found")
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

                            fixLM(logicalModel,newId);

                            //fixPaths(lst,newId);




                            //logicalModel.snapshot.element = removeExtensions(logicalModel.snapshot.element)
                            console.log(logicalModel.snapshot.element)

                            deferred.resolve(logicalModel);
                        },
                        function (err) {
                            //return the error and the incomplete model...
                            deferred.reject({err:err,lm:logicalModel,errors:errors})
                        }
                    )

                } else {
                    //no - we can return the list immediately...
                    logicalModel.snapshot.element = removeExtensions(logicalModel.snapshot.element)
                    //logicalModel.id = newId
                    fixLM(logicalModel,newId);

                    //fixPaths(logicalModel.snapshot.element,newId)
                    deferred.resolve(logicalModel)
                }
            } else {
                deferred.reject();
            }

            return deferred.promise;




            //the last function called before the model is returned
            function fixLM(LM,root){

                lst = LM.snapshot.element;

                LM.id = newId
                LM.kind = 'logical';
                LM.extension = logicalModel.extension || []
                LM.extension.push({
                    "url": "http://clinfhir.com/fhir/StructureDefinition/baseTypeForModel",
                    "valueString": "Patient"
                })

                LM.identifier = LM.identifier || []
                LM.identifier.push({system:'http://clinfhir.com',value:'author'})

               /*
                LM.keyword =  [
                    {
                        "system": "http://fhir.hl7.org.nz/NamingSystem/application",
                        "code": "clinfhir"
                    }
                ]
                */



                lst.forEach(function (ed,inx) {
                    if (inx == 0) {
                        ed.path=root
                        ed.id = root
                    } else {
                        var ar = ed.path.split('.')
                        ar[0] = root;
                        var newPath = ar.join('.')
                        ed.path=newPath
                        ed.id = newPath
                    }

                })
            }

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
        makeGraph: function (lst,focusResourceId,hidePatient) {
            //if focusResourceId, then only show resources with a directreference to that one
            //if hidePatient then don't show patient
            //lst is list of all resources...

            //let lst = angular.copy(lstIn);   NOOOOOOO!!!! must be the original as they are all references!!!!   //so we can modify the list


            var arNodes = [], arEdges = [];
            var objColours = ecosystemSvc.objColours();
            var nodesWithReferenceFromFocus = {}

            var patientNodeId = null;
            if (hidePatient) {
                //find patient node
                lst.forEach(function(item) {
                    if (item.baseType == 'Patient') {
                        patientNodeId = item.id
                        console.log(patientNodeId)
                    }
                })
            }


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

                if (patientNodeId && node.id == patientNodeId) {

                } else {
                    arNodes.push(node);
                }



                //now get all the references from this node...
                if (item.table) {





                    item.table.forEach(function (row) {
                        if (row.references) {
                            row.references.forEach(function (ref) {
                                //console.log(ref)
                                var edge = {
                                    id: 'e' + arEdges.length + 1, from: item.id, to: ref.targetItem.id,
                                    label: ref.sourcePath, arrows: {to: true}
                                };

                                if (focusResourceId) {


                                    //if this resorcce (item) has a reference to the target
                                    if  (ref.targetItem.id == focusResourceId) {
                                        nodesWithReferenceFromFocus[item.id] = item;
                                        if (! isHiddenPatientReference(patientNodeId,edge)) {
                                            arEdges.push(edge)
                                        }

                                    }

                                    //if this is the focus, then include all the resources that it references
                                    if (item.id == focusResourceId) {
                                        nodesWithReferenceFromFocus[ref.targetItem.id] = "x";
                                        if (! isHiddenPatientReference(patientNodeId,edge)) {
                                            arEdges.push(edge)
                                        }
                                    }



                                } else {
                                    if (! isHiddenPatientReference(patientNodeId,edge)) {
                                        arEdges.push(edge)
                                    }
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

            //return true if this edge is to a hidden patient
            function isHiddenPatientReference(patientNodeId,edge) {
                if (! patientNodeId) {return false};        //patient is not hidden
                if (edge.from == patientNodeId || edge.to == patientNodeId) {
                    return true
                }

            }

        },
        makeTree : function(table,hideEmpty) {
            //makes a tree of the type
            //hideEmpty  = true;
            var arTree = [];
            var pathHash = {};      //the most recent id for each hash

            if (! table) {
                return;
            }
            //assume that the tree is in order

            table.forEach(function (row) {

                var path = row.path;     //this is always unique in a logical model...
                var arPath = path.split('.');
                var item = {data:row};
                var newId = new Date().getTime() + '-' + 1000 * Math.random();
                pathHash[path] = newId;         //save the most recent id for this path. (will overwrite old with new - we want that...)

                item.id = newId;//path;

                item.text = arPath[arPath.length-1];
                if (arPath.length == 1) {
                    //the root
                    item.parent = '#'
                } else {
                    arPath.pop();//
                    //item.parent = arPath.join('.');
                    item.parent = pathHash[arPath.join('.')];   //this will be the most recent element with this path

                }

                if (row.structuredData) {
                    item['li_attr'] = {class:'treeNodeHasData'};

                    //make the parent have this class also...
                    let nodeParent = getNodeById(item.parent)
                    if (nodeParent) {
                        //set the parent font to bold
                        nodeParent['li_attr'] = {class:'treeNodeHasData'};

                        //add structuredData to the parent also...
                        nodeParent.data = nodeParent.data || {}
                        nodeParent.data.structuredData = nodeParent.data.structuredData || {}
                        nodeParent.data.structuredData[item.text] = row.structuredData;

                    }

                } else {
                    item['li_attr'] = {class:'treeNodeHasNoData'};
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
/*
                if (arPath.length == 1) {
                    //the root
                    item.parent = '#'
                } else {
                    arPath.pop();//
                    //item.parent = arPath.join('.');
                    item.parent = pathHash[arPath.join('.')];   //this will be the most recent element with this path



                }
                */
                arTree.push(item)
            });

            if (hideEmpty) {
                let newTree = [];
                arTree.forEach(function (item) {
                    if (item.data.structuredData || item.text == 'id' || item.text == 'resourceType') {
                        newTree.push(item)
                    }

                })
                return newTree;
            } else {
                return arTree;
            }



            function getNodeById(id) {
                for (var i=0; i < arTree.length; i++) {
                    let node = arTree[i]
                    if (node.id == id) {
                        return node;
                        break;
                    }
                }
                return null;

            }
        }
    }
});