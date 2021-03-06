
//demo.provider/V.62Q5@zdE
//mohannadh / OrionOrion1234


//required libraries
var async = require('async');
var express = require('express');
var request = require('request');
var session = require('express-session');
var fs = require('fs');
var _ = require('lodash');

var framingham = require(__dirname + "/framingham.js");     //perform the actual calculations...
var writeData = require(__dirname + "/writeData.js");       //write out some sample observations
var localConfig = require(__dirname + '/config.json');

var app = express();

var showLog = false;         //for debugging...

//initialize the session...
app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }   //For some reason, secure cookins are failing...
}));


//key of the environment where this server is running.
//Default to 'production'  (as I can easily feed in the dev environment via the IDE)
var environment = process.env.environment;
if (!environment) {
    environment = 'production';
}

//the default port. This can be overwritten when the server is executed or from the IDE.
var port = process.env.port;
if (! port) {
    port=3000;
}

//there a certificate issue with request. Needed for request over SSL...
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var config = {};

//to serve up the static web pages - particularly the login page if no page is specified...
app.use('/', express.static(__dirname,{index:'/login.html'}));


//--- ============= authentication callback & other routine

//The first step in authentication. The browser will load this 'page' and receive a redirect to the login page
app.get('/auth', function(req, res)  {
    //console.log('/auth')
    req.session["page"] = req.query.page || 'orion.html'

    if (showLog) {console.log('env=', environment)};
    var config;

    //find the configuration for this environment...
    localConfig.configs.forEach(function (conf) {
        if (conf.key == environment) {
            config = conf;
            req.session["config"] = config;     //save for later calls. Note this is NOT sent to the client...
        }
    });

    //generate the uri to re-direct the browser to. This will be the login page for the system
    var authorizationUri = config.baseUrl + "/oauth2/authorize";
    authorizationUri += "?redirect_uri=" + encodeURIComponent(config.callback);
    authorizationUri += "&response_type=code";
    authorizationUri += "&client_id="+config.clientId;

    if (showLog) {console.log('authUri=',authorizationUri)};
    res.redirect(authorizationUri);

});


//after authentication the browser will be redirected by the auth server to this endpoint
app.get('/callback', function(req, res) {
    //console.log('/callback')
    //If authentication was successful, the Authorization Server will return a code which can be exchanged for an
    //access token. If there is no code, then authorization failed, and a redirect to an error page is returned.
    var code = req.query.code;
    if (showLog) {
        console.log('/callback, query=', req.query);
        console.log('/callback, code=' + code);
    }

    if (! code) {
        //no code, redirect to error
        res.redirect('error.html');
        return;
    }


    var config = req.session["config"];     //retrieve the configuration from the session. This was set in /auth.

    //request an access token from the Auth server.
    var options = {
        method: 'POST',
        uri: config.baseUrl + config.tokenEndPoint,
        body: 'code=' + code + "&grant_type=authorization_code&redirect_uri=" + config.callback + "&client_id=" + config.clientId + "&client_secret=" + config.secret,
        headers: {'content-type': 'application/x-www-form-urlencoded'}
    };

    //perform the request...
    request(options, function (error, response, body) {
        if (showLog) {
            console.log(' ----- after token call -------');
            console.log('body ', body);
        }
        if (response && response.statusCode == 200) {
            //save the access token in the session cache. Note that this is NOT sent to the client
            req.session['accessToken'] = JSON.parse(body)['access_token']



            res.redirect(req.session["page"]);

        } else {
            res.redirect('error.html')
        }


    })
});


