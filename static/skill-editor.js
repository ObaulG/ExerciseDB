import * as skills from './skills.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import Graph from './skill-graph.js';
import NodeType from './skill-graph.js';

var side_window;
var node_form;
var edge_form;
var node_types;

var object_edited = null;


function displayNodeData(node){
    var node_title = document.getElementById("nodetitle");
    var node_type = document.getElementById("nodetype");
    var node_descr = document.getElementById("nodedescr");

    node_form.hidden = false;
    edge_form.hidden = true;

    if(!node){
        node_title.value = "";
        node_type.value = "";
        node_descr.value = "";
    } else {
        node_title.value = node.title;
        node_type.value = node.node_type;
        node_descr.value = node.descr;
    }
}

function displayEdgeData(edge){
    // ...
    var edge_type = document.getElementById("edgetype");
    node_form.hidden = true;
    edge_form.hidden = false;

    if(!edge){
        edge_type.value = "";
    } else {
        edge_type.value = edge.label;
    }
}

/** When finished to edit properties of node or edge from object_edited. **/
function update_changes_to_graph(graph){
    if (!object_edited){return;}
    if ("label" in object_edited){
        console.log("node edited. Pushing changes to graph");
        //...
    }
    else if ("node_type" in object_edited){
        console.log("edge edited. Pushing changes to graph");
        //...
    }
}

async function push_graph_changes_to_db(){
     var exercise_json = JSON.stringify({
        "title": title,
        "difficulty": difficulty,
        "ex_content": body,
        "ex_answer": answer,
        "educ_items_id": educ_items_id
    });
    console.log("Submitting new exercise...");
    const resp = await fetch("/exercises", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: exercise_json
    })
    .then(handleErrors)
    .then(response => {
        var response = response.json();
        return response;
        })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    })
    .then(data => {
        console.log(data);
        // data should be a JSON holding an
        // EducItemData
        var id = data["id"];
        var title = data["title"];
        var descr = data["descr"];

        create_educ_item_selectable_element(id, title, descr);
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
}

async function load_skill_graph_data_from_db(){

}
/** Display data of the node in the side window **/
function onGraphNodeClick(node){
    console.log(`Node selected: ${node.id}`);
    object_edited = node;
    displayNodeData(node);
}

/** Display data of the node in the side window **/
function onGraphEdgeClick(edge){
    console.log(`Edge selected`);
    object_edited = edge;
    displayEdgeData(edge);
}

/** Removes the current object_edited. **/
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
    node_form = document.getElementById("node-editor");
    edge_form = document.getElementById("edge-editor");
    node_form.hidden = true;
    node_form.hidden = true;
    side_window = document.getElementById("object-editor-window");

    node_types = [];
    for (const node_type in document.getElementById("node-types")
                                    .getElementsByTagName("option")){
        node_types.push(node_type);
    }
    const graph = new Graph({
        svg: d3.select("#graph"),
        nodes: initial_nodes_data,
        edges: initial_edges_data,
    });
    console.log("Graph loaded!");

    /** Adding graph listeners **/
    graph.listen("nodeClick", onGraphNodeClick);
    graph.listen("edgeClick", onGraphEdgeClick);
    graph.listen("nothingClick", onGraphNothingClick);

    /** When clicking outside of the side window, updating the graph object.**/
    document.addEventListener('click', function(event) {
        // Check if the clicked target is not a descendant of myElement
        if (!side_window.contains(event.target)) {
          console.log('Clicked outside the side window.');
          update_changes_to_graph(graph);
          node_form.hidden = true;
          node_form.hidden = true;
          graph.redrawNodes();
          graph.redrawEdges();
        }
    });
}
