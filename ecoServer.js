#!/usr/bin/env node
//http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#allow-pm2-to-bind-applications-on-ports-80-443-without-root

var express = require('express');

var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');

var manageMod = require('./ecoModule');

var hashDataBases = {};         //hash for all connected databases

//var qaModule = require('qaModule');

//the known databases (or events)
var dbKeys = require('./artifacts/events.json')


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";     //allow self signed certificates
useSSL = false;


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
    if(err) {
        console.log(err);
        console.log('>>> Mongo server not running')
    } else {
        console.log("Connected successfully to local server, dataBase="+dbName);

        //get the list of events from the event database
        var eventDb =  client.db('eventDb');

        eventDb.collection("event").find({}).toArray(function(err,result){
            if (err) {
                console.log('Unable to access the event database')
            } else {
                //console.log(result)
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
                    //console.log('setting dbkeys',result)
                    dbKeys = result;

                    dbKeys.forEach(function(item){
                        hashDataBases[item.key] = client.db(item.key);
                    });

                }
            }
        });

/*

        //all the different databases on this server...
        dbKeys.forEach(function(item){
            hashDataBases[item.key] = client.db(item.key);
        });
*/

        //initialize the management module
        manageMod.setup(app,hashDataBases);

        //at server startup, read all the scenarios. We need this when creating the TestReport resource. it is neverupdated (at the moment)

        /* todo - move this to another place

        TODO DON'T DELETE UNTIL THAT HAS BEEN DONE

        db.collection("track").find({}).toArray(function(err,result){
            if (err) {
                console.log('Unable to load the tracks!')
            } else {
                result.forEach(function (track) {
                    hashTrack[track.id] = track;
                })
            }
        });

        db.collection("scenario").find({}).toArray(function(err,result){
            if (err) {
                console.log('Unable to load the scenarios!')
            } else {
                result.forEach(function (scenario) {
                    hashScenario[scenario.id] = scenario;
                })
            }
        })


        */

    }
});

//initialize the session...
app.use(session({
    secret: 'conManRules-OK?',
    resave: false,
    saveUninitialized: false,
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
    console.log(url)
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



function recordAccess(req,data,cb) {

    var clientIp = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    if (req.selectedDbCon) {
        var audit = {ip:clientIp,date:new Date()};      //note date is UTC

        audit.data = data;

        var options = {
            method:'GET',
            uri : "http://freegeoip.net/json/"+clientIp
        };

        request(options,function(error,response,body) {

            if (body) {
                var loc;
                try {
                    loc = JSON.parse(body);
                    audit.loc = loc;
                    audit.country = loc.country_name;   //to make querying simpler
                    audit.region = loc.region_name;     //to make querying simpler

                    req.selectedDbCon.collection("accessAudit").insert(audit, function (err, result) {
                        if (err) {
                            console.log('Error logging access ',audit);
                            cb(err);
                        } else {
                            cb();
                        }

                    });
                } catch (ex) {
                    cb()
                }
            } else {
                cb();
            }
        })

    }
}


//====== access

//return all the users for a given database. Used when logging in to an event
app.get('/public/getUsers/:key',function(req,res){
    var key = req.params.key;
   // console.log('/public/getUsers/:key')
    if (hashDataBases[key]) {
        //we have established a connection to the given database
        hashDataBases[key].collection("person").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
            if (err) {
                res.send(err,500)
            } else {
                req.session['config'] = {key:key};      //record the database key in the session
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
        console.log(hashDataBases[key])
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
    if (hashDataBases[event.key]) {
        req.session['config'] = {key: event.key};      //record the database key in the session
        res.json({});
    } else {
        res.status(400).send({msg:'Invalid event key:'+event.key})
    }
});

//login to an event
app.post('/public/loginDEP',function(req,res){

    var body = req.body;
    console.log(body);
    if (body) {
        //the userid and database key were sent in - ie the client is wanting to initialize the session from browser storage
        session['config'] = body;


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

//record the access - but don't wait, or bother about an error...
app.post('/startup',function(req,res){
    var data = req.body;    //may be empty
    recordAccess(req,data,function(){
        res.json({})
    });
});


//========= proxy endpoints. Used by the connectathon UI to query a server, and by CDS-hooks function =======

app.get('/proxyfhir/*',function(req,res) {
    var fhirQuery = req.originalUrl.substr(11); //strip off /orionfhir
    var options = {
        method: 'GET',
        uri: fhirQuery,
        encoding : null
    };

    options.headers={accept:'fhir+json'};

    request(options, function (error, response, body) {
        if (error) {
            console.log('error:',error)
            var err = error || body;
            res.send(err,500)
        } else if (response && response.statusCode !== 200) {
            console.log(response.statusCode)
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

    console.log(fhirQuery);
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
    // db.collection("client").find({}).sort( { name: 1 }).toArray(function(err,result){
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
   // db.collection("client").insert(req.body,function(err,result){
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
            res.send(result)
        }
    })
});

//add or updates a single server
app.post('/server',function(req,res){

    var server = req.body;
    req.selectedDbCon.collection("server").update({id:server.id},server,{upsert:true},function(err,result){

   // db.collection("server").insert(req.body,function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


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
    console.log(id)
    req.selectedDbCon.collection("result").update({id:id},{$set: {status:'deleted'}},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            console.log(result.result)
            res.send(result.result)
        }
    })

});

//return the results in TestReport format
//notes: result could have 'partial'
// could add a 'comment' field
//why is TestScript required?

app.get('/fhir/TestReport',function(req,res){
    req.selectedDbCon.collection("result").find({}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            var resultBundle = {resourceType:'Bundle',type:'searchset',entry:[]}
            result.forEach(function (rslt) {

                var tr = {resourceType:'TestResult',id:rslt.id,contained:[],extension:[]};

                tr.status = 'completed';
                tr.participant = [];


                //var tr = {resourceType:'TestResult',status:'completed',participant:[],test:[]};
                if (rslt.text == 'partial') {
                    tr.result = 'pass';
                    tr['_result'] = [{extension : {url:'http.clinfhir.com/fhir/StructureDefinition/testResult',valueCode:'partial'}}]
                } else {
                    tr.result = rslt.text;
                }

                tr.issued = rslt.issued;
                if (rslt.author) {
                    tr.tester = rslt.author.name;
                }

                if (rslt.server) {
                    var serverUrl = 'server/'+rslt.server.serverid;
                    tr.participant.push({type:'server',uri:serverUrl, display:rslt.server.name})
                }
                if (rslt.client) {
                    var clientUrl = 'client/'+rslt.client.clientid;
                    tr.participant.push({type:'client',uri:clientUrl, display:rslt.client.name})
                }

                tr.name = "";
                var track = hashTrack[rslt.trackid];
                if (track) {
                    tr.name += track.name
                }


                var scenario = hashScenario[rslt.scenarioid];
                if (scenario) {
                    tr.name += ' / ' + scenario.name
                }

                //now the comment
                if (rslt.note) {
                    tr.extension.push({url:'http.clinfhir.com/fhir/StructureDefinition/testResultComment',valueString:rslt.note})
                }

                //and any trackers
                if (rslt.trackers) {
                    rslt.trackers.forEach(function (tracker) {
                        tr.extension.push({url:'http.clinfhir.com/fhir/StructureDefinition/testResultTracker',
                            valueUrl:tracker.url})
                    })
                }

                //now the contained testScript resource. Set it to the scenario...
                var testScript = {id:rslt.id+'-script',resourceType:'TestScript',status:'active'};
                testScript.url = 'scenario/'+rslt.scenarioid;
                testScript.name = tr.name
                tr.contained.push(testScript);
                resultBundle.entry.push({resource:tr})


            });

            res.send(resultBundle)
        }
    })
});

//add a single result. This is always a put as the result can be updated
app.put('/result',function(req,res){
    var result = req.body;
    result.issued = new Date();
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
    //db.collection("link").insert(req.body,function(err,result){
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
    var result = req.body;
    result.issued = new Date();
    var collection = req.selectedDbCon.collection('scenarioGraph')

    clinicalUpdate(collection,result,res)
});


//get all the graphs for all tasks
app.get('/scenarioGraph',function(req,res) {

    res.send([])
    return;

    
    var collection = req.selectedDbCon.collection('scenarioGraph')


    collection.find({userid:'id1527157065008'}).toArray(function (err, result) {
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









    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.find().toArray(function (err, result) {
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

//get all the graphs for a  specific scenario
app.get('/scenarioGraph/:scenarioid',function(req,res) {

    var scenarioId = req.params.scenarioid;
    //console.log(userid,scenarioid)
    var collection = req.selectedDbCon.collection('scenarioGraph')

    collection.find({scenarioid:scenarioId}).toArray(function (err, result) {
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
    //console.log(userid,scenarioid)
    var collection = req.selectedDbCon.collection('scenarioGraph')

    clinicalFind(collection,userId,scenarioId,res)
});


//add/update a lmCheck (Logical Model) result
app.put('/lmCheck',function(req,res){
    var result = req.body;
    result.issued = new Date();
    var collection = req.selectedDbCon.collection('lmCheck')
    clinicalUpdate(collection,result,res)
    /*
    req.selectedDbCon.collection("lmCheck").update({id:result.id},result,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
    */
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

//get a specicif lmCheck for a user and a scenario. Should only be 1...
app.get('/lmCheck/:userid/:scenarioid',function(req,res) {

    var userId = req.params.userid;
    var scenarioId = req.params.scenarioid;
    //console.log(userid,scenarioid)
    var collection = req.selectedDbCon.collection('lmCheck')

    clinicalFind(collection,userId,scenarioId,res)
    /*
    req.selectedDbCon.collection("lmCheck").find({userid:userid,scenarioid:scenarioid}).toArray(function (err, result) {
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
    */
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







