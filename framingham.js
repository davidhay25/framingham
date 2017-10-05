var moment = require('moment');
var _ = require('lodash');


exports.getRisk = function(vo) {
    return framingham(vo);
}

//the set of observation codes used for framingham...
exports.observationList = function() {
    var observations = []
    observations.push({key:'ldl',name:'LDL',code:'18262-6', unit:'mg/dl',system:'http://loinc.org',min:90,max:180})
    observations.push({key:'hdl',name:'HDL',code:'2085-9', unit:'mg/dl',system:'http://loinc.org',min:30,max:90})
    observations.push({key:'sys',name:'Systolic BP',code:'8480-6', unit:'mm/Hg',system:'http://loinc.org',min:100,max:170})
    observations.push({key:'dias',name:'Diastolic BP',code:'8462-4', unit:'mm/Hg',system:'http://loinc.org',min:60,max:100})
    observations.push({key:'smoker',name:'Smoker',code:'72166-2',system:'http://loinc.org',type:'bool'})
    return observations;
};

exports.conditionList = function(){
    var conditions = []
    conditions.push({key:'diab',name:'Diabetes', code:"46635009",system:"http://snomed.info/sct",verif:"confirmed",id:'diabetes-fram',type:'bool'})
    return conditions;
};

exports.diabetesSNOMEDCode = function() {
    return "46635009"
};  // used to find in Conditions list

exports.diabetesLOINCCode = function () {
    return "66152-0"    //used in the created Framingham assessment
};

exports.demogList = function(){
    var demog = []
    demog.push({key:'age',name:'Age',code:'21612-7',system:'http://loinc.org'})
    demog.push({key:'gender',name:'Gender',code:'46098-0',system:'http://loinc.org'})
    return demog;
};

