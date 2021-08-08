let fs = require("fs")
var request = require('request');
let fhirServer = "http://home.clinfhir.com:8054/baseR4/";    //for saving the config in a binary resource

let connCommon;         //the database where common collections are stored - server & IG currently. con27 for now...
exports.setup = function(app,client) {

    //add the person objects to a 'trackLead' collection

    app.post('/admin/makeTrackLeadCollection',function (req,res){
        if (req.selectedDbCon) {
            let trackLeads = req.body;      //array of track leads
            req.selectedDbCon.collection("trackLeads").drop({}, function (err) {
                let doInsert = true;

                /*
                if (err) {
                    if (err.code !== 26) {
                        reject("track:error during drop")
                    }
                }
    */

                req.selectedDbCon.collection("trackLeads").insertMany(trackLeads, {}, function (err, result) {

                    if (err) {
                        res.status(500).json(err)
                        reject("trackLeads:error during insertMany")
                    } else {
                        console.log(result.insertedCount + ' persons inserted')
                        res.json({msg: `${result.insertedCount} persons inserted`})
                    }
                })

            })
        } else {
            res.status(500).send({msg:"No collection found"})
        }
    })






    //mark a track as deleted
    app.put('/admin/deleteTrack/:id',function (req,res){
        if (req.selectedDbCon) {
            let id = req.params.id;
            req.selectedDbCon.collection("track").update({id:id},{$set:{status:'deleted'}},function(err,result){
                if (err) {
                    res.status(500).send({msg:'Error deleting track'})
                } else {
                    res.send({})
                }
            })
            //res.json();
        } else {
            res.status(500).send({msg:'Database not found'})
        }


    })

    //download the entire config as a JSON file.
    app.get('/admin/getConfig/:code', function (req, res) {
        let code = req.params.code;

        let fileName = "./artifacts/eventConfig-" + req.params.code + ".json";
        let url = fhirServer + "/Binary/ct-" + code

        let options = {
            method: 'GET',
            uri: url,
            'content-type': 'application/fhir+json'
        };

        request(options, function (error, response, body) {
            //console.log(response.statusCode, body)

            if (response.statusCode == 404 || response.statusCode == 410) {
                //not found or deleted
                //if the code is unknown, return an empty object (so the UI can be used
                let event = {key: code, tracks: []}
                res.json(event)
            } else {
                let resource = JSON.parse(body);

                //console.log(resource)
                //console.log('----------')
                //console.log('data= ',resource.data)

                let config = Buffer.from(resource.data, 'base64').toString('ascii')

                //console.log(config)
                res.json(JSON.parse(config))
            }
        })


        /*
                try {
                    let contents = fs.readFileSync(fileName, {encoding: 'utf8'});
                    let resource = JSON.parse(contents)
                    res.json(resource)

                } catch (ex) {
                    res.status(404).json(ex)
                }
                */
    })


    app.put('/admin/putConfig/:code', function (req, res) {
        let code = req.params.code;
        let fileName = "./artifacts/eventConfig-" + code + ".json";
        let config = req.body;
        //console.log(fileName, config)
        try {
            fs.writeFileSync(fileName, JSON.stringify(config));

            let b64 = Buffer.from(JSON.stringify(config)).toString('base64');

            let resource = {resourceType: "Binary", "content-type": "application/json", data: b64}
            //console.log(config)
            //console.log(resource)

            let url = fhirServer + "/Binary/ct-" + code

            let options = {
                method: 'PUT',
                body: JSON.stringify(resource),
                uri: url,
                'content-type': 'application/fhir+json'
            };

            request(options, function (error, response, body) {
                //console.log(response.statusCode)
                if (response.statusCode !== 200 && response.statusCode !== 201) {
                    res.status(500).json()
                } else {
                    res.json()
                }
            })


            //Buffer.from("Hello World").toString('base64'))

            //console.log(b64)


        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex)
        }
    })


    //get all the servers from the 'reference' db. Currently this is con27 (where the IG's are also)
    //+++++++++++ old ++++++++++++
    app.get('/admin/servers', function (req, res) {
        connCommon.collection("server").find({}).toArray(function (err, result) {
            if (err) {
                res.send(err, 500)
            } else {
                res.json(result)
            }
        })
    })
}