#!/usr/bin/env node
//http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#allow-pm2-to-bind-applications-on-ports-80-443-without-root
//https://medium.freecodecamp.org/supercharge-your-debugging-experience-for-node-js-3f0ddfaffbb2

/* To create a new event:
* add the database with the new event code
* add an 'admin' collection in the db with a document {key: name: }
* add an document in the 'eventDb' collection  {key: display: }
* update the artifacts/events.json doc (will rebuild the eventsDB collection on a new server from the doc)
* restart the server
* */


process.on('uncaughtException', function(err) {
    console.log('>>>>>>>>>>>>>>> Caught exception: ' + err);
});

require('events').EventEmitter.prototype._maxListeners = 100;
var express = require('express');
var request = require('request');
var session = require('express-session');

var bodyParser = require('body-parser');

var fs = require('fs');

let reportModule = require('./reportModule.js')

//this supports the administration function - eg setup the tracks for a new event

let adminModule = require('./adminModule.js')


var hashDataBases = {};         //hash for all connected databases

//todo Note - this is needed to avoid an error about maxListeners - but there could be a code issue to review - see https://stackoverflow.com/questions/8313628/node-js-request-how-to-emitter-setmaxlisteners
require('events').EventEmitter.defaultMaxListeners = 15;

//the known databases (or events)
var dbKeys = require('./artifacts/events.json')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";     //allow self signed certificates
useSSL = false;

//right now, we're using the con27 database for the IGs. May move to a separate 'common' database...
let connIG = {};        //the connection object to the IG db
let igDb = "con27"     //the database where the IGs are located. collection is 'IG'. May be other resources over time...

//to allow local testing
if (process.env.ig) {
    igDb = process.env.ig;
    console.log('Setting IG db to ' + igDb)
}

//  *************** temp for COF !!!
var dbName = 'cof';    //default database name...

//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=80; //8443;
}

var hashScenario = {};      //a hash of all the scenarios...
var hashTrack = {};         //a hash of all the tracks

var app = express();



//to serve up the static web pages - particularly the login page if no page is specified...
//Order of app.use() is important as we need to increase the size limit for json parsing...
app.use('/', express.static(__dirname,{index:'/connectathon.html'}));

//http://mongodb.github.io/node-mongodb-native/3.0/quick-start/quick-start/
const MongoClient = require('mongodb').MongoClient;

//connect to the server and populate the list of databases (each db is a connectathon event)
MongoClient.connect('mongodb://localhost:27017', function(err, client) {
    if (err) {
        console.log(err);
        console.log('>>> Mongo server not running')
    } else {
        console.log("Connected successfully to local server, dataBase="+dbName);

        //create the connection for the IG
        connIG = client.db(igDb)
        reportModule.setup(app,client,igDb)


        //get the list of events from the event database
        var eventDb =  client.db('eventDb');

        eventDb.collection("event").find({}).toArray(function(err,result){
            if (err) {
                console.log('Unable to access the event database')
            } else {

                if (result.length == 0) {
                    console.log('writing default events')
                    //this is the first time this has run on this server - set up the db from the json file...
                    eventDb.collection("event").insert(dbKeys,function(err,result){
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(result)

                            dbKeys.forEach(function(item){
                                hashDataBases[item.key] = client.db(item.key);
                            });
                        }
                    })
                } else {

                    dbKeys = result;
                    dbKeys.forEach(function(item){
                        hashDataBases[item.key] = client.db(item.key);
                        console.log(item.key)
                    });

                    /* - need to figure out which event databases to do this for
                    //write the initial snapshot and set the timer for the write
                    recordDbCount('con27')

                    //repeat snapshot at an interval (ms)
                    let repeatInterval = 15 * 60 * 1000     //every 15 minutes
                    setInterval(function (){
                        recordDbCount('con27')
                    }, repeatInterval)

                    */

                }
            }
        });
    }
});

//initialize the session...
app.use(session({
    secret: 'conManRules-OK',
    resave: false,
    saveUninitialized: true,        //was false
    cookie: { secure: false }   // secure cookies need ssl...
}));

if (useSSL) {
    //https://aghassi.github.io/ssl-using-express-4/
    var https = require('https');
    var sslOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
        passphrase:'ne11ieh@y'
    };
    https.createServer(sslOptions, app).listen(8443)
    console.log('server listening via TLS on port 8443');
} else {
    var http = require('http');
    http.createServer(app).listen(port)
    console.log('server listening  on port ' + port);
}

