import { check_cookie_existence, get_cookie_value_by_name } from './cookie_helper.js';

function create_account(){
    var xhttp = new XMLHttpRequest ();
    var data = new FormData (account_creation_form); // get the data of form

    var username = data.get("username"); // get the value of the <input name="username">
    var password = data.get("password"); // get the value of the <input name="password">
    var password_bis = data.get("password_bis"); // get the value of the <input name="password">
    var email = data.get("email");

    if (password != password_bis){
        alert("Passwords aren't matching!")
        return
    }

    var user_json_data = {  // create the JSON object which will send the data in the body
        "username": username,
        "email": email,
        "password": password
    };

    xhttp.onreadystatechange = function () { // this funtion will run when the server respond back
        if (xhttp.readyState == 4){
            // this request should return a HTTP resource
            var res = xhttp.responseText;
            if (xhttp.status != 200){ // If the response from the server has not a response code of:200
                alert("Account creation failed!")
            }else{
                // We reload the page
                alert("Account created failed!")
            }
        }
    }

    xhttp.open ("POST", "/user/create_account"); // Create a POST request to send for the server
    xhttp.setRequestHeader("content-type", "application/json"); // set the content type to json (like the server wants)
    xhttp.send(JSON.stringify(user_json_data), false); // put the JSON object in the body of that request and send that request
}
var account_creation_form ;
var bt_create_account;

document.addEventListener("DOMContentLoaded", function(event){
    //const authentication_form = document.getElementById("test_auth");
    account_creation_form = document.getElementById("new_account_form");
    console.log(account_creation_form);
    bt_create_account = document.getElementById("bt_create_account");

    // Sending an account creation request
    bt_create_account.onclick = create_account ;

});
