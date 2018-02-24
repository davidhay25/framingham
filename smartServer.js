//http://docs.smarthealthit.org/authorization/backend-services/

var express = require('express');
var request = require('request');

//require('request-debug')(request);  //https://github.com/request/request-debug

var session = require('express-session');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var fs = require('fs');

var oauthModule = require('./oauthModule.js');

var app = express();
app.use(bodyParser.json())

//https://aghassi.github.io/ssl-using-express-4/
var https = require('https');
var sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    passphrase:'ne11ieh@y'
};


https.createServer(sslOptions, app).listen(8443)

var showLog = true;         //for debugging...

//initialize the session...
app.use(session({
    secret: 'mySecret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }   // secure cookins needs ssl...
}));




//the Proxy to manage the
var cfProxy = require('./smartProxy.js');
cfProxy.setup(app);

//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=8443;
}

//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/smartLogin.html'}));


//after the user has logged on
app.get('/loginDEP',function(req,res){


    console.log('/cf/login')
console.log(req.session);


    var authSession = req.session["authSession"];
    //check user details here...

    //now redirect to the callback...
    console.log(req.body)

    var callBackUrl = req.session["authSession"].callBackUrl  + "?code="+req.session["authSession"].code;       //add the code to the redirect url...
    res.redirect(callBackUrl)



})



//When a smart profile has been selected. Receive the config to use, then
//load the capabilityStatement from the server, and set the SMART end points in config
app.post('/setup',function(req,res){

    config = req.body;      //contains all the secrets...
    console.log(config)
    req.session.config = config;
    delete req.session['serverData'];      //will return the server granted scope

    var options = {
        method: 'GET',
        uri: config.baseUrl + "/metadata",
        agentOptions: {         //allows self signed certificates to be used...
            rejectUnauthorized: false
        },
        headers: {accept:'application/json+fhir'}       //todo - may need to set this according to the fhir version...
    };

    request(options, function (error, response, body) {
        if (response && response.statusCode == 200) {

            var capStmt = JSON.parse(body);
            req.session['serverData'] = {capStmt:capStmt};

            getSMARTEndpoints(config,capStmt)

            res.json(config)
            return;

            //this is getting the openId stuff. Really need to get this from the issuer in the JWT token (I think)...
            if (1==2 && config.clientIdConfig) {


                //how get the keys to decrypt the id token. I'm not yet sure this is the right place...
                //in particular, this means that teh server MUST support the whole key lookup thing...
                request.get(config.clientIdConfig,function(err,resp,body){
                if (!err && body) {
                    var json = JSON.parse(body)
                    console.log(body)
                    console.log(json['jwks_uri'])
                    if (json['jwks_uri']) {
                        var url = json['jwks_uri'];
                        request.get(url,function(err,resp,body) {
                            if (!err && body) {
                                req.session.keys = JSON.parse(body);        //should be the decryption keys...

                                console.log('keys',req.session.keys);

                                //now we can return the non-private config...
                                //console.log(config)
                                res.json(config)

                            } else {
                                req.session.error = {err:"couldn't find "+ url + " (from " + config.clientIdConfig + ")"};
                                res.redirect('smartError.html')
                            }
                        })


                    } else {
                        req.session.error = {err:"couldn't find "+ config.clientIdConfig};
                        res.redirect('smartError.html')
                    }

                } else {
                    //can't find the
                    req.session.error = body;
                    res.redirect('smartError.html')
                }
            })
            } else {
                //no clientIdConfig specified - just return. note that the oauth scopes openid & profile will not be available
                res.json(config)
            }

        } else {
            console.log('Error calling '+ options.uri)
            console.log(error,body)
            req.session.error = {err: body};
            res.statue(500).send(req.session.error);

           // res.redirect('smartError.html')
        }
    })

})


