// Construction dynamique de l'URL WebSocket pour éviter toute confusion de port
const WS_PORT = 3000; // Doit correspondre au port backend
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
const WS_HOST = window.location.hostname;
const socket = new WebSocket(`${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}`);

function connectWebSocket(onMessageCallback, onCloseCallback, onErrorCallback) {
  socket.onopen = () => {
    console.log("✅ WebSocket connecté");

  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.go_to_login) {
      goToLogin();
      return;
    }

    if (typeof onMessageCallback === "function") {
      onMessageCallback(message);
    }
  };

  socket.onclose = (event) => {
    console.log("❌ WebSocket déconnecté", event.reason || "No reason provided");
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

export function goToLogin() {
  console.log("Redirecting to login page");
  window.location.href = "/pages/login.html";
}

export { connectWebSocket, sendMessage };
