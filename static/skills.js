function retrieve_skill_list(){
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


function submit_skill(title, type, description){
    var xhttp = new XMLHttpRequest ();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4){
            // this request should return a HTTP resource
            var res = xhttp.responseText;
            if (xhttp.status != 200){
                // we can make the server send a text explaining the error
                // (username inexistant or wrong password)
                // instead of making a pop-up
                console.log("Failed to submit skill...");
            }else{
                console.log("Skill submit successfully!")

            }
        }
    };

    var skill_json = {
        "title": title,
        "type": type,
        "description": description,
    };
    xhttp.open ("POST", "/educitem/submit");
    //xhttp.open ("POST", "http://localhost:8000/educitem/submit");
    xhttp.setRequestHeader("content-type", "application/json");
    xhttp.send(JSON.stringify(skill_json), false);
}
document.addEventListener("DOMContentLoaded", function(event){

    var skill_list = document.getElementById("skill_list");
    var new_skill_title = document.getElementById("skill_title");
    var new_skill_type = document.getElementById("educ_item_type");
    var new_skill_description = document.getElementById("skill_description");
    var bt_submit_skill = document.getElementById("bt_submit_skill");
    var selected_skills = [];

    bt_submit_skill.onclick = function(e){
        let title = new_skill_title.value;
        let type = Number(new_skill_type.value);
        let descr = new_skill_description.value;

        console.log(title +" "+type+" "+descr);
        submit_skill(title, type, descr);
    };
});