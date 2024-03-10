//import * as skills from './skills.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import Graph from './skill-graph.js';
import {NodeType} from "./skill-graph.js";
import * as notifCreator from './notification_creator.js';
import * as db_methods from './exercisedb_methods.js';


var side_window;
var node_form;
var edge_form;
var db_graph_id;
var graph_list;
var graph_table;
var graph_create_form;
var node_types;

/**
 *  Stores the reference of the object edited in the Graph.
 * @type {object}
 */
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
    let node_id = document.getElementById("nodeid");
    let node_title = document.getElementById("nodetitle");
    let node_type = document.getElementById("nodetype");
    let node_descr = document.getElementById("nodedescr");

    console.log("displaying node data from...");
    console.log(node);
    node_form.hidden = false;
    edge_form.hidden = true;

    if(!node){
        node_id.value = "";
        node_title.value = "";
        node_type.value = "";
        node_descr.value = "";
    } else {
        node_id.value = node.id;
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


/** When finished to edit properties of node or edge from object_edited.
 * Retreive the data from the object editor, push it to the Graph,
 * then to the database.
 * **/
function commit_changes_of_object_edited(){
    if (!object_edited){return;}
    if ("node_type" in object_edited){
        console.log("node edited. Pushing changes to graph");
        let node_id = document.getElementById("nodeid");
        let node_title = document.getElementById("nodetitle");
        let node_type = document.getElementById("nodetype");
        let node_descr = document.getElementById("nodedescr");

        object_edited.id = node_id.value;
        object_edited.title = node_title.value;
        object_edited.node_type = node_type.value;
        object_edited.descr = node_descr.value;

        db_methods.updateNode(object_edited);
    }
    else if ("label" in object_edited){
        console.log("edge edited. Pushing changes to graph");
        db_methods.updateEdge(object_edited);
    }
    graph.manualDraw();
}

/**
    Function called from buttons generated from update_graph_list_table().
    It should retrieve this graph data.
**/
async function editGraph(graph_id){
    console.log("Loading graph " + graph_id);
    await load_skill_graph_data_from_db(graph_id);
    update_graph_ui_elements()
}
/**
    Graph data is stored in existing_graphs as a Node ({node_id:"...", labels:[...], "properties":{...}}
**/
function update_graph_list_table(){
    console.log("Updating graph table");
    graph_table.innerHTML = ''; // Clear the content
    const graphIds = Object.keys(existing_graphs);
    console.log(graphIds);
    for (let i = 0; i < graphIds.length; i++) {
      const graphId = graphIds[i];
      const graph = existing_graphs[graphId];
      //console.log(graph);
      const row = graph_table.insertRow(i);

      // Populate cells
      const cellNumber = row.insertCell(0);
      cellNumber.textContent = i+1;

      const cellTitle = row.insertCell(1);
      cellTitle.textContent = graph.title;

      const cellDescription = row.insertCell(2);
      cellDescription.textContent = graph.description;

      const cellAction = row.insertCell(3);
      // Add any action button or link here
      cellAction.innerHTML = `<button id="${graphId}">Edit</button>`;
    }
}


async function create_new_graph(title, descr){
    const graph_form_json = {
        "title": title,
        "description": descr,
    };
    const resp = await db_methods.create_framework(graph_form_json);
    const response_json = await resp.json();
    if (resp.ok){
        console.log(response_json);
        // data should be a JSON holding a Node
        let id = response_json.properties.id;
        title = response_json.properties.title;
        descr = response_json.properties.descr;

        existing_graphs[id] = response_json
        update_graph_list_table()
    } else {
        console.error(response_json.detail)
        notifCreator.generate_and_call_error_notif("New graph error", 'An error has occured... : ' + response_json.detail);
    }
}

/**
    graph_id is a String.
    This function will load a Graph into the global variable graph
**/
async function load_skill_graph_data_from_db(graph_id){

    const resp = await db_methods.get_framework_by_id(graph_id);
    const data = await resp.json();

    if (resp.ok) {
        console.log(data);
        //class GraphNodesEdges(BaseModel):
        //    nodes_count: Optional[int]
        //    edges_count: Optional[int]
        //    nodes: Nodes
        //    edges: Edges

        let nodes_count = data["nodes_count"];

        // note: these are Object and not Array !
        let nodes = data["nodes"]["nodes"];
        let relationships = data["edges"]["edges"];
        // TODO: the DB can store the app location (x,y) of each node, for each user.
        let json_converted = convert_neo4j_graph(nodes, relationships);
        graph.load_from_json(graph_id, json_converted.nodes, json_converted.edges);
        notifCreator.generate_and_call_success_notif("Graph loaded!", "");
    }
    else {
       console.log('An error has occured... : ');
       notifCreator.generate_and_call_error_notif("Graph process error", 'An error has occured...');
    }
}

/**
    When a graph is loaded, will update current graph UI elements displayed.
**/
function update_graph_ui_elements(){
    if  (!graph._graph_id){
        graph_list.hidden = false;
        node_form.hidden = true;
        edge_form.hidden = true;
    } else {
        graph_list.hidden = true;
        node_form.hidden = false;
        edge_form.hidden = false;
    }
}
async function get_all_skillgraphs_from_db(){


    console.log("Retrieving skill graphs...");
    const resp = await db_methods.get_frameworks();
    const data = await resp.json();


        /**
            class NodeBase(BaseModel):
                node_id: int
                labels: list
            class Node(NodeBase):
                properties: Optional[dict] = None

            class Nodes(BaseModel):
                nodes: List[Node]
        **/
    if (resp.ok){
        var nodes = data["nodes"];


        // We update the dict with the data received
        for (const [node_id, node] of Object.entries(nodes)) {
            //console.log(node);
            existing_graphs[node.node_id] = node.properties;
        }
        update_graph_list_table();
        notifCreator.generate_and_call_success_notif("Skillgraphs downloaded", nodes.length + " nodes received.");
    }
    else{
        notifCreator.generate_and_call_error_notif("Get skillgraph error");
    }
}

/**
 * Convert the nodes and edges received from the Neo4j database to
 * a version used by the Skill Editor.
 * @param nodes
 * @param edges
 * @returns {{nodes: *[], edges: *[]}}
 */
function convert_neo4j_graph(nodes, edges){

    var new_nodes_array = [];
    var new_edges_array = [];
    console.log("converting neo4j graph");
    console.log(nodes);
    console.log(edges);

    // TODO : add the node_type label. It should be one among "Competency", "Skill" and "Knowledge",
    //        stored as labels in the Neo4j database
    Object.values(nodes).forEach((node) => {
        console.log(node);
        const node_type = node.labels.find((l) => l.toLowerCase() in NodeType);
        new_nodes_array.push({
            id: node.node_id,
            node_type: node_type ? node_type.toLowerCase() : NodeType.Competency,
            title: node.properties.title,
            x: 0,
            y: 0,
            properties: node.properties,
        });
    });

    Object.values(edges).forEach((edge) => {
        new_edges_array.push({
            source: edge.source,
            target: edge.target,
            label: edge.label,
            properties: edge.properties,
        });
    });

    return {nodes: new_nodes_array, edges: new_edges_array};
}


/** Display data of the node in the side window **/
function onGraphNodeClick(object){
    console.log(`Object received: ${object}`);
    object_edited = object.node;
    displayNodeData(object_edited);
}

/** Display data of the node in the side window **/
function onGraphEdgeClick(object){
    console.log(`Object received: ${object}`);
    object_edited = object.edge;
    displayEdgeData(object_edited);
}

/** Update changes done to the object_edited to the DB set it to null . **/
function onGraphNothingClick(){
    console.log("NothingClick detected!");

    // also must be updated to the graph

    commit_changes_of_object_edited();
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
    graph_create_form = document.getElementById("graph-form");
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
    graph.listen("nodeClicked", onGraphNodeClick);
    graph.listen("edgeClicked", onGraphEdgeClick);
    graph.listen("nothingClicked", onGraphNothingClick);

    /** When clicking outside the side window, updating the graph object.**/
    document.addEventListener('click', function(event) {
        // Check if the clicked target is not a descendant of myElement
        if (!side_window.contains(event.target)) {
          console.log('Clicked outside the side window.');
          node_form.hidden = true;
          edge_form.hidden = true;
          graph.redrawNodes();
          graph.redrawEdges();
        }
    });

    graph_table = document.getElementById("graph-table-content");
    // Listen to dynamically created buttons in the graph list
    graph_table.onclick = function(e) {
        // Thanks to David Walsh
        // https://davidwalsh.name/event-delegate
        // e.target is the clicked element!
        // If it was a list item
        let clicked_button = e.target;
        console.log("Click detected from : " + e.target + " nodeName: " + clicked_button.nodeName);
        if(clicked_button && clicked_button.nodeName === "BUTTON") {
            // List item found!
            editGraph(clicked_button.id);
        }
     };

    graph_create_form = document.getElementById("graph-form");
    graph_create_form.hidden = true;
    graph_create_form.onblur = function(){
        if (graph_create_form.hidden){return;}
    };

    let bt_create_graph = document.getElementById("create-new-graph");
    let bt_submit_new_graph = document.getElementById("send-graph-create-request")
    let bt_load_graph = document.getElementById("load-existing-graph");

    bt_create_graph.onclick = function(){
        if (graph_create_form.hidden){
            graph_create_form.hidden = false;
            graph_list.hidden = true;
        }
        else {
            graph_create_form.hidden = true;
            graph_list.hidden = true;
        }
    };

    bt_submit_new_graph.onclick = function(){
        let graph_create_title = document.getElementById("graph-title").value;
        let graph_create_descr = document.getElementById("graph-descr").value;
        create_new_graph(graph_create_title, graph_create_descr).then();
    }

    bt_load_graph.onclick = function(){
        graph_list.hidden = false;
        graph_create_form.hidden = true;
    };

}
