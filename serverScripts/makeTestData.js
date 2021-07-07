#!/usr/bin/env node

//Create test data for an event for load testing. Run after the event has been created...

//get the Event code
let eventCode = process.argv[2];
if (!eventCode) {
    console.log("No event code specified. Must be in the command eg: importEvent.js test")
    process.exit()
}

console.log("Setting test data for " + eventCode)
//const eventCode = "tst"
const request = require('request');
const fhirServer = "http://home.clinfhir.com:8054/baseR4/";    //for saving the config in a binary resource
const MongoClient = require('mongodb').MongoClient;

//get the requested config
let config = null;      //the config retrieved from the server
let thisEventDb = null;       //the database that holds this event details

let url = fhirServer + "/Binary/ct-" + eventCode
let options = {
    method: 'GET',
    uri: url,
    'content-type': 'application/fhir+json'
};


request(options, function (error, response, body) {
    //console.log(response.statusCode, body)

    if (response.statusCode == 404 || response.statusCode == 410) {
        //not found or deleted
        console.log("Config for " + eventCode + " not found or deleted")
        process.exit()
    } else {
        try {
            let resource = JSON.parse(body);
            config = JSON.parse(Buffer.from(resource.data, 'base64').toString('ascii'))

            addTestData(config)
        } catch (ex) {
            console.log(err)
            process.exit()
        }

    }
})

function addTestData(config) {
    MongoClient.connect('mongodb://localhost:27017', function(err, dbClient) {
        if (err) {
            console.log(err);
            console.log('>>> Mongo server not running')
            process.exit()
        } else {
            thisEventDb = dbClient.db(eventCode);
            console.log("Connected to db...")

            //create an array of test users
            let arUsers = []
            let cnt = 1000
            let idBase = "id" + new Date().getTime()
            for (var i=0; i< cnt; i++) {
                let id = idBase + i
                let user = {id:id,name:'user'+i}
                console.log(user)
                arUsers.push(user)
            }

            //create an array of test results
            let arResults = []
            let cntResults = 1000
            let idResultsBase = "idr" + new Date().getTime()
            for (var i=0; i< cntResults; i++) {
                let id = idResultsBase + i
                let result = {type:'direct',text:'pass',note:'This is a note to make sure that the result object is a representative size'}
                result.trackid = config.tracks[0].id
                result.scenarioid = config.tracks[0].scenarios[0].id
                result.id = id;
                arResults.push(result)
            }


            //save the users in the db
            insertCollection(thisEventDb,'person', arUsers).then(
                function (data){
                    console.log('updated users')


                    insertCollection(thisEventDb,'result', arResults).then(
                        function (data){
                            console.log('updated results')


                            console.log('done.')
                            process.exit();
                        }, function (err) {
                            console.log(err)
                        }
                    )


                    //console.log('done.')
                    //process.exit();
                }, function (err) {
                    console.log(err)
                }
            )

        }})


}






return;


request(options, function (error, response, body) {
    //console.log(response.statusCode, body)

    if (response.statusCode == 404 || response.statusCode == 410) {
        //not found or deleted
        console.log("Config for " + eventCode + " not found or deleted")
        process.exit()
    } else {
        try {
            let resource = JSON.parse(body);
            config = JSON.parse(Buffer.from(resource.data, 'base64').toString('ascii'))

            performImport()
        } catch (ex) {
            console.log(err)
            process.exit()
        }

    }
})

/*
let fs = require("fs")

let fileName = "../artifacts/eventConfig-" + eventCode + ".json";

let contents = fs.readFileSync(fileName, {encoding: 'utf8'});
let config = JSON.parse(contents)


*/


