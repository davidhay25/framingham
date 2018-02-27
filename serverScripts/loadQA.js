#!/usr/bin/env node
var fs = require('fs');

var resourceSource = "/Users/davidha/fhir/trunk/build/source/";
var publishRoot = "/Users/davidha/fhir/trunk/build/publish/";

var qaOutputRoot = "/Users/davidha/Dropbox/fhirQA2018/";        //where to place the output files...

var ExtensionDefinitions = {}
var SearchParameters = {}
var Profiles = {};
var CoreProfiles = {};      //the descripto

var Operations = {};

//getOtherProfiles();
//return;

getSearchParameters();
getExtensionDefinitions();
getCoreProfiles();      //includes operations
getOtherProfiles();
//return;


//generate the datatypes


var fileName = publishRoot + "profiles-types.json"
var contents = JSON.parse(fs.readFileSync(fileName).toString());

var html = '<html xmlns="http://www.w3.org/TR/REC-html40"><head>';
html += "<title>Datatypes</title>";
html += '<meta name="ProgId" content="Word.Document"></meta>';
html += '<style type="text/css">pre {mso-no-proof:yes} code {mso-no-proof:yes}</style></head>';
html += '<body lang="EN-US" style="mso-ansi-language:EN-US">';

html += "<h1>DataTypes</h1>";

contents.entry.forEach(function(entry){
    var SD = entry.resource;


    html += "<h2>"+SD.name+"</h2>";
    html += "<p>"+SD.description +"</p>"


    html += "<h3>Elements</h3>";
    html += "<table><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
    SD.snapshot.element.forEach(function(ed){

        var path = ed.path;
        var ar = path.split('.');
        ar.splice(0,1);     //drop off the first

        var newPath = ar.join('.')
      //  if (['id','meta','implicitRules','language','text','contained','extension','modifierExtension'].indexOf(newPath) == -1) {
            //don't include teh standard ones...
            html += "<tr>";
            html += "<td valign='top'>"+ed.path+"</td>";
            html += "<td valign='top'>"+ed.short+"</td>";
            html += "<td valign='top'>"+ed.definition+"</td>";
            if (ed.comment) {
                html += "<td valign='top'>"+ed.comment+"</td>";
            } else {
                html += "<td valign='top'></td>";
            }

            html += "</tr>";
      //  }


    });
    html += "</table><hr/>";
})
html += "</table><hr/>";

var outFileName = qaOutputRoot + 'Datatypes-qa.html';
fs.writeFileSync(outFileName,html)



//generate the 'other' files
fs.readdir(resourceSource, function(err, list) {
    // console.log(list)

    list.forEach(function (folderName) {
        var lcFolderName = folderName.toLowerCase();
        var fileOrFolderName = resourceSource + folderName;
        fs.stat(fileOrFolderName, function (err, stat) {
            //console.log(fileOrFolderName,stat)
            if (! stat.isDirectory()) {
              //  console.log(fileOrFolderName);
                if (fileOrFolderName.indexOf('.html') > -1) {
                    var ar = fileOrFolderName.split('/');
                    var outFileName = qaOutputRoot + 'others/'+ ar[ar.length-1];
                    var contents = fs.readFileSync(fileOrFolderName).toString();
                    fs.writeFileSync(outFileName,contents)
                }
            }
        })
    })
})



