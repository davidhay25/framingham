#!/usr/bin/env node

var syncRequest = require('sync-request');


var sourceUrlRoot = "https://fhir.hl7.org.uk/STU3/";
var targetUrlRoot = "http://localhost:8080/baseDstu3/";
var termServerRoot = "https://ontoserver.csiro.au/stu3-latest/";

var allCSurl =sourceUrlRoot + "CodeSystem?_count=100";

//Create an implementation guide to hold the artifacts
var IG = {resourceType:'ImplementationGuide',status:'draft',package:[{name:'complete',resource:[]}]};
IG.id = 'cf-careconnect';
IG.description = "Care Connect";
IG.extension = [{url: "http://clinfhir.com/fhir/StructureDefinition/cfAuthor",valueBoolean:true}]

//var addCodeSystem = true;
//var add
var writeIG = false;


if (1==1) {
    console.log('Getting CodeSystems...')
    var options = {}
    options.headers = {"content-type": "application/json"}
    options.timeout = 30000;        //30 seconds
    var response = syncRequest('GET', allCSurl, options);
    console.log(response.statusCode);
    var allCSBundle = JSON.parse(response.body.toString())
//console.log(allVSBundle)
    allCSBundle.entry.forEach(function (entry) {
        var CS = entry.resource;
        console.log(CS.id,CS.url)

        var targUrl = termServerRoot + 'CodeSystem/'+ CS.id;
        var options = {}
        options.headers = {"content-type": "application/json"}
        options.timeout = 30000;        //30 seconds
        options.body = JSON.stringify(CS)
        var response = syncRequest('PUT', targUrl, options);
        var statusCode = response.statusCode;
        console.log(targUrl,response.statusCode);
        if (statusCode > 299) {
            console.log(response.body.toString())
        } else {
            //add to CS
            var purpose = 'terminology';
            var description = CS.description;
            var IGEntry = {acronym: purpose, description: description, sourceReference: {reference: CS.url}}
            IG.package[0].resource.push(IGEntry);

        }
    });
}


//return;

if (1==1) {
    var allVSurl = sourceUrlRoot + "ValueSet?_count=100";
    console.log('Getting ValueSets...',allVSurl)
    var options = {}
    options.headers = {"content-type": "application/json"}
    options.timeout = 30000;        //30 seconds
    var responseVS = syncRequest('GET', allVSurl, options);
    console.log(responseVS.statusCode);
    var allVSBundle = JSON.parse(responseVS.body.toString())
    console.log(allVSBundle)
    allVSBundle.entry.forEach(function (entry) {
        var VS = entry.resource;
        console.log(VS.id,VS.url)

        var targUrl = termServerRoot + 'ValueSet/'+ VS.id;
        var options = {}
        options.headers = {"content-type": "application/json"}
        options.timeout = 30000;        //30 seconds
        options.body = JSON.stringify(VS)
        var response = syncRequest('PUT', targUrl, options);
        var statusCode = response.statusCode;
        console.log(targUrl,response.statusCode);
        if (statusCode > 299) {
            console.log(response.body.toString())
        } else {
            //add to IG
            var purpose = 'terminology';
            var description = VS.description;
            var IGEntry = {acronym: purpose, description: description, sourceReference: {reference: VS.url}}
            IG.package[0].resource.push(IGEntry);

        }
    });

}



if (1 == 2) {
    var allSDurl =sourceUrlRoot + "StructureDefinition?_count=100";

    console.log('Getting StructureDefinitions...',allSDurl)
    var options = {}
    options.headers = {"content-type": "application/json"}
    options.timeout = 30000;        //30 seconds
    var response = syncRequest('GET', allSDurl, options);
    console.log(response.statusCode);
//console.log(response.body.toString());

    var allSDBundle = JSON.parse(response.body.toString());

    allSDBundle.entry.forEach(function (entry) {
        var SD = entry.resource;
        console.log(SD.id,SD.url)
        SD.text.div = "<div/>"

        var targUrl = targetUrlRoot + 'StructureDefinition/'+ SD.id;
        var options = {}
        options.headers = {"content-type": "application/json"}
        options.timeout = 30000;        //30 seconds
        options.body = JSON.stringify(SD)
        var response = syncRequest('PUT', targUrl, options);
        var statusCode = response.statusCode;
        console.log(targUrl,response.statusCode);
        if (statusCode > 299) {
            console.log(response.body.toString())
        } else {
            //add to IG
            var purpose = 'profile';
            if (SD.constrainedType == 'Extension' || SD.type=='Extension') {
                purpose = 'extension'
            }
            var description = SD.description;
            var IGEntry = {acronym: purpose, description: description, sourceReference: {reference: SD.url}}
            IG.package[0].resource.push(IGEntry);

        }
    });
}



//save teh IG
if (writeIG) {
    console.log('Saving ImplementationGuide...')
    var url = targetUrlRoot  + "ImplementationGuide/" + IG.id;
    var options = {};
    options.body = JSON.stringify(IG);
    options.headers = {"content-type": "application/json+fhir"};
    options.timeout = 20000;        //20 seconds
    var response = syncRequest('PUT', url, options);
    console.log(url,response.statusCode);
}


