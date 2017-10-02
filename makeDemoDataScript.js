#!/usr/bin/env node

var syncRequest = require('sync-request');
var moment = require('moment');

/*
* When the script is run, the patient id, age of results and target server must be set
* The results are sent to target server synchronously (not all servers handle multiple calls well or batches)...
* */
var framingham = require(__dirname + "/framingham.js");

//these are the config options...
//remoteFhirServer = "http://localhost:8080/baseDstu3/";
remoteFhirServer = "http://localhost:8079/baseDstu2/";

//var patientRef = 'Patient/2344';
var patientRef = 'Patient/108';
var age = 4;        //how long ago to make the observations
var sendObservations = true;
var sendConditions = false;

var observations = framingham.observationList();

var conditions = framingham.conditionList();

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
observations.forEach(function (vo) {
    vo.patientRef = patientRef;
    vo.date = moment().subtract(age,'days').format();
    var obs = createObservation(vo)
    console.log(obs)

    var url = remoteFhirServer  + "Observation" ;
    var options = {};
    options.body = JSON.stringify(obs);
    options.headers = {"content-type": "application/json+fhir"};
    options.timeout = 20000;        //20 seconds
    var response = syncRequest('POST', url, options);

    console.log(response.statusCode)
    if (response.statusCode > 201) {
        console.log(response.body.toString())
    }
    console.log('-----------------')
});



//generate a single observation
function createObservation(vo) {
    var obs = {resourceType:'Observation',status:'final'};
    obs.code = {coding:[{system:vo.system,code:vo.code}],text:vo.name}
    obs.subject = {reference:vo.patientRef}
    obs.effectiveDateTime = vo.date;
    if (vo.type == 'bool') {
        obs.valueBoolean = false;
        if (Math.random() > .5) {
            obs.valueBoolean = true;
        }
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