//generate the individual Resource files
fs.readdir(resourceSource, function(err, list) {
   // console.log(list)

    list.forEach(function(folderName){
        var lcFolderName = folderName.toLowerCase();
        var fileOrFolderName = resourceSource+folderName;
        fs.stat(fileOrFolderName,function(err,stat){
            //console.log(fileOrFolderName,stat)
            if (stat.isDirectory()) {
                // a folderName should be equivalent to a resource type

                var html = '<html xmlns="http://www.w3.org/TR/REC-html40"><head>';
                html += "<title>Resource: "+folderName+"</title>";
                html += '<meta name="ProgId" content="Word.Document"></meta>';
                html += '<style type="text/css">pre {mso-no-proof:yes} code {mso-no-proof:yes}</style></head>';
                html += '<body lang="EN-US" style="mso-ansi-language:EN-US">';

                html += "<h1>Resource type: "+folderName+"</h1>";

                //console.log(fileOrFolderName)
                //this is a source folder. create an html file with the concatenated xml files


                //list of elements
                if (CoreProfiles[lcFolderName]) {
                    var SD = CoreProfiles[lcFolderName];
                    html += "<h2>Elements</h2>";
                    html += "<table><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
                    SD.snapshot.element.forEach(function(ed){

                        var path = ed.path;
                        var ar = path.split('.');
                        ar.splice(0,1);     //drop off the first

                        var newPath = ar.join('.')
                        if (['id','meta','implicitRules','language','text','contained','extension','modifierExtension'].indexOf(newPath) == -1) {
                            //don't include teh standard ones...
                            html += "<tr>";
                            html += "<td valign='top'>"+newPath+"</td>";
                            html += "<td valign='top'>"+ed.short+"</td>";
                            html += "<td valign='top'>"+ed.definition+"</td>";
                            if (ed.comment) {
                                html += "<td valign='top'>"+ed.comment+"</td>";
                            } else {
                                html += "<td valign='top'></td>";
                            }

                            html += "</tr>";
                        }


                    });
                    html += "</table>";
                } else {
                    console.log('Processing folder '+ folderName + ' and there is no core profile')
                }

                var suffixes = ['-introduction.xml','-notes.xml','-header.xml'];

                suffixes.forEach(function(sfx){
                    var fileName = fileOrFolderName + "/" +folderName + sfx;
                   // console.log(fileName)

                    //var stat = fs.statSync(fileName)
                    if (fs.existsSync(fileName)) {
                        var contents = fs.readFileSync(fileName).toString();
                        html += contents;
                        //console.log(contents)
                    }
                 });



                //now add search parameters
                html += '<h2>Search Parameters </h2>';

                var type = folderName.toLowerCase();
                if (SearchParameters[type]) {
                    html += "<table>";
                    SearchParameters[type].forEach(function(sp){
                        //console.log(sp)
                        html += "<tr>";

                        html += "<td valign='top'>"+sp.name+"</td>";
                        html += "<td>"+sp.description+"</td>";
                        html += "<td>"+sp.expression+"</td>";
                        html += "<tr>";
                    });
                    html += "</table>";
                    delete SearchParameters[type];
                }

                //now the extension definitions
                html += '<h2>Extension Definitions </h2>';
                html += '<i>These are extension definitions for this resource defined by the spec';
                //console.log(type,ExtensionDefinitions[type])
                if (ExtensionDefinitions[type]) {
                    html += "<table>";
                    ExtensionDefinitions[type].forEach(function(ed){
                        //console.log(sp)

                        html += "<tr>";

                        html += "<td valign='top'>"+ed.id+"</td>";
                        html += "<td>"+ed.description+"</td>";

                        html += "<tr>";
                    });
                    html += "</table>";
                    delete ExtensionDefinitions[type];
                }

                //now the profiles
                if (Profiles[lcFolderName]) {
                    html += '<h2>Profiles based on this resource</h2>';

                    Profiles[lcFolderName].forEach(function(SD){
                        html += "<h3>"+SD.name+"</h3>";
                        html += "<p>"+SD.description +"</p>"


                        html += "<h2>Elements</h2>";
                        html += "<table><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
                        SD.snapshot.element.forEach(function(ed){

                            var path = ed.path;
                            var ar = path.split('.');
                            ar.splice(0,1);     //drop off the first

                            var newPath = ar.join('.')
                            if (['id','meta','implicitRules','language','text','contained','extension','modifierExtension'].indexOf(newPath) == -1) {
                                //don't include teh standard ones...
                                html += "<tr>";
                                html += "<td valign='top'>"+newPath+"</td>";
                                html += "<td valign='top'>"+ed.short+"</td>";
                                html += "<td valign='top'>"+ed.definition+"</td>";
                                if (ed.comment) {
                                    html += "<td valign='top'>"+ed.comment+"</td>";
                                } else {
                                    html += "<td valign='top'></td>";
                                }

                                html += "</tr>";
                            }


                        });
                        html += "</table><hr/>";




                    })
                }


                html += '</body></html>';


                var outFileName = qaOutputRoot + 'Resources/'+folderName + '-qa.html';
                fs.writeFileSync(outFileName,html)
/*
                if (folderName == 'condition' ) {

                    var outFileName = fileOrFolderName + "/" +folderName + '-qa.html';
                    //console.log(outFileName)
                    fs.writeFileSync(outFileName,html)
                }
                */

            }

        })
    })

    //console.log(SearchParameters);


})


