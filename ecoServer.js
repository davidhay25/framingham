#!/usr/bin/env node

var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');

var dbName = 'connectathon';


//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=4000; //8443;
}



//look for command line parameters...
process.argv.forEach(function (val, index, array) {
    //console.log(index + ': ' + val);

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

//middleware invoked on every request...
app.use(function (req, res, next) {

    console.log('Time:', Date.now(), dbName)
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



        console.log(req.url,req.method,req.body)

    }




})

var showLog = false;         //for debugging...

//initialize the session...
app.use(session({
    secret: 'mySecret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }   // secure cookins needs ssl...
}));

var bodyParser = require('body-parser')
bodyParser.json();

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
    db.collection("server").find({}).toArray(function(err,result){
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
    db.collection("result").find({}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


//add a single result. This is always a put as the result can be updated
app.put('/result',function(req,res){
    var result = req.body;
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
    db.collection("person").find({}).toArray(function(err,result){
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

//=============== config items tracks, scnarios, roles


app.get('/config/:type',function(req,res){

    var type = req.params.type;
    //console.log(type)
    db.collection(type).find({}).toArray(function(err,result){
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


//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/connectathonMain.html'}));



