import { check_cookie_existence, get_cookie_value_by_name } from './cookie_helper.js';
import * as notifCreator from './notification_creator.js';


async function create_account(){
    let data = new FormData (account_creation_form); // get the data of form

    let username = data.get("username"); // get the value of the <input name="username">
    let password = data.get("password"); // get the value of the <input name="password">
    let password_bis = data.get("password_bis"); // get the value of the <input name="password">
    let email = data.get("email");


    if (password !== password_bis){
        alert("Passwords aren't matching!")
        return
    }
    console.log("Creating account...");
    let user_json_data = {  // create the JSON object which will send the data in the body
        "pseudo": username,
        "email": email,
        "password": password
    };
    let response;
    let json;
    let error_caught = false;
    try {
        response = await fetch("/user/create_account", {
            method: "POST",
            headers:{
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user_json_data),
        });
        json = await response.json();
    } catch(e){
        console.error(e)
        notifCreator.generate_and_call_error_notif("Server error", e.toString());
        error_caught = true;
    }

    if (response.ok){
        notifCreator.generate_and_call_success_notif("Creation successful!", "");
    }else{
        if (!error_caught){
            notifCreator.generate_and_call_error_notif("Creation failed", json ? 'Detail: ' + json.detail : "No detail");
        }

    }
}
async function login(){
    let data = new FormData (login_form); // get the data of form
    let response;
    let json;
    let error_caught = false;
    try {
        response = await fetch("/token", {
            method: "POST",
            body: data,
        });
        json = await response.json();
    }
    catch (e) {
        console.error(e)
        notifCreator.generate_and_call_error_notif("Server error", e.toString());
        error_caught = true;
    }
    if (response.ok){
        localStorage.setItem('tokens', JSON.stringify(json));
        // store JWT in session storage
        sessionStorage.setItem('JWT', JSON.stringify(json));
        console.log('My JWT is', sessionStorage.getItem('JWT'));
        notifCreator.generate_and_call_success_notif("Login success!", "");
    }else{
        if (!error_caught){
            notifCreator.generate_and_call_error_notif("Login failed",
                                           json ? json.detail : "No detail");
        }

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