//check the db connection on every request - may be redundant...
app.use(function (req, res, next) {

    //allow html and js files to be returned - todo - these files should all be in a 'public' folder - or something better
    var url = req.url;

    if (url.indexOf('.html') > -1 || url.indexOf('.js') > -1 || url == '/' || url.indexOf('/icons/') > -1 ||
        url.indexOf('.css') > -1 || url.indexOf('.gif') > -1 ||url.indexOf('/public/') > -1 ||
        url.indexOf('/artifacts/') > -1 || url.indexOf('/fonts/') > -1 || url.indexOf('/qa') > -1 ){

        next();

    } else {
        //are we in a user session?

        var config = req.session['config'];         //the configuration for this user

        if (config && config.key) {
            //yep - there is a session...
            //there is a config and a key - this user
            var db = hashDataBases[config.key];     //the database connection

            if (db) {
                req.selectedDbCon = db;
                next()
            } else {
                res.status(404).send({msg:'Invalid database key:'+config.key})
            }
        } else {
            //not in a user session...
            console.log('no session ' + url)
            next();
        }
    }

});

var showLog = false;         //for debugging...

var bodyParser = require('body-parser')
var jsonParser       = bodyParser.json({limit:'50mb', type:'application/json'});
var urlencodedParser = bodyParser.urlencoded({ extended:true,limit:'50mb',type:'application/x-www-form-urlencoding' })

//https://stackoverflow.com/questions/29939852/mean-io-error-request-entity-too-large-how-to-increase-bodyparser-limit-ou

app.use(jsonParser);
app.use(urlencodedParser);
adminModule.setup(app,connIG);



//added for the con27 event to count the number of results over time. Will need further thought if I continue with it
//in particular, how to avoid hard coding the db name
function recordDbCount(dbName) {

    //let db = client.db(dbName)
    let db = hashDataBases[dbName];
    if (db) {
        db.collection('result').count({}, function(error, numOfDocs) {

            let doc = {type:'colCount',date:new Date(),resultCount:numOfDocs}

            db.collection("snapshot").insertOne(doc,function(err,result){
                if (err) {
                    console.log('Failed to insert to snapshot')
                } else {
                    console.log('wrote snapshot')
                }
            })
        });
    } else {
        console.log('Database '+ dbName + ' not found in hash')
    }
}

function recordAccess(req,data,cb) {
    var clientIp =
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress ||
        req.headers['x-forwarded-for'];

    if (clientIp) {
        clientIp = clientIp.replace('::ffff:',"");      //the prefix relates to v6...
    }

    if (req.selectedDbCon) {
        var audit = {ip:clientIp,date:new Date()};      //note date is UTC


        var options = {
            method:'GET',
            uri: 'https://api.iplocation.net/?ip=' + clientIp
        };

        request(options,function(error,response,body) {

            if (body) {
                var loc;

                try {
                    loc = JSON.parse(body);
                    audit.country = loc['country_name'];
                    audit.countryCode = loc['country_code2'];   //to make querying simpler


                    req.selectedDbCon.collection("accessAudit").insert(audit, function (err, result) {
                        if (err) {
                            console.log('Error logging access ',audit);
                            cb(err);
                        } else {
                            cb(audit);
                        }

                    });
                } catch (ex) {
                    console.log(ex)
                    cb(audit)
                }
            } else {
                cb(audit);
            }
        })

    } else {
        cb({err:'no database connection'})
    }
}


//====== access

/*
//--- temp fix
app.get('/fixresult',function(req,res){
    connIG.collection("person").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            let hash = {}}
            result.forEach(function (person){
                hash[person.id] = person
            })

        connIG.collection("result").find({status : {$ne : 'deleted' }}).toArray(function(err,result){

        })
        })
})

*/

//return all the users for a given database. Used when logging in to an event
app.get('/public/getUsers/:key',function(req,res){
    var key = req.params.key;

    if (hashDataBases[key]) {
        //we have established a connection to the given database
        hashDataBases[key].collection("person").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
            if (err) {
                res.send(err,500)
            } else {
                req.session['config'] = {key:key};      //record the database key in the session


                //remove all the passwords!
                result.forEach(function (user) {
                    delete user.password;
                });

                res.send(result)
            }
        })

    } else {
        //this is an unknown database
        res.send({msg:'unknown database:'+key},404)
    }
});

// === event management
app.get('/event/list',function(req,res){
    res.json(dbKeys)
});

