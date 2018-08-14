
angular.module("sampleApp")
    .controller('exampleCtrl',
        function ($scope,$http,$window) {


            var url = $window.location.href;

            var profileUrl;        //the canonical url of the profile
            var registryServer = "https://stu3.simplifier.net/Structured/";     //

            var ar = url.split('?');
            if (ar.length == 2) {
                var search = ar[1];     //the search string - eg ?event=mihin
                var ar1 = search.split('&');
                ar1.forEach(function (qry) {
                    console.log(qry)
                    var arParam = qry.split('=');
                    switch (arParam[0]) {
                        case 'profile' :
                            profileUrl = arParam[1]
                            break;
                    }
                })
            }


            if (profileUrl) {
                //right now the profile is the direct link to the profile...
                $http.get(profileUrl).then(
                    function(data) {
                        console.log(data.data);

                        $scope.SD = data.data;

                        $scope.SD.snapshot.element.forEach(function (ed) {
                            if (ed.type) {
                                if (ed.type[0].profile) {
                                    var extensionProfile = ed.type[0].profile;
                                    console.log(extensionProfile)

                                    var url = registryServer + 'StructureDefinition?url='+extensionProfile;

                                    $http.get(url).then(
                                        function(data) {
                                            console.log(url)
                                            console.log(data.data)
                                        },
                                        function(err) {
                                            console.log(err)
                                        }
                                    )


                                }
                            }
                        })


                    },
                    function(err) {
                        console.log(err)
                    }
                );


                return;
                var url = registryServer + 'StructureDefinition?url='+profileUrl;
                $http.get(url).then(
                    function(data) {
                        console.log(data.data)
                    },
                    function(err) {
                        console.log(err)
                    }
                )

            }



    });