//after authentication
app.get('/callbackCLEAN', function(req, res) {
    var code = req.query.code;  //a code set by the Auth Server
       if (! code) {
        res.redirect('error.html')
        return;
    }
    var config = req.session["config"];     //retrieve the configuration from the session...
    var options = {
        method: 'POST',
        uri: config.baseUrl + config.tokenEndPoint,
        body: 'code=' + code + "&grant_type=authorization_code&redirect_uri=" +
          config.callback + "&client_id=" + config.clientId + "&client_secret=" + config.secret,
        headers: {'content-type': 'application/x-www-form-urlencoded'}
    };

    //the request function issues the HTTP call using the parameters in the options object
    request(options, function (error, response, body) {
        if (response && response.statusCode == 200) {
            req.session['accessToken'] = JSON.parse(body)['access_token']
            res.redirect('orion.html')
        } else {
            res.redirect('error.html')
        }
    })
});



// ---------- end authentication routines...


//return the log
app.get('/orion/getLog',function(req,res){

    res.json(log)
})

app.post('/orion/clearLog',function(req,res){
    log.length = 0;

    res.json(log)
})

//get the risk for a single patient
app.get('/orion/getRisk',function(req,res){
    var getRiskStart = new Date().getTime();
    var identifier = req.query['identifier'];
    var access_token = req.session['accessToken'];  //set at login
    var config = req.session["config"];     //retrieve the configuration from the session...

    //get all the data that we're going to need - Patient, Observation, Condition using async parallel calls...
    getAllData(identifier,access_token,config,function(err,results){
        if (showLog) {console.log('data loaded.',results)};
        if (showLog) {console.log('err.',err)};
        if (err) {
            res.json(err,500);
            return;
        } else {
            //pull the data into a hash for easier manipulation
            var hash = {};
            results.forEach(function (item) {

                //console.log(item);
                if (hash[item.type]) {
                    //the response collection can have more that one bundle with the same type = observations
                    if (item.result) {

                        hash[item.type].entry = hash[item.type].entry || []

                        if (item.result.entry) {
                            item.result.entry.forEach(function (entry) {

                                hash[item.type].entry.push(entry)
                            })
                        }
                    }

                } else {
                    hash[item.type] = item.result;      //result is a bundle
                }

            });


            //todo - check for no observations (? no conditions) here...
//console.log('getting risk',hash);

            getRiskOnePatient(hash,function(err,result){
                if (err) {
                    console.log('error getting risk one patient', err);
                    res.json(err,500)
                } else {
                    var rslt = result;
                    rslt.docRef = hash['DocumentReference']

                    res.json(rslt)
                }
            })
        }
    })
});

