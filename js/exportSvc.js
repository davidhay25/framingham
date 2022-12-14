angular.module("sampleApp").service('exportSvc', function() {



    return {
        makeServerExport : function(servers,hashTracks,hashIgs,hashPersons,filterTrack){
            let output = []
            if (servers && servers.length > 0) {
                servers.forEach(function (svr) {
                    let sumry = {}
                    sumry.name = svr.name
                    sumry.accessToken = svr.accessToken
                    sumry.address = svr.address
                    sumry.description = svr.description
                    sumry.proxy = svr.proxy
                    sumry.UIaddress = svr.UIaddress
                    sumry.fhirVersion = svr.fhirVersion
                    sumry.isTerminology = svr.isTerminology
                    sumry.connectionType = svr.connectionType
                    sumry.dynamicRegistration = svr.dynamicRegistration


                    sumry.payloadType = svr.payloadType

                    sumry.trustFrameworkType = svr.trustFrameworkType


                    sumry.publicCert = svr.publicCert
                    sumry.exchangeCert = svr.exchangeCert
                    sumry.signedArtifact = svr.signedArtifact






                    let isInTrack = false       //set true if there is a track, and this server has a reference to it
                    if (svr.tracks && svr.tracks.length > 0) {
                        sumry.tracks = []
                        svr.tracks.forEach(function (trackId) {
                            let track = hashTracks[trackId]
                            if (track) {
                                sumry.tracks.push({name:track.name})
                                if (filterTrack && track.id == filterTrack.id) {
                                    isInTrack = true
                                }
                            }

                        })

                    }
                    if (svr.igs && svr.igs.length > 1) {
                        sumry.igs = []
                        svr.igs.forEach(function (igId) {
                            let ig = hashIgs[igId]
                            if (ig) {
                                let clone = angular.copy(ig)
                                delete clone.id
                                delete clone._id
                                sumry.igs.push(clone)

                            }
                        })

                    }

                    if (svr.contact) {
                        sumry.contacts = []
                        svr.contact.forEach(function (contact) {
                            let person = hashPersons[contact.id]
                            let sContact = {name:contact.name}
                            if (person) {
                                sContact.details = {contact:person.contact,name:person.name}
                            }
                            sumry.contacts.push(sContact)

                        })
                    }

                    //If there's a filterTrack then only add to the summary if the track mentions it
                    if (filterTrack) {
                        if (isInTrack) {
                            output.push(sumry)
                        }
                    } else {
                        output.push(sumry)
                    }


                })
            }

            return output



        }

    }

});