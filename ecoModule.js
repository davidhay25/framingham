var async = require("async");

var db;
exports.setup = function(app,hashDataBases){

    //console.log(hashDataBases);

    //download the entire config as a JSON file.
    app.get('/manage/downloadConfig',function(req,res){

        var db = req.selectedDbCon;
        //for testing...
        if (!db) {
            db = hashDataBases['cof']
        }

        //console.log(req.selectedDbCon)

        try {
            var config = createConfig(db,function(result){
                //console.log('ok',result)

                res.json(result)
            })

        } catch (err) {
            console.log(err)
            res.status(500).send(err)

        }

    })
};

//there are better ways of doing this in mongo - should investigate...
function createConfig(db,cb) {
    //first load all the tracks
    var hashRoles;

    async.series([
            function(cb) {
                //get all the roles...
                db.collection('role').find({status : {$ne : 'deleted' }}).toArray(function(err,roles){
                    if (err) {
                        cb(err)
                    } else {
                        var hash = {};
                        roles.forEach(function (role) {
                            hash[role.id] = role;
                        });
                        cb(null, hash);

                    }}
                )
            },
            function(callback) {
                // do some more stuff ...
                callback(null, 'two');
            }
        ],
        function(err, results) {
            hashRoles = results[0];
            console.log(hashRoles);
            db.collection('track').find({status : {$ne : 'deleted' }}).toArray(function(err,tracks){
                if (err) {
                    throw err
                } else {
                    //next the scenarios
                    db.collection('scenario').find({status : {$ne : 'deleted' }}).toArray(function(err,scenario) {
                        if (err) {
                            throw err
                        } else {
                            //create a hash of the scnenarios by id...
                            var hashScenario = {};
                            scenario.forEach(function(scenario){
                                //console.log(scenario)
                                hashScenario[scenario.id] = scenario;
                            });

                            var result = {tracks:[]}
                            tracks.forEach(function(raw){
                                //console.log(raw)
                                var track = {id:raw.id,name:raw.name,type:raw.type,scenarios:[]};
                                addIfNotNull(track,'description',raw.description)
                                addIfNotNull(track,'url',raw.url)
                                addIfNotNull(track,'endPoints',raw.endPoints)

                                if (raw.scenarioIds) {
                                    track.scenarios = [];
                                    raw.scenarioIds.forEach(function (id) {
                                        var s = hashScenario[id];
                                        //console.log(s)
                                        if (s) {
                                            var scenario = {id:s.id,name:s.name}
                                            addIfNotNull(scenario,'links',s.links)
                                            addIfNotNull(scenario,'steps',s.steps)
                                            addIfNotNull(scenario,'description',s.description)
                                            addIfNotNull(scenario,'action',s.action)
                                            addIfNotNull(scenario,'precondition',s.precondition)
                                            addIfNotNull(scenario,'success',s.success);
                                            addIfNotNull(scenario,'scenarioTypes',s.scenarioTypes)

                                            if (s.roleIds) {
                                                scenario.roles = []
                                                s.roleIds.forEach(function (id) {
                                                    var role = hashRoles[id];
                                                    if (role) {
                                                        scenario.roles.push({name:role.name,id:id})
                                                    }
                                                })

                                            }

                                            track.scenarios.push(scenario)
                                        }
                                    })
                                }


                                result.tracks.push(track);



                            });


                            cb(result);

                        }
                    })

                }
            })

        });





    function addIfNotNull(obj,eleName,element) {
        if (element) {
            obj[eleName] = element
        }

    }


}