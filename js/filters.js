/**
 * Created by davidhay on 27/10/14.
 */


angular.module("sampleApp")

    .filter('manualText',['builderSvc',function(builderSvc){
        return function(resource) {

            if (resource && resource.text) {
                var vo = builderSvc.splitNarrative(resource.text.div)
                return vo.manual;
            }
        }
    }])

    .filter('showMapOnly', function() {
        return function(map) {
            var ar = map.split('|');
            return ar[0];
        }
    })
    .filter('addSpace', function() {
        return function(s) {
            //https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript


            return s.replace(/\./g, '. ');


          //  var ar = s.split('.')
          //  return ar.join('. ')


        }
    })

    .filter('libraryCategory', function() {
        return function(selectedCategory,container) {
            console.log(selectedCategory,container)
            return false;
        }
    })

    .filter('resourceTextFromReference',['builderSvc',function(builderSvc){
        return function(reference) {

            var resource = builderSvc.resourceFromReference(reference);
            //console.log(resource)
            if (resource) {
                //if the text is empty, return the reference...
                if (! builderSvc.isEmptyText(resource.text.div )) {
                    return resource.text.div
                } else {
                    return reference
                }
            } else {
                //if the references resource has been removed from the set...
                return reference
            }

        }
    }])
    .filter('markDown', function() {
        return function(text) {
            var converter = new showdown.Converter(),

                html  = converter.makeHtml(text);

            return html;
        }
    })
    .filter('oneLineResource', ['ResourceUtilsSvc', function(ResourceUtilsSvc) {
        return function(resource) {
            return ResourceUtilsSvc.getOneLineSummaryOfResource(resource);
        }
    }])

    .filter('getLogicalID',function(){
        return function(id) {
            //console.log(id);
            if (id) {
                var url = id;
                if (angular.isArray(id)){
                    url = id[0];
                }

                //console.log(id);
                var ar = url.split('/');
                var lid = ar[ar.length-1];
                return lid;
            } else {
                return "" ; //nov 11 - was returning an array
            }

        }

    })
    .filter('getAge',function(){
        return function(dob,inBrackets){
            if (dob) {
                var diff = moment().diff(moment(dob),'days');
                var disp = "";

                if (diff < 0) {
                    //this is a future date...
                    return "";
                }

                if (diff < 14) {
                    disp = diff + " days";
                } else if (diff < 32) {
                    disp = Math.floor( diff/7) + " weeks";
                } else {
                    disp = Math.floor( diff/365) + " years";
                    //todo logic for better age
                }
                if (inBrackets) {
                    return "(" + disp+")";
                } else {
                    return disp;
                }

            } else {
                return '';
            }

        }
    })
    .filter('getAgeSeconds',function(){
        return function(da,inBrackets){
            if (da) {
                var diff = moment().diff(moment(da),'seconds');
                var disp = "";
                if (diff < 60) {
                    disp = diff + " secs";
                } else if (diff < 60*60) {
                    var m = Math.floor( diff/60);
                    if (m == 1) {
                        disp =  " 1 minute";
                    } else {
                        disp = m + " minutes";
                    }


                } else if (diff < 60*60*24){
                    var d = Math.floor( diff/(60*60));
                    if (d ==1 ) {
                        disp =  "1 hour";
                    } else {
                        disp = d + " hours";
                    }


                    //todo logic for better age
                } else if (diff < 60*60*24*30){
                    var d = Math.floor( diff/(60*60*24));
                    if (d == 1){
                        disp = '1 day';
                    } else {
                        disp = d + " days";
                    }

                    //todo logic for better age

                } else {
                    var w = Math.floor( diff/(60*60*24*7));
                    if (w == 1) {
                        disp = "1 week";
                    } else {
                        disp = w + " weeks";
                    }


                    //todo logic for better age
                }


                if (inBrackets) {
                    return "(" + disp+")";
                } else {
                    return disp;
                }

            } else {
                return '';
            }

        }})
    .filter('referenceType',function(){
        return function(ref) {
            //return the last part of a url - allowing for stu2 (array) or stu3 (single)
            if (ref) {

                var profile = ref;
                if (angular.isArray(profile)){
                    profile = ref[0]
                }

                //DSTU-2 - this is an array - just grab the first
                var ar = profile.split('/');
                //console.log(ar)
                return(ar[ar.length-1]);
            } else {
                return ref;
            }



        }
    })
    .filter('cleanTextDiv',function(){
        //remove the <div  xmlns='http://www.w3.org/1999/xhtml'>{texthere}</div> tgs...
        return function(textDiv) {
            //console.log(textDiv)
            if (textDiv) {
                var startDiv = "<div xmlns='http://www.w3.org/1999/xhtml'>";
                if (textDiv.indexOf(startDiv) > -1) {
                    textDiv = textDiv.replace(startDiv,"");

                    textDiv = textDiv.substr(0,textDiv.length - 6);
                }

                return textDiv;
            }


        }
    })
    .filter('addTextDiv',function(){
        //add the <div  xmlns='http://www.w3.org/1999/xhtml'>{texthere}</div> tgs...
        return function(textDiv) {
            return "<div xmlns='http://www.w3.org/1999/xhtml'>" + textDiv + "</div>";

        }
    })
    .filter('dropFirstInPath',function(){
            return function(path) {
                //return the last part of a path - allowing for stu2 (array) or stu3 (single)
                if (path) {
                    var ar = path.split('.');
                    ar.splice(0,1);
                    return ar.join('.') //removed training space...
                }


            }
        }

    ).filter('stripDiv',function(){
    return function(text) {
        return text;
    }
    }).filter('bundleDisplay',function(){
        //return a display version of the bundle
        return function(bundle) {
            var response = {resourceType:'Bundle',entry:[]}
            if (bundle && bundle.entry) {
                bundle.entry.forEach(function(entry){
                    var resource =entry.resource;
                    if (resource.extension && resource.extension.length == 0) {
                        delete resource.extension;
                    }
                    response.entry.push({resource:resource})
                })

            }
            return response;
        }
    }).filter('containerMeta',function(){
    //return the metadata in the container
    return function(container) {
        if (container) {
            var t = angular.copy(container)
            delete t.bundle;        //the bundle of resources
            delete t.resources;     //an array added when viewing the scenario in the library
            return t;
        }

    }
})

    .directive('autoFocus', function($timeout) {
        return {
            restrict: 'AC',
            link: function(_scope, _element) {
                $timeout(function(){
                    _element[0].focus();
                }, 0);
            }
        };
    }).filter('resourcesOfType',function(){
    return function(ar,filt) {
        console.log(ar,filt);
        return ar;
    }
});