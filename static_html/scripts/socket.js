const socket = new WebSocket("ws://localhost:3000");

function connectWebSocket(onMessageCallback, onCloseCallback, onErrorCallback) {
  socket.onopen = () => {
    console.log("✅ WebSocket connecté");

    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      socket.send(JSON.stringify({ auth_token: authToken }));
    } else {
      localStorage.removeItem('auth_token');
      goToLogin();
    }
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.go_to_login) {
      localStorage.removeItem('auth_token');
      goToLogin();
      return;
    }

    if (typeof onMessageCallback === "function") {
      onMessageCallback(message);
    }
  };

  socket.onclose = () => {
    console.log("❌ WebSocket déconnecté");
    if (typeof onCloseCallback === "function") {
      onCloseCallback();
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (typeof onErrorCallback === "function") {
      onErrorCallback(error);
    }
  };
}

function sendMessage(messageObj) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(messageObj));
  } else {
    console.warn("⚠️ WebSocket non prêt pour envoyer un message.");
  }
}

function goToLogin() {
  window.location.href = "/pages/login.html";
}

export { connectWebSocket, sendMessage };
