let chat = document.getElementById('chat');
let new_message = document.getElementById("new_message");


console.log(localStorage)
const socket = new WebSocket("ws://localhost:3000");

function initiateWebSocketConnection() {
    //localStorage.removeItem('auth_token');
    console.log(localStorage.getItem('auth_token'));

socket.onopen = function() {
        console.log("WebSocket connection opened");
        
        const authToken = localStorage.getItem('auth_token');
        if (authToken != null) {
            socket.send(JSON.stringify({ auth_token: authToken }));
        } else {
            localStorage.removeItem('auth_token');
            goToLogin();
        }
    };
  
socket.onmessage = function() {
        const message = JSON.parse(event.data);
        if ("go_to_login" in message) {
            localStorage.removeItem('auth_token');
            goToLogin();
            return
        }
        console.log(message);

        if ("message" in message) {
        
        sp = document.createElement("span")
        sp.innerHTML = `${message.owner}: ${message.message}`;
        sp.style.color = message.color;
        chat.appendChild(sp);
        return
    }
};
  
socket.onclose = function() {
    console.log("WebSocket connection closed");
};
  
socket.onerror = function() {
    console.error("WebSocket error:", error);
};
}

function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "http://localhost:8080/login.html";
}

function sendJson(message) {
    socket.send(JSON.stringify(message));
};

initiateWebSocketConnection();

