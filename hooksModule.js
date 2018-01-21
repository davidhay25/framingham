
var hooksConfig;

exports.setup = function(app){

    hooksConfig = {services:[]};

    var service = {};
    service.hook = 'patient-view';
    service.name = 'Smoking status';
    service.description = 'Examines the database to determine the smoking status based on Observations';
    service.id = 'smoking-status';
    service.prefetch = {};
    service.prefetch.patient = "Patient/{{Patient.id}}";
    service.prefetch.observations = "Observation?subject={{Patient.id}}";

    hooksConfig.services.push(service);

    app.post('/hooks/cds-services/smoking-status',function(req,res){
        smokingStatus(req,res);

    });

    //the discovery endpoint
    app.get('/hooks/cds-services',function(req,res){
        res.json(hooksConfig);
    });
};


//this function knows what 'could' be in the body - especially prefetch stuff
var smokingStatus = function(req,res) {
    var payload = req.body;     //payload is the hook request object
    console.log(payload)


    //get the data that was passed across in the call...
    var patient,observations;

    if (payload.prefetch) {
        if (payload.prefetch.patient) {
            patient = payload.prefetch.patient.resource;
        }
        if (payload.prefetch.observations) {
            observations = payload.prefetch.observations.resource
        }

    }


    //now, let's model getting other data we want from the caller
    //var ehrFHIRInterface = payload.fhirServer;




    var response = {cards:[]}

    var card = {};
    card.summary = "Received the message"
    card.detail = "";
    if (patient) {
        card.detail += "Patient was " + patient.text.div;
    }
    if (observations) {
        card.detail += "There were " + observations.entry.length + "Observations";//  patient.text.div;
    }

    card.suggestions = [];


    var action = {};
    action.type = "create";
    action.description = "Suggest you take the patients blood pressure";


    var suggestion = {label:"Check Blood Pressure",uuid:uuidv4(), actions:[]}
    suggestion.actions.push(action);
    card.suggestions.push(suggestion);
    response.cards.push(card);


    res.json(response)
};

function uuidv4() {
    //https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}