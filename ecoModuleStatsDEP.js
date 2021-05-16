
exports.getStats = function(db,res) {



    let statsCursor = db.collection('accessAudit').aggregate([

        { $group: { _id: "$country", count: { $sum: 1 } }},
        { $sort: { total: -1 } }
    ])

    //console.log(stats)
    let ar = []
    statsCursor.forEach(function (item){
        ar.push(item)
        console.log('item' , item)
    })

   return ar;

    /*

    https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/
    let qry = `
    db.getCollection('accessAudit').aggregate([
        { "$group": {
                "_id": { "$toLower": "$country" },
                "count": { "$sum": 1 }
            } },
        { "$group": {
                "_id": "countries",
                "counts": {
                    "$push": { "k": "$_id", "v": "$count" }
                }
            } }
    ]);
    `

    db.orders.aggregate([
        { $match: { status: "A" } },
        { $group: { _id: "$cust_id", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } }
    ])

    */

}


