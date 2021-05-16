angular.module("sampleApp")
    .controller('eventActivityCtrl',
        function ($scope) {
                $scope.countryBarOptions = {scales: {
                                yAxes: [{
                                        stacked: true,
                                        ticks: {
                                                beginAtZero:true
                                        }
                                }],xAxes: [{
                                        stacked: true

                                }]
                        }};

            if ($scope.eventStats) {
                    $scope['statsCountryData'] = []
                    $scope['statsCountryLabels'] = []
                    $scope.eventStats.uniqueCountries.forEach(function (item){
                            $scope['statsCountryData'].push(item.count)
                            $scope['statsCountryLabels'].push(item['_id'])
                            console.log(item)
                    })

            }


            //    $scope['statsCountryLabels'] = ['2006', '2007', '2008', '2009', '2010', '2011', '2012'];
             //   $scope.series = ['Series A'];

              //  $scope['statsCountryData'] = [
             //           [65, 59, 80, 81, 56, 55, 40]
             //   ];


        })