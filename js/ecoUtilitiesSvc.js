angular.module("sampleApp").service('ecoUtilitiesSvc', function($q,$http,modalService,$localStorage) {


    return {

        getObjectSize : function(obj) {
            //http://www.russwurm.com/uncategorized/calculate-memory-size-of-javascript-object/

            function roughSizeOfObject( object ) {
                var objectList = [];
                var recurse = function( value ) {
                    var bytes = 0;

                    if ( typeof value === 'boolean' ) {
                        bytes = 4;
                    } else if ( typeof value === 'string' ) {
                        bytes = value.length * 2;
                    } else if ( typeof value === 'number' ) {
                        bytes = 8;
                    } else if (typeof value === 'object'
                        && objectList.indexOf( value ) === -1) {
                        objectList[ objectList.length ] = value;
                        for( i in value ) {
                            bytes+= 8; // assumed existence overhead
                            bytes+= recurse( value[i] )
                        }
                    }
                    return bytes;
                }

                return recurse( object );
            }

            return roughSizeOfObject(obj)
        },

        generateHash : function(){
            var hash = "";
            var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 5; i++ ) {
                hash += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return hash;
        }
    }

    });