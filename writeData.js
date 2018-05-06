//write out some demodata for the indicated patient. Uses sync. requests for simplicity...

var syncRequest = require('sync-request');
var moment = require('moment');

var framingham = require(__dirname + "/framingham.js");

var observations = framingham.observationList();

//create a set of observations for this patient
exports.saveResource = function(resource,endPoint,token,cb) {
    var resourceType = resource.resourceType;
    var url = endPoint + "/fhir/1.0/"+resourceType;
    var options = {};
    options.body = JSON.stringify(resource);
    options.headers = {'accept':'application/json','authorization': 'Bearer ' + token}
    options.timeout = 20000;        //20 seconds
    var response = syncRequest('POST', url, options);

    console.log(response.statusCode)
    if (response.statusCode > 201) {
        console.log(response.body.toString())
        cb({err:response.body.toString()})
    } else {
        cb({ok:response.body.toString()})
    }
    console.log('-----------------')

   // cb()


};





//create a set of observations for this patient
exports.makeObservations = function(patientIdentifier,endPoint,token,cb) {
    //first, locate the patient from the identifier

    var url = endPoint + "/fhir/1.0/Patient?identifier="+patientIdentifier;
    var options = {
        method: 'GET',
        headers: {'accept':'application/json','authorization': 'Bearer ' + token}
    };
    var response = syncRequest('GET', url, options);
    var body = JSON.parse(response.body);
    console.log('demog',body);

    if (body.entry && body.entry.length > 0) {  //Strictly, there should only be 1...
        var patient = body.entry[0].resource;
        //now we can create the Observations...
        var age = 4;        //how long ago to make the observations


        var err = [];        //

        observations.forEach(function (vo) {
            vo.patientRef = "Patient/"+patient.id;
            vo.date = moment().format();
            var obs = createObservation(vo)
            console.log(vo);
            console.log(obs)

            var url = endPoint + "/fhir/1.0/Observation" ;
            var options = {};
            options.body = JSON.stringify(obs);
            options.headers = {'accept':'application/json','authorization': 'Bearer ' + token}
            options.timeout = 20000;        //20 seconds
            var response = syncRequest('POST', url, options);

            console.log(response.statusCode)
            if (response.statusCode > 201) {
                console.log(response.body.toString())
                err.push({err:response.body.toString()})
               // cb({err:response.body.toString()})

            } else {
               // cb()
            }
            console.log('-----------------')
        });

        cb(err)

    } else {
        //there were no patients in the response...
        cb({err:"No patient found with the identifier: "+patientIdentifier})
    }



};

return;




//these are the config options...
//remoteFhirServer = "http://localhost:8080/baseDstu3/";
remoteFhirServer = "http://localhost:8079/baseDstu2/";

//var patientRef = 'Patient/2344';
var patientRef = 'Patient/108';

var sendObservations = true;
var sendConditions = false;



conditions.forEach(function (vo) {
    vo.patientRef = patientRef;
    vo.date = moment().subtract(age,'days').format();
    var cond = createCondition(vo)
    console.log(cond)

    //we only want a single condition for each code, so use a PUT
    var url = remoteFhirServer  + "Condition/"+vo.id ;
    var options = {};
    options.body = JSON.stringify(cond);
    options.headers = {"content-type": "application/json+fhir"};
    options.timeout = 20000;        //20 seconds
    var response = syncRequest('PUT', url, options);

    console.log(response.statusCode)
    if (response.statusCode > 201) {
        console.log(response.body.toString())
    }
    console.log('-----------------')

});
//return

//send all the Observations



//generate a single observation
function createObservation(vo) {
    var obs = {resourceType:'Observation',status:'final'};
    obs.code = {coding:[{system:vo.system,code:vo.code}],text:vo.name}
    obs.subject = {reference:vo.patientRef}
    obs.effectiveDateTime = vo.date;
    if (vo.name == 'Smoker') {      //this is only for smoker right now. valueBoolean seems to not be saved...
        obs.valueString = '4';  //https://s.details.loinc.org/LOINC/72166-2.html?sections=Comprehensive
    } else {
        var value = Math.round(vo.min + (vo.max-vo.min)* Math.random());
        obs.valueQuantity = {value:value,unit:vo.unit}
    }

    return obs;
}

function createCondition(vo) {
    var cond = {resourceType:'Condition',id:vo.id,verificationStatus:vo.verif};
    cond.patient = {reference:patientRef};
    cond.dateRecorded = vo.date;
    cond.code = {coding:[{system:vo.system,code:vo.code}],text:vo.name}
    return cond;
}