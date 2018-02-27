angular.module("sampleApp")
    .controller('qaCtrl',
        function ($scope,$http,$localStorage) {

            $scope.input = {};


            $http.get('artifacts/allResources.json').then(function(data){

            });


            $http.get('artifacts/allResources.json').then(function(data){
                //console.log(data)
                $scope.allResources = data.data;
                $scope.allResources.sort(function(a,b){
                    if (a.name < b.name) {
                        return -1
                    } else {
                        return 1
                    }
                })
            });


            $scope.userName = $localStorage.qaUserName;
            $scope.setUserName = function(name) {
                $localStorage.qaUserName = name;
            }

            $scope.selectResource = function(type) {
                console.log(type)
                $scope.selectedType = type;
                $scope.waiting = true;
                var url = 'http://snapp.clinfhir.com:8081/baseDstu3/StructureDefinition/' +$scope.selectedType
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        $scope.selectedSD = data.data;
                        getValueSets($scope.selectedSD)
                    }
                ).finally(function(){
                        $scope.waiting = false;
                    }
                )
            };


            $scope.addComment = function(text) {
                var comment = {id:'idc'+new Date().getTime()};
                comment.url = $scope.selectedVS.url;
                comment.text = text;
                comment.reviewer = $scope.userName;
                comment.date = new Date();
                $http.put('/qa',comment).then(
                    function(data){
                        console.log(data.data)
                        delete $scope.comments.push(comment)
                    },function(err) {
                        alert(angular.toJson(err));
                    }
                )
            };

            $scope.selectVS = function(vs) {
                console.log(vs);
                $scope.waiting = true;
                delete $scope.selectedVS;
                delete $scope.expandedVS;
                delete $scope.comments;
                var url = 'https://ontoserver.csiro.au/stu3-latest/ValueSet?url=' +vs.url
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        $scope.selectedVS = data.data.entry[0].resource;

                        var commentUrl = "/qa/"+encodeURIComponent(vs.url)
                        $http.get(commentUrl).then(function(data){
                            $scope.comments = data.data;
                        })


                    }, function(err) {
                        console.log(err)
                    }
                ).finally(function(){
                        $scope.waiting = false;
                    }
                )

                //$scope.selectedVS = vs
            }

            $scope.expand = function(filter){
                $scope.waiting = true;
                var url = 'https://ontoserver.csiro.au/stu3-latest/ValueSet/'+$scope.selectedVS.id;
                url += '/$expand';
                $http.get(url).then(
                    function (data) {
                        console.log(data.data)
                        $scope.expandedVS = data.data

                    }, function(err) {
                        console.log(err)
                    }
                ).finally(function(){
                    $scope.waiting = false;
                    }
                )
            };

            function getValueSets(SD) {
                var hashVS = {}
                $scope.allVS = []
                SD.snapshot.element.forEach(function(ed){
                    if (ed.binding && ed.binding.valueSetReference) {
                        var url = ed.binding.valueSetReference.reference;
                        if (hashVS[url]) {
                            hashVS[url].path.push(ed.path)
                        } else {
                            var entry = {url:url,path:[]};
                            entry.description = ed.binding.description;
                            entry.strength = ed.binding.strength;
                            entry.path.push(ed.path);
                            if (ed.binding.extension) {
                                ed.binding.extension.forEach(function(ext){
                                    if (ext.url == 'http://hl7.org/fhir/StructureDefinition/elementdefinition-bindingName') {
                                        entry.bindingName = ext.valueString;
                                    }
                                })
                            }
                            hashVS[url] = entry;
                            $scope.allVS.push(entry);
                        }
                    }
                });

                $scope.allVS.sort(function(a,b){
                    if (a.name < b.name) {
                        return -1
                    } else {
                        return 1
                    }
                });

                //console.log($scope.allVS)
            }

        }
    );