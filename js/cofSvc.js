angular.module("sampleApp").service('cofSvc', function(ecosystemSvc) {


    return {
        makeGraph: function (lst) {
            var arNodes = [], arEdges = [];
            var objColours = ecosystemSvc.objColours();

            lst.forEach(function (item) {

                var node = {id: item.id, label: item.type, shape: 'box', item: item};

                if (objColours[item.baseType]) {
                    node.color = objColours[item.baseType];
                }

                arNodes.push(node);

                if (item.table) {
                    item.table.forEach(function (row) {
                        if (row.references) {
                            row.references.forEach(function (ref) {
                                var edge = {
                                    id: 'e' + arEdges.length + 1, from: item.id, to: ref.targetItem.id,
                                    label: ref.sourcePath, arrows: {to: true}
                                };

                                arEdges.push(edge)
                            })
                        }
                    })
                }

            });

            var nodes = new vis.DataSet(arNodes);
            var edges = new vis.DataSet(arEdges);

            // provide the data in the vis format
            var graphData = {
                nodes: nodes,
                edges: edges
            };

            return {graphData: graphData};

        }
    }
})