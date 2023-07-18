function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}


function create_educ_item_selectable_element(id, title, descr){
/*
<div class="cat">
   <label>
      <input type="checkbox" value="1"><span>EducItem name</span>
   </label>
</div>
*/
    console.log("Adding EducItem " + title + " to the list...");
    var new_checkbox = document.createElement("input");
    new_checkbox.setAttribute("type", "checkbox");
    new_checkbox.setAttribute("value", id);
    var span_title = document.createElement("span");
    span_title.innerText = title
    var label = document.createElement("label");
    label.appendChild(new_checkbox);
    label.appendChild(span_title);
    var div_cat = document.createElement("div");
    div_cat.setAttribute("class", "cat");
    div_cat.setAttribute("id", "educ-item-"+String(id))
    div_cat.appendChild(label);


    skill_list.appendChild(div_cat);

}

async function retrieve_skill_list(){
    const resp = await fetch("/education-items", {
        method: "GET",
    })
    .then(response => {
        var response = response.json();
        return response;
        })
    .then(data => {
        console.log(data);
        console.log("values: " + data.values().toString());
        // data should be a JSON holding a list of EducItemData
        for (k in data){
            console.log(data);
            var id = data[k].id;
            var title = data[k].title;
            var descr = data[k].descr;

            create_educ_item_selectable_element(id, title, descr);
        }

    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
}


async function submit_skill(title, type, description){

    var skill_json = JSON.stringify({
        "title": title,
        "type": type,
        "description": description,
    });
    console.log("Submitting EducItem...");
    const resp = await fetch("/education_items", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: skill_json
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

var skill_list;
var new_skill_title;
var new_skill_type;
var new_skill_description;
var bt_submit_skill;
var selected_skills = [];
document.addEventListener("DOMContentLoaded", function(event){

    skill_list = document.getElementById("skill_list");
    new_skill_title = document.getElementById("skill_title");
    new_skill_type = document.getElementById("educ_item_type");
    new_skill_description = document.getElementById("skill_description");
    bt_submit_skill = document.getElementById("bt_submit_skill");

    bt_submit_skill.onclick = function(e){
        let title = new_skill_title.value;
        let type = Number(new_skill_type.value);
        let descr = new_skill_description.value;

        submit_skill(title, type, descr);
    };

    var resp = retrieve_skill_list();
});