var request = require('request');
var jwt = require('jsonwebtoken');

//http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/

exports.validateJWT = function(jwtInstance,rawJwt) {

    return new Promise(function(resolve, reject) {
        // Do async job

        console.log('----------- in validate...',jwtInstance);

        if (!jwtInstance.payload) {
            reject('no payload property in JWT token...')
            return;
        }



        var issuer = jwtInstance.payload.iss;   //the issuer
        var userProfile = jwtInstance.payload.profile;      //this will be the current user. Next steps are to validate the jwt token...


        if (! issuer) {
            reject('No issuer found in the JWT token...')
            return;
        }

        //console.log(issuer);
        //this is teh 'well known' location (see the SMART spec)

        var url = issuer + "/.well-known/openid-configuration";

        var options = {
            url: url,
            headers: {
                'User-Agent': 'request'
            }
        };

        request.get(options,function(err,resp,body) {
            if (!err && body) {
                var json = JSON.parse(body)
                //console.log(body)
                //console.log(json['jwks_uri'])
                if (json['jwks_uri']) {
                    var url = json['jwks_uri'];
                    console.log(url)
                    request.get(url, function (err, resp, body) {
                        if (!err && body) {



                            var webKey = JSON.parse(body);        //should be the decryption keys...


                            console.log('keys',webKey.keys);

                            //https://www.iana.org/assignments/jose/jose.xhtml#web-key-types

                            var key = webKey.keys[0].n;

                            console.log('------- verifying...')
                            console.log('--------key:',key)
                            //console.log(jwt.verify(rawJwt,body))


                            //console.log(jwt.verify(rawJwt,key,{algorithms:[webKey.keys[0].alg]}));



                            //now we can return the non-private config...
                            //console.log(config)
                          resolve(webKey)
                        } else {
                           reject(err)
                        }
                    })


                } else {
                    req.session.error = {err: "couldn't find " + config.clientIdConfig};
                    res.redirect('smartError.html')
                }

            } else {
                //can't find the
                req.session.error = body;
                res.redirect('smartError.html')
            }
        })
    })
}