//gets both profiles and operations
function getOtherProfiles(){
    var fileName = publishRoot + "profiles-others.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());
    //console.log(json.entry.length)
    json.entry.forEach(function(entry) {
        var resource = entry.resource;
        delete resource.text;

        var type = resource.resourceType
        switch (type) {

            case 'StructureDefinition':
                var id = resource.id;

                var baseDef = resource.baseDefinition.toLowerCase();
                var ar = baseDef.split('/');
                var type = ar[ar.length-1];
                //console.log(type)

                if (type=='vitalsigns') {
                    type = 'observation';
                }


                Profiles[type] = Profiles[type] || []
                Profiles[type].push(resource);

                break;

            default :
                console.log('Unknown resource type in profiles-others: '+ type)

        }


    });

    //console.log(Profiles);

}

//gets both profiles and operations
function getCoreProfiles(){
    var fileName = publishRoot + "profiles-resources.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());
    //console.log(json)
    json.entry.forEach(function(entry) {
        var resource = entry.resource;
        delete resource.text;

        var type = resource.resourceType
        switch (type) {
            case 'CompartmentDefinition':
            case 'CapabilityStatement':
            //these can all be ignored....
            //console.log(resource.name)
            case 'StructureDefinition':
                var id = resource.id;
                if (CoreProfiles[id]) {
                    console.log('There is a duplicate definition in profiles-resources.json for '+id)
                } else {
                    CoreProfiles[id.toLowerCase()] = resource;
                }

                break;
            case 'OperationDefinition' :
                //Operations
                var r = resource.resource;
                if (! r) {
                    console.log('There is an operation definition that has no resource defined: '+ resource.id)
                } else {
                    var type = r[0].toLowerCase();
                    Operations[type] = Operations[type] || []
                    Operations[type].push(resource)
                }



                break;
            default :
                console.log('Unknown resource type in profiles-resources: '+ type)

        }


    })

    console.log(CoreProfiles);

}

function getExtensionDefinitions(){
    var fileName = publishRoot + "extension-definitions.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());
    //console.log(json)
    json.entry.forEach(function(entry) {
        var ed = entry.resource;

        if (ed.contextType == 'resource') {
            var path = ed.context[0];  //just get the first one...
            var ar = path.split('.');

            var type = ar[0].toLowerCase();

            if (type == '*') {      //a randomn choice...
                type = 'patient'
            }

            //console.log(type)

            ExtensionDefinitions[type] = ExtensionDefinitions[type] || []
            ExtensionDefinitions[type].push(ed);
        }


    })
    console.log('ed',ExtensionDefinitions['visionprescription']);
}

function getSearchParameters(){
    var fileName = publishRoot + "search-parameters.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());
    json.entry.forEach(function(entry) {
        var ed = entry.resource;

        var target = ed.base[0];
        if (!target) {
            console.log('Search Parameter '+entry.fullUrl + ' has no base')
        } else {
            target = target.toLowerCase()
            SearchParameters[target] = SearchParameters[target] || []
            SearchParameters[target].push(ed);
        }
    })

}