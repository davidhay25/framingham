#!/usr/bin/env node

/*
* pre-req
* update from repo
* run build locally build/publish.sh
* run transform  build/tools/xslt/ProfileToQAView.xslt against build/publish/profiles-resources.xml
*
*
*
*
* */


var fs = require('fs');

var resourceSource = "/Users/davidha/fhirbuild/build/source/";
var publishRoot = "/Users/davidha/fhirbuild/build/publish/";
var qaOutputRoot = "/Users/davidha/Dropbox/fhirQA2018/";        //where to place the output files...
var resourcesList = "/Users/davidha/Dropbox/development/ecosystem/artifacts/resources.txt";     //the list of resource tyopes

var saveIndividualOtherFiles = false;   //whether to generate individual 'other' files...

var arAllResourceTypes = getAllResourceTypes(resourcesList);

var ExtensionDefinitions = {}
var SearchParameters = {}
var Profiles = {};
var CoreProfiles = {};      //the descripto

var Operations = {};


//set up the hash's used when creating the individual resource pages...
getSearchParameters();
getExtensionDefinitions();
getCoreProfiles();      //includes operations
getOtherProfiles();

createValueSets();      //generate the valuesets page

createDatatypes();      //generate the datatype page

//generate the 'other' files
fs.readdir(resourceSource, function(err, list) {
    var allContent = "";        //the content for all files...
    var cnt = 0, section = 0
    list.forEach(function (folderName) {
        var lcFolderName = folderName.toLowerCase();

        var fileOrFolderName = resourceSource + folderName;
        var stat = fs.statSync(fileOrFolderName);
        if (! stat.isDirectory()) {     //ignore folders...
            if (fileOrFolderName.indexOf('.html') > -1) {

                if (cnt == 10) {
                    section ++
                    var header =  "==============================================================================="
                    header += "<h1>Section: " + section + "</h1>"
                    header += "==============================================================================="

                    allContent = header + allContent
                    cnt = 0;
                    console.log(section)

                    var outFileName = qaOutputRoot + 'others/allContentSection'+ section + '.html';
                    fs.writeFileSync(outFileName,allContent);
                    allContent = ""

                } else {
                    cnt++
                }


                var ar = fileOrFolderName.split('/');
                var outFileName = qaOutputRoot + 'others/'+ ar[ar.length-1];
                var contents = fs.readFileSync(fileOrFolderName).toString();
                allContent += "<h2>" + folderName + "</h2>"
                allContent += getCleanBody(contents);
                allContent += '<hr/>';

                if (saveIndividualOtherFiles) {
                    fs.writeFileSync(outFileName,contents)
                }
            }
        }
    });

    if (allContent) {
        section ++
        var header =  "==============================================================================="
        header += "<h1>Section: " + section + "</h1>"
        header += "==============================================================================="

        allContent = header + allContent
        var outFileName = qaOutputRoot + 'others/allContentSection'+ section + '.html';
        fs.writeFileSync(outFileName,allContent);
    }

   // outFileName = qaOutputRoot + 'others/allContentInOneFile.html'
   // fs.writeFileSync(outFileName,allContent)
    console.log("Total 'other' pages:"+cnt)

});




