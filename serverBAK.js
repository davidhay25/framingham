
//demo.provider/V.62Q5@zdE

//mohannadh / OrionOrion1234

// rsync -a * root@clinfhir.com:/opt/orion1



var syncRequest = require('sync-request');
var express = require('express');
var request = require('request');
var session = require('express-session');
var _ = require('lodash');
var framingham = require(__dirname + "/framingham.js");
var demoData = require(__dirname + "/makeDemoData.js");


//https://developer.orionhealth.io/apis/worklists_8.2/

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
app.get('/config', function(req, res)  {
    var ar = []
    localConfig.configs.forEach(function (config) {
        ar.push({key:config.key,display:config.display});
    });
    res.json(ar)
});

//when authenticating...
app.get('/auth/:environment', function(req, res)  {

    var environment =  req.params['environment'];
    console.log('env=', environment);
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

    console.log('authUri=',authorizationUri);
    res.redirect(authorizationUri);

});

//after authentication
app.get('/callback', function(req, res) {
    var code = req.query.code;
    console.log('/callback, query=',req.query)
    console.log('/callback, code=' + code);

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

    console.log('options',options)

    request(options, function (error, response, body) {
       // console.log('error ',error)
        console.log(' ----- after token call -------');
        console.log('body ' , body);
        if (response && response.statusCode == 200) {
            console.log(response.statusCode)
            req.session['accessToken'] = JSON.parse(body)['access_token']
            res.redirect('orion.html')
        } else {
            res.redirect('error.html')
        }


    })
});

// ---------- end authentication routines...






//get the risk for a single patient
app.get('/orion/getRisk',function(req,res){

    var identifier = req.query.identifier;
    var saveRisk = req.query.saveRisk;
    console.log(identifier,saveRisk)





    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    var response = demoData.makeObservations(identifier,config.apiEndPoint,access_token);

    console.log(response);
    return

    //temp - to test out access to Observation...

    var uri = config.apiEndPoint + "/fhir/1.0/Observation?subject.identifier="+identifier;


    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    console.log(uri);
    request(options, function (error, response, body) {
        console.log(body)
        res.json(body)
    })




    return


/*

    getResources(identifier, 'Observation', req.session, function(err,bundle) {
        if (err) {
          console.log(err);
        } else {
            console.log('obs', bundle)

        }
    })

*/

    getRiskOnePatient(identifier,saveRisk,function(result){
        res.json(result)
    })
});


//get the risk for a single patient (assuming that we have the patient identifier)
//been a bit lazy and used synchronous calls - but it is only a prototype...
function getRiskOnePatient(patientIdentifier,saveRisk,cb) {
    var remoteFhirServer = "http://localhost:8079/baseDstu2/";
    var voData = {};        //this will hold all the data for the risk calculator...

    //first get the patient
    var url = remoteFhirServer + "Patient?identifier="+patientIdentifier;

    var options = {};
    options.headers = {"content-type": "application/json+fhir"};
    options.timeout = 20000;        //20 seconds
    var response = syncRequest('GET', url, options);

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



    //finally get all the observations. todo: likely need a date filter
    var url = remoteFhirServer + "Observation?subject.identifier="+patientIdentifier+"&_count=100";
    var response = syncRequest('GET', url, options);

    var json = JSON.parse(response.body.toString());
    if (response.statusCode == 200) {
        //this will be a bundle
       // console.log(json.entry.length);

        //get the most recent for all the configured Observations
       framingham.observationList().forEach(function (item) {
           voData[item.key] = mostRecent(json,item.code);
           voData[item.key].display = item.name;
       });


        var tmp = framingham.getRisk(voData);       //calculates the risk and generates a summary observation


        //get all the existing observations that are risk assessments to return to the client...
        var assessments = _.filter(json.entry,function(o){
            if (o.resource && o.resource.code && o.resource.code.coding ) {
                return o.resource.code.coding[0].code == '65853-4' && o.resource.effectiveDateTime ;
            } else {
                return false;
        }})


        var reply = {risk:tmp.risk,data:voData,obs:tmp.obs,ref:lst,assess:assessments}

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


    request(options, function (error, response, body) {
        //console.log('user error:', error)
        //console.log('user body ' , body);
        if (error || response.statusCode !== 200) {
            res.send(error,500)
        } else {
            try {
                var usr = JSON.parse(body);
               // console.log(usr)
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

    //var userIdentifier = req.query.userIdentifier;

    var access_token = req.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...

    var uri = config.apiEndPoint + "/actor/"+userIdentifier + "/patientlist/watchlist";
   // console.log('userlists', uri)
    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };


    request(options, function (error, response, body) {

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
                        bundle.entry.push(list);
                    })
                }


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
   // console.log('userlists', uri)
    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json','authorization': 'Bearer ' + access_token}
    };

    request(options, function (error, response, body) {
        if (response.statusCode !== 200) {
            res.send(body,500)
        } else {
            var raw = JSON.parse(body)
            var bundle = {resourceType:'Bundle',type:'searchset',entry:[]}
            if (raw.payload) {
                raw.payload.forEach(function(pat,inx){
                   // console.log('pat',pat)
                    var patient = makePatient(pat,inx);
                    //console.log(patient);
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
           // console.log(raw.mergeChains)
           /* patient.identifier = patient.identifier || []
            raw.mergeChains.forEach(function (identifier,system) {
                console.log(identifier,system)
            })*/
            
        }
        

        return patient;

    }


});


//get all the known data for a patient
app.get('/orion/:identifier',function(req,res){
    var identifier =  req.params['identifier'];
    var returnBundle;

    //for now, just call the endpoints sequentially (npt sure of parallel processing). Move to $q if get more...
    getResources(identifier, 'Encounter', req.session, function(err,bundle) {
        if (err) {
            res.send(500);
        } else {
            returnBundle = bundle;
            returnBundle.total = returnBundle.total || 0;
            getResources(identifier, 'MedicationDispense', req.session, function(err,bundleM) {
                if (err) {
                    res.send(500);
                } else {
                    console.log(bundleM)
                    returnBundle.entry  = returnBundle.entry || []
                    if (bundleM && bundleM.entry) {
                        bundleM.entry.forEach(function (entry) {
                            returnBundle.total++
                            returnBundle.entry.push(entry)
                        })
                    }
                    res.send(returnBundle);
                }
            })
        }
    })
});

//get a single type of resource
function getResources(identifier, type, session, cb) {
    var access_token = session['accessToken'];
    var config = session["config"];     //retrieve the configuration from the session...

    var uri = config.apiEndPoint + "/fhir/1.0/"+type+"/_search?patient.identifier="+identifier;
    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept':'application/json+fhir','authorization': 'Bearer ' + access_token}
    };

    console.log(options)

    request(options, function (error, response, body) {
        console.log('body ' , body);
        if (error) {
            cb(true,error)
        } else {
            cb(null,JSON.parse(body))
        }

    })
}

app.listen(port);

console.log('server listening on port ' + port);