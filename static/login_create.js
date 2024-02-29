import { check_cookie_existence, get_cookie_value_by_name } from './cookie_helper.js';
import * as notifCreator from './notification_creator.js';


async function create_account(){
    var data = new FormData (account_creation_form); // get the data of form

    var username = data.get("username"); // get the value of the <input name="username">
    var password = data.get("password"); // get the value of the <input name="password">
    var password_bis = data.get("password_bis"); // get the value of the <input name="password">
    var email = data.get("email");

    if (password !== password_bis){
        alert("Passwords aren't matching!")
        return
    }
    console.log("Creating account...");
    var user_json_data = {  // create the JSON object which will send the data in the body
        "pseudo": username,
        "email": email,
        "password": password
    };

    const response = await fetch("/user/create_account", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user_json_data),
    });
    const json = await response.json();
    if (response.ok){
        notifCreator.generate_and_call_success_notif("Creation successful!", "");
    }else{
        notifCreator.generate_and_call_error_notif("Creation failed", 'Detail: ' + json.detail);
    }
}
async function login(){
    var data = new FormData (login_form); // get the data of form

    const response = await fetch("/token", {
        method: "POST",
        body: data,
    });
    const json = await response.json();
    if (response.ok){
        localStorage.setItem('tokens', JSON.stringify(json));
        // store JWT in session storage
        sessionStorage.setItem('JWT', JSON.stringify(json));
        console.log('My JWT is', sessionStorage.getItem('JWT'));
        notifCreator.generate_and_call_success_notif("Login success!", "");
    }else{
        notifCreator.generate_and_call_error_notif("Login failed", json.detail);
    }
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
