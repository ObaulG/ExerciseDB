function create_educ_item_element(id, title, descr){

}

async function retrieve_skill_list(){
    var xhttp = new XMLHttpRequest ();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4){
            // this request should return a HTTP resource
            var res = xhttp.responseText;
            if (xhttp.status != 200){
                // we can make the server send a text explaining the error
                // (username inexistant or wrong password)
                // instead of making a pop-up
                console.log("Failed to retrieve (error " + str(xhttp.status) + ")");
            }else{
                // The server has sent a list of skills...

            }
        }
    };

    xhttp.open ("GET", "/educ_items");
    xhttp.setRequestHeader("content-type", "application/json");
    xhttp.send("", false);
}


async function submit_skill(title, type, description){

    var skill_json = JSON.stringify({
        "title": title,
        "type": type,
        "description": description,
    });
    console.log("Submitting EducItem...");
    const resp = await fetch("/educitem/submit", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: skill_json
    })
    .then(response => {
        var response = response.json();
        return response;
        })
    .then(data => {
        console.log(data);
        // data should be a JSON holding an
        // EducItemData
        var id = data["id"];
        var title = data["title"];
        var descr = data["descr"];

        create_educ_item_element(id, title, descr);
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
});