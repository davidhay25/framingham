angular.module("sampleApp")
    .controller('addElementCtrl',
        function ($scope) {

                $scope.input = {};
                $scope.dataTypes = getDataTypes();
                $scope.dataTypes.forEach(function (t) {
                    if (t.code == 'string') {
                        $scope.input.dt = t;
                    }
                });

                $scope.save = function(){
                    var row = {path : $scope.input.name}
                    if ($scope.input.isMultiple) {
                        row.mult = '0..*';
                        row.max='*'
                    } else {
                        row.mult = '0..1';
                        row.max=1
                    }

                    row.type = [$scope.input.dt];
                    row.clinDesc = $scope.input.clinDesc;
                    row.isLeaf = true;
                    row.id = 'id'+new Date().getTime();
                    $scope.$close(row)
                };

                function getDataTypes() {

                    var lst = [];
                    lst.push({code: 'string'});
                    lst.push({code: 'CodeableConcept', isCoded: true});
                    //lst.push({code: 'decimal'});
                    lst.push({code: 'Quantity'});
                    lst.push({code: 'date'});
                    lst.push({code: 'dateTime'});
                    lst.push({code: 'Period'});
                    lst.push({code: 'Range'});
                    lst.push({code: 'Age'});
                    lst.push({code: 'boolean'});
                    lst.push({code: 'Reference', isReference: true});
                    lst.push({code: 'Identifier'});
                    lst.push({code: 'uri'});
                    lst.push({code: 'Ratio'});

                    lst.push({code: 'Address'});
                    lst.push({code: 'ContactPoint'});
                    lst.push({code: 'code', isCoded: true});
                    lst.push({code: 'Coding', isCoded: true});


                    lst.push({code: 'markdown'});
                    lst.push({code: 'integer'});
                    lst.push({code: 'decimal'});

                    //lst.push({code: 'Ratio'});
                    lst.push({code: 'base64Binary'});
                    lst.push({code: 'Attachment'});
                    lst.push({code: 'HumanName'});
                    lst.push({code: 'Annotation'});
                    lst.push({code: 'Timing'});
                    lst.push({code: 'instant'});


                    //lst.push({code: 'BackboneElement'});    //?is this needed anywhere
                    lst.push({code: 'Element'});

                    lst.forEach(function (item) {
                        // item.description = item.description + " ("+ item.code + ")";
                        item.description = item.description || item.code;

                    });

                    lst.sort(function(a,b){
                        if (a.description.toLowerCase() > b.description.toLowerCase()) {
                            return 1
                        } else {
                            return -1
                        }
                    });



                    return lst

                }

        }
    )