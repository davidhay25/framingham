#!/usr/bin/env node

//CareConnect version 3 profiles...


var fs = require('fs');
var syncRequest = require('sync-request');

var upload = false;
var errors = 0;


var localFileRoot = "/Users/davidha/Dropbox/development/ecosystem/artifacts/";
var urlRoot = "http://localhost:4000/config/";
//var urlRoot = "http://snapp.clinfhir.com:4000/config/";
//var urlRoot = "http://snapp.clinfhir.com:4001/config/";

uploadArray(localFileRoot+'tracksREF.json',urlRoot+"track/",'tracks');
uploadArray(localFileRoot+'scenariosREF.json',urlRoot+"scenario/",'scenarios');
uploadArray(localFileRoot+'rolesREF.json',urlRoot+"role/",'roles');

function uploadArray(pathToFile,url,elementName) {
    var contents = fs.readFileSync(pathToFile,{encoding:'utf8'})
    try {
        var json = JSON.parse(contents);    //will be an array of objects

        var arItem = json[elementName]

        for (var i = 0; i < arItem.length; i++) {
            var item = arItem[i]

            //console.log(i,url)
            var options = {}

            options.body = JSON.stringify(item);
            options.headers = {"content-type": "application/json"}
            options.timeout = 20000;        //20 seconds

            var response = syncRequest('POST', url, options);

            console.log(response.statusCode)
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                console.log('--------------->   error uploading '+ url)
                console.log(response.body.toString())
                //return false
            } else {
                console.log('uploaded '+ url)
                ///return true;
            }

        }



        }  catch (ex) {
        console.log('error:',ex)
    }
}

