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
        fetch("http://localhost:3000/boo", {
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
    }
  });
}

fetch("http://localhost:3000/getMaze", {
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
      console.log("Positions des joueurs reçues:", message.positions);
      positions = message.positions;
      if (player && player.player_id) {
        console.log(player.player_id);
        updateAllPlayers(message.positions, scene, maze, player.player_id);
      }
    } else if (message.type === "mazeUpdate") {
      console.log("Maze updated:", message.maze);
    } else if (message.type === "boo") {
      console.log("Boo message received:", message);
      //const booSound = new Audio('/static_html/sounds/boo.mp3');
      //booSound.play();
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
    }
    else {
      console.log("Message reçu:", message);
    }
  });
}

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