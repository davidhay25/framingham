var client;

exports.setup = function(app,inclient,igDb){
    client = inclient;

    app.get('/public/report/igresult',function(req,res){

        let arAllResults = []
        getResults(arAllResults)


        async function getResults() {
            try {
                //console.log('at async')

                let dbs = ['con27','public']
                for (let inx in dbs) {

                    let ar = await getResultsOneDb(dbs[inx])
                    console.log(ar.length)
                    arAllResults = arAllResults.concat(ar)
                }

                let hashIG = await getAllIGs(igDb)

                //create summary by IG
                let hashIGResults= {}
                arAllResults.forEach(function (result){

                    if (result.IG && result.IG.id) {
                        let id = result.IG.id
                        hashIGResults[id] = hashIGResults[id] || {IG:hashIG[id],results:[]}
                        hashIGResults[id].results.push(result)
                        //only include results that are for an IG
                        //let
                    }
                })

                res.json(hashIGResults)
                //return ar
            } catch (ex) {
                console.log(ex)
                res.status(500)
            }

        }


    })
}

function getAllIGs(igDb) {
    console.log(igDb)
    return new Promise(function (resolve, reject) {
        let connIG = client.db(igDb)
        connIG.collection("ig").find({status : {$ne : 'deleted' }}).toArray(function(err,result){
            if (err) {
                reject()
            } else {
                let hash = {}
                result.forEach(function (ig){
                    hash[ig.id] = ig
                })
               resolve(hash)
            }
        })
    })
}

function getResultsOneDb(dbName) {
    return new Promise(function (resolve, reject) {
        let conn = client.db(dbName)

        conn.collection("person").find({status: {$ne: 'deleted'}}).toArray(function (err, result) {
            if (err) {
                reject()
            } else {
                let hashPerson = {}
                result.forEach(function (person) {
                    hashPerson[person.id] = person
                })

                conn.collection("result").find({status: {$ne: 'deleted'}}).toArray(function (err, result) {
                    if (err) {
                        reject()
                    } else {
                        let allResults = []
                        result.forEach(function (result) {
                            if (! result.asserter) {
                                let person = hashPerson[result.asserterid]
                                if (person) {
                                    result.asserter = {id:result.asserterid,name:person.name,contact:person.contact}
                                }
                            }
                            delete result._id;
                            result.event = {key:dbName}
                            allResults.push(result)


                        })
                        resolve(allResults)
                    }

                })


            }

        })
    })
}