//load the capabilityStatement from the server, and set the SMART end points in config
app.get('/setupDEP',function(req,res){

    delete req.session['serverData'];      //will return the server granted scope

    var options = {
        method: 'GET',
        uri: config.baseUrl + "/metadata",
        clientId : "d90584cc-3b0e-40db-8543-536df45a84f4"

    };

    request(options, function (error, response, body) {
        if (response && response.statusCode == 200) {

            var capStmt =JSON.parse(body);
            req.session['serverData'] = {capStmt:capStmt};

            getSMARTEndpoints(config,capStmt)

            //how get the keys to decrypt the id token. I'm not yet sure this is the right place...
            //in particular, this means that teh server MUST support the whole key lookup thing...
            request.get(config.clientIdConfig,function(err,resp,body){
                if (!err && body) {
                    var json = JSON.parse(body)
                    console.log(body)
                    console.log(json['jwks_uri'])
                    if (json['jwks_uri']) {
                        var url = json['jwks_uri'];
                        request.get(url,function(err,resp,body) {
                            if (!err && body) {
                                req.session.keys = JSON.parse(body);        //should be the decryption keys...

                                console.log('keys',req.session.keys);

                                //now we can return the non-private config...
                                //console.log(config)
                                res.json(config)

                            } else {
                                req.session.error = {err:"couldn't find "+ url + " (from " + config.clientIdConfig + ")"};
                                res.redirect('smartError.html')
                            }
                        })


                    } else {
                        req.session.error = {err:"couldn't find "+ config.clientIdConfig};
                        res.redirect('smartError.html')
                    }

                } else {
                    //can't find the
                    req.session.error = body;
                    res.redirect('smartError.html')
                }
            })



        //    console.log(config)
          //  res.json(config)










        } else {
            console.log(error,body)
            req.session.error = body;
            res.redirect('smartError.html')
        }
    })
});


//The first step in authentication. The browser will load this 'page' and receive a redirect to the login page
app.get('/auth', function(req, res)  {

    if (showLog) {console.log('requested scope=' + req.query.scope)}

    req.session["scope"] = req.query.scope || 'launch/patient';
    //req.session["config"] = config;     //todo - think about multi-user...
    req.session["page"] = "smartQuery.html";

    //generate the uri to re-direct the browser to. This will be the login page for the system
    var authorizationUri = config.authorize;
    if (req.session.config.public) {
        //this is a public launch

        authorizationUri += "?redirect_uri=" + encodeURIComponent(config.callback);
        authorizationUri += "&response_type=code";
        authorizationUri += "&scope=" + encodeURIComponent(req.session["scope"]);
        authorizationUri += "&state="+ "test";
        authorizationUri += "&aud="+ config.baseUrl;
        authorizationUri += "&client_id="+config.clientId;
    } else {
        //this is a private launch
        authorizationUri += "?redirect_uri=" + encodeURIComponent(config.callback);
        authorizationUri += "&response_type=code";
        authorizationUri += "&scope=" + encodeURIComponent(req.session["scope"]);
        authorizationUri += "&state="+ "test";
        authorizationUri += "&aud="+ config.baseUrl;
        authorizationUri += "&client_id="+config.clientId;
    }

    if (showLog) {console.log('authUri=',authorizationUri)};

    //header


    res.redirect(authorizationUri);

});


