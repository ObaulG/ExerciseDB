import * as db_methods from './exercisedb_methods.js';
import * as notifCreator from "./notification_creator.js";


export const NodeType = {
	Framework: "educframework",
	Competency: "competency",
	Skill: "skill",
	Knowledge: "knowledge",
	Ressource: "ressource",
}

export const EdgeType = {
    Comprises: "comprises",
    Requires : "requires",
    HasSkill: "hasSkill",
    HasKnowledge: "hasKnowledge",
    IsComplexificationOf: "isComplexificationOf",
    IsLeverOfUnderstandingOf: "isLeverOfUnderstandingOf",
}

export const EdgeStringToType = {
    "requires": EdgeType.Requires,
    "comprises": EdgeType.Comprises,
    "hasSkill": EdgeType.HasSkill,
    "hasKnowledge": EdgeType.HasKnowledge,
    "isComplexificationOf": EdgeType.IsComplexificationOf,
    "isLeverOfUnderstandingOf": EdgeType.IsLeverOfUnderstandingOf,
}

const keyToNodeType = {
    "KeyC": NodeType.Competency,
    "KeyK": NodeType.Knowledge,
    "KeyR": NodeType.Ressource,
    "KeyS": NodeType.Skill,
}


/** See https://github.com/kldtz/graph-editor/blob/main/graph.js
    This class is based on the D3 hierarchy class. A Graph stores
    Nodes and Edges separately.
**/
export default class Graph {
  get graph_id() {
    return this._graph_id;
  }

  get current_pressed() {
    return this._current_pressed;
  }
  constructor(opts) {

    this.svg = opts.svg;

    // this is the graph_id as stored in the Neo4j database.
    this._graph_id = null;

    this.nodes = opts.nodes;
    this.edges = this.#mapEdges(opts.edges);
    // current id == maximum id
    // only for local purposes.
    // DB ids are stored in properties
    this.nodeId = this.nodes.reduce(
      (acc, curr) => (acc > curr.local_id ? acc : curr.local_id),
      0
    );
    this.state = {
      mouseOverNode: null,
      shiftNodeDrag: false,
      selectedNode: null,
      selectedEdge: null,
      mouseInSVG: false,
    };

    /**
    Will be used with Mouse events when the user wants
    to add Nodes.
    Holds a KeyboardEvent.key (string).
    **/
    this._current_pressed = null;
    /**
    KeyboardEvent.keyCode is deprecated
    https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode,
    so we should use KeyboardEvent.key value (string) instead.
    https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
    **/
    this.consts = {
      BACKSPACE_KEY: "Backspace",
      DELETE_KEY: "Delete",
      NODE_RADIUS: 50,
      CLICK_DISTANCE: 5,
      ENTER_KEY: "Enter",
      C_KEY: "KeyC",
      F_KEY: "KeyF",
      K_KEY: "KeyK",
      R_KEY: "KeyR",
      S_KEY: "KeyS",
      I_KEY: "KeyI",
    };


    this.listeners = {};

    // Attributes defined in #draw
    this.circles = null;


    // If a graph was stored in localSession, we should load it.
    // Will update this.nodes and this.edges if found.
    this.loadFromLocalStorage();


    this.#draw();

  }

  listen(eventName, callback){
    if (!this.listeners.hasOwnProperty(eventName)){
        this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    console.log(this.listeners[eventName]);
  }

  /**
    emits signals when clicking on a Node or an edge,
    and also on nothing. Used by other components
    to display more data on these objects.
  **/
  emit(eventName, eventData){
    let event = new Event(eventName, eventData);
    if (eventName in this.listeners) {
      this.listeners[eventName].forEach(callback => callback(eventData));
    }
  }

  noElementSelected(){
    return !this.state.selectedNode
        && !this.state.mouseOverNode
        && !this.state.selectedEdge
  }
  #mapEdges(edges) {
    // map source and target id to respective node
    return edges.map((e) => ({
      source: this.nodes.find((n) => n.local_id === e.source),
      target: this.nodes.find((n) => n.local_id === e.target),
      label: e.label,
      properties: e.properties,
    }));
  }

