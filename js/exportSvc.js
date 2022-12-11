angular.module("sampleApp").service('exportSvc', function() {



    return {
        makeServerExport : function(servers,hashTracks,hashIgs,hashPersons){
            let output = []
            if (servers && servers.length > 0) {
                servers.forEach(function (svr) {
                    let sumry = {}
                    sumry.name = svr.name

                    sumry.address = svr.address
                    sumry.description = svr.description
                    sumry.proxy = svr.proxy
                    sumry.UIaddress = svr.UIaddress
                    sumry.fhirVersion = svr.fhirVersion
                    sumry.isTerminology = svr.isTerminology
                    sumry.connectionType = svr.connectionType
                    if (svr.tracks && svr.tracks.length > 0) {
                        sumry.tracks = []
                        svr.tracks.forEach(function (trackId) {
                            let track = hashTracks[trackId]
                            if (track) {
                                sumry.tracks.push({name:track.name})
                            }

                        })

                    }
                    if (svr.igs && svr.igs.length > 1) {
                        sumry.igs = []
                        svr.igs.forEach(function (igId) {
                            let ig = hashIgs[igId]
                            if (ig) {
                                delete ig.id
                                delete ig._id
                                sumry.igs.push(ig)
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

                    output.push(sumry)

                })
            }

            return output



        }

    }

});