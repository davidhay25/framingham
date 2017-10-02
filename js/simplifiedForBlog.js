/**
 * Created by davidha on 19/6/17.
 */




app.get('/orion/:identifier',function(req,res) {
    var identifier = req.params['identifier'];
    var access_token = reg.session['accessToken'];
    var config = req.session["config"];     //retrieve the configuration from the session...
    var uri = "http:OrionAPI/fhir/1.0/MedicationDispense/_search?patient.identifier=" + identifier;
    var options = {
        method: 'GET',
        uri: uri,
        headers: {'accept': 'application/json+fhir', 'authorization': 'Bearer ' + access_token}
    };
    request(options, function (error, response, body) {
        console.log('body ', body);
        if (error) {
            res.send(500);
        } else {
            res.send(returnBundle);
        }

    })
})





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



app.get('/auth/', function(req, res)  {
    var config = req.session["config"];     //retrieve the configuration from the session...
    var authorizationUri = "http:OrionAPI/oauth2/authorize";
    authorizationUri += "?redirect_uri=" + encodeURIComponent(config.callback);
    authorizationUri += "&scope=notifications";
    authorizationUri += "&state=" + encodeURIComponent("3(#0/!~");
    authorizationUri += "&response_type=code";
    authorizationUri += "&client_id="+config.clientId;
    res.redirect(authorizationUri);
});


app.get('/callback', function(req, res) {
    var code = req.query.code;

    var config = req.session["config"];     //retrieve the configuration from the session...
    var options = {
        method: 'POST',
        uri: "http:OrionAPI/oauth2/token",
        body: 'code=' + code + "&grant_type=authorization_code&redirect_uri=" + config.callback + "&client_id=" + config.clientId + "&client_secret=" + config.secret,
        headers: {'content-type': 'application/x-www-form-urlencoded'}
    };

    request(options, function (error, response, body) {
        console.log('error ',error)
        if (response && response.statusCode == 200) {
            console.log(response.statusCode)
            req.session['accessToken'] = JSON.parse(body)['access_token']
            res.redirect('orion.html')
        } else {
            res.redirect('error.html')
        }
    })
});