
angular.module("sampleApp")
    .controller('lmSummaryCtrl',
        function ($scope,ecosystemSvc,$http,$filter,modalService) {


            function makeSummary(arReview) {
                //construct a hash of path vs id (a single id can have multiple paths).
                //

                var lmSummary = {fields:[],persons:[],data:{}}
                //construct summary array for display table
                var hash = {};
                arReview.forEach(function(rpt){
                    //first, a hash of paths for Ids...
                    var hashId = {};
                    rpt.table.forEach(function(row){
                        var id = row.id;
                        if (! hashId[id]) {
                            hashId[id] = row.path
                        }
                    });

                    lmSummary.persons.push(ecosystemSvc.getPersonWithId(rpt.userid))

                    //now, the summary of notes/path for each user...
                    angular.forEach(rpt.notes,function(v,k){        //notes is an object keyed by id...
                        console.log(v,k)
                        var path = hashId[k];
                        if (lmSummary.fields.indexOf(path) == -1) {
                            lmSummary.fields.push(path)
                        }
                        //data is keyed by path & id. It is possible for a user to have multiple notes for a single path..
                        var key = path + '-' + rpt.userid;
                        if (lmSummary.data[key]) {
                            lmSummary.data[key] +=  "<br\>" + v;
                        } else {
                            lmSummary.data[key] = v;
                        }
                    });

                    //and finally the overall comment
                    if (rpt.reviewComment) {
                        var key = 'reviewComment-' + rpt.userid;
                        lmSummary.data[key] = rpt.reviewComment;
                    }

                });
                //console.log(lmSummary)
                return lmSummary;

            }

            function load(){
                if ($scope.lmSummaryScenario) {
                    var url = '/lmCheck/'+$scope.lmSummaryScenario.id;

                    $http.get(url).then(
                        function(data) {
                            console.log(data.data)
                            $scope.lmSummary = makeSummary(data.data)
                        }
                    )
                }
            }

            $scope.refresh = function(){
                load();
            };

            $scope.lmSummarySelectScenario = function(scenario) {
                $scope.lmSummaryScenario = scenario;
                load();

            };

            $scope.getNote = function(path,personId) {
                //console.log(path,personId)
                var key = path + '-' + personId;
                return $scope.lmSummary.data[key]
            }


    });
