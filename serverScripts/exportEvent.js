#!/usr/bin/env node

//export an existing event to the server...
//assume a copy has been placed in the local server
let eventCode = "con27"

const axios = require('axios')

//http://mongodb.github.io/node-mongodb-native/3.0/quick-start/quick-start/
const MongoClient = require('mongodb').MongoClient;

//connect to the server and the db
let eventDb;

MongoClient.connect('mongodb://localhost:27017', function(err, client) {
    if (err) {
        console.log(err);
        console.log('>>> Mongo server not running')
        process.exit();
    } else {
        eventDb = client.db(eventCode);
        console.log(eventDb)
        process.exit();
    }
});



function createExport(eventDb) {


}

function addTracks() {

}