//generate the individual Resource files
fs.readdir(resourceSource, function(err, list) {


    var lstResources = []
    list.forEach(function(folderName){
        var lcFolderName = folderName.toLowerCase();
        var fileOrFolderName = resourceSource+folderName;
        fs.stat(fileOrFolderName,function(err,stat){
            //See if this folder is on the list of valid resource types...
            if (stat.isDirectory() && arAllResourceTypes.indexOf(lcFolderName) > -1) {
                // a folderName should be equivalent to a resource type

                var html = '<html xmlns="http://www.w3.org/TR/REC-html40"><head>';
                html += "<title>Resource: "+folderName+"</title>";
                html += '<meta name="ProgId" content="Word.Document"></meta>';
                html += '<style type="text/css">pre {mso-no-proof:yes} code {mso-no-proof:yes}</style></head>';
                html += '<body lang="EN-US" style="mso-ansi-language:EN-US">';

                html += "<h1>Resource type: "+folderName+"</h1>";

                //list of elements
                if (CoreProfiles[lcFolderName]) {
                    var SD = CoreProfiles[lcFolderName];


                    for (var property in SD) {
                        if (['description','purpose','copyright'] > -1) {
                            html += "<h2>"+property+"</h2>";
                            html += SD[property];
                        }
                    }

                    html += "<h2>Description</h2>";
                    html += SD.description;


                    html += "<h2>Elements</h2>";
                    html += "<table border='1'><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
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

                    if (fs.existsSync(fileName)) {
                        var contents = fs.readFileSync(fileName).toString();
                        html += contents;
                    }
                 });



                //now add search parameters
                html += '<h2>Search Parameters </h2>';

                var type = folderName.toLowerCase();
                if (SearchParameters[type]) {
                    html += "<table border='1'>";
                    SearchParameters[type].forEach(function(sp){

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

                if (ExtensionDefinitions[type]) {
                    html += "<table border='1'>";
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
                        html += "<table border='1'><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
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
                lstResources.push({name:folderName,size:html.length});

                var temp = "";
                lstResources.forEach(function (item) {
                    temp += item.name + "," + item.size + '\n';
                })

                fs.writeFileSync(qaOutputRoot + "allResourceNames",temp);


            }

        })
    })




})


function createValueSets() {
    var fileName = publishRoot + "valuesets.json"
    var contents = JSON.parse(fs.readFileSync(fileName).toString());




    //first create a hash of valuesets by committee
    var hashCommittee = {}

    contents.entry.forEach(function(entry) {
        var resource = entry.resource;
        var wg = getExtensionValue(resource.extension,'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg');
        wg = wg || 'fhir';        //default is FHIR-i
        hashCommittee[wg] = hashCommittee[wg] || []
        hashCommittee[wg].push(resource)
    })

    //now iterate through the resources. Create separate files for each wg
    for (var prop in hashCommittee) {
        var value = hashCommittee[prop]


        var html = '<html xmlns="http://www.w3.org/TR/REC-html40"><head>';
        html += "<title>ValueSets</title>";
        html += '<meta name="ProgId" content="Word.Document"></meta>';
        html += '<style type="text/css">pre {mso-no-proof:yes} code {mso-no-proof:yes}</style></head>';
        html += '<body lang="EN-US" style="mso-ansi-language:EN-US">';

        html += "<h1>Terminology</h1>";

        value.forEach(function(resource){

            switch (resource.resourceType) {
                case 'ValueSet' :
                    html += '<h2>ValueSet: '+ resource.name +'</h2>'
                    html += resource.description
                    break;
                case 'CodeSystem' :

                    if (resource.concept) {     //only include the codesystems that are enumerating concepts
                        html += '<h2>CodeSystem:'+ resource.name +'</h2>'
                        html += resource.description
                        html += '<table border="1">';
                        html += '<tr><th>Code</th><th>Display</th><th>Definition</th></tr>'
                        resource.concept.forEach(function(con){
                            html += '<tr>';
                            html += '<td valign="top">'+con.code+'</td>';
                            html += '<td valign="top">'+con.display+'</td>';
                            html += '<td valign="top">'+con.definition+'</td>';
                            html += '</tr>';
                        })

                        html += '</table>';
                    }

                    break;
            }
        })

        html += "</body></html>";

        var outFileName = qaOutputRoot + '/terminology/'+prop + '.html';
        fs.writeFileSync(outFileName,html)



    }





}

function createDatatypes() {
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
        html += "<table border='1'><tr><th>Path</th><th>Short</th><th>Definition</th><th>Comments</th></tr>";
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
    html += "</body></html>";

    var outFileName = qaOutputRoot + 'Datatypes-qa.html';
    fs.writeFileSync(outFileName,html)


}




//generate the ValueSet


//gets both profiles and operations
function getOtherProfiles(){
    var fileName = publishRoot + "profiles-others.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());

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



}

//gets both profiles and operations
function getCoreProfiles(){
    var fileName = publishRoot + "profiles-resources.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());

    json.entry.forEach(function(entry) {
        var resource = entry.resource;
        delete resource.text;

        var type = resource.resourceType
        switch (type) {
            case 'CompartmentDefinition':
            case 'CapabilityStatement':
            //these can all be ignored....

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



}

function getExtensionDefinitions(){
    var fileName = publishRoot + "extension-definitions.json"
    var json = JSON.parse(fs.readFileSync(fileName).toString());

    json.entry.forEach(function(entry) {
        var ed = entry.resource;

        if (ed.contextType == 'resource') {
            var path = ed.context[0];  //just get the first one...
            var ar = path.split('.');

            var type = ar[0].toLowerCase();

            if (type == '*') {      //a randomn choice...
                type = 'patient'
            }



            ExtensionDefinitions[type] = ExtensionDefinitions[type] || []
            ExtensionDefinitions[type].push(ed);
        }


    })

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

function getExtensionValue(arExt,inUrl) {

    if (arExt) {

        for (var i=0; i<arExt.length; i++) {
            var ext = arExt[i]

            if (ext.url == inUrl) {

                if (ext.valueCode) {

                    return ext.valueCode;       //'cause we know that it will be a code...
                }
                if (ext.valueString) {

                    return ext.valueString;
                }
            }
        }
    }


}

//get the content of an html document
function getCleanBody(content) {
    var i = content.indexOf("<body");
    if (i > -1) {
        content = content.substr(i+6)
    }
    i = content.indexOf("</body");
    if (i > -1) {
        content = content.substr(0,i)
    }








    content = removeAllCodes(content,'[%','%]')
    content = removeAllCodes(content,'<%','%>')
    content = removeAllCodes(content,'<script','</script>')
    content = removeAllCodes(content,'<link','/>')

    return content;



}

function removeAllCodes(content,start,end) {
    var s = removeCode(content,start,end)
    while (s) {
        content = s;
        s = removeCode(content,start,end)
    }
    return content;
}

function removeCode(string, start, end) {
    var s;
    var g = string.indexOf(start);
    if (g > -1) {
        //if (g ==0 ) {g = 1}    //if the start is the very start
        var g1 = string.indexOf(end,g);
        if (g1 > -1) {

            s = string.substr(0,g -1) + string.substr(g1+end.length)
            return s
        }
    }
}


function getAllResourceTypes(fileName) {
    var contents = fs.readFileSync(fileName).toString();

    var ar = contents.split('\n');
    return ar;
}