//get the risk for a single patient using the data already loaded...
function getRiskOnePatient(hash,cb) {

    var voData = {};        //this will hold all the data for the risk calculator...

    //first get the patient
    var patientBundle = hash['Patient'];
    if (! patientBundle.entry || patientBundle.entry.length == 0) {
        cb('No patient with this identifier was located.')
        return;
    }
    var patient = patientBundle.entry[0].resource;      //assume only 1 - really should check...

    //now check that the required patient demographics are present...
    if (!patient.birthDate) {
        cb('Patient has no birth date!')
        return;
    }

    var birthdate = new Date(patient.birthDate);
    var cur = new Date();
    var diff = cur-birthdate; // This is the difference in milliseconds
    voData.age = {value:{value: Math.floor(diff/31557600000),unit:'a'},display:'Age'}; // Divide by 1000*60*60*24*365.25

    if (!patient.gender || patient.gender=='other' || patient.gender=='unknown') {
        cb('Patient has no recognizable gender!')
        return;
    }

    voData.gender = {value:{value:'M'},type:'code',display:'Gender',type:'code'};
    if (patient.gender == 'female'){
        voData.gender = {value:{value:'F'},display:'Gender',type:'code'};
    }

    //add the codes to the list of data for framingham
    framingham.demogList().forEach(function(item) {
        voData[item.key].code = item.code;
        voData[item.key].system = item.system;
    });



    //now find out if the patient has diabetes. We'll look for a single SNOMED code, but there are more robust ways of doing this...

    var diabetesCode = framingham.diabetesSNOMEDCode();
    diabetesEntry = _.find(hash['Condition'].entry,function(o){
        try {
            return o.resource.code.coding[0].code == diabetesCode;
        } catch(ex) {
            return false;
        }

    });

    //default to no...
    voData.diabetes = {value:{value:'No'},type:'code',display:'Has Diabetes',type:'code'};
    if (diabetesEntry) {
        voData.diabetes = {value:{value:'Yes'},type:'code',display:'Has Diabetes',type:'code'};
    }



    var observations = hash['Observation'];

    //get the most recent for all the configured Observations
    //voData[item.key] has structure {value: date: code: system: type:}
   framingham.observationList().forEach(function (item) {
       voData[item.key] = mostRecent(observations,item.code);

       if (voData[item.key]) {
           voData[item.key].display = item.name;
       }

   });


   try {
       //get all the existing observations that are risk assessments to return to the client...
       var assessments = _.filter(observations.entry,function(o){
           if (o.resource && o.resource.code && o.resource.code.coding ) {
               return o.resource.code.coding[0].code == '65853-4' && o.resource.effectiveDateTime ;
           } else {
               return false;
           }})
   } catch (ex) {
       console.log('no assessments',err)
   }




    //adjust the smoker values for the DSS and

    //doesn't seem to be saving the value when smoker is false. todo - look into this...
    if (! voData.smoker || ! voData.smoker.value) {
        voData.smoker = {value:{value:'4'},type:'code',display:'Is smoker',type:'code'};
    }

    var tmp;
    try {
        tmp = framingham.getRisk(voData);       //calculates the risk and generates a summary observation
    } catch(ex) {
        console.log('error calculating score ',ex)
    }

    if (tmp.missingData) {
        //true when not all of the data required for the assessment is present...
        //it's not an error (in the api sense - just can't be computed)
        cb(tmp)
        return;
    }

    var reply = {totalPoints:tmp.points,risk:tmp.risk,data:voData,obs:tmp.obs,assess:assessments}

    //finally create an observation that represents the risk calculation...
    var Observation = tmp.obs;
    Observation.subject = {reference:'Patient/'+patient.id};

    //add the conditions and the demographics to the reference list (for display in the UI)
    var lst = framingham.observationList().concat(framingham.conditionList());
    reply.ref = lst.concat(framingham.demogList())
    reply.jsonObservations = observations;

    cb(null,reply);
    return;

    function mostRecent(bundle,code) {
        var sys = _.filter(bundle.entry,function(o){
            if (o.resource && o.resource.code && o.resource.code.coding && o.resource.effectiveDateTime) {
                return o.resource.code.coding[0].code == code && o.resource.effectiveDateTime ;
            } else {
                return false;
            }
        }).map(function(o){
            //warning! if the coding is empty this coud barf... (though it is checked in the _.filter()...)
            var ret = {value:o.resource.valueQuantity,date:o.resource.effectiveDateTime,code:code,system:o.resource.code.coding[0].system};
            if (! _.isUndefined(o.resource.valueString)) {
                ret.value = {value:o.resource.valueString};
                ret.type = 'string';
            }
            return ret;
        });

        sys = _.orderBy(sys,['date'],['desc']);
        return sys[0];
    }
}


//retrieve the metadata (conformance) resource
app.get('/orion/metadata',function(req,res){
    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...
    var uri = config.apiEndPoint + "/fhir/1.0/metadata"

    var options = {
        method: 'GET',
        uri: uri,
        encoding : null,
        headers: {'authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {

        if (error) {
            console.log('error:',error)
            var err = error || body;
            res.send(err,500)
        } else if (response && response.statusCode !== 200) {
            console.log(uri)
            console.log(response.statusCode,body.toString())
            res.send(body.toString(),response.statusCode);//,'binary')
        } else {
            console.log('body',body)
            res.send(body);
        }
    })
});

