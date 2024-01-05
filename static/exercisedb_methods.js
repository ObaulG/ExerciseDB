

var db_graph_id;

function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

async function add_node(node){

    const node_json = JSON.stringify(node);
    const resp = await fetch("/educitem", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: node_json
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
        return data
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
    return resp;
}

async function delete_node(node){
    const node_json = JSON.stringify(node);
    const resp = await fetch("/educitem", {
        method: "DELETE",
        headers:{
            "Content-Type": "application/json"
        },
        body: node_json
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
        console.log("Node deleted");
        //class GraphNodesEdges(BaseModel):
            //nodes_count: Optional[int]
            //relationships_count: Optional[int]
            //nodes: Nodes
            //relationships: Relationships
        return data;
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
    return resp
}

async function add_skill_node(node){
    const node_json = JSON.stringify(node);
    const resp = await fetch("/educitem", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: node_json
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
        return data;
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
    return resp;
}

async function create_edge(edge){
    const edge_json = JSON.stringify(edge);
    const resp = await fetch("/educitem", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: edge_json
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
        return data;
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
    return resp;
}

async function delete_edge(edge){
    const edge_json = JSON.stringify(node);
    const resp = await fetch("/educitem", {
        method: "DELETE",
        headers:{
            "Content-Type": "application/json"
        },
        body: edge_json
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
        console.log("Node deleted");
        //class GraphNodesEdges(BaseModel):
            //nodes_count: Optional[int]
            //relationships_count: Optional[int]
            //nodes: Nodes
            //relationships: Relationships
        return data;
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
    return resp;
}