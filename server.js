
//demo.provider/V.62Q5@zdE
//mohannadh / OrionOrion1234

// rsync -a * root@clinfhir.com:/opt/orion1

var showLog = true;     //a flag to activate / deactivate the console.log
var log = [];           //performance logs
var globalStart;        //for when there are timings that cross functions...

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



//capture any uncaught exception to avoid a crash...
process.on('uncaughtException', function(err) {
    console.log('>>>>>>>>>>>>>>> Caught exception: ' + err);
});

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

//deault port
var port = process.env.port;
if (! port) {
    port=3000;
}

//there a certificate issue with request...
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var config = {};

app.use('/', express.static(__dirname,{index:'/login.html'}));


//--- ============= authentication callback & other routine

//get known configurations - key & display only...

app.get('/configDEP', function(req, res)  {
    var ar = []
    localConfig.configs.forEach(function (config) {
        ar.push({key:config.key,display:config.display});
    });
    res.json(ar)
});

//when authenticating...
app.get('/auth', function(req, res)  {

    globalStart = new Date().getTime();

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

    console.log(config);

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
       // console.log('error ',error)
        if (showLog) {
            console.log(' ----- after token call -------');
            console.log('body ', body);
        }
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
    console.log(log)
    res.json(log)
})


//get the risk for a single patient
app.get('/orion/getRisk',function(req,res){
    var identifier = req.query.identifier;
    var saveRisk = req.query.saveRisk;
    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    var getRiskStart = new Date().getTime();
    getRiskOnePatient(identifier,config.apiEndPoint,access_token,function(result){
        addLog(getRiskStart,null,'Overall time for risk assessment');
        res.json(result)
    })
});



//get the risk for a single patient (assuming that we have the patient identifier)
//been a bit lazy and used synchronous calls - but it is only a prototype...
function getRiskOnePatient(patientIdentifier,endPoint,token,cb) {
    var saveRisk = false;

    var voData = {};        //this will hold all the data for the risk calculator...

    //first get the patient
    var url = endPoint + "/fhir/1.0/Patient?identifier="+patientIdentifier;
    var options = {
        method: 'GET',
        headers: {'accept':'application/json','authorization': 'Bearer ' + token}
    };
    var start = new Date().getTime();
    var response = syncRequest('GET', url, options);
    addLog(start,url);



    var patient;

    try {
        var patientBundle = JSON.parse(response.body.toString());

        if (! patientBundle.entry || patientBundle.entry.length == 0) {
            cb({err:'No patient with the identifier ' +patientIdentifier+ ' was located.'})
            return;
        }

        patient = patientBundle.entry[0].resource;

        if (!patient.birthDate) {
            cb({err:'Patient has no birth date!'})
            return;
        }

        var birthdate = new Date(patient.birthDate);
        var cur = new Date();
        var diff = cur-birthdate; // This is the difference in milliseconds
        voData.age = {value:{value: Math.floor(diff/31557600000),unit:'a'},display:'Age'}; // Divide by 1000*60*60*24*365.25

        if (!patient.gender || patient.gender=='other' || patient.gender=='unknown') {
            cb({err:'Patient has no recognizable gender!'})
            return;
        }

        voData.gender = {value:{value:'M'},type:'code',display:'Gender',type:'code'};

        if (patient.gender == 'female'){
            voData.gender = {value:{value:'F'},display:'Gender',type:'code'};
        }

        //add the codes to the
        framingham.demogList().forEach(function(item) {
            voData[item.key].code = item.code;
            voData[item.key].system = item.system;
        })


    } catch (ex) {
        cb({err:'Unable to locate Patient'})
        return;
    }

    //set the diabetes to 'no' for now...
    voData.diabetes = {value:{value:'No'},type:'code',display:'Has Diabetes',type:'code'};



    /* temp - add back later...
    //next get all the conditions. todo: likely need a date filter
    var url = remoteFhirServer + "Condition?patient.identifier="+patientIdentifier+"&_count=100";
    var response = syncRequest('GET', url, options);

    voData.diab = {code : framingham.diabetesLOINCCode(), value: {value: false},type:'bool',display:'Has Diabetes'};        //true if the patient has diabetes...
    try {
        var conditionBundle = JSON.parse(response.body.toString());
       // console.log(conditionBundle)

        if (conditionBundle && conditionBundle.entry) {
            conditionBundle.entry.forEach(function (ent) {
                if (ent.resource && ent.resource.code && ent.resource.code.coding) {
                    ent.resource.code.coding.forEach(function (coding) {
                        console.log(coding.code, framingham.diabetesSNOMEDCode())
                        if (coding.code == framingham.diabetesSNOMEDCode()) {
                            voData.diab = {code : framingham.diabetesLOINCCode(), value: {value: true},type:'bool',display:'Has Diabetes'};
                        }
                    })
                }
            })
        }


    } catch (ex) {
        cb({err:'Unable to retrieve Conditions'})
        return;
    }
    */

    //finally get all the observations. todo: likely need a date filter
    var url = endPoint + "/fhir/1.0/Observation?subject.identifier="+patientIdentifier;
    var start = new Date().getTime();
    var response = syncRequest('GET', url, options);
    addLog(start,url);

    var jsonObservations = JSON.parse(response.body.toString());

    if (response.statusCode == 200) {
        //this will be a bundle


        //get the most recent for all the configured Observations
       framingham.observationList().forEach(function (item) {
           voData[item.key] = mostRecent(jsonObservations,item.code);

           if (voData[item.key]) {
               voData[item.key].display = item.name;
           }

       });

        //get all the existing observations that are risk assessments to return to the client...
        var assessments = _.filter(jsonObservations.entry,function(o){
            if (o.resource && o.resource.code && o.resource.code.coding ) {
                return o.resource.code.coding[0].code == '65853-4' && o.resource.effectiveDateTime ;
            } else {
                return false;
            }})


        //doesn't seem to be saving the value when smoker is false. todo - look into this...
        if (! voData.smoker || ! voData.smoker.value) {
            voData.smoker = {value:{value:'yes'},type:'code',display:'Is smoker',type:'code'};
        }


        var tmp = framingham.getRisk(voData);       //calculates the risk and generates a summary observation


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

        //only write it out if the 'saveRisk' flag is set...
        if (saveRisk) {
            options.json = Observation;
            var url = remoteFhirServer + "Observation/";
            var response = syncRequest('POST', url, options);


            //If there's an error, at least return the Observation so I can debug...
            if (response.statusCode !== 201) {
                reply.err = 'Error saving assessment '+ response.body;

            }
        }

        //add the conditions and the demographics to the reference list (for display in the UI)
        var lst = framingham.observationList().concat(framingham.conditionList());
        reply.ref = lst.concat(framingham.demogList())
        reply.jsonObservations = jsonObservations;

        cb(reply);


    } else {
        cb({err:'No Observations for this patient'})
    }


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
            if (! _.isUndefined(o.resource.valueBoolean)) {
                ret.value = {value:o.resource.valueBoolean};
                ret.type = 'bool';
            }
            return ret;
        });

        sys = _.orderBy(sys,['date'],['desc']);
        return sys[0];
    }


}


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
        addLog(start,uri);
        if (error || response.statusCode !== 200) {
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
            //console.log(raw.mergeChains);
            patient.identifier = patient.identifier || []

            for(var system in raw.mergeChains){
                patient.identifier.push({system:system,value:raw.mergeChains[system]})

            }



            
        }
        

        return patient;

    }


});


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
        console.log('body: ' + body);
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