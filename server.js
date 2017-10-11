
//demo.provider/V.62Q5@zdE
//mohannadh / OrionOrion1234

// rsync -a * root@clinfhir.com:/opt/orion1

var showLog = true;     //a flag to activate / deactivate the console.log
var log = [];           //performance logs
var globalStart;        //for when there are timings that cross functions...
var async = require('async');

var addLog = function(start,url,note){
    var elap = new Date().getTime() - start;
    var entry = {date: new Date().getTime(),elap:elap};
    if (url) { entry.url = url;}
    if (note) { entry.note = note;}
    log.push(entry)
};

var syncRequest = require('sync-request');
var express = require('express');
var request = require('request');
var session = require('express-session');
var _ = require('lodash');
var framingham = require(__dirname + "/framingham.js");
var writeData = require(__dirname + "/writeData.js");

/*

//capture any uncaught exception to avoid a crash...
process.on('uncaughtException', function(err) {
    console.log('>>>>>>>>>>>>>>> Caught exception: ' + err + " (Note that the actual error may be misleading and may not reflect tha actual problem)");
});

*/

var localConfig = require(__dirname + '/config.json');

var app = express();

//initialize the session...
app.use(session({
    secret: 'ohClinFhir',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))

//environment where this server is running. default to the snapp server (as I can easily feed in the dev environment via the IDE)
var environment = process.env.environment;
if (!environment) {
    environment = 'snapp';
}

//default port
var port = process.env.port;
if (! port) {
    port=3000;
}

//there a certificate issue with request...
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var config = {};

app.use('/', express.static(__dirname,{index:'/login.html'}));


//--- ============= authentication callback & other routine

//when authenticating...
app.get('/auth', function(req, res)  {
    globalStart = new Date().getTime();
    req.session["page"] = req.query.page || 'orion.html'

    // now getting this form teh command line... var environment =  req.params['environment'];
    if (showLog) {console.log('env=', environment)};
    var config;

    //find the configuration for this environment...
    localConfig.configs.forEach(function (conf) {
        if (conf.key == environment) {
            config = conf;
            req.session["config"] = config;     //save for later calls. Note this is NOT sent to the client...
        }
    });



    var authorizationUri = config.baseUrl + "/oauth2/authorize";
    authorizationUri += "?redirect_uri=" + encodeURIComponent(config.callback);
    // authorizationUri += "&scope=notifications";
    //authorizationUri += "&state=" + encodeURIComponent("3(#0/!~");
    authorizationUri += "&response_type=code";
    authorizationUri += "&client_id="+config.clientId;

    if (showLog) {console.log('authUri=',authorizationUri)};
    res.redirect(authorizationUri);

});


//after authentication
app.get('/callback', function(req, res) {
    addLog(globalStart,null,'Elapsed from login start to callback for token');
    var code = req.query.code;
    if (showLog) {
        console.log('/callback, query=', req.query)
        console.log('/callback, code=' + code);
    }

    if (! code) {
        res.redirect('error.html')
        return;
    }

    var config = req.session["config"];     //retrieve the configuration from the session...

    //call the token endpoint directly as the library is placing key data in both headers & body, causing a failure
    var options = {
        method: 'POST',
        uri: config.baseUrl + config.tokenEndPoint,
        body: 'code=' + code + "&grant_type=authorization_code&redirect_uri=" + config.callback + "&client_id=" + config.clientId + "&client_secret=" + config.secret,
        headers: {'content-type': 'application/x-www-form-urlencoded'}
    };
    var start = new Date().getTime();
    request(options, function (error, response, body) {
        addLog(start,options.uri,'get token');

        if (showLog) {
            console.log(' ----- after token call -------');
            console.log('body ', body);
        }
        if (response && response.statusCode == 200) {


            req.session['accessToken'] = JSON.parse(body)['access_token']

            console.log('access token: ' + req.session['accessToken'])
            res.redirect(req.session["page"]);
            //res.redirect('orion.html')
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
        if (showLog) {console.log('data loaded...',err)};
        if (err) {
            res.json(err,500);
            return;
        } else {
            //pull the data into a hash for easier manipulation
            var hash = {};
            results.forEach(function (item) {
                if (hash[item.type]) {
                    //the response collection can have more that one bundle with the same type = observations
                    if (item.result) {
                        hash[item.type].entry = hash[item.type].entry || []

                        item.result.entry.forEach(function (entry) {
                            hash[item.type].entry.push(entry)
                        })
                    }

                } else {
                    hash[item.type] = item.result;      //result is a bundle
                }

            });


            //todo - check for no observations (? no conditions) here...

            getRiskOnePatient(hash,function(err,result){
                if (err) {
                    res.json(err,500)
                } else {
                    res.json(result)
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


    //get all the existing observations that are risk assessments to return to the client...
    var assessments = _.filter(observations.entry,function(o){
        if (o.resource && o.resource.code && o.resource.code.coding ) {
            return o.resource.code.coding[0].code == '65853-4' && o.resource.effectiveDateTime ;
        } else {
            return false;
        }})

    //adjust the smoker values for the DSS and

    //doesn't seem to be saving the value when smoker is false. todo - look into this...
    if (! voData.smoker || ! voData.smoker.value) {
        voData.smoker = {value:{value:'4'},type:'code',display:'Is smoker',type:'code'};
    }

    try {
        var tmp = framingham.getRisk(voData);       //calculates the risk and generates a summary observation
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
        addLog(start,uri);
        if (error || response.statusCode !== 200) {
            console.log('err',error,response)
            res.send(error,500)
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


    //      user/as/Patient

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
        addLog(start,uri);
        if (error || response.statusCode !== 200) {
            console.log(error,body)
            res.send(error,500)
        } else {
            try {
                var usr = JSON.parse(body);

                var vo = {user:usr}
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

    var uri = config.apiEndPoint + "/actor/"+userIdentifier + "/patientlist/watchlist";

    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };
    var start = new Date().getTime();
    request(options, function (error, response, body) {
        addLog(start,uri);
        if (response.statusCode !== 200) {
            var reply = body;


            try {
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

    var uri = config.apiEndPoint + "/actor/"+userIdentifier + "/patientlist/watchlist/"+listId;

    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    var start = new Date().getTime();
    request(options, function (error, response, body) {
        addLog(start,uri);
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
    var ConditionUrl =  config.apiEndPoint + "/fhir/1.0/Condition?patient.identifier="+identifier + "&_count=100";

    var start = new Date().getTime();
    async.parallel([

        function(cb) {
            var url = ObservationUrl + "&code=http://loinc.org|18262-6";
            singleCall(url,access_token,function(err,result){
                cb(err,{type:'Observation',result:result});
            })
        },

        function(cb) {
            var url = ObservationUrl + "&code=http://loinc.org|65853-4";
            singleCall(url,access_token,function(err,result){
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
        addLog(start,null,'get all data');

        console.log('final err',err)

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


            console.log('sc ' + url + " "+ response.statusCode, x.resourceType, y)
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
                console.log(response.statusCode)
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

app.listen(port);

console.log('server listening on port ' + port);