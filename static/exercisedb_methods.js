import * as notifCreator from './notification_creator.js';

export const ROUTES = {
    addNode: "/educitem/node",
    deleteNode: "/educitem/node",
    updateNode: "/educitem/node",
    addEdge: "/educitem/edge",
    deleteEdge: "/educitem/edge",
    updateEdge: "/educitem/edge",
    getSkillGraph: "/educitem/skillgraph",
    getAllFrameworks: "/educitem/framework/all",
    createFramework: "/educitem/framework/new",
}

function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

/**
 * Make a call to the Python app linked to the Neo4j database.
 * @param route A String representing the route to request
 * @param method HTTP method
 * @param data An Object to add to the body of the request
 * @returns {Promise<Response>} The promise containing the Response object.
 */
export async function db_call(route, method, data){
    let resp;
    let init_data;
    if (method === "GET"){
        init_data = {
            method: method,
        };
    } else {
        init_data = {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };
    }
    try{
        resp = await fetch(route, init_data);
    }
    catch (e){
        console.error(e)
        notifCreator.generate_and_call_error_notif("Server error", e.toString());
    }

    return resp;
}

export async function add_node(node){
    return await db_call(ROUTES.addNode, "POST", node);
}

export async function delete_node(node){
    return await db_call(ROUTES.deleteNode, "DELETE", node);
}

export async function create_edge(edge){
    return await db_call(ROUTES.addEdge, "POST", edge);
}

export async function delete_edge(edge){
    return await db_call(ROUTES.deleteEdge, "DELETE", edge);
}

export async function update_edge(edge){
    return await db_call(ROUTES.updateEdge, "POST", edge);
}

export async function get_framework_by_id(id){
    return await db_call(ROUTES.getSkillGraph + "/" + id, "GET", {})
}

export async function get_frameworks(){
    return await db_call(ROUTES.getAllFrameworks, "GET", {})
}
export async function create_framework(data){
    return await db_call(ROUTES.createFramework, "POST", data);
}