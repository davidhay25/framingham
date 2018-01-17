var express = require('express');
var request = require('request');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');
var hooks = require(__dirname + "/hooksModule.js");

var port = 8443;

var app = express();
app.use(bodyParser.json())

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //to allow self signed certs

//https://aghassi.github.io/ssl-using-express-4/
var https = require('https');
var sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    passphrase:'ne11ieh@y'
};

https.createServer(sslOptions, app).listen(port);
hooks.setup(app)


console.log('server listening via TLS on port ' + port);