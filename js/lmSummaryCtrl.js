
angular.module("sampleApp")
    .controller('lmSummaryCtrl',
        function ($scope,ecosystemSvc,$http,$uibModal,moment) {


            var hashComments;      //hash of comments, keyed by {path}-{userid) (where userid is the userid of the report being commented on)


            $scope.commentStatus=[];
            $scope.commentStatus.push({code:'new',display:'New'});
            $scope.commentStatus.push({code:'change',display:'Closed, change made'});
            $scope.commentStatus.push({code:'nochange',display:'Closed no change'});

            $scope.showCommentsInLine = true;   //display the comments in the 'All scenarios' display

            function makeSummary(arReview) {
                //construct a hash of path vs id (a single id can have multiple paths).
                //each review represents a sample form for a single LM by a single user...
                hashComments = {};

                var lmSummary = {fields:[],persons:[],data:{}}
                //construct summary array for display table
                var hash = {};
                var hashUsers = {};         //a hash of all users...

                arReview.forEach(function(rpt){
                    //first, a hash of paths for Ids in this form...
                    var hashId = {};
                    rpt.table.forEach(function(row){
                        var id = row.id;
                        if (! hashId[id]) {
                            hashId[id] = row.path
                        }
                    });

                    //add to the list of users - if not already present (there will be one for each scenario used)
                    var user = ecosystemSvc.getPersonWithId(rpt.userid);
                    if (!hashUsers[user.id] ) {
                        lmSummary.persons.push(user);
                        hashUsers[user.id] = 0;   //this will be count of comments
                    }

                    //if there are comments, create a hash for this report based on the path

                    if (rpt.comments) {
                        rpt.comments.forEach(function (comment) {
                            var path = hashId[comment.field];
                            if (path) {
                                console.log(comment)
                                var key = path + '-' + rpt.userid;
                                hashComments[key] = hashComments[key] || []
                                hashComments[key].push(comment)
                            } else {
                                console.log('unknown field in comment:'+comment.field);
                            }
                        })
                    }
                    console.log(hashComments);

                    //now, the summary of notes/path for each user...
                    angular.forEach(rpt.notes,function(v,k){        //notes is an object keyed by id...
                        //console.log(v,k)
                        var path = hashId[k];
                        if (lmSummary.fields.indexOf(path) == -1) {
                            lmSummary.fields.push(path)
                        }
                        //data is keyed by path & id. It is possible for a user to have multiple notes for a single path..
                        var key = path + '-' + rpt.userid;
                        lmSummary.data[key] = lmSummary.data[key] || []
                        lmSummary.data[key].push({value:v,id:k,lmCheckId:rpt.id})
                        /*
                        if (lmSummary.data[key]) {
                            lmSummary.data[key] +=  "<br/>" + v;
                        } else {
                            lmSummary.data[key] = v;
                        }
                        */
                        hashUsers[rpt.userid]++;        //increment the number of comments for this user
                    });

                    //and finally the overall comment
                    if (rpt.reviewComment) {
                        var key = 'reviewComment-' + rpt.userid;
                        lmSummary.data[key] = [{value:rpt.reviewComment,id:'reviewComment',lmCheckId:rpt.id}];
                    }

                    //now remove all users where there is no summary
                    var ar = [];
                    lmSummary.persons.forEach(function (person) {
                        if (hashUsers[person.id] > 0) {
                            ar.push(person)
                        }
                    })
                    lmSummary.persons = ar;


                });



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

            $scope.editComment = function(path,personId) {
                //clearSession();
                $uibModal.open({
                    templateUrl: 'modalTemplates/editLMComment.html',
                    controller: function($scope,comments,user,notes,path,author){
                        $scope.comments= comments;
                        $scope.user = user;
                        $scope.author = author;
                        $scope.notes = notes;
                        $scope.path = path;
                        $scope.input = {};
                        $scope.currentDate = moment().format('MMM D, H:mm a')

                        $scope.save=function(){
                            //always attach the comment to teh forst note - todo may want to specify the note...
                            var id = notes[0].id;
                            var lmCheckId= notes[0].lmCheckId

                            var comment = {comment:$scope.input.newComment,field:id,lmCheckId:lmCheckId}
                            comment.user = {name:user.name,id:user.id}
                            $scope.$close(comment);
                        }

                    },
                    resolve : {
                        path : function() {
                            return path
                        },
                        notes : function(){
                            return $scope.getNoteFromAll(path,personId)
                        },
                        comments: function(){
                            //
                            return $scope.getComments(path,personId)
                        },
                        user : function(){
                            return ecosystemSvc.getCurrentUser();
                        },
                        author : function(){
                            return ecosystemSvc.getPersonWithId(personId)
                        }
                    }
                }).result.then(function(comment) {
                    //called when a new comment is made
                    var url = "/lmCheckComment"
                    $http.post(url,comment).then(
                        function(){
                            console.log('refresh')
                            $scope.refreshAll();        //todo - could probably just update the local model...

                        },
                        function(err){
                            alert(angular.toJson(err))
                        }
                    );



                })
            };

            $scope.refreshAll = function() {
                var url = '/lmCheckTrack/'+$scope.selectedTrack.id;

                $scope.showWarning = true;
                delete $scope.allScenarioLMSummary;
                $http.get(url).then(
                    function(data) {
                        console.log(data.data)
                        $scope.allScenarioLMSummary = makeSummary(data.data)

                        console.log($scope.allScenarioLMSummary)

                    },
                    function(err) {
                        console.log(err)
                    }
                ).finally(
                    function () {
                        delete $scope.showWarning
                    }
                )
            }

            //loadAll($scope.selectedTrack.id)

            $scope.refresh = function(){
                load();
            };

            $scope.lmSummarySelectScenario = function(scenario) {
                $scope.lmSummaryScenario = scenario;
                load();

            };

            //return a note for an entry in a single scenario
            $scope.getNote = function(path,personId) {
                //console.log(path,personId)
                var key = path + '-' + personId;
                return $scope.lmSummary.data[key]
            };

            //return a note for an entry in all scenarios
            $scope.getNoteFromAll = function(path,personId) {
                //console.log(path,personId)
                var key = path + '-' + personId;
                return $scope.allScenarioLMSummary.data[key]
            }




            $scope.getComments = function(path,personId) {
                //console.log(path,personId)
                var key = path + '-' + personId;
                return hashComments[key]
            }

            $scope.getCommentsHTML = function(path,personId) {
                //console.log(path,personId)
                var display = '<div><strong>Comments</strong></div>'
                var key = path + '-' + personId;
                var arComments = hashComments[key]
                if (arComments) {

                    arComments.forEach(function (comment) {
                        display += '<p>'+ comment.comment + ' (' + comment.user.name +  ')</p>'
                    });
                    display += '<div><em>Click to edit comments</em></div>'

                } else {
                    display += '<div><em>None so far. Click to add</em></div>'
                }

                return display;

            }




    });