  /* Deletes selected node and adjacent edges */
  async deleteNode(node) {
    // We can't delete the framework node.
    if (node.type === NodeType.Framework){return;}
    var edges_to_remove = this.edges.filter((e) => e.source === node || e.target === node);

    this.nodes = this.nodes.filter((n) => node !== n);
    this.edges = this.edges.filter(
      (e) => e.source !== node && e.target !== node
    );
    this.redraw();

    var resp = await db_methods.delete_node(node)
    // if the update is not validated, we rollback to the previous state.
  }

  async deleteEdge(edge) {
    this.edges = this.edges.filter((e) => edge !== e);
    this.redrawEdges();

    var resp = await db_methods.delete_edge(edge)
  }

  clearSelection() {
    this.state.selectedNode = null;
    this.state.selectedEdge = null;
    this.redraw();
  }

  async addNode(title, x, y) {
    var node = {
      id: ++this.nodeId,
      local_id: this.nodeId,
      title: title,
      x: x,
      y: y,
      node_type: NodeType.Competency,
      description: "",
    }
    this.nodes.push(node);
    this.redrawNodes();

    var resp = await db_methods.add_node(node)
  }

  async addSkillNode(title, x, y, type, descr){
    var node = {
      id: ++this.nodeId,
      local_id: this.nodeId,
      title: title,
      x: x,
      y: y,
      node_type: type,
      description: descr,
    }
    this.nodes.push(node);
    this.redrawNodes();

    var resp = await db_methods.add_skill_node(node)
  }

  async createEdge(edge){
    this.edges.push(edge);
    this.redrawEdges();
    console.log(this.edges);
    var resp = await db_methods.create_edge(edge)
  }

  manualDraw(){
    this.#draw();
  }
  /**
  Add the keydown event callback on the graph :
  - On DELETE_KEY down, will remove the current selected
    node or edge.
  - On C, S, K or K key, will store the info in this.current_pressed.
  Add a drag and zoom behaviour.

  Listens to mousedown event :
  - when clicking outside of elements, emits a nothingClicked event;
  - when shift-clicking, create an empty Node,
  - when c-cliking, create a Competency Node,
  - when s-clicking, create a Skill Node,
  - when k-clicking, create a Knowledge Node,
  - when r-clicking, create a Resource Node
  **/
  async #draw() {
    // listening events in the window.
    d3.select(window)
        .on("keydown", (event) => {
              switch (event.key) {

                // we should delete the node only if the mouse is inside the Graph view
                case this.consts.BACKSPACE_KEY:
                case this.consts.DELETE_KEY:
                  if (!this.state.mouseInSVG) {return;}
                  if (this.state.selectedNode) {
                    event.preventDefault();
                    this.deleteNode(this.state.selectedNode);
                  } else if (this.state.selectedEdge) {
                    event.preventDefault();
                    this.deleteEdge(this.state.selectedEdge);
                  }
                  break;
              }
              if (event.key in keyToNodeType){
                  console.log(event.key + " pressed!");
                  this._current_pressed = event.key;
              }
        })
        .on("keyup", (event) => {
              if (event.key in keyToNodeType){
                  console.log(event.key + " unpressed!");
                  this._current_pressed = null;
              }
      });

    // add zoom behavior to whole svg
    const zoom = d3
      .zoom()
      .clickDistance(this.consts.CLICK_DISTANCE)
      .on("zoom", (event) => {
        this.plot.attr("transform", event.transform);
      });

    // prepare SVG by adding listeners
    this.svg
      .on("mouseenter", (event, d) => {
          this.state.mouseInSVG = true;
        })
      .on("mouseleave", (event, d) => {
          this.state.mouseInSVG = false;
        })
      .on("mousedown", (event, d) => {
          /** "is the shiftKey pressed with the mouse click"?
              we can't do that with basic letter keys.**/
          console.log("mouseDown event!");
          // current pointer position
          const pos = d3.pointer(event, graph.plot.node());

          if (event.shiftKey) {
              console.log("event.shiftKey! adding a Node");
              this.addNode((this.nodeId + 1).toString(), pos[0], pos[1]);
          }
          if (this._current_pressed in keyToNodeType){
              console.log("mouseDown with key pressed!");
              let nodetype = keyToNodeType[this._current_pressed];
              this.addSkillNode((this.nodeId + 1).toString(), pos[0], pos[1], nodetype, "");
          }
      })
      // click outside of elements
      .on("click", () => {
        this.clearSelection();
        this.emit("nothingClicked", {});
      })

