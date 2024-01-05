import * as skills from './skills.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import Graph from './skill-graph.js';
import NodeType from './skill-graph.js';


var side_window;
var node_form;
var edge_form;
var graph_list;
var graph_create_form;
var node_types;
var object_edited = null;
var graph;
var existing_graphs = {};
const graph_test_id = 1;


function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

/**
    TODO: Should also display properties and labels.
**/
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

/**
    Function called from buttons generated from update_graph_list_table().
    It should retrieve this graph data.
**/
async function editGraph(graph_id){
    load_skill_graph_data_from_db(graph_id)
}
/**
    Graph data is stored in existing_graphs
**/
function update_graph_list_table(){
    const tbody = document.getElementById('graph-table-content');
    tbody.innerHTML = ''; // Clear the content
    const graphIds = Object.keys(existing_graphs);
    for (let i = 0; i < graphIds.length; i++) {
      const graphId = graphIds[i];
      const graph = existing_graphs[graphId].properties;
      const row = tbody.insertRow(i);

      // Populate cells
      const cellNumber = row.insertCell(0);
      cellNumber.textContent = i + 1;

      const cellTitle = row.insertCell(1);
      cellTitle.textContent = graph.title;

      const cellDescription = row.insertCell(2);
      cellDescription.textContent = graph.description;

      const cellAction = row.insertCell(3);
      // Add any action button or link here
      cellAction.innerHTML = `<button onclick="editGraph('${graphId}')">Edit</button>`;
    }
}


async function create_new_graph(title, descr){
    var graph_form_json = JSON.stringify({
        "title": title,
        "description": descr,
    });
    const resp = await fetch("/skillgraph", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: graph_form_json
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

/**
    graph_id is a String.
    This function will load a Graph into the global variable graph
**/
async function load_skill_graph_data_from_db(graph_id){

    const resp = await fetch("/skillgraph/{graph_id}", {
        method: "GET"
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
        //class GraphNodesEdges(BaseModel):
            //nodes_count: Optional[int]
            //relationships_count: Optional[int]
            //nodes: Nodes
            //relationships: Relationships


        // data should be a JSON holding an
        // EducItemData
        var nodes_count = data["nodes_count"];
        var nodes = data["nodes"];
        var relationships = data["relationships"];

        var json_converted = convert_neo4j_graph(nodes, relationships);
        graph.load(json_converted.nodes, json_converted.edges);
        console.log("Graph loaded!");
        db_graph_id = graph_id;
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
}

async function get_all_skillgraphs_from_db(){

    console.log("Retrieving skill graphs...");
    const resp = await fetch("/educitem/framework/all", {
        method: "GET",
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

        /**
            class NodeBase(BaseModel):
                node_id: int
                labels: list
            class Node(NodeBase):
                properties: Optional[dict] = None

            class Nodes(BaseModel):
                nodes: List[Node]
        **/
        var nodes = data["nodes"];
        console.log(nodes.length + " nodes received.")
        // We erase previous data received.
        for (node in nodes) {
            console.log(node);
            existing_graphs[node.node_id] = node.properties;
        }
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
}

function convert_neo4j_graph(nodes, relationships){
/**
class Node(NodeBase):
    properties: Optional[dict] = None

class Nodes(BaseModel):
    nodes: List[Node]

class Relationship(BaseModel):
    relationship_id: int
    relationship_type: str
    source_node: Node
    target_node: Node
    properties: Optional[dict] = None
**/

    new_nodes_array = []
    new_edges_array = []

    nodes.forEach((node) => {
        new_nodes_array.push({
            id: node.id,
            title: node.title,
            x: 0,
            y: 0,
            properties: node.properties,
        });
    });

    relationships.forEach((edge) => {
        new_edges_array.push({
            source: edge.source_node,
            target: edge.target_node,
            label: "",
            properties: edge.properties,
        });
    });

    return {nodes: new_nodes_array, edges: new_edges_array};
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

/**
    var initial_nodes_data = [
        {id: 1, title: "Remise à Niveau en Mathématiques", node_type: NodeType.Framework, description: "", x: 250, y: 450, properties:{}},
        {id: 2, title: "Compétence générale de calcul", node_type: NodeType.Competency, description: "", x: 450, y: 150, properties:{} },
        {id: 3, title: "Résolution de problèmes", node_type: NodeType.Competency, description: "", x: 450, y: 350, properties:{} },
        {id: 4, title: "Calcul littéral", node_type: NodeType.Competency, description: "", x: 450, y: 550, properties:{} },
        {id: 5, title: "Numération dans d'autres bases", node_type: NodeType.Competency, description: "", x: 450, y: 750, properties:{} },
    ]
    var initial_edges_data = [
        {source: 1, target: 2, label: "comprises", properties:{} },
        {source: 1, target: 3, label: "comprises", properties:{} },
        {source: 1, target: 4, label: "comprises", properties:{} },
        {source: 1, target: 5, label: "comprises", properties:{} },
    ]
**/
    console.log("Loading...");
    get_all_skillgraphs_from_db();

    node_form = document.getElementById("node-editor");
    edge_form = document.getElementById("edge-editor");
    node_form.hidden = true;
    edge_form.hidden = true;
    graph_create_form.hidden = true;
    side_window = document.getElementById("object-editor-window");
    graph_list = document.getElementById("graph-list");
    node_types = [];
    for (const node_type in document.getElementById("node-types")
                                    .getElementsByTagName("option")){
        node_types.push(node_type);
    }

    graph = new Graph({
        svg: d3.select("#graph"),
        nodes: [],
        edges: [],
    });

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
    graph_create_form = document.getElementById("graph-form");
    graph_create_form.hidden = true;
    graph_create_form.onblur = function(){
        if (graph_create_form.hidden){return;}


    };

    var bt_create_graph = document.getElementById("create-new-graph");
    var bt_load_graph = document.getElementById("load-existing-graph");

    bt_create_graph.onClick = function(){
        graph_create_form.hidden = false;
        var graph_create_title = document.getElementById("graph-title");
        var graph_create_descr = document.getElementById("graph-descr");
        create_new_graph(graph_create_title.text, graph_create_descr.text);
        console.log("Graph creation request sent");
    };

    bt_load_graph.onClick = function(){

    };

}
