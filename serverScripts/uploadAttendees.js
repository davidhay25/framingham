#!/usr/bin/env node

var syncRequest = require('sync-request');

var upload = false;
var errors = 0;


var fileName = "/Users/davidha/Dropbox/development/ecosystem/artifacts/attendees-II.txt";
//var urlRoot = "http://localhost:4000/config/";
var urlRoot = "http://snapp.clinfhir.com:4000/config/";


//var contents = fs.readFileSync(pathToFile,{encoding:'utf8'})

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(fileName)
});

lineReader.on('line', function (line) {
   // console.log('Line from file:', line);
    var ar = line.split('\t');

    var name = ar[0];
    name = name.replace(/\"/g,"");
    name = name.trim();
console.log(name)
    var id = 'id' + new  Date().getTime(), idHash = {};     //default id
    var ar1 = name.split(',')
    if (ar1.length == 2) {
        console.log(ar1);
        name = ar1[1].trim() + " " + ar1[0]
        id = ar1[1].trim() + ar1[0]
    }
    if (idHash[id]) {
        //2 people with the same name!!!
        id = id + getRandomInt(100);        //choose a random suffix 0->100
    }





    if (name) {
        var json = {id:id,name:name,organization:ar[1]};

        var options = {}

        var url = urlRoot + "person"
        options.body = JSON.stringify(json);
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




});



function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}