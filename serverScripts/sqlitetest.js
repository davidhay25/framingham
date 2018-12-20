#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();

let dataBaseFile = "./encounterSample.db";
let db = new sqlite3.Database(dataBaseFile, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the '+dataBaseFile+ ' database.');
});


let sql = `select * from encounter,patient
    where encounter.patientid = patient.patientid
    and patient.identifierValue = "abc123"
    and patient.identifierSystem = "sys2"`;

db.all(sql, [], (err, rows) => {
    if (err) {
        throw err;
    }

    let bundle = {resourceType:'Bundle',type :'searchset',entry:[]}
    let serverBase = 'http://testserver/fhir/';      //the base of the FHIR server (as seen from the outside)


    rows.forEach((row) => {
        //add the encounters to the bundle. Could add the patient as well (if _include was set)
        let encounter = {resourceType:'Encounter'};
        encounter.id = String(row.encounterid);     //id must be a string
        encounter.reason = {text:row.reason};       //a CodeableConcept datatype
        encounter.status = "finished";              //safe to hardcode this

        //map from the value in the database to the FHIR value. using a terminology server - ConceptMap/$translate would be cleaner
        let klass;
        switch (row.type) {
            case 'gp' :
                klass = 'AMB'
                break;
        }

        encounter.class = {system:"http://hl7.org/fhir/ValueSet/v3-ActEncounterCode",code:klass};      //a Coding datatype
        encounter.period = {start:row.datetime};        //assume the format in the db is the FHIR format
        encounter.subject = {reference:serverBase + 'Patient/' + row.patientid}; //


        let fulUrl = serverBase + "Encounter/"+row.encounterid;
        bundle.entry.push({fullUrl:fulUrl,resource:encounter})


        //console.log(row);
    });

    console.log(JSON.stringify(bundle));
});