app.get('/event/detail/:key',function(req,res){
    var key = req.params.key;
    if (hashDataBases[key]) {

        hashDataBases[key].collection("admin").find().toArray(function(err,result){
            if (err) {
                res.send(err,500)
            } else {
                res.send(result)
            }
        })

    } else{
        res.status(404)
    }

});


//sets the session for the specified event...
app.post('/public/setEvent',function(req,res) {
    var event = req.body;
    console.log('setEvent',event)
    if (hashDataBases[event.key]) {
        req.session['config'] = {key: event.key};      //record the database key in the session

        res.json(req.session['config']);
    } else {
        res.status(400).send({msg:'Invalid event key:'+event.key})
    }
});

//get all access records. todo This could become an AuditEvent in the future...
//a new record each time the app is loaded...
app.get('/accessAudit',function(req,res){
    //todo - need filtering options...
    req.selectedDbCon.collection("accessAudit").find({}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


//modStats
app.get('/getStats',function(req,res){

    if (!req.selectedDbCon) {
            res.status(500).json()
        } else {

        getStats(res,req.selectedDbCon);
    }
        async function getStats (res,db ) {
            let pipeline = [
                { $group: { _id: "$country",  count: { $sum: 1 } }},
                { $sort: { total: -1 } }
            ]
            let ar = await db.collection('accessAudit').aggregate(pipeline).toArray()

            let pipeline1 = [
                { $group: { _id: "$ip", 'country' : { "$last": "$country"}, count: { $sum: 1 } }},
                { $sort: { total: -1 } }
            ]

            let ar1 = await db.collection('accessAudit').aggregate(pipeline1).toArray()
            let ar2 = await db.collection('snapshot').find({}).toArray();
            res.json({uniqueCountries: ar, uniqueUsers : ar1, snapshots : ar2})
        }



})

//record the access - but don't wait, or bother about an error...
app.post('/startup',function(req,res){
    var data = req.body;    //may be empty
    recordAccess(req,data,function(data){
        res.json(data)
    });
});

// ============ web interface - added for confluence
app.get('/web/servers/:eventCode',function(req,res){

    let eventCode = req.params.eventCode;

    var eventDb =  hashDataBases[eventCode];

    if (eventDb) {
        let ar = []
        ar.push("<html><title>Servers</title> <head>")

        ar.push("<link rel='stylesheet' type='text/css' href='https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css'/>")

        ar.push("</head><body style='padding: 8px'>")
        eventDb.collection("server").find({}).toArray(function(err,result){
            if (err) {
                res.send(err,500)
            } else {
                //generate a simple page. Should probably use a templating engine of some sort
                ar.push("<h3>Servers for " + eventCode + " connectathon</h3>")
                ar.push("<table class='table table-bordered table-condensed'>")
                ar.push("<tr><th>Name</th><th>Description</th><th>Notes</th><th>FHIR Version</th><th>Address</th></tr>")
                result.forEach(function (server){
                    ar.push("<tr>")
                    ar.push("<td>" + server.name + "</td>")
                    ar.push("<td>" + (server.description || '') + "</td>")
                    ar.push("<td>" + (server.notes || '') + "</td>")
                    ar.push("<td>" + (server.fhirVersion || '') + "</td>")
                    ar.push("<td>" + server.address+ "</td>")
                    ar.push("</tr>")
                })
                ar.push("</table>")
                ar.push("</body></html>")

                res.send(ar.join('\n'))
            }
        })
    } else {
        let err = "Event code " + eventCode + " not known"
        res.send(err,404)
    }


});

//========= proxy endpoints. Used by the connectathon UI to query a server, and by CDS-hooks function =======

app.get('/proxyfhir/*',function(req,res) {
    var fhirQuery = req.originalUrl.substr(11); //strip off /orionfhir
    var options = {
        method: 'GET',
        uri: fhirQuery,
        encoding : null
    };

    options.headers={accept:'application/fhir+json'};

    request(options, function (error, response, body) {
        if (error) {
            console.log('error:',error)
            var err = error || body;
            res.send(err,500)
        } else if (response && response.statusCode !== 200) {
            //console.log(response.statusCode)
            res.send(body,response.statusCode);//,'binary')
        } else {
            res.send(body);//,'binary')
        }
    })
});
app.post('/proxyfhir/*',function(req,res) {
    var fhirQuery = req.originalUrl.substr(11); //strip off /orionfhir
    var payload = req.body;
    var options = {
        method: 'POST',
        uri: fhirQuery,
        body:JSON.stringify(payload),
        headers: {'content-type':'application/json'},
        encoding : null
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log('error:',error)
            var err = error || body;
            res.send(err,500)
        } else if (response && response.statusCode !== 200) {
            console.log('---------------');
            console.log(response.statusCode);
            console.log(body.toString());
            console.log('---------------');
            res.send(body,response.statusCode);//,'binary')
        } else {

            res.send(body);//,'binary')

        }
    })
});

//================================ clients =======================
//get all clients
app.get('/client',function(req,res){
    req.selectedDbCon.collection("client").find({}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//add/update a single client
app.post('/client',function(req,res){
    var client = req.body
    req.selectedDbCon.collection("client").update({id:client.id},client,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//================= IG's ==========

app.get('/IG',function(req,res){

    req.selectedDbCon.collection("ig").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        //connIG.collection("ig").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })

})

app.post('/IG',function(req,res){
    var IG = req.body

    //let Conn = req.selectedDbCon;

    //connIG.collection("ig").update({id:IG.id},IG,{upsert:true},function(err,result){
    req.selectedDbCon.collection("ig").update({id:IG.id},IG,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//================================ servers =======================
//get all servers
app.get('/server',function(req,res){
    req.selectedDbCon.collection("server").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            if (result) {
                result.forEach(function (svr){
                    delete svr.capStmt;         //remove the capability statement to reduce size
                })
            }
            res.send(result)
        }
    })
});

//add or updates a single server
app.post('/server',function(req,res){

    var server = req.body;
    req.selectedDbCon.collection("server").update({id:server.id},server,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


//find all servers that claim to support a type or operation
app.get('/server/query/:search',function (req,res){
    let searchString = req.params.search.toLowerCase();       //todo might be an operation name in the future
    console.log(searchString)
    req.selectedDbCon.collection("server").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            if (result) {
                let response = {servers:[]}
                result.forEach(function (svr){

                  if (svr.capStmt) {

                      if (svr.capStmt.rest && svr.capStmt.rest.length > 0) {

                          //search for Resource types
                          let ar = svr.capStmt.rest[0].resource.filter(item => item.type.toLowerCase() == searchString)
                          if (ar.length > 0) {
                              let item = {id:svr.id,name:svr.name,description:svr.description,notes:svr.notes}
                              item.definition = ar[0];
                              item.matchReason = "Supported resource type"
                              item.matchType = "Type"
                              response.servers.push(item)
                          }


                            //search for resource operations
                          svr.capStmt.rest[0].resource.forEach(function (res) {
                              if (res.operation) {
                                  res.operation.forEach(function (op) {
                                      if (op.name && op.name.toLowerCase() == searchString) {
                                          let item = {id:svr.id,name:svr.name,description:svr.description,notes:svr.notes}
                                          item.definition = res;
                                          item.matchReason = "Resource level operation"
                                          item.matchType = "Type"
                                          response.servers.push(item)
                                      }
                                  })
                              }
                          })
                        //search for interactions (operations) at the server root level

                          if (svr.capStmt.rest[0].operation) {
                              let ar1 = svr.capStmt.rest[0].operation.filter(item => item.name.toLowerCase() == searchString)

                              if (ar1.length > 0) {
                                  //should only be a single entry...
                                  let item = {id:svr.id,name:svr.name,description:svr.description,notes:svr.notes}
                                  item.definition = ar1[0];
                                  item.matchReason = "Root level operation"
                                  item.matchType = "Root"
                                  response.servers.push(item)
                              }
                          }


                      }
                  }
                })
                res.send(response)
            } else {
                res.send({})
            }

        }
    })

})

//============================== results ===============
//get all results
app.get('/result',function(req,res){
    req.selectedDbCon.collection("result").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


app.delete('/result/:id',function(req,res){
    var id = req.params.id;       //the id of the result to delete
    req.selectedDbCon.collection("result").update({id:id},{$set: {status:'deleted'}},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result.result)
        }
    })

});


app.put('/result',function(req,res){
    var result = req.body;
    result.issued = new Date();
    let refDate = new Date("2021-05-16")
    //difference to 10 minute blocks
    let diff = parseInt((new Date().getTime() - refDate.getTime()) / (10 * 60 * 1000))
    result.timeSlot = diff;
    req.selectedDbCon.collection("result").update({id:result.id},result,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//============================= links ==============
//get all links
app.get('/link',function(req,res){
    req.selectedDbCon.collection("link").find({active:true}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//add a single link
app.post('/link',function(req,res){
    var link = req.body;
    delete link._id;
    req.selectedDbCon.collection("link").update({id:link.id},link,{upsert:true},function(err,result){
        if (err) {
            res.status(500).send(err)
        } else {
            res.send(result)
        }
    })
});

//============================= persons ==============
//get all people
app.get('/person',function(req,res){
    //db.collection("person").find({}).sort( { name: 1 }).collation({locale:'en',strength:2}).toArray(function(err,result){
    req.selectedDbCon.collection("person").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//add/update a single person. This will check the id
app.post('/person',function(req,res){
    var person = req.body;
    delete person._id;
    req.selectedDbCon.collection("person").update({id:person.id},person,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


//add/update a scenarioGraph (Logical Model) result
app.put('/scenarioGraph',function(req,res){
    var data = req.body;
    data.issued = new Date();
    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.update({id:data.id},
        {$set: {isDirty:data.isDirty,items:data.items,scenarioNotes:data.scenarioNotes}},function(err,result){
        if (err) {
            console.log(err)
            res.send(err,500)
        } else {
            if (result.result.n == 0) {     //no matches found
                //no updates, this is a new document
                console.log('inserting...')
                collection.insertOne(data,function(err,result){
                    if (err) {
                        res.send(err,501)
                    } else {
                        res.send(result)
                    }
                })
            } else {
                //this is an update
                res.send(result)
            }
        }
    })
});

//get a single scenarioGraph by Id
app.get('/oneScenarioGraph/:graphid',function(req,res) {

    var graphId = req.params.graphid;

    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.find({id:graphId}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {

                res.send(result[0])
            } else {
                res.send([])
            }
        }
    })
});

//get an index of all the graphs for all tasks
app.get('/scenarioGraph',function(req,res) {



    var collection = req.selectedDbCon.collection('scenarioGraph')
// collection.find({},{projection:{id:1,name:1,userid:1,scenarioid:1}}).toArray(function (err, result) {
    collection.find({},{projection:{id:1,name:1,userid:1,scenarioid:1}}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {
                //console.log(result)
                res.send(result)
            } else {
                res.send([])
            }
        }
    })
});

/* not storing trackid for all graphs...
//get all the graph indexes for a  specific track
app.get('/scenarioGraphForTrack/:trackid',function(req,res) {

    var trackId = req.params.trackid;
    //console.log(userid,scenarioid)
    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.find({trackid:trackId},{projection:{id:1,name:1,userid:1,scenarioid:1}}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {
                res.send(result)
            } else {
                res.send([])
            }
        }
    })
});
*/


//get all the graph indexes for a  specific scenario
app.get('/scenarioGraph/:scenarioid',function(req,res) {

    var scenarioId = req.params.scenarioid;
    //console.log(userid,scenarioid)
    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.find({scenarioid:scenarioId},{projection:{id:1,name:1,userid:1,scenarioid:1}}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {
                res.send(result)
            } else {
                res.send([])
            }
        }
    })
});

//get a specific scenarioGraph for a user and a scenario. Should only be 1...
app.get('/scenarioGraph/:userid/:scenarioid',function(req,res) {

    var userId = req.params.userid;
    var scenarioId = req.params.scenarioid;

    var collection = req.selectedDbCon.collection('scenarioGraph')

    clinicalFind(collection,userId,scenarioId,res)
});

//add a comment to a specific graph
app.put('/scenarioGraphComment',function(req,res) {
    var id = req.params.id;

    var comment = req.body;
    comment.date = new Date();

    var collection = req.selectedDbCon.collection('scenarioGraph')
    collection.update({id:comment.graphid}, {$push: {comments:comment}},function(err,result){
        if (err) {
            console.log(err)
            res.status(500).send(err);
        } else {
            res.send();
        }
    })


    }
);


//add/update a lmCheck (Logical Model) result
app.put('/lmCheck',function(req,res){
    var result = req.body;
    result.issued = new Date();
    var collection = req.selectedDbCon.collection('lmCheck')
    clinicalUpdate(collection,result,res)

});




function clinicalUpdate(collection,data,res) {
    collection.update({id:data.id},data,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
}

//get a specific lmCheck for a user and a scenario. Should only be 1...
app.get('/lmCheck/:userid/:scenarioid',function(req,res) {

    var userId = req.params.userid;
    var scenarioId = req.params.scenarioid;

    var collection = req.selectedDbCon.collection('lmCheck')

    clinicalFind(collection,userId,scenarioId,res)

});

function clinicalFind(collection,userId,scenarioId,res) {

    collection.find({userid:userId,scenarioid:scenarioId}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {
                res.send(result[0])     //should only be 1...
            } else {
                res.send({})
            }

        }
    })
}

//get all the reviews for a scenario
app.get('/lmCheck/:scenarioid',function(req,res) {

    var scenarioid = req.params.scenarioid;

    req.selectedDbCon.collection("lmCheck").find({scenarioid:scenarioid}).toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {
                res.send(result)
            } else {
                res.send([])
            }
        }
    })
});

//get all the reviews for all scenarios
app.get('/lmCheckTrack/:trackId',function(req,res) {
//todo - add trachId to comment

    var trackId = req.params.trackId;
//req.selectedDbCon.collection("lmCheck").find({trackId:trackId}).toArray(function (err, result) {
    req.selectedDbCon.collection("lmCheck").find().toArray(function (err, result) {
        if (err) {
            res.send(err,500)
        } else {
            if (result.length > 0) {



                res.send(result)
            } else {
                res.send([])
            }
        }
    })
});


app.post('/lmCheckComment',function(req,res) {
        var comment = req.body;
        comment.date = new Date();
        var lmCheckId = comment.lmCheckId;

        console.log(comment)

        var collection = req.selectedDbCon.collection('lmCheck')
        collection.update({id:lmCheckId}, {$push: {comments:comment}},function(err,result){
            if (err) {
                console.log(err)
                res.status(500).send(err);
            } else {
                res.send();
            }
        })
    }
);


//=============== config items tracks, scenarios, roles

app.get('/config/:type',function(req,res){
    var type = req.params.type;

    req.selectedDbCon.collection(type).find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })

});

//todo - the uploaded won;t work no more....
app.post('/config/:type',function(req,res){
    var item = req.body;
    var type = req.params.type;
    req.selectedDbCon.collection(type).update({id:item.id},item,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })

});

app.post('/addScenarioToTrack/:track',function(req,res){
    var scenario = req.body;
    var trackId = req.params.track;

    //first add the scenario...
    req.selectedDbCon.collection('scenario').update({id:scenario.id},scenario,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {

            req.selectedDbCon.collection('track').update({id:trackId},{$addToSet:{scenarioIds:scenario.id}},function(err,result){
                if (err) {
                    res.send(err,500)
                } else {
                    res.send(result)
                }
            })
        }
    })
});

//add/update a track (Logical Model) result
app.post('/track',function(req,res){

    var data = req.body;
    data.issued = new Date();
    var collection = req.selectedDbCon.collection('track')

    //var fieldsToUpdate = {};        //basically everything except scenarioIds

    var fieldsToUpdate = JSON.parse(JSON.stringify(data));
    //temp - while I figure out how to do re-order safely...  delete fieldsToUpdate.scenarioIds;
   // delete fieldsToUpdate.scenarios;

/*
    fieldsToUpdate.name = data.name;
    fieldsToUpdate.roles = data.roles;
    fieldsToUpdate.trackType = data.trackType;
    fieldsToUpdate.allowGraph = data.allowGraph;
    fieldsToUpdate.allowDirectSample = data.allowDirectSample;
    fieldsToUpdate.termServer = data.termServer;
    fieldsToUpdate.confServer = data.confServer;
    fieldsToUpdate.dataServer = data.dataServer;
    fieldsToUpdate.resultRotals = data.name;
    fieldsToUpdate.persons = data.persons;
    fieldsToUpdate.toi = data.toi;
    fieldsToUpdate.chat = data.chat;
    fieldsToUpdate.LM = data.LM;
    fieldsToUpdate.description = data.description;
    fieldsToUpdate.IG = data.IG;
    fieldsToUpdate.expandQuery = data.expandQuery;
    fieldsToUpdate.endPoints = data.endPoints;
    fieldsToUpdate.links = data.links;
    fieldsToUpdate.status = data.status;


*/
    collection.update({id:data.id},
        {$set: fieldsToUpdate},function(err,result){
            if (err) {
                console.log(err)
                res.send(err,500)
            } else {
                //console.log(result.result.n)
                if (result.result.n == 0) {     //no matches found
                    //no updates, this is a new document
                    console.log('inserting...')
                    collection.insertOne(data,function(err,result){
                        if (err) {
                            res.send(err,501)
                        } else {
                            res.send(result)
                        }
                    })
                } else {
                    //this is an update
                    res.send(result)
                }
            }
        })
});