app.get('/orion/getDocument',function(req,res){

    var urlToDoc = req.query['url'];
    var contentType = req.query['contentType'];
    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...
    var uri =  "https://orionhealth-sandbox-us-bellatrix.apigee.net" + urlToDoc;

    var options = {
        method: 'GET',
        uri: uri,
        encoding : null,
        headers: {'authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            console.log('err',uri, response.statusCode,error)
            console.log(error);
            console.log(response.headers['content-type']);
            var err = error || body;

            res.setHeader('Content-disposition', 'inline');
            if (response.headers) {
                res.setHeader('content-type',response.headers['content-type'])
            }

            res.send(err,500)
        } else {

            res.setHeader('Content-disposition', 'inline');
            res.setHeader('content-type',contentType)
            /* - using the returned content-type sometimes causes a download,,,
            if (response.headers) {
                res.setHeader('content-type',response.headers['content-type'])
            } else {
                res.setHeader('content-type',contentType)
            }
*/
            res.send(body);//,'binary')
        }
    })
});

app.get('/orion/currentPatient',function(req,res){


    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    var uri = config.apiEndPoint + "/user/as/Patient";

    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            console.log('err',error,response)
            var err = error || body;
            res.send(err,500)
        } else {
            try {
                var usr = JSON.parse(body);
                res.json(usr)
            } catch (ex){
                console.log('getpat',ex)
                res.send('Error processing User',500)
            }

        }

    })

});


//return the current user - and the environment  (This is not a FHIR call)
app.get('/orion/currentUser',function(req,res){


    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    var uri = config.apiEndPoint + "/actor/current/";

    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            console.log(error,body)
            res.send(error,500)
        } else {
            try {
                var usr = JSON.parse(body);

                var vo = {user:usr};
                req.session["userIdentifier"] = usr.primaryActor.resolvingIdentifier.id + "@"+ usr.primaryActor.resolvingIdentifier.namespace;
                vo.env = {key:config.key,display:config.display}
                res.json(vo)
            } catch (ex){
                res.send('Error processing User',500)
            }

        }

    })



});

//return the Lists defined for the current user
app.get('/orion/getUserLists',function(req,res) {

    var userIdentifier = req.session["userIdentifier"]

    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    //var uri = config.apiEndPoint + "/actor/"+userIdentifier + "/patientlist/watchlist";
    var uri = config.apiEndPoint + "/actor/current/patientlist/watchlist";


    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };
    var start = new Date().getTime();
    request(options, function (error, response, body) {

        if (response.statusCode !== 200) {
            var reply = body;

            //console.log(response.statusCode)
/*
            //------------------ a cheat to return a fixed identifier...
            var bundle = {resourceType:'Bundle',type:'searchset',entry:[]}
            var list = {resourceType:'List',status:'current',mode:'snapshot',entry:[]}
            list.title = oList.name + " (" + oList.count + ")";
            list.id = oList.identifier;
            bundle.entry.push({resource:list});
            var vo = {bundle:bundle}
            vo.raw = raw;
            res.json(vo)
            return;
            //---------  end of cheat


*/

            try {
                //console.log(uri,body)
                var json = JSON.parse(body);
                json.url = uri;
                reply = JSON.stringify(json);
            } catch (ex) {
                //the response likely wasn't json. This is just a prototype so don't really care...
                console.log(ex)
            }


            res.send(reply,500)
        } else {
            try {
                //convert to FHIR Lists...
                var bundle = {resourceType:'Bundle',type:'searchset',entry:[]}
                var raw = JSON.parse(body);
                if (raw.payload && raw.payload.lists) {
                    raw.payload.lists.forEach(function (oList) {
                        var list = {resourceType:'List',status:'current',mode:'snapshot',entry:[]}
                        list.title = oList.name + " (" + oList.count + ")";
                        list.id = oList.identifier;
                        bundle.entry.push({resource:list});
                    })
                }

                //the sort order seems random...
                bundle.entry.sort(function(a,b){
                    if (a.resource.title > b.resource.title) {
                        return 1
                    } else {
                        return -1
                    }
                })


                var vo = {bundle:bundle}
                vo.raw = raw;
                res.json(vo)
            } catch (ex){
                res.send('Error processing /orion/getUserLists ',500)
            }

        }

    })


});


