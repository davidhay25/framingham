#!/usr/bin/env node

//create the json file used by the importer to create an event from a csv file
const request = require('request');

const fhirServer = "http://home.clinfhir.com:8054/baseR4/";

let mainId = 'ct-con28'
const fs = require('fs')
const event = {id: mainId,key:"con28", tracks:[]}

let contents = fs.readFileSync("./CAT28.csv").toString();
let arTracks = contents.split('\n');
//console.log(ar.length)
//console.log(ar)
arTracks.forEach(function (lne,ctr){
    lne = lne.replace("\r","")
    let ar = lne.split(',')
    console.log(lne,ar)
    let track = {id:"trk"+ new Date().getTime() + ctr}
    track.name = ar[0]
    track.description = ar[0]
    track.url = ar[1]
    track.key = "trck"+ctr;
    track.clientRoles = [{name:"Client",description:"Generic client"}]
    track.serverRoles = [{name:"Server",description:"Generic server"}]
    track.scenarios = [{name:"General",description:"General testing",id : "scn"+ new Date().getTime() + ctr}]


    event.tracks.push(track)
})


let b64 = Buffer.from(JSON.stringify(event)).toString('base64');
let resource = {id:mainId,resourceType: "Binary", "content-type": "application/json", data: b64}


fs.writeFileSync("./CAT28-binary.json",JSON.stringify(resource))

fs.writeFileSync("./CAT28.json",JSON.stringify(event))

let url = fhirServer + "Binary/" + mainId
console.log(url)
let options = {
    method: 'PUT',
    uri: url,
    body: JSON.stringify(resource),
    'content-type': 'application/fhir+json'
};

request(options, function (error, response, body) {
    console.log(response.statusCode)

    if (response.statusCode !== 200 && response.statusCode !== 201) {
        //not found or deleted
        console.log("Url: " + url + " failed")
        process.exit()
    } else {

    }
})