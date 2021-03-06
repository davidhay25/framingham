angular.module("sampleApp").service('getDatatypeValueSvc', function() {

        return {
            getDTValue : function(dt,value){
                //get the value for a datatype - implemented for newBuilder...
                var v,text = "";
                switch (dt) {


                    case 'Ratio' :
                        v = {}
                        try {
                            if (value.ratio.numerator) {
                                var numValue = parseFloat(value.ratio.numerator.value)
                                var numUnits = value.ratio.numerator.units;
                                var numSystem = value.ratio.numerator.system;
                                text += numValue + numUnits;
                                v.numerator = {value:numValue,unit:numUnits,system:numSystem};
                            }

                        } catch (ex) {
                            //alert?? what to do?
                            console.log('error parsing numerator:',ex)
                        }

                        try {
                            if (value.ratio.denominator) {
                                var denomValue = parseFloat(value.ratio.denominator.value)
                                var denomUnits = value.ratio.denominator.units;
                                var denomSystem = value.ratio.denominator.system;
                                text += " / " + denomValue + denomUnits;
                                v.denominator = {value:denomValue,unit:denomUnits,system:denomSystem};
                            }

                        } catch (ex) {
                            //alert??  what to do?
                            console.log('error parsing denominator:',ex)
                        }






                        break;

                    case 'positiveInt' :
                        v = parseInt(value.integer,10);
                        text = v;
                        break;
                    case 'unsignedInt' :
                        v = parseInt(value.integer,10);
                        text = v;
                        break;

                    case 'ReferenceDEP':
                        v = {};
                        if (value.reference) {
                            v.reference = value.reference.url;
                            v.identifier = value.reference.identifier;
                            v.display = value.reference.display;
                        }
                        break;

                    case 'Narrative' :

                        var narrativeText = value.narrative.div;
                        narrativeText = "<div xmlns='http://www.w3.org/1999/xhtml'>"+ narrativeText + "</div>"
                        v = {div:narrativeText,status:'additional'};

console.log(v);


                        text = value.narrative.div;
                        break;
                    case 'instant' :
                        //value is a Date object...
                        v = moment(value.date).format();
                        text = v;
                        break;
                    case 'Attachment' :
                        v = {title:value.attachment.title};

                        addIfNotEmpty(value.attachment.contentType,v,'contentType');
                        addIfNotEmpty(value.attachment.language,v,'language');
                        addIfNotEmpty(value.attachment.url,v,'url');
                        addIfNotEmpty(value.attachment.size,v,'size');
                        addIfNotEmpty(value.attachment.hash,v,'hash');

                        if (value.attachment.creation) {
                            var cr = moment(value.attachment.creation).format();
                            addIfNotEmpty(cr,v,'creation');

                        }
                        text = v.title;
                        break;

                    case 'Quantity' :
                    case 'Money' :
                    case 'Count' :
                    case 'Distance':
                    case 'Duration':
                    case 'Age' :
                        var f = parseFloat(value.quantity.value)

                        if (f !== f) {      //test for Nan (http://stackoverflow.com/questions/30314447/how-do-you-test-for-nan-in-javascript)
                            alert('Must be a numeric value')        //todo - shouldn't really use alert here...

                        } else {
                            v = {value:f,unit:value.quantity.unit}
                            text = f + " " + v.unit;
                        }

                        break;
                    case 'Dosage' :
                        var insrt = {};
                        //addIfNotEmpty(value.HumanName.use,insrt,'use');

                        insrt.text = value.dosage.text;
                        insrt.sequence = value.dosage.sequence;
                        insrt.patientInstruction = value.dosage.patientInstructions;
                        insrt.timing =  value.dosage.timing;

                        if (value.dosage.route) {
                            insrt.route = value.dosage.route
                        }
                        if (value.dosage.dose) {
                            insrt.doseQuantity = {value: value.dosage.dose.value}
                            insrt.doseQuantity.unit = value.dosage.dose.unit;
                        }
                        if (value.dosage.prn) {
                            if (value.dosage.prn.reason) {
                                insrt.asNeededCodeableConcept = {text:value.dosage.prn.reason}
                            }

                        }


                        v = insrt;
                        text = insrt.text;
                        break;
                    case 'extensionDEP' :


                        break;
                    case 'integer' :
                        v = parseInt(value.integer,10);
                        text = v;
                        break;

                    case 'decimal' :
                        v = parseFloat(value.integer)
                        text = v;
                        break;

                    case 'uri' :
                        v = value.uri;
                        text = v;
                        break;

                    case 'ContactPoint':
                        v = {value:value.contactpoint.value,system:value.contactpoint.system,use:value.contactpoint.use}
                        text = v.value + " ("+ v.system + ")";
                        break;
                    case 'Identifier' :
                        v = {value:value.identifier.value,system:value.identifier.system}
                        text = value.identifier.system + "|" + value.identifier.value;
                        break;

                    case 'boolean' :
                        v = value.boolean;
                        text = v;
                        break;
                    case 'Annotation' :
                        v = {text:value.Annotation.text,time:moment().format()}
                        text = v.text;
                        break;

                    case 'HumanName' :
                        var fhirVersion = 3; //appConfigSvc.getCurrentDataServer().version; //format changed between versions

                        var insrt = {}

                        text += addIfNotEmpty(value.HumanName.use,insrt,'use');
                        text += addIfNotEmpty(value.HumanName.prefix,insrt,'prefix',true);
                        text += addIfNotEmpty(value.HumanName.given,insrt,'given',true);
                        text += addIfNotEmpty(value.HumanName.middle,insrt,'given',true);
                        if (fhirVersion == 2) {
                            text += addIfNotEmpty(value.HumanName.family,insrt,'family',true);
                        } else {
                            text += addIfNotEmpty(value.HumanName.family,insrt,'family');
                        }


                        text += addIfNotEmpty(value.HumanName.suffix,insrt,'suffix',true);

                        addIfNotEmpty(value.HumanName.text,insrt,'text');

                        text = text || value.HumanName.text;

                        v = insrt;
                        break;

                    case 'Address' :
                        var insrt = {}

                        addIfNotEmpty(value.Address.use,insrt,'use');
                        addIfNotEmpty(value.Address.type,insrt,'type');

                        addIfNotEmpty(value.Address.line1,insrt,'line',true);
                        addIfNotEmpty(value.Address.line2,insrt,'line',true);
                        addIfNotEmpty(value.Address.line3,insrt,'line',true);

                        addIfNotEmpty(value.Address.city,insrt,'city');
                        addIfNotEmpty(value.Address.district,insrt,'district');
                        addIfNotEmpty(value.Address.state,insrt,'state');
                        addIfNotEmpty(value.Address.postalCode,insrt,'postalCode');

                        addIfNotEmpty(value.Address.country,insrt,'country');

                        addIfNotEmpty(value.Address.text,insrt,'text');


                        //make the display test the first line, the address.text or a stringify of the object...
                        if (insrt.line) {
                            text = insrt.line[0];
                        } else if (value.Address.text) {
                            text = value.Address.text;
                        } else {
                            text = angular.toJson(insrt)
                        }


                        v = insrt;
                        break;

                    case 'Period' :
                        if (value.period) {
                            var start = value.period.start;
                            var end = value.period.end;
                            v = {start:start,end:end}

                            text = '';
                            if (v.start) {
                                text += moment(v.start).format('YYYY-MM-DD');
                            }

                            if (v.end) {
                                text += " to " + moment(v.end).format('YYYY-MM-DD') ;
                            }

                            //text = moment(v.start).format() + " to " + moment(v.end.format()) ;
                        }


                        break;

                    case 'date' :
                        //value is a Date object...
                        v = moment(value.date).format('YYYY-MM-DD');
                        text = v;
                        break;
                    case 'dateTime' :
                        //value is a Date object...

                        //var v = moment(value.date).format();

                        v = moment(value.date).format('YYYY-MM-DD');
                        if (value.time) {
                            value.date = value.time;    //when time is selected, date is null
                            value.date.setHours(value.time.getHours());
                            value.date.setMinutes(value.time.getMinutes());
                        }

                        v = moment(value.date).format();
                        text = v;

                        break;

                    case 'code' :
                        v = value.code;
                        text = value.code;
                        break;
                    case 'string' :
                        v = value.string;
                        text = value.string;
                        break;
                    case 'MarkDown' :
                        v = value.markdown;
                        text = value.markdown;
                        break;
                    case "CodeableConcept" :
                        //value is an object that can have properties code, system, display, text
                        var cc = {},text="";
                        if (value && value.cc) {

                            //when a CC is rendered as a set of radios the output is a json string...

                            if (angular.isString(value.cc)) {
                                value.cc = {coding:angular.fromJson(value.cc)}
                                delete value.cc.coding.extension;
                            }


                            if (value.cc.coding && value.cc.coding.code) {

                                cc.coding = [] ; //[value.cc.coding]
                                var coding = {}
                                coding.code = value.cc.coding.code;      //from the specific input box
                                coding.system = value.cc.coding.system;
                                coding.display = value.cc.coding.display;
                                cc.coding.push(coding)
                                //  if (value.cc.coding.display) {
                                // text = value.cc.coding.display
                                // }
                            }
                            if (value.cc.text) {
                                cc.text = value.cc.text;
                                text = value.cc.text;
                            }



                            v = cc;

                        }

                        break;
                    case "Coding" :
                        //value is an object that can have properties code, system, display, text
                        var cc = {},text="";
                        if (value && value.coding) {
                            v = value.coding

                        }
                        text = v;
                        break;
                }

                return {value:v,text:text};


                function addIfNotEmpty(value,obj,prop,isArray) {
                    if (value) {

                        if (isArray) {
                            obj[prop] = obj[prop] || [];
                            obj[prop].push(value);
                            var txt = "";
                            return value + " ";

                        } else {
                            obj[prop] = value;
                            return value + " ";
                        }



                    } else {
                        return "";
                    }
                }

            }

        }
    }
)