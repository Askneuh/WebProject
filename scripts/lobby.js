import { connectWebSocket, sendMessage } from './socket.js';

const players = [];

const chat = document.getElementById("chat");

connectWebSocket((message) => {
    if (message.type === "UpdateAllPlayers") {
    console.log("Positions des joueurs reçues:", message.positions);
    updateAllPlayers(message.positions);
  } else if (message.type === "mazeUpdate") {
    console.log("Maze updated:", message.maze);
  } else if (message.type === "chatMessage") {
    displayChatMessage(message.username, message.message);
  } else {
    console.log("Message reçu:", message);
  }
});