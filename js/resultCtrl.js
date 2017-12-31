angular.module("sampleApp")
    .controller('resultCtrl',
        function ($scope,ecosystemSvc, scenario,server,client,previousResult) {

            $scope.input = {};
            $scope.previousResult = previousResult;

            $scope.scenario = scenario;
            $scope.server = server;
            $scope.client = client;
            $scope.previousResult = previousResult;

            if (previousResult && previousResult.asserter) {
                $scope.selectedPerson = previousResult.asserter;
                $scope.input.asserter = previousResult.asserter;
            }

            console.log(previousResult)

            $scope.allPersons = ecosystemSvc.getAllPersons();//[]
           // var selectedPerson;
            /*var ar = ecosystemSvc.getAllPersons();
            ar.forEach(function (p) {
                console.log(p)
                $scope.allPersons.push({name:p.name,'x':'d'})
            })
*/



            $scope.asserterSelected = function(item){
                $scope.selectedPerson = item;
                console.log(item);//, $model, $label, $event)
                //typeahead-on-select($item, $model, $label, $event)
            }


            $scope.radioModel = '';

            if (previousResult) {
                $scope.input.note = previousResult.note;
                $scope.radioModel = previousResult.text;

            }

            $scope.save = function() {
                var result = {}
                result.text = $scope.radioModel;
                result.note = $scope.input.note;
                result.asserter = $scope.selectedPerson;
                if (previousResult) {
                    result.id = previousResult.id;
                }

                $scope.$close(result);
            }

        }
    );