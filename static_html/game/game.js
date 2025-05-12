import { initScene, updateAllPlayers, updateLight } from './scene.js';
import { generateMaze, buildMaze, getMaze } from './buildMaze.js';
import { Player, Direction } from './player.js';
import { connectWebSocket, sendMessage, goToLogin} from '../scripts/socket.js';
import { verifySession } from '../scripts/index.js';
verifySession();

const { scene, camera, renderer, controls } = initScene();

const cellSize = 10;
const mazeSize = 20;
const maze = generateMaze(mazeSize, mazeSize);
buildMaze(maze, scene, cellSize);




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
              player.facingTowards = "up";
            } 
            break;
        case 's':
            if (player.canMove("down")) {
              newY++;
              player.faceTowards(Direction.DOWN);
              player.facingTowards = "down";
            }
            break;
        case 'q':
            if (player.canMove("left")) {
              newX--;
              player.faceTowards(Direction.LEFT);
              player.facingTowards = "left";
            }
            break;
        case 'd':
            if (player.canMove("right")) {
              newX++;
              player.faceTowards(Direction.RIGHT);
              player.facingTowards = "right";
            }
            break;
            /*
            case 'e':
            fetch("http://localhost:3000/BooCheck", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ x: player.x, y: player.y, direction: player.facingTowards})
            })
            .then(response => {
                if (response.ok) {
                    console.log("BooCheck successful");
                    //a faire : incrémenter le score du joueur, notifier au joueur attrapé qu'il s'est fait avoir
                    //et le faire respawn
                } else {
                    console.error("BooCheck failed:", response.statusText);
                    //pour l'instant je sais pas
                }
            })
                */
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

function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    //updateLight(player.x, player.y, cellSize, scene);
}




window.addEventListener('beforeunload', () => {
  sendMessage({
    type: "playerDisconnect",
    player_id: player.player_id
  });
});
console.log("Current cookies:", document.cookie);
animate();