      .call(zoom);

    this.#defineMarkers();

    // drag behavior :
    // on shift : trace an Edge from the selected node to another node
    // else just move the selected node
    const graph = this;
    this.drag = d3
      .drag()
      .clickDistance(this.consts.CLICK_DISTANCE)
      .on("drag", function (event, d) {
        if (graph.state.shiftNodeDrag) {
          // update temporary drag line
          const pos = d3.pointer(event, graph.plot.node());
          graph.dragLine.attr(
            "d",
            "M" + d.x + "," + d.y + "L" + pos[0] + "," + pos[1]
          );
        } else {
          // update position of dragged node and update adjacent edges
          d.x = event.x;
          d.y = event.y;
          d3.select(this)
            .raise()
            .attr("transform", (d) => "translate(" + [d.x, d.y] + ")");
          graph.redrawEdges();
        }
      })
      .on("end", (event, source) => {
        this.state.shiftNodeDrag = false;
        // hide line, remove arrow tip
        this.dragLine.classed("hidden", true);

        const target = this.state.mouseOverNode;

        console.log("drag end...\n",source, "-", target);
        if (!source || !target) return;

        // source and target are different
        if (source !== target) {
          // remove edge between source and target (any order)
          /*
          this.edges = this.edges.filter(
            (edge) =>
              !(edge.source === source && edge.target === target) &&
              !(edge.source === target && edge.target === source)
          );*/
          let newEdge = {source: source, target: target, label: "comprises", properties: {}};
          this.createEdge(newEdge);
        }
      });

    // populate svg
    this.plot = this.svg.append("g");

    // displayed when dragging between nodes
    this.dragLine = this.plot
      .append("path")
      .classed("line", true)
      .classed("dragline", true)
      .classed("hidden", true)
      .attr("d", "M0,0L0,0");

    // circles need to be added last to be drawn above the paths
    this.paths = this.plot.append("g").classed("edges", true);
    this.circles = this.plot.append("g").classed("nodes", true);

    this.redraw();
  }

  #defineMarkers() {
    const defs = this.svg.append("defs");
    // arrow marker for edge
    defs
      .append("marker")
      .attr("id", "end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at circle (cut off part of tip that is thinner than line)
      .attr("refX", this.consts.NODE_RADIUS - 3)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
    // arrow marker for selected edge (to allow separate CSS styling)
    defs
      .append("marker")
      .attr("id", "selected-end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at circle (cut off part of tip that is thinner than line)
      .attr("refX", this.consts.NODE_RADIUS - 3)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
    // arrow marker for leading arrow
    defs
      .append("marker")
      .attr("id", "mark-end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at end of line
      .attr("refX", -5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
  }

  redraw() {
    this.redrawEdges();
    this.redrawNodes();
  }

  redrawNodes() {
  console.log("redrawNodes");
    this.circles
      .selectAll("g")
      .data(this.nodes, (d) => d.local_id)
      .join(
        (enter) => this.#enterNodes(enter),
        (update) => this.#updateNodes(update),
        (exit) => exit.remove()
      );
  }

  /**
   Create the new Nodes. Emits the nodeClicked event when left-clicking a node.
   mouseover: should display the full title.
  **/
  #enterNodes(enter) {

    const div_tooltip = enter.append("div").attr("class", "tooltip-node").style("opacity", 0);
    const nodes = enter
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")
      .on("mousedown", (event, d) => {
        event.stopPropagation();
        if (event.shiftKey) {
          this.state.shiftNodeDrag = true;
          this.dragLine
            .classed("hidden", false)
            .attr("d", "M" + d.x + "," + d.y + "L" + d.x + "," + d.y);
        }
      })
      .on("mouseover", (event, d) => {
        this.state.mouseOverNode = d;
        d3.select(event.target).transition()
               .duration(50)
               .attr('opacity', '.85');

        div_tooltip.html(d.title)
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 15) + "px")
               .transition()
               .duration(150)
               .style("opacity", 0.55);
      })

      .on("mouseout", (event, d) => {
        event.stopPropagation();
        this.state.mouseOverNode = null;
        d3.select(event.target).transition()
               .duration(50)
               .attr('opacity', '1');
        div_tooltip.transition()
               .duration(50)
               .style("opacity", 1);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const nodeClicked = d;
        console.log(d);
        if (event.shiftKey) {
          this.#editNodeLabel(nodeClicked);
        } else {
          this.state.selectedNode = nodeClicked;
          this.state.selectedEdge = null;
          console.log("nodeclicked: " + nodeClicked);
          this.emit("nodeClicked", {
            "node": nodeClicked,
          });
          this.redraw();
        }
      })
      .call(this.drag);

    nodes.append("circle").attr("r", String(this.consts.NODE_RADIUS))
                          .attr("stroke", "black")
    nodes.append("text").text((d) => d.title);
  }


  #editNodeLabel(d) {
    const selection = this.circles
      .selectAll("g")
      .filter((dval) => dval.local_id === d.local_id);
    // hide current label
    const text = selection.selectAll("text").classed("hidden", true);
    // add intermediate editable paragraph
    const d3txt = this.plot
      .selectAll("foreignObject")
      .data([d])
      .enter()
      .append("foreignObject")
      .attr("x", d.x - this.consts.NODE_RADIUS)
      .attr("y", d.y - this.consts.NODE_RADIUS / 2)
      .attr("height", 2 * this.consts.NODE_RADIUS)
      .attr("width", 2 * this.consts.NODE_RADIUS)
      .append("xhtml:div")
      .attr("id", "editable-p")
      .attr("contentEditable", "true")
      .style("text-align", "center")
      //.style("border", "1px solid")
      .text(d.title)
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      })
      .on("keydown", (event, d) => {
        event.stopPropagation();
        if (event.key === this.consts.ENTER_KEY) {
          event.target.blur();
        }
      })
      // when losing focus on the textbox
      .on("blur", (event, d) => {
        d.title = event.target.textContent;
        d3.select(event.target.parentElement).remove();
        this.redrawNodes();
        text.classed("hidden", false);
      });
    d3txt.node().focus();
  }

  #updateNodes(update) {
    update
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")
      .classed("selected", (d) => d === this.state.selectedNode);

    update.select("text").text((d) => d.title);
  }

  // See https://www.d3indepth.com/selections/ for more info...
  redrawEdges() {
    // select all edges
    this.paths
      .selectAll(".edge")
      // bind all the edges to the method #edgeId (?)
      .data(this.edges, this.#edgeId)
      .join(
        (enter) => this.#enterEdges(enter),
        (update) => this.#updateEdges(update),
        (exit) => exit.remove()
      );
  }

  /**
  Create the new Edges, adding handlers
  **/
  #enterEdges(enter) {
    const edges = enter
      .append("g")
      .classed("edge", true)
      .on("click", (event, d) => {
        event.stopPropagation();

        this.state.selectedEdge = d;
        this.state.selectedNode = null;
        this.emit("edgeClicked",{
          "edge": d,
        })
        this.redraw();

      })
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      });

    edges
      .append("path")
      .attr("id", this.#edgeId)
      .classed("line", true)
      .attr(
        "d",
        (d) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );

    edges
      .append("text")
      .attr("class", "edge-label")
      .attr("dy", -15)
      .append("textPath")
      .attr("xlink:href", (d) => "#" + this.#edgeId(d))
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .text((d) => d.label);
  }

  #editEdgeLabel(d) {
    const selection = this.paths
      .selectAll("g")
      .filter((dval) => this.#edgeId(dval) === this.#edgeId(d));
    // hide current label
    const text = selection.selectAll("text").classed("hidden", true);
    // add intermediate editable paragraph
    const d3txt = this.plot
      .selectAll("foreignObject")
      .data([d])
      .enter()
      .append("foreignObject")
      // TODO: rotate via transform: rotate(20deg);
      .attr("x", d.target.x - (d.target.x - d.source.x) / 2)
      .attr("y", d.target.y - (d.target.y - d.source.y) / 2)
      .attr("height", 100)
      .attr("width", 100)
      .append("xhtml:div")
      //.style("transform", "rotate(20deg)")
      .attr("id", "editable-p")
      .attr("contentEditable", "true")
      .style("text-align", "center")
      //.style("border", "1px solid")
      .text(d.label)
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      })
      .on("keydown", (event, d) => {
        event.stopPropagation();
        if (event.key === this.consts.ENTER_KEY) {
          event.target.blur();
        }
      })
      .on("blur", (event, d) => {
        d.label = event.target.textContent;
        d3.select(event.target.parentElement).remove();
        this.redrawEdges();
        text.classed("hidden", false);
      });
    d3txt.node().focus();
  }

  #updateEdges(update) {
    update.classed("selected", (d) => d === this.state.selectedEdge);

    update
      .select("path")
      .attr(
        "d",
        (d) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );

    update
      .select("text")
      .select("textPath")
      .text((d) => d.label);
  }

  /**
   * Returns the id of the edge d used in CSS attributes.
   * @param d the Edge object
   * @returns {string} {source.local_id}+{target.local_id}
   */
  #edgeId(d) {
    return String(d.source.local_id) + "+" + String(d.target.local_id);
  }

  /**
    Load a Graph from local nodes and edges.
   */
  load(nodes, edges) {
    this.nodeId = nodes.reduce((prev, curr) =>
      prev.local_id > curr.local_id ? prev.local_id : curr.local_id
    );
    this.nodes = nodes;
    this.edges = this.#mapEdges(edges);
    this.redraw();
  }

  /**
   * Create a Graph from data received from Neo4j app.
   * @param graph_id The graph_id as stored in the Neo4j DB.
   * @param nodes A list of Nodes without local_id. They have "node_id", "labels" ([...]) and properties keys.
   * @param edges A list of Edges.
   */
  load_from_json(graph_id, nodes, edges){
    this._graph_id = graph_id;
    this.nodeId = nodes.length;
    // edges stores db_id and not local_id, so we should convert them.
    // associates the node's database id to the local_id we will give here.
    var db_id_to_local_id = {};
    for(let i = 0; i<nodes.length; i++){
        nodes[i].local_id = i;
        db_id_to_local_id[nodes[i].id] = i;
    }
    console.log("db_id_to_local_id: ");
    console.log(db_id_to_local_id);

    this.nodes = nodes;
    console.log(nodes);
    console.log(this.nodes);

    edges.forEach((edge) => {
      edge.source = db_id_to_local_id[edge.source];
      edge.target = db_id_to_local_id[edge.target];
    });
    console.log("Edges before map:");
    console.log(edges);
    this.edges = this.#mapEdges(edges);
    console.log("edges are set");
    console.log(this.edges);
    this.redraw();
  }

  loadFromLocalStorage(){
    let graph_json;
    try{
      graph_json = JSON.parse(localStorage.getItem("graph"));
    }
    catch (e) {
      console.error(e)
      notifCreator.generate_and_call_error_notif("Failed to load graph from localSession", e.toString());
    }

    if (graph_json) {
      let nodes = graph_json.nodes;
      let edges = graph_json.edges;

      // for each Edge, we must retrieve the node with the corresponding local_id
      // it was given.
      this.edges.forEach((edge) => {
        edge.source = nodes.find((node)=> node.local_id === edge.source);
        edge.target = nodes.find((node)=> node.local_id === edge.target);
      });

      this.nodes = nodes;
      this.edges = edges;

      notifCreator.generate_and_call_success_notif("Graph loaded from localSession!", "Nice!")
      localStorage.removeItem("graph");
    }
  }

  saveToLocalStorage(){
    localStorage.setItem("graph", this.serializeString())
  }

  /**
   * Return
   * @returns {*} the list of Edges with their source and target reduced to the local_id of the nodes.
   */
  saveEdges(){
    return this.edges.map((edge) => ({
      source: edge.source.local_id,
      target: edge.target.local_id,
      label: edge.label,
      properties: edge.properties,
    }));
  }
  serializeString(){
    const savedEdges = this.saveEdges();
    return JSON.stringify({ nodes: this.nodes, edges: savedEdges });
  }
  serializeBlob() {
    const savedEdges = this.saveEdges();
    return new window.Blob(
      [window.JSON.stringify({ nodes: this.nodes, edges: savedEdges })],
      { type: "text/plain;charset=utf-8" }
    );
  }

  getNbNodes(){
    return this.nodes.length;
  }

  getNbEdges() {
    return this.edges.length;
  }
}