import * as skills from './skills.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import Graph from './skill-graph.js';
import NodeType from './skill-graph.js';

/** Display data of the node in the side window **/
function onGraphNodeClick(node){

}

/** Display data of the node in the side window **/
function onGraphEdgeClick(edge){

}

function onGraphNothingClick(){
    console.log("NothingClick detected!");
}


window.onload = function(){
    var initial_nodes_data = [
        {id: 1, title: "Remise à Niveau en Mathématiques", node_type: NodeType.Framework, description: "", x: 250, y: 450 },
        {id: 2, title: "Compétence générale de calcul", node_type: NodeType.Competency, description: "", x: 450, y: 150 },
        {id: 3, title: "Résolution de problèmes", node_type: NodeType.Competency, description: "", x: 450, y: 350 },
        {id: 4, title: "Calcul littéral", node_type: NodeType.Competency, description: "", x: 450, y: 550 },
        {id: 5, title: "Numération dans d'autres bases", node_type: NodeType.Competency, description: "", x: 450, y: 750 },
    ]
    var initial_edges_data = [
        {source: 1, target: 2, label: "comprises" },
        {source: 1, target: 3, label: "comprises" },
        {source: 1, target: 4, label: "comprises" },
        {source: 1, target: 5, label: "comprises" },
    ]
    var node_form = document.getElementById("node-editor");
    var edge_form = document.getElementById("edge-editor");
    const graph = new Graph({
        svg: d3.select("#graph"),
        nodes: initial_nodes_data,
        edges: initial_edges_data,
    });
    console.log("Graph loaded!");

    /** Adding listeners **/
    graph.listeners.push(onGraphNodeClick);
    graph.listeners.push(onGraphEdgeClick);
    graph.listeners.push(onGraphNothingClick);
}
