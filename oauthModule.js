var request = require('request');
var jwt = require('jsonwebtoken');

//http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/

const jwkToPem = require("jwk-to-pem"); //https://www.npmjs.com/package/jwk-to-pem/tutorial


exports.validateJWT = function(rawJwt) {

    return new Promise(function(resolve, reject) {

        //using the jwt library, decode the JWT token
        var id_token = jwt.decode(rawJwt, {complete: true});
        //console.log('----------- in validate...');//,jwtInstance);

        //?? is this check necessory???
        if (!id_token.payload) {
            reject('no payload property in JWT token...');
            return;
        }
        if (!id_token.header) {
            reject('no header property in JWT token...');
            return;
        }

        var alg = id_token.header.alg;   //signing algorithm used
        var issuer = id_token.payload.iss;   //the issuer
        var userProfile = id_token.payload.profile;      //this will be the current user. Next steps are to validate the jwt token...

        if (! issuer) {
            reject('No issuer found in the JWT token...');
            return;
        }

        //this is the 'well known' location (see the SMART spec - http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/)
        var url = issuer + "/.well-known/openid-configuration";
        request.get({url:url},function(err,resp,body) {
            if (!err && body) {
                var json = JSON.parse(body)
                if (json['jwks_uri']) {         //another 'well known' location..
                    var url = json['jwks_uri'];
                    request.get(url, function (err, resp, body) {
                        if (!err && body) {
                            var webKey = JSON.parse(body);        //should be the decryption keys...

                            //just grap the first key...
                            var key = webKey.keys[0]

                            //now verify the token...
                            try {
                                var outcome = jwt.verify(rawJwt,jwkToPem(key),{algorithms:[alg]})
                                //throws an exception if fails validation, so must be OK..
                                resolve(id_token)
                            } catch (ex) {
                                console.log('error verifying jwt:',ex)
                                reject(ex)
                            }

                        } else {
                           reject(err)
                        }
                    })

                } else {
                    reject("couldn't find " + config.clientIdConfig)
                }

            } else {
                //can't find the well known config.
                reject("can't find "+url);

            }
        })
    })
}