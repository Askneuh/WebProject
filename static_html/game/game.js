import { initScene, updateAllPlayers, updateLight } from './scene.js';
import { generateMaze, buildMaze, getMaze } from './buildMaze.js';
import { Player, Direction } from './player.js';
import { connectWebSocket, sendMessage, goToLogin} from '../scripts/socket.js';
import { verifySession } from '../scripts/index.js';
verifySession();

const { scene, camera, renderer, controls } = initScene();

const cellSize = 10;
const mazeSize = 20;
var positions = [];
let maze;
let player;

// Overlay classement kills
const overlay = document.createElement('div');
overlay.id = 'kills-overlay';
overlay.style.position = 'fixed';
overlay.style.top = '10px';
overlay.style.right = '10px';
overlay.style.background = 'rgba(0,0,0,0.7)';
overlay.style.color = 'white';
overlay.style.padding = '10px 20px';
overlay.style.borderRadius = '8px';
overlay.style.zIndex = '1000';
overlay.style.fontFamily = 'Arial, sans-serif';
overlay.innerHTML = '<b>Classement Kills</b><div id="kills-list">Chargement...</div>';
document.body.appendChild(overlay);

function updateKillsOverlay() {
  fetch('https://localhost:3000/kills', { 
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }

  })
    .then(res => res.json())
    .then(data => {
      const killsList = document.getElementById('kills-list');
      if (!data || !Array.isArray(data.kills)) {
        killsList.innerHTML = 'Aucun score.';
        return;
      }
      killsList.innerHTML = data.kills.map((u, i) =>
        `<div>${i+1}. <b>${u.username}</b> : ${u.kills} kills</div>`
      ).join('');
    })
    .catch(() => {
      document.getElementById('kills-list').innerHTML = 'Erreur chargement.';
    });
}
setInterval(updateKillsOverlay, 2000);
updateKillsOverlay();

function initializePlayer() {
  const random_coord_x = Math.floor(Math.random() * maze[0].length);
  const random_coord_y = Math.floor(Math.random() * maze.length);
  player = new Player(random_coord_x, random_coord_y, scene, cellSize, maze);
  player.createMesh();
  player.createOnServer();
  
  setupKeyboardControls();
}

function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    let newX = player.x;
    let newY = player.y;

    switch (e.key) {
      case 'z':
        player.faceTowards(Direction.UP);
        if (player.canMove("up", positions)){
          newY--;
        } 
        break;
      case 's':
        player.faceTowards(Direction.DOWN);
        if (player.canMove("down", positions)) {
          newY++;
        }
        break;
      case 'q':
        player.faceTowards(Direction.LEFT);
        if (player.canMove("left", positions)) {
          newX--;
        }
        break;
      case 'd':
        player.faceTowards(Direction.RIGHT);
        if (player.canMove("right", positions)) {
          newX++;
        }        
        break;
      case 'e':
        fetch("https://localhost:3000/boo", {
          method: "POST", 
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({}) 
        })
    }

    if (newX !== player.x || newY !== player.y) {
      console.log("Player moved to:", newX, newY);
      player.moveTo(newX, newY);
      sendMessage({
        type: "playerMove",
        player_id: player.player_id,
        x: newX,
        y: newY,
        facing: player.facingTowards
      });
      console.log("Player moved to server:", newX, newY);
    }
  });
}

fetch("https://localhost:3000/getMaze", {
  method: "POST", 
  credentials: "include",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({}) 
})
.then(response => {
  if (response.ok) {
    return response.json();
  } else {
    console.error("Failed to fetch maze:", response.statusText);
    throw new Error("Failed to fetch maze");
  }
})
.then(result => {
  maze = result.maze;
  console.log("Maze fetched:", maze);
  
  buildMaze(maze, scene, cellSize);
  
  initializePlayer();
  
  setupWebSocketConnection();
})
.catch(error => {
  console.error("Error fetching maze:", error);
});

function setupWebSocketConnection() {
  connectWebSocket((message) => {
    if (message.type === "UpdateAllPlayers") {
      positions = message.positions;
      if (player && player.player_id) {
        updateAllPlayers(message.positions, scene, maze, player.player_id);
      }
    } else if (message.type === "mazeUpdate") {
      console.log("Maze updated:", message.maze);    } else if (message.type === "boo") {
      console.log("Boo message received:", message);
      
      
      if (message.targetId === player.player_id) {
        alert("Boo! You have been scared!");
        const random_coord_x = Math.floor(Math.random() * maze[0].length);
        const random_coord_y = Math.floor(Math.random() * maze.length);
        player.moveTo(random_coord_x, random_coord_y);
        sendMessage({
        type: "playerMove",
        player_id: player.player_id,
        x: random_coord_x,
        y: random_coord_y,
        facing: player.facingTowards
      });
        
      }
    } else if (message.type === "message") {
      // Affiche le message dans le chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const div = document.createElement('div');
        div.innerHTML = `<b>${message.from} :</b> ${message.text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } else {
      console.log("Message reçu:", message);
    }
  });
}

// Ajout de l'envoi de message via le chat
window.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault(); //Empeche le rechargement de la page
      const text = chatInput.value.trim(); //enleve les espaces au debut et a la fin
      if (text.length > 0) {
        sendMessage({ type: 'message', text });
        chatInput.value = '';
      }
    });
  }
});

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
  // Commenté car selon votre code, cette fonction n'est pas encore pleinement implémentée
  // if (player) {
  //   updateLight(player.x, player.y, cellSize, scene);
  // }
}

window.addEventListener('beforeunload', () => {
  if (player && player.player_id) {
    sendMessage({
      type: "playerDisconnect",
      player_id: player.player_id
    });
  }
});

console.log("Current cookies:", document.cookie);
animate();