//return the patients in a single list. This will be a bundle of Patient resources...
app.get('/orion/getListContents',function(req,res) {
    var listId = req.query.listId;

    var userIdentifier = req.session["userIdentifier"]; //set when getting user details...
    var access_token = req.session['accessToken'];  //set at login
    var config = req.session["config"];     //retrieve the configuration from the session...

    //var uri = config.apiEndPoint + "/actor/"+userIdentifier + "/patientlist/watchlist/"+listId;

    var uri = config.apiEndPoint + "/actor/current/patientlist/watchlist/"+listId;


    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {


        if (response.statusCode !== 200) {
            res.send(body,500)
        } else {
            var raw = JSON.parse(body)
            var bundle = {resourceType:'Bundle',type:'searchset',entry:[]}
            if (raw.payload) {
                raw.payload.forEach(function(pat,inx){
                    var patient = makePatient(pat,inx);
                    bundle.entry.push({resource:patient})
                })
            }
            res.json({bundle:bundle,raw:raw})

        }
    });


    function makePatient(raw,id) {
        var patient = {resourceType:'Patient'};
        patient.id = id;
        patient.name = [{text:raw.fullName}]
        if (raw.gender) {
            patient.gender = raw.gender.toLowerCase()
        }
        if (raw.dateOfBirth) {
            patient.birthDate = raw.dateOfBirth.substr(0,4)+ '-'+ raw.dateOfBirth.substr(4,2)+ '-'+raw.dateOfBirth.substr(6,2)
        }
        if (raw.resolvingIdentifier) {
            patient.identifier = [{system:raw.resolvingIdentifier.namespace,value:raw.resolvingIdentifier.id,use:'official'}]
        }
        
        if (raw.mergeChains) {

            patient.identifier = patient.identifier || []

            for(var system in raw.mergeChains){
                var t = raw.mergeChains[system]
                if (t.current) {
                    patient.identifier.push({system:system,value:t.current})
                }

//console.log(raw.mergeChains[system])
            }

        }
        

        return patient;

    }


});


//a test endpoint - not actually used...
app.get('/orion/getAllData',function(req,res) {
    var identifier = req.query['identifier'];
    var access_token = req.session['accessToken'];  //set at login
    var config = req.session["config"];     //retrieve the configuration from the session...
    getAllData(identifier,access_token,config,function(err,results){
        res.json(results)
    })
});

