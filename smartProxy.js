//exposes a SMART OAuth interface, then proxy requests to another FHIR server...
var request = require('request');
var serverConfig = require("./artifacts/smartServerConfig.json");
console.log(serverConfig);

var serverCache = {};       //used by the server to hole values between calls... hashed by authcode
var authTokens = {};        //a hash of all the auth tokens issued by the server...
var refreshTokens = {};        //a hash of all the refresh tokens issued by the server...

//var registeredApps = {};    //known applications, hashed by clientId

var ageOfAuthTokens = 60 * 60;      //how long an auth token is valid for (in seconds)

var showLog = true;         //for debugging...

exports.setup = function(app) {

    //return the CapabilityStatement resource
    app.get('/cf/metadata',function(req,res){
        var cs = {resourceType:'CapabilityStatement',status:'draft',date:'2017-12-20T12:00',rest:[]};
        var ext = {url:"http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",extension:[]}
        ext.extension.push({url:'authorize',valueUri:'https://localhost:8443/cf/auth'});
        ext.extension.push({url:'token',valueUri:'https://localhost:8443/cf/token'});
        var rest = {mode:'server',security: {}}
        rest.security.extension = [ext];

        cs.rest.push(rest)
        res.json(cs)
    });

    //the authorization endpoint
    app.get('/cf/auth',function(req,res){
        console.log('/cf/auth')
        req.session["authSession"] = {};

        var requiredParams = ['client_id','response_type','redirect_uri','scope','state','aud'];
        for (var i=0; i < requiredParams.length; i++) {
            var p = requiredParams[i]
            var v = req.query[p];

            if (v == 'undefined') {
                console.log('---> missing '+p)
                res.json({"error":"invalid_parameter", "error_description":"Missing "+p })
                break;
                return;
            }
        }

        //todo - need to check the aud parameter here. Might want to think about this auth component supporting multiple resource
        //servers. Could expose an endpoint that a resource server could call with an access token to determine if correct

        var clientId = req.query['client_id'];
        var appConfig = findUserConfig(clientId);
        if (!appConfig) {
            res.json({"error":"invalid_clientid", "error_description":"Unrecognized clientId"})
            return
        }

        if (req.query['response_type' !== 'code']) {
            res.json({"error":"invalid_response_type", "error_description":"Response type muts have the value 'code'"})
            return
        }

        //set up the server cache for this session (NOT a client session!). Note that the
        //user has not yet authenticated, but we create the auth code now as an index into the details for the user...
/*
        var code = makeAuthCode();
        var dataToSave = {};
        dataToSave.created = new Date().getTime();
        dataToSave.state = 'login';     //at the login state in the process
        //dataToSave.appConfig = appConfig
        dataToSave.callBackUrl =  req.query['redirect_uri'];
        dataToSave.clientStateString = req.query.state;
        dataToSave.scope = req.query.scope || 'User/*.*';
        dataToSave.code = code
        serverCache[code] = dataToSave;

*/
        req.session["authSession"].state = 'login';     //at the login state in the process
        req.session["authSession"].appConfig = appConfig
        req.session["authSession"].callBackUrl =  req.query['redirect_uri'];
        req.session["authSession"].clientStateString = req.query.state;
        req.session["authSession"].scope = req.query.scope || 'User/*.*';
       // req.session["authSession"].code = makeAuthCode();

        //redirect to the login page
        console.log('login page')
        res.redirect("/cfLogin.html")


    });


    //after the user has logged in.
    //check that the user details are correct and issue an auth code...
    app.post('/cf/login',function(req,res){
        console.log('/cf/login')
        var data='';
        req.on('data', function(chunk) {
            data += chunk;
        });

        req.on('end', function() {
            var authSession = req.session["authSession"];       //holds the data that the user originally submitted to /cf/auth...
            //check user details here...


            //now create the code and redirect to the callback...
            var code = makeAuthCode();
            var dataToSave = {};
            dataToSave.code = code;
            dataToSave.created = new Date().getTime();
            dataToSave.state = authSession.state;       //the clients state string
            dataToSave.scope = authSession.scope;       //the original scope request

            serverCache[code] = dataToSave;

            //need to check the callback url here.
            var callBackUrl = authSession.callBackUrl + "?code="+code;
            console.log(callBackUrl)

            res.redirect(callBackUrl)

        })
    });

    function splitParams(s) {
        var params = {}
        var ar = s.split('&');
        ar.forEach(function (p) {
            var ar1 = p.split('=');
            params[ar1[0]] = ar1[1]
        });
        return params;
    }

    //the token endpoint
    app.post('/cf/token',function(req,res){
        console.log('/cf/token')
        var data='';

        req.on('data', function(chunk) {
            data += chunk;
        });

        req.on('end', function() {

            console.log(data)
            //todo - better null checking...
            /*
            var params = {}
            var ar = data.split('&');
            ar.forEach(function (p) {
                var ar1 = p.split('=');
                params[ar1[0]] = ar1[1]
            });
*/
            var params = splitParams(data);

            console.log(params)


            var authCode = params.code;

            console.log(serverCache);
            var serverData = serverCache[authCode]
            if (serverData) {
                console.log(serverData)
                //todo - check the values in params (passed in with this call) against the originals in session, and the registeredApps

                //todo - check the scope that we're going to allow...
                var scope = serverData.scope

                var token = makeAuthToken();

                var refreshToken = makeRefreshToken();
                refreshTokens[refreshToken] = serverData;       //save the serverdata against the refresh token...

                var reply = {'access_token':token,'token_type': 'Bearer','refresh_token': refreshToken}
                reply['expires_in'] = ageOfAuthTokens;
                reply.scope = scope;

                //save the auth token for use
                var expiry = new Date();
                expiry.setSeconds(expiry.getSeconds() + ageOfAuthTokens);
                authTokens[token] = {expires: expiry}

                res.json(reply);

            } else {
                //unknown code...
                res.status(403).json({msg:"unknown auth token: " + authCode})

            }
        });
    });

    //the refresh endpoint
    app.post('/cf/refresh',function(req,res) {
        console.log('/cf/token')
        var data = '';

        req.on('data', function (chunk) {
            data += chunk;
        });

        req.on('end', function () {
            var params = splitParams(data);
            var refreshToken = params['refresh_token']
            var serverData = refreshTokens[refreshToken]
            if (serverData) {
                //so this is a valid refresh token...
                delete refreshTokens[refreshToken];     //so can't be re-used...

                var newAuthToken = makeAuthToken();
                var newRefreshToken = makeRefreshToken();

                var reply = {'access_token':newAuthToken,'token_type': 'Bearer','refresh_token': newRefreshToken}
                reply['expires_in'] = ageOfAuthTokens;
                reply['scope'] = serverData.scope;
                res.json(reply);

                console.log(serverData)
            } else {
                res.status(403).json({msg:"unknown refresh token: " + refreshToken})
            }

        })
    });

    //check that an auth token is valid. If it has expired, then use the refresh token to get a replacement.
    //return {outcome: x} x = valid if valid, expired if unable to refresh, unknown if the token is unknown, empty if not present
    app.get('/cf/checkToken/:token',function(req,res){
        var authToken = req.params.token;
        if (showLog) {
            console.log('token:', authToken);
            console.log('known auth tokens:', authTokens);
            console.log('known refresh tokens:', refreshTokens);
        }

        //is there a token supplied?
        if (! authToken) {
            res.json({outcome: 'empty'})
            return;
        }

        //does it match one we issued?
        var ar = authToken.split(' ');
        var serverCopy = authTokens[ar[1]]; //split off the leading 'Bearer'...
        if (! serverCopy) {
            res.json({outcome: 'unknown'})
            return;
        }

        //check for expiry
        var current_date = new Date();
        var willExpire = serverCopy.expires;     //the time that the access token will expire
        willExpire.setSeconds(willExpire.getSeconds() -60); //1 minute of lee way
        if (current_date.getTime() > willExpire) {
            //token has expired (or is about to)
            res.json({outcome: 'expired'})
            return;
        }

        //hurrah! it's valid!
        res.json({outcome: 'valid'})
        return;


/*
        var token = req.params.token;
        var valid = false;
        var serverTokenCache = authTokens[token];   // {expires: }
        if (serverTokenCache) {
            //todo - check for expiry


            valid = true;
        }
        res.json({valid:valid})
        */

    });


    //------------------ functions that go in a resource server ------------


    //call the auth server to see if a given token is valid
    function checkAuthToken(token,cb) {
        var url = "https://localhost:8443/cf/checkToken/" + token;      //will automatically refresh if possible

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
                var result = body.toString();
                console.log('-------->',result)

                cb(result.outcome);
                /*
                switch (result.outcome) {
                    case 'valid' :
                        cb(true);
                        break;
                    case 'expired' :
                        cb(false)
                        break;
                    case 'unknown' :
                        //an unknown token...

                }
                */

            }
        })
    }

    //the FHIR query endpoint
    app.get('/cf/*',function(req,res){

        console.log('headers', req.headers)

        var token = req.get('authorization');

        if (! token) {
            //no token was supplied - ?? what to do ??
        }


        checkAuthToken(token,function(outcome){
            if (outcome !== 'valid') {
                var fhirQuery = req.originalUrl.substr(4); //strip off /orionfhir
                console.log(fhirQuery);

                //todo - fhir server from config...
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
                res.status(403).send({code: outcome,msg:"Auth token is not valid or expired"});
            }
        })
    });


    //================  utility functions ==================

    //generate an auth token.
    function makeAuthToken() {
        var token = 'Auth'+ new Date().getTime();

        return token;
    }

    function makeRefreshToken() {
        var token = 'Refresh'+ new Date().getTime();

        return token;
    }


    function makeAuthCode() {
        var code = new Date().getTime();

        return code;
    }

    function findUserConfig(clientid) {
        for (var i=0; i < serverConfig.apps.length; i++){
            var c = serverConfig.apps[i];
            if (c.clientId == clientid) {
                return c;
                break;
            }
        }
    }

}


