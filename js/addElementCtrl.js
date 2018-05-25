angular.module("sampleApp")
    .controller('addElementCtrl',
        function ($scope,row,tableCopy) {

            var editing = false;
            $scope.input = {};
            $scope.dataTypes = getDataTypes();

            if (row) {
                //editing
                editing = true;
                $scope.input.clinDesc = row.clinDesc;
                $scope.row = row;
                $scope.input.path = row.path;
                $scope.dataTypes.forEach(function (t) {
                    if (t.code == row.type[0].code) {
                        $scope.input.dt = t;
                    }
                });

                if (row.max == '*') {
                    $scope.input.isMultiple = true;
                }

            } else {
               //new
                $scope.dataTypes.forEach(function (t) {
                    if (t.code == 'string') {
                        $scope.input.dt = t;
                    }
                });
            }

            $scope.save = function(){
                if (editing) {
                    $scope.row.clinDesc = $scope.input.clinDesc;
                    $scope.row.type = [$scope.input.dt];
                    if ($scope.input.isMultiple) {
                        $scope.row.mult = '0..*';
                        $scope.row.max='*'
                        $scope.row.isMultiple = true;
                    } else {
                        $scope.row.mult = '0..1';
                        $scope.row.max=1
                        $scope.row.isMultiple = false;
                    }
                    $scope.$close($scope.row)

                } else {
                    var row = {path : $scope.input.path};
                    if ($scope.input.isMultiple) {
                        row.mult = '0..*';
                        row.max='*'
                        $scope.row.isMultiple = true;
                    } else {
                        row.mult = '0..1';
                        row.max=1
                        $scope.row.isMultiple = false;
                    }
                    row.edited = true;
                    row.type = [$scope.input.dt];
                    row.clinDesc = $scope.input.clinDesc;
                    row.isLeaf = true;
                    row.id = 'id'+new Date().getTime();
                    $scope.$close(row)
                }


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

                return lst;

            }

        }
    );