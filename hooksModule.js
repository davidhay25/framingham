
var hooksConfig;

exports.setup = function(app){

    hooksConfig = {services:[]};

    var service = {};
    service.hook = 'patient-view';
    service.name = 'Smoking status';
    service.description = 'Examines the database to determine the smoking status based on Observations';
    service.id = 'smoking-status';

    hooksConfig.services.push(service);

    app.get('/hooks/smoking-status',function(req,res){
        smokingStatus(req,res);

    });

    //the discovery endpoint
    app.get('/hooks/cds-services',function(req,res){
        res.json(hooksConfig);
    });
};


var smokingStatus = function(req,res) {
    res.json('gotcha!')
};