function getAllData(identifier,access_token,config,callback) {
    var ObservationUrl = config.apiEndPoint +"/fhir/1.0/Observation?subject.identifier="+identifier;
    var PatientUrl = config.apiEndPoint + "/fhir/1.0/Patient?identifier="+identifier;
    var ConditionUrl =  config.apiEndPoint + "/fhir/1.0/Condition?patient.identifier="+identifier;// + "&_count=100";
    var DocRefUrl = config.apiEndPoint + "/fhir/1.0/DocumentReference?patient.identifier="+identifier;

    var start = new Date().getTime();
    async.parallel([

        function(cb) {
            var url = DocRefUrl;
            singleCall(url,access_token,function(err,result){
                cb(err,{type:'DocumentReference',result:result});
            })
        },

        function(cb) {
            var url = ObservationUrl + "&code=http://loinc.org|18262-6";
            singleCall(url,access_token,function(err,result){
                cb(err,{type:'Observation',result:result});
            })
        },

        function(cb) {
            var url = ObservationUrl + "&code=http://loinc.org|65853-4";
            singleCall(url,access_token,function(err,result){

               // console.log('ra',err,result)

                cb(err,{type:'Observation',result:result});
            })
        },

        function(cb) {
            var url = ObservationUrl + "&code=http://loinc.org|2085-9";
            singleCall(url,access_token,function(err,result){
                cb(err,{type:'Observation',result:result});
            })
        },

        function(cb) {
           var url = ObservationUrl + "&code=http://loinc.org|8480-6";
           singleCall(url,access_token,function(err,result){

               cb(err,{type:'Observation',result:result});
           })
       },
        function(cb) {
           var url = ObservationUrl + "&code=http://loinc.org|72166-2";
           singleCall(url,access_token,function(err,result){

               cb(err,{type:'Observation',result:result});
           })
       },

        function(cb) {
           var url = ObservationUrl + "&code=http://loinc.org|8462-4";

           singleCall(url,access_token,function(err,result){
               cb(err,{type:'Observation',result:result});
           })
       },

        function(cb) {
            singleCall(PatientUrl,access_token,function(err,result){
                cb(err,{type:'Patient',result:result});
            })
        },
        function(cb) {
            singleCall(ConditionUrl,access_token,function(err,result){
                cb(err,{type:'Condition',result:result});
            })
        }
    ],function(err,results){


        console.log('final err from async getAllResults',err)

        callback(err,results)

    });

    function singleCall(url,token,cb) {
        var options = {
            method: 'GET',
            uri : url,
            headers: {'accept':'application/json','authorization': 'Bearer ' + token}
        };

        request(options, function (error, response, body) {
            //values for log display
            var x,y;
            if (body) {
                 x = JSON.parse(body)
                if (x.entry) {
                     y = x.entry.length;
                }
            }

            //console.log('sc ' + url + " "+ response.statusCode, x.resourceType, y)
            if (response && response.statusCode == 200) {
                try {
                    var raw = JSON.parse(body)
                    cb(null,raw)
                    return;
                } catch (ex) {
                    cb(ex)
                    return;
                }
            } else {
                console.log('------------')
                console.log(response.statusCode, body.toString())
                console.log(url)
                console.log('------------')
                cb('Status code:'+response.statusCode)
            }
        })
    }
}


//create a set of demo data for the patient with the given identifier
app.post('/orion/createDemoData',function(req,res){
    var identifier = req.query.identifier;      //fhir identifier - system|value
    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    writeData.makeObservations(identifier,config.apiEndPoint,access_token,function(result){
        res.json(result)
    })
});

//save the assessment observation to the Observation store...
app.post('/orion/fhir/Observation',function(req,res){

    var body = "";
    req.on('data', function (chunk) {
        body += chunk;
    });
    req.on('end', function () {

        var resource = JSON.parse(body);
        var access_token = req.session['accessToken'];
        var config = req.session["config"];     //retrieve the configuration from the session...

        writeData.saveResource(resource,config.apiEndPoint,access_token,function(result){
            res.json(result)
        })
    })

});


//decide whic certificate to use. Assume that if there is a port specified it is running locally. Otherwise on the
//snapp server. There will be better ways than this...
var sslOptions;

if (process.env.port) {
    console.log('Using self signed certificate...')
    sslOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
        passphrase:'ne11ieh@y'
    };
} else {
    console.log("Using let's encrypt certificate")
    sslOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/snapp.clinfhir.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/snapp.clinfhir.com/fullchain.pem'),
        passphrase:'ne11ieh@y'
    };
}

/* Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/snapp.clinfhir.com/fullchain.pem
   Your key file has been saved at:
   /etc/letsencrypt/live/snapp.clinfhir.com/privkey.pem
   Your cert will expire on 2018-10-15. To obtain a new or tweaked
   version of this certificate in the future, simply run certbot
   again. To non-interactively renew *all* of your certificates, run
   "certbot renew"*/


//   /etc/letsencrypt/live/snapp.clinfhir.com/fullchain.pem
//   /etc/letsencrypt/live/snapp.clinfhir.com/privkey.pem


//https://aghassi.github.io/ssl-using-express-4/
var https = require('https');





https.createServer(sslOptions, app).listen(3000)
console.log('server listening via SSL on port 3000');

//app.listen(port);

//console.log('server listening on port ' + port);