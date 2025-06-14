export const NodeType = {
	Framework: "educframework",
	Competency: "competency",
	Skill: "skill",
	Knowledge: "knowledge",
	Ressource: "ressource",
}

export class Node {
    constructor(opts) {
        this.node_id = opts.node_id;
		this.local_id = opts.local_id;
		this.labels = opts.labels;
		if (opts.hasOwnProperty("properties")){
			this.properties = opts.properties;
		}
		else{
			this.properties = {
				title: opts.title,
				x: opts.x,
				y: opts.y,
				description: opts.description,
			};
		}
    }

	hasLabel(label){
		return this.labels.includes(label);
	}

	getX(){
		return this.properties.x;
	}
	getY(){
		return this.properties.y;
	}
	getTitle(){
		return this.properties.title;
	}

	getDescription(){
		return this.properties.description;
	}

	getFirstLabel(){
		return this.labels[0];
	}

	setX(x){
		this.properties.x = x;
	}

	setY(y){
		this.properties.y = y;
	}
	setTitle(title){
		this.properties.title = title;
	}
	setDescription(descr){
		this.properties.description = descr;
	}
	setFirstLabel(label){
		if (this.labels.length === 0){
			this.labels.push(label);
			return
		}
		this.labels[0] = label
	}
}