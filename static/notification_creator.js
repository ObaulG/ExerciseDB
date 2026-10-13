

/**
    Returns a function without parameters that calls the notification when called.
**/
export function generate_notification(properties){
    return function() {
        window.createNotification({
            theme: properties.theme,
            showDuration: properties.duration,
        })({title: properties.title, message: properties.message})
    };
}

/**

**/

export function generate_success_notif(title, message){
    return generate_notification({theme: "success", showDuration: 5000, title: title, message: message});
}

export function generate_error_notif(title, message){
    return generate_notification({theme: "error", showDuration: 5000, title: title, message: message});
}

export function generate_info_notif(title, message){
    return generate_notification({theme: "info", showDuration: 5000, title: title, message: message});
}

export function generate_warning_notif(title, message){
    return generate_notification({theme: "warning", showDuration: 5000, title: title, message: message});
}

/**
    Make the notification with given parameters spawn directly. It is not returned.
**/
export function generate_and_call_notification(properties){
    window.createNotification({
            theme: properties.theme,
            showDuration: properties.duration,
        })({title: properties.title, message: properties.message});
}

export function generate_and_call_error_notif(title, message){
    generate_error_notif(title, message)();
}

export function generate_and_call_success_notif(title, message){
    generate_success_notif(title, message)();
}

export function generate_and_call_info_notif(title, message){
    generate_info_notif(title, message)();
}