function performImport(){
//connect to the server and populate the list of databases (each db is a connectathon event)
    MongoClient.connect('mongodb://localhost:27017', function(err, dbClient) {
    if (err) {
        console.log(err);
        console.log('>>> Mongo server not running')
        process.exit()
    } else {
        thisEventDb =  dbClient.db(eventCode);
        console.log("Connected to db...")
        console.log(config)
        console.log('------------------------------------')
        if (config.servers) {
            insertCollection(thisEventDb,'server', config.servers).then(
                function (data){

                }, function (err) {
                    console.log(err)
                }
            )
        }
        if (config.clients) {
            insertCollection(thisEventDb,'client', config.clients).then(
                function (data){

                }, function (err) {
                    console.log(err)
                }
            )
        }
        if (config.IGs) {
            insertCollection(thisEventDb,'ig', config.IGs).then(
                function (data){

                }, function (err) {
                    console.log(err)
                }
            )
        }


        checkOtherDb(eventCode,config,thisEventDb,dbClient).then(
            function(){
                //set tracks.
                insertTracks(config,thisEventDb).then(
                    function(vo) {
                        //all ok
                        //console.log('tracks inserted...',vo)
                        if (vo.scenarios.length > 0) {
                            insertScenarios(vo.scenarios,thisEventDb).then(
                                function() {
                                    //ok
                                    process.exit()
                                },
                                function(err) {
                                    console.log(err)
                                    process.exit()
                                }
                            )
                        } else {
                            console.log('No scenarios to import')
                            process.exit()
                        }
                    },
                    function(err) {
                        console.log(err)
                        process.exit()

                    }
                )
            },
            function(err) {
                console.log(err)
                console.log('tracks & scenarios not updated')
                process.exit()
            }
        )


    }
})

}


//insert a collection, dropping the existing collection first
function insertCollection(db,collName,arData) {
    console.log('Info: Inserting '+ arData.length + ' records into '+ collName + "...")
    return new Promise(function(resolve,reject) {
        db.collection(collName).drop({},function(err){
            if (err) {
                if (err.code !== 26) {
                    reject("error during drop of " + collName)
                } else {
                    console.log("Info:" + collName + " did not exist")
                }
            }

            db.collection(collName).insertMany(arData,{},function(err,result){
                if (err) {
                    reject("error during insertMany into " + collName)
                } else {
                    console.log(result.insertedCount + ' records inserted into ' + collName)
                    resolve()

                }
            })
        })
    })

}

//Check that the event key is set up in other databases
function checkOtherDb(key,config,db,dbClient) {
    return new Promise(function(resolve,reject) {



        //drop the results. Don't bother waiting for it to finish
        db.collection("result").drop({},function(err){

        })



        let eventItem = {key:key,display:config.eventDescription,active:true, public:true}
        let mainEventDb = dbClient.db('eventDb')        //the connection to eventDb database - only 1 on the server

        mainEventDb.collection("event").update({key:key},eventItem,{upsert:true},function(err,result){
            if (err) {
                reject("scenario: error during updating eventDb database")
            } else {
               //upsert admin collection in the event database
                let adminItem = {key:key,name:config.eventDescription,alert:config.alert}

                db.collection("admin").update({key:key},adminItem,{upsert:true},function(err,result){
                    if (err) {
                        reject("scenario: error during update local admin collection")
                    } else {
                       resolve()
                    }


            })

        }}

        )

    })
}

//Scenario collection was created Track inserting
function insertScenarios(scenarios,db) {
    return new Promise(function(resolve,reject) {

        db.collection("scenario").drop({}, function (err) {
            if (err) {
                if (err.code !== 26) {
                    reject("scenario: error during drop")
                }
            }
            db.collection("scenario").insertMany(scenarios,{},function(err,result){
                if (err) {
                    reject("scenario: error during insertMany")
                } else {
                    console.log(result.insertedCount + ' scenarios inserted')
                    resolve({scenarios: scenarios})

                }
            })

        })
    })
}

//insert the tracks, returning the scenarios to which it refers
function insertTracks(config,db) {
    return new Promise(function(resolve,reject) {
        //let trackCollection = db.collection("track")
        //https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateMany

        //extract scenarios from track, and move to a separate collection
        let tracks = [], allScenarios = []
        config.tracks.forEach(function (track){
            //let mTrack = {name:track.name,description:}
            let scenarios = track.scenarios
            if (scenarios) {
                scenarios.forEach(function (scen,inx){
                    let id = new Date().getTime() + '-' + inx
                    scen.id = id
                    allScenarios.push(scen)
                    track.scenarioIds = track.scenarioIds || []
                    track.scenarioIds.push(id)
                    delete track.scenarios

                })
            }
            tracks.push(track)
        })

        db.collection("track").drop({},function(err){
            let doInsert = true;
            if (err) {
                if (err.code !== 26) {
                    reject("track:error during drop")
                }
            }


            db.collection("track").insertMany(tracks,{},function(err,result){

                    if (err) {
                        reject("track:error during insertMany")
                    } else {
                        console.log(result.insertedCount + ' tracks inserted')
                        resolve({scenarios: allScenarios})

                    }
                })

        })



    })
}