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

async function initializePlayer() {
  try {
    const positionResponse = await fetch('https://localhost:3000/getPlayerPosition', {
      method: 'GET',
      credentials: 'include'
    });
    
    const positionData = await positionResponse.json();
    
    if (positionData.exists) {
      console.log("Joueur existant trouvé:", positionData);
      player = new Player(positionData.x, positionData.y, scene, cellSize, maze);
      player.player_id = positionData.player_id;
      player.facingTowards = positionData.facing || "down";
    } else {
      const random_coord_x = Math.floor(Math.random() * maze[0].length);
      const random_coord_y = Math.floor(Math.random() * maze.length);
      
      const createResponse = await fetch('https://localhost:3000/createNewPlayer', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          x: random_coord_x,
          y: random_coord_y
        })
      });
      
      const createData = await createResponse.json();
      console.log("Nouveau joueur créé:", createData);
      
      player = new Player(random_coord_x, random_coord_y, scene, cellSize, maze);
      player.player_id = createData.player_id;
    }
    
    player.createMesh();
    setupKeyboardControls();
    
  } catch (error) {
    console.error("Erreur d'initialisation du joueur:", error);
    goToLogin();
  }
}

function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    let newX = player.x;
    let newY = player.y;
    let directionChanged = false;
    let oldDirection = player.facingTowards;

    switch (e.key) {
      case 'z':
        player.faceTowards(Direction.UP);
        directionChanged = (oldDirection !== Direction.UP);
        if (player.canMove("up", positions)){
          newY--;
        } 
        break;
      case 's':
        player.faceTowards(Direction.DOWN);
        directionChanged = (oldDirection !== Direction.DOWN);
        if (player.canMove("down", positions)) {
          newY++;
        }
        break;
      case 'q':
        player.faceTowards(Direction.LEFT);
        directionChanged = (oldDirection !== Direction.LEFT);
        if (player.canMove("left", positions)) {
          newX--;
        }
        break;
      case 'd':
        player.faceTowards(Direction.RIGHT);
        directionChanged = (oldDirection !== Direction.RIGHT);
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
        return; // Sortir de la fonction pour éviter les autres traitements
    }

    // Si le joueur a bougé, envoyer la mise à jour de position
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

    else if (directionChanged) {
      console.log("Player direction changed to:", player.facingTowards);
      sendMessage({
        type: "playerDirectionChange",
        player_id: player.player_id,
        x: player.x,
        y: player.y,
        facing: player.facingTowards
      });
      console.log("Player direction sent to server:", player.facingTowards);
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
  if (!response.ok) throw new Error("Maze fetch failed");
  return response.json();
})
.then(result => {
  maze = result.maze;
  console.log("Maze fetched:", maze);
  buildMaze(maze, scene, cellSize);
  
  return initializePlayer(); 
})
.then(() => {
  setupWebSocketConnection();
  animate();
})
.catch(error => {
  console.error("Initialization error:", error);
  goToLogin();
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

}

window.addEventListener('beforeunload', () => {
  if (player && player.player_id) {
    sendMessage({
      type: "playerDisconnect",
      player_id: player.player_id
    });
  }
});

animate();


