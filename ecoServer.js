

var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');


var db;

const MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://localhost:27017', function(err, client) {
    if(err) {
        //throw err;
        console.log('>>> Mongo server not running')
    } else {
        console.log("Connected successfully to 'connectathon' server");
        db = client.db('connectathon');
        //db.collection("client").insert({test: 'Test'})
    }
});


var app = express();
app.use(bodyParser.json())

//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=8443;
}

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
    http.createServer(app).listen(3000)
    console.log('server listening  on port ' + 3000);
}


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


//get all clients
app.get('/client',function(req,res){
    db.collection("client").find({}).toArray(function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//add a single client
app.post('/client',function(req,res){
    db.collection("client").insert(req.body,function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


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

//add a single server
app.post('/server',function(req,res){
    db.collection("server").insert(req.body,function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});


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

//add a single result
app.post('/result',function(req,res){
    db.collection("result").insert(req.body,function(err,result){
        if (err) {
            res.send(err,500)
        } else {
            res.send(result)
        }
    })
});

//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/ecosystemMain.html'}));