//https://www.nhlbi.nih.gov/health-pro/guidelines/current/cholesterol-guidelines/quick-desk-reference-html/10-year-risk-framingham-table
var framingham = function(vo) {
    //check that all the required fields have a value...

    // return {risk:risk,obs:obs};
    var arErr = [];
    checkPresent(vo,'ldl',arErr);
    checkPresent(vo,'hdl',arErr);
    checkPresent(vo,'sys',arErr);
    checkPresent(vo,'dias',arErr);

    if (arErr.length > 0) {
        return {missingData:arErr}
    }

    var points = 0;
    //{gender:, age:, ldl:, hdl:, sys:, dia:, diabetes:, smoking
    var age = vo.age.value.value;       //this must be present as this is checked before calling this function...
    var ldl = vo.ldl.value.value;       //18262-6   (mg/dl)
    var hdl = vo.hdl.value.value;       //2085-9   (mg/dl)
    var sys = vo.sys.value.value;       //8480-6
    var dia = vo.dias.value.value;      //8462-4

    //we'll assume that in the absense of a value, the answer is no...
    var diabetes = vo.diabetes.value.value; //condition diabetes codes - 46635009 / 44054006
    var smoker = vo.smoker.value.value;  //72166-2
    //chol = 14647-2

    var male_map = [3,4,4,6,7,9,11,14,18,22,27,33,40,47];
    var female_map = [2,2,3,3,4,5,6,7,8,9,11,13,15,17,20,24,27];

    var risk;

    //I can be sure that vo.gender.value exists...
    if (vo.gender.value.value == 'M') {
        if (age <= 34) {
            points -= 1;
            vo.age.points = -1;
        } else if (age <= 39) {
            //no change
            vo.age.points = 0;
        } else if (age <= 44) {
            points += 1;
            vo.age.points = 1;
        } else if (age <= 49) {
            points += 2;
            vo.age.points = 2;
        } else if (age <= 54) {
            points += 3;
            vo.age.points = 3;
        } else if (age <= 59) {
            points += 4;
            vo.age.points = 4;
        } else if (age <= 64) {
            points += 5;
            vo.age.points = 5;
        } else if (age <= 69) {
            points += 6;
            vo.age.points = 6;
        } else {
            vo.age.points = 7;
            points += 7;
        }

        if (ldl < 100) {
            points -= 3
            vo.ldl.points = -3;
        } else if (ldl < 160) {
            //no change
            vo.ldl.points = 0;
        } else if (ldl <= 189) {
            points += 1
            vo.ldl.points = 1;
        } else  {
            points += 2
            vo.ldl.points = 2;
        }

        vo.hdl.points = 0;
        if (hdl < 35) {
            points += 2
            vo.hdl.points = 2;
        } else if (hdl <= 44) {
            points += 1
            vo.hdl.points = 1;
        } else if (hdl <= 99) {
           //no change
            vo.hdl.points = 0;
        } else if (hdl >= 60) {
            points -= 1
            vo.hdl.points = -1;
        }

        vo.sys.points = 0;
        if (sys <= 129 && dia >= 85 && dia <= 89) {
            points += 1
            vo.sys.points = 1;
        } else if (sys >= 130 && sys <= 139 && dia < 90) {
            points += 1
            vo.sys.points = 1;
        } else if (sys <= 139 && dia >= 90 && dia <= 99) {
            points += 2
            vo.sys.points = 2;
        } else  if (sys >= 140 && sys <= 159 && dia < 100) {
            points += 2
            vo.sys.points = 2;
        } else if (sys > 159 || dia >= 99) {
            points += 3;
            vo.sys.points = 3;
        }

        if (diabetes.toLowerCase() == 'yes') {
            points += 2
            vo.diab.points = 2;
        }

        if (smoker.toLowerCase() == 'yes') {
            points += 2
            vo.smoker.points = 2;
        }

        if (points > 13) {
            risk = 56
        } else {
            if (points < 0) {
                points = 0
            }
            risk = male_map[points]
        }

    } else {
        //this is female

        if (age <= 34) {
            points -= 9
            vo.age.points = -9;
        } else if (age <= 39) {
            points -= 4
            vo.age.points = -4;
        } else if (age <= 44) {
            //no chnage;
            vo.age.points = 0;
        } else if (age <= 49) {
            points += 3;
            vo.age.points = 3;
        } else if (age <= 54) {
            points += 6;
            vo.age.points = 6;
        } else if (age <= 59) {
            points += 7;
            vo.age.points = 7;
        } else {
            vo.age.points = 8;
            points += 8;
        }

        if (ldl < 100) {
            vo.ldl.points = -2;
            points -= 2
        } else if (ldl >= 160) {
            vo.ldl.points = 2;
            points += 2
        }

        if (hdl < 35) {
            points += 5
            vo.hdl.points = 5;
        } else if (hdl <= 44) {
            points += 2
            vo.hdl.points = 2;
        } else if (hdl <= 49) {
            points += 1
            vo.hdl.points = 1;
        } else if (hdl >= 60) {
            points -= 2
            vo.hdl.points = -2;
        }

        vo.sys.points = 0;
        if (sys < 120 && dia < 80) {
            points -= 3;
            vo.sys.points = -3;
        } else  if (sys <= 159 && dia >=90 && dia <= 100) {
            points +=2
            vo.sys.points = 2;
        } else if (sys >= 159 || dia > 99){
            points += 3
            vo.sys.points = 3;
        }

        if (diabetes.toLowerCase() == 'yes') {
            points += 4
            vo.diab.points = 4;
        }

        if (smoker.toLowerCase() == 'yes') {
            points += 2
            vo.smoker.points = 2;
        }

        if (points > 16) {
            risk = 32
        } else {
            if (points < 0) {
                points = 0
            }
            risk = female_map[points]
        }
    }

    if (risk <= 0) {
        risk = 2
    }

    var obs = makeSummaryObservation(vo,risk);
    return {risk:risk,obs:obs,points:points};

    //check that 'field' is a property on the vo with a value.value property
    function checkPresent(vo,field,arErr) {
        var fld = vo[field];
        if (fld && fld.value && fld.value.value) {
            return
        } else {
            arErr.push('There is no value for ' + field)
        }
    }
};

function makeSummaryObservation(data,risk){
    var obs = {resourceType:'Observation',status:'final'};
    obs.code = {coding:[{system:'http://loinc.org',code:'65853-4'}],text:'General CVD 10Y risk (Framingham)'}
    //obs.subject = {reference:vo.patientRef}
    obs.effectiveDateTime =  moment().format();
    obs.valueQuantity = {value:risk,unit:"%"};
    obs.component = [];
    _.forIn(data,function(v,k){
        //console.log(v,k)
        var item = {code : {Coding:[{system:'http://loinc.org',code:v.code}],text:v.display}};

        if (v.type) {
            switch (v.type) {
                case 'code' :
                    item.valueCode = v.value.value
                    break;
                case 'bool' :
                    item.valueBoolean = v.value.value;
            }

        } else {
            console.log(v)
            if (v && v.value && v.value.value) {
                item.valueQuantity = {value:v.value.value,unit:v.value.unit};
            }

        }


        // if has diabetes, then a loinc code  66152-0 with a value of yes
        if (item.valueQuantity || item.valueBoolean || item.valueCode) {
            obs.component.push(item)
        }

    })




    return obs;

}

