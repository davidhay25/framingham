

var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');


var db;

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://127.0.0.1:27017/clinfhir', function(err, ldb) {
    if(err) {
        //throw err;
        console.log('>>> Mongo server not running')
    } else {
        console.log('connected...')
        db = ldb;


    }
});




//var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost/connectathon');

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


app.get('client',function(req,res){

});

app.post('/client',function(req,res){

    console.log(req.body)

    console.log(db.collection)

    db.client.insertOne(req.body,function(err){

    })

    return;

    db.collection("client").insert(req.body, function (err, result) {
        if (err) {
            console.log('Error adding client ',audit)
        } else {

            if (result && result.length) {
                console.log('logged ',err)
                updateLocation(result[0],clientIp);

            }
        }
    });

});





//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/ecosystemMain.html'}));



