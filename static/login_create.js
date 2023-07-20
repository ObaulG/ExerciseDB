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
        "pseudo": username,
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

function login(){
console.log("wut?");
    var xhttp = new XMLHttpRequest ();
    var data = new FormData (login_form); // get the data of form

    var username = data.get("username"); // get the value of the <input name="username">
    var password = data.get("password"); // get the value of the <input name="password">

    var user_json_data = {  // create the JSON object which will send the data in the body
        "username": username,
        "password": password
    };

    // asking for token
    const resp = fetch("/token", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user_json_data),
    })
    .then(response => {
        return response.json();
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
        alert("Login failed...");
    })
    .then(data => {
        console.log(data);
        // data holds the JWT
        localStorage.setItem('tokens', JSON.stringify(data));

        // store JWT in session storage
        sessionStorage.setItem('JWT', myJWT);

        console.log('My JWT is', sessionStorage.getItem('JWT'));

        alert("Login success!");
    })
    .catch(function(error) {
        console.log('An error has occured... : ' + error.message);
    });
}

var account_creation_form;
var login_form;
var bt_create_account;
var bt_login;

document.addEventListener("DOMContentLoaded", function(event){
    //const authentication_form = document.getElementById("test_auth");
    account_creation_form = document.getElementById("new_account_form");
    login_form = document.getElementById("login_form");
    console.log(account_creation_form);
    bt_create_account = document.getElementById("bt_create_account");
    bt_login = document.getElementById("bt_login");
    // Sending an account creation request
    bt_create_account.onclick = create_account ;
    bt_login.onclick = login;
});
