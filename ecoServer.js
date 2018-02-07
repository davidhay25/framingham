#!/usr/bin/env node

var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";     //allow self signed certificates

var dbName = 'connectathon';    //default database name...

//  *************** temp for COF !!!
var dbName = 'cof';    //default database name...

/* disable as will be running under pm2, which will trap errors and give a better message...
process.on('uncaughtException', function(err) {
    console.log('>>>>>>>>>>>>>>> Caught exception: ' + err);
});
*/


//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=4000; //8443;
}



//look for command line parameters...
process.argv.forEach(function (val, index, array) {


    var ar = val.split('=');
    if (ar.length == 2) {
        switch (ar[0]) {
            case 'db' :
                dbName = ar[1]
                console.log('Setting database to '+ dbName)
                break;
            case 'port' :
                port = ar[1];
                console.log('setting port to '+port )
                break;
        }
    }
});

var hashScenario = {};      //a hash of all the scenarios...
var hashTrack = {};         //a hash of all the tracks
var db;
//http://mongodb.github.io/node-mongodb-native/3.0/quick-start/quick-start/
const MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://localhost:27017', function(err, client) {
    if(err) {
        console.log(err);
        console.log('>>> Mongo server not running')
    } else {
        console.log("Connected successfully to local server, dataBase="+dbName);
        //db = client.db('connectathon');
        db = client.db(dbName);

        //at server startup, read all the scenarios. We need this when creating the TestReport resource. it is neverupdated (at the moment)

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
    }
});


var app = express();
app.use(bodyParser.json())



useSSL = false;

if (useSSL) {
    //https://aghassi.github.io/ssl-using-express-4/
    var https = require('https');
    var sslOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
        passphrase:'ne11ieh@y'
    };
    https.createServer(sslOptions, app).listen(8443)
    console.log('server listening via TLS on port ' + port);
} else {
    var http = require('http');
    http.createServer(app).listen(port)
    console.log('server listening  on port ' + port);
}

//check the db connection on every request - may be redundant...
app.use(function (req, res, next) {

    if (!db) {
        res.send({err:'Database could not be connected to. It may not be running...'},500)
    } else {
        //save in the audit if a PUT or a POST
        if (req.method == 'PUT' || req.method == 'POST') {
            var audit = {url:req.url,body:req.body,time:new Date(),method:req.method}
            db.collection("audit").insert(audit,function(err,result){
                if (err) {
                    res.send({err:'Unable to insert record into the audit database...'},500)

                } else {
                    next()
                }
            })


        } else {
            //this is a GET...
            next()
        }
    }

});

var showLog = false;         //for debugging...


var bodyParser = require('body-parser')
bodyParser.json();


function recordAccess(req,data,cb) {

    var clientIp = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    if (db) {
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

                    db.collection("accessAudit").insert(audit, function (err, result) {
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


//get all access records. todo This could become an AuditEvent in the future...
//a new record each time the app is loaded...
app.get('/accessAudit',function(req,res){
    //todo - need filtering options...
    db.collection("accessAudit").find({}).toArray(function(err,result){
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
    db.collection("client").find({}).toArray(function(err,result){
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
    db.collection("client").update({id:client.id},client,{upsert:true},function(err,result){
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

    db.collection("server").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
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
    db.collection("server").update({id:server.id},server,{upsert:true},function(err,result){

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
    db.collection("result").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
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
    db.collection("result").update({id:id},{$set: {status:'deleted'}},function(err,result){
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
    db.collection("result").find({}).toArray(function(err,result){
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
    db.collection("result").update({id:result.id},result,{upsert:true},function(err,result){
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
    db.collection("link").find({active:true}).toArray(function(err,result){
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
    db.collection("link").update({id:link.id},link,{upsert:true},function(err,result){
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
    db.collection("person").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
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
    db.collection("person").update({id:person.id},person,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//=============== config items tracks, scenarios, roles


app.get('/config/:type',function(req,res){

    var type = req.params.type;

    db.collection(type).find({status : {$ne : 'deleted' }}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

app.post('/config/:type',function(req,res){
    var item = req.body;
    var type = req.params.type;

    db.collection(type).update({id:item.id},item,{upsert:true},function(err,result){
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
    db.collection('scenario').update({id:scenario.id},scenario,{upsert:true},function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            db.collection('track').update({id:trackId},{$addToSet:{scenarioIds:scenario.id}},function(err,result){
                if (err) {
                    res.send(err,500)
                } else {
                    res.send(result)
                }
            })
        }
    })
});


//this is just testing espruino stuff...
app.post('/espruino',function(req,res){
    var data = req.body;
    data.date = new Date();
    console.log(data)
    db.collection("espruino").insert(data,function(err,result){
        // db.collection("client").insert(req.body,function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/connectathonMain.html'}));