//after authentication the browser will be redirected by the auth server to this endpoint
app.get('/callback', function(req, res) {

    //If authentication was successful, the Authorization Server will return a code which can be exchanged for an
    //access token. If there is no code, then authorization failed, and a redirect to an error page is returned.
    var code = req.query.code;
    if (showLog) {
        console.log('/callback, query=', req.query);
        console.log('/callback, code=' + code);
    }

    if (! code) {
        //no code, redirect to error
        req.session.error = req.query;  //any error message will be in the querystring...
        res.redirect('smartError.html')
        return;
    }

    var config = req.session["config"];     //retrieve the configuration from the session. This was set in /auth.

    //request an access token from the Auth server.
    var options = {
        method: 'POST',
        uri: config.token,
        agentOptions: {         //allows self signed certificates to be used...
            rejectUnauthorized: false
        },
        body: 'code=' + code + "&grant_type=authorization_code&redirect_uri=" + encodeURIComponent(config.callback),
        headers: {'content-type': 'application/x-www-form-urlencoded'}
    };

    if (config.public) {
        //a public client includes the client if, but no auth header
        options.body += '&client_id='+ config.clientId;
    } else {
        //a confidential client creates an Authorization header
        var buff = new Buffer(config.clientId + ':' + config.secret);
        options.headers.Authorization = 'Basic ' + buff.toString('base64')
    }


    //perform the request to get the auth token...
    request(options, function (error, response, body) {
        if (showLog) {
            console.log(' ----- after token call -------');
            console.log('body ', body);
            console.log('error ', error);
        }
        if (response && response.statusCode == 200) {
            //save the access token in the session cache. Note that this is NOT sent to the client
            var token = JSON.parse(body);

            if (showLog) {
                console.log('token=', token);
            }

            req.session['accessToken'] = token['access_token']
            req.session.serverData.scope = token.scope;
            req.session.serverData.fullToken = token;

            req.session.serverData.config = req.session["config"];


            //an id token was returned
            if (token['id_token']) {



                var id_token = jwt.decode(token['id_token'], {complete: true});
                req.session.serverData['idToken'] = id_token;
                console.log(id_token)

                //req.session.serverData.idToken = id_token;

               //this for DXE

                res.redirect(req.session["page"]);


/*
                oauthModule.validateJWT(token['id_token']).then(
                    function(id_token) {
                        req.session.serverData.idToken = id_token;
                        console.log('success!',id_token)
                        res.redirect(req.session["page"]);
                    },
                    function(err) {
                        console.log('fail...' + err);
                        req.session.error = err
                        res.redirect("SMARTError.html");
                    }
                )
                */

                //res.redirect(req.session["page"]);

            } else {
                res.redirect(req.session["page"]);
            }



        } else {
            req.session.error = body;
            res.redirect('smartError.html')
        }
    })
});

//retrieve any error object for this session
app.get('/orionerror',function(req,res){
    if (req.session.error) {
        res.json(req.session.error)
    } else {
        res.json({})
    }
});

//retrieve the scope assigned by the server for this session
app.get('/serverdata',function(req,res){
    if (req.session.serverData) {
        res.json(req.session.serverData)
    } else {
        res.json({})
    }
});


function checkAccessToken(req,cb) {
    cb();
}

//make a FHIR call. the remainder of the query beyond '/orionfhir/*' is the actual query to be sent to the server
app.get('/orionfhir/*',function(req,res){

    var fhirQuery = req.originalUrl.substr(11); //strip off /orionfhir
    //var fhirQuery = req.originalUrl.substr(11); //strip off /orionfhir
    //check that the access token is still valid - refresh it if not...
    checkAccessToken(req,function(err){
        if (err) {
            console.log('Error from token check');
            res.send(err,500);
            return;
        }

        var access_token = req.session['accessToken'];
        var config = req.session["config"];     //retrieve the configuration from the session...


        //var url = config.baseUrl  + fhirQuery;
        var url = config.baseUrl + '/' + fhirQuery;
        if (showLog) {
            console.log('url=' + url)
        }

        var options = {
            method: 'GET',
            uri: url,
            encoding : null,
            agentOptions: {         //allows self signed certificates to be used...
                rejectUnauthorized: false
            },
            headers: {'authorization': 'Bearer ' + access_token,'accept':'application/json+fhir'}
        };


        //console.log(config)
        //create the consent data
        var consent = ',,'
        try {
            consent = config.context.org.code + ',' + config.context.role.code + ','+ config.context.purpose.code;
        } catch (ex) {

        }

        //console.log(consent)
        if (consent !== ',,') {
            options.headers['X-consent'] = consent;
        }

        //console.log(options)

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

    })
});

//retrieve the server endpoints from the capability statement
var getSMARTEndpoints = function(config,capstmt) {
    var smartUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
    try {
        var extensions = capstmt.rest[0].security.extension;
        extensions.forEach(function(ext) {
            if (ext.url == smartUrl) {
                ext.extension.forEach(function(child){
                    switch (child.url) {
                        case 'authorize' :
                            config.authorize = child.valueUri;
                            break;
                        case 'token' :
                            config.token = child.valueUri;
                            break;
                        case 'register' :
                            config.register = child.valueUri;
                            break;


                    }
                })
            }
        })


    } catch(ex) {
        return ex
    }



}

//app.listen(port);


console.log('server listening via TLS on port ' + port);