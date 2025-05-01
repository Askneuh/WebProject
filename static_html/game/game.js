import { initScene, updateAllPlayers } from './scene.js';
import { generateMaze, buildMaze, getMaze } from './buildMaze.js';
import { Player, Direction } from './player.js';
import { connectWebSocket, sendMessage } from '../scripts/socket.js';


const { scene, camera, renderer, controls } = initScene();

const cellSize = 10;
const mazeSize = 20;
const maze = generateMaze(mazeSize, mazeSize);
buildMaze(maze, scene, cellSize);

sendMessage({
  type: "requestMaze",
  auth_token: localStorage.getItem('auth_token')
});


connectWebSocket((message) => {
  if (message.type === "UpdateAllPlayers") {
    console.log("Positions des joueurs reçues:", message.positions);
    console.log(player.player_id);
    updateAllPlayers(message.positions, scene, maze, player.player_id);
  } else if (message.type === "mazeUpdate") {
    console.log("Maze updated:", message.maze);
  } else {
    console.log("Message reçu:", message);
  }
});


const player = new Player(0, 0, scene, cellSize, maze);
player.createMesh();
player.createOnServer();

document.addEventListener('keydown', (e) => {
    let newX = player.x;
    let newY = player.y;

    switch (e.key) {
        case 'z':
            if (player.canMove("up")){
              newY--;
              player.faceTowards(Direction.UP);
            } 
            break;
        case 's':
            if (player.canMove("down")) {
              newY++;
              player.faceTowards(Direction.DOWN);
            }
            break;
        case 'q':
            if (player.canMove("left")) {
              newX--;
              player.faceTowards(Direction.LEFT);
            }
            break;
        case 'd':
            if (player.canMove("right")) {
              newX++;
              player.faceTowards(Direction.RIGHT);
            }
            break;
    }

    if (newX !== player.x || newY !== player.y) {
        player.moveTo(newX, newY);
        sendMessage({
            type: "playerMove",
            player_id: player.player_id,
            x: newX,
            y: newY,
            auth_token: localStorage.getItem('auth_token')
        });
    }
});

function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('beforeunload', () => {
  sendMessage({
    type: "playerDisconnect",
    player_id: player.player_id,
    auth_token: localStorage.getItem('auth_token')
  });
});

animate();
