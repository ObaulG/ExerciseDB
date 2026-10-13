export function check_cookie_existence(cookie_name) {
    // Returns True if the name given appears in the cookies stored, False otherwise.

    // Array.prototype.some() checks if at least one element of an array verifies the
    // test implemented by the given function

    // String.prototype.trim() removes whitespaces in both beginning and end of the string and returns
    // this string. It does NOT change the value of the current string

    // String.startsWith() explains itself lol.
    return document.cookie.split(';').some((item) => item.trim().startsWith(cookie_name + '='));
}

// https://www.w3schools.blog/get-cookie-by-name-javascript-js
export function get_cookie_value_by_name(cookie_name) {
    let cookie = {};
    document.cookie.split(';').forEach(function(el) {
        // generating the dict
        let [key,value] = el.split('=');
        cookie[key.trim()] = value;
    })
    return cookie[cookie_name];
}
