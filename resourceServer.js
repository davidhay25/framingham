#!/usr/bin/env node
//represents a resource server that has a separate auth server

var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');

//the location of the auth server. Assume it exposes auth, token and checkToken endpoints...
var authServerBaseUrl = "https://localhost:8443/cf/";


var app = express();
app.use(bodyParser.json())

//https://aghassi.github.io/ssl-using-express-4/
var https = require('https');
var sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    passphrase:'ne11ieh@y'
};



//need to get the port from a command line config option
var port = 8444
var thisServer = "https://localhost:"+ port + '/';      //todo - also from config - or similar


//call the auth server to see if a given token is valid. If the token has expired, then use the refresh to replace it.
//only return false if unable to do so...
function checkAuthToken(token,cb) {

    var url = authServerBaseUrl + "checkToken/" + token;
    var options = {
        method: 'GET',
        uri: url,
        agentOptions: {         //allows self signed certificates to be used...
            rejectUnauthorized: false
        },
        encoding : null
    };

    request(options, function (error, response, body) {
        if (error) {
            var err = error || body;
            console.log(err);
            cb(false)
        } else if (response && response.statusCode !== 200) {
            console.log(body.toString());
            cb(false)

        } else {
            cb(true)

        }
    })


}


//return the CapabilityStatement for this server. Note that it references the external auth server...
app.get('/cf/metadata',function(req,res){
    var cs = {resourceType:'CapabilityStatement',status:'draft',date:'2017-12-20T12:00',rest:[]};
    var ext = {url:"http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",extension:[]}
    ext.extension.push({url:'authorize',valueUri:authServerBaseUrl + 'auth'});
    ext.extension.push({url:'token',valueUri:authServerBaseUrl+'token'});
    var rest = {mode:'server',security: {}}
    rest.security.extension = [ext];

    cs.rest.push(rest)
    res.json(cs)

});


//the FHIR query endpoint
app.get('/cf/*',function(req,res){

    console.log('headers', req.headers)

    var token = req.get('authorization');
    checkAuthToken(token,function(isValid){
        if (isValid) {
            var fhirQuery = req.originalUrl.substr(4); //strip off /orionfhir
            console.log(fhirQuery);

            //todo - fhir resource server from config...
            var url = "http://localhost:8080/baseDstu3/" + fhirQuery;

            var options = {
                method: 'GET',
                uri: url,
                agentOptions: {         //allows self signed certificates to be used...
                    rejectUnauthorized: false
                },
                encoding : null
            };

            request(options, function (error, response, body) {
                if (error) {
                    var err = error || body;
                    res.send(err,500)
                } else if (response && response.statusCode !== 200) {
                    //eg if asked for a resource that you don't have access to...
                    var err = {err: body.toString()};
                    err.statusCode = response.statusCode
                    res.status(500).send(err);
                } else {
                    res.send(body)
                }
            })
        } else {
            res.status(403).send({msg:"Auth token is not valid or expired and cannot be renewed."});
        }
    })
});



https.createServer(sslOptions, app).listen(port)
console.log('Resource server listening on port '+ port)


//https.createServer(sslOptions, app).listen(8443)