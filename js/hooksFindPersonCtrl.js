angular.module("sampleApp")
    .controller('hooksFindPersonCtrl',function($scope, $http, dataServerUrl, resourceType, modalService){

        $scope.resourceType = resourceType;

        $scope.selectPatient = function(patient) {
            $scope.$close(patient);
        };

        $scope.searchForPatient = function(name) {
            $scope.nomatch=false;   //if there were no matching patients
            delete $scope.matchingPersonList;
            if (! name) {
                alert('Please enter a name');
                return true;
            }
            $scope.waiting = true;
            var url = dataServerUrl + resourceType + "?name="+name;

            $http.get(url).then(
                function(data){
                    $scope.matchingPersonList = [];
                    if (data.data && data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            var patient = entry.resource;
                            $scope.matchingPersonList.push({display:getHumanNameSummary(patient.name[0]),patient:patient})
                        })
                    }


                },
                function(err) {
                    modalService.showModal({}, {bodyText: 'Error finding patient - have you selected the correct Data Server?'})
                }
            ).finally(function(){
                $scope.waiting = false;
            })
        };





        function getHumanNameSummary(data){
            if (!data) {
                return "";
            }
            var txt = "";
            if (data.text) {
                return data.text;
            } else {
                txt += getString(data.given);
                txt += getString(data.family);
                return txt;
            }

            function getString(ar) {
                var lne = '';
                if (ar) {
                    if (angular.isArray(ar)) {      //make sure it's an array. eh humanname isn't...
                        ar.forEach(function(el){
                            lne += el + " ";
                        } )
                    } else {
                        lne += ar + " ";
                    }



                }
                return lne;
            }
        }

        $scope.cancel = function () {
            $scope.$close();
        }

    })