import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { MapControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/MapControls.js';
import { Player } from './player.js';

const players = [];
export function initScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2.5;
    controls.minPolarAngle = Math.PI / 6;

    const light = new THREE.AmbientLight(0xffffff);
    scene.add(light);

    return { scene, camera, renderer, controls };
}   

export function updateAllPlayers(positions, scene, grid, user_id) {
    // Si positions est vide, ne rien faire
    if (!positions || positions.length === 0) return scene;
    
    // Mettre à jour les joueurs existants et ajouter les nouveaux
    positions.forEach((position) => {
        let player = players.find(player => player.player_id === position.id);
        const currentPlayer = players.find(player => player.player_id === user_id);
        if (player) {
            // Mettre à jour la position du joueur existant
            player.moveTo(position.x, position.y);
            // Mettre à jour la visibilité selon le champ de vision
            if (currentPlayer && player.player_id !== user_id) {
                const { x: currentX, y: currentY, faceToward } = currentPlayer;
                console.log('[DEBUG] player', position.id, 'at', position.x, position.y, '| current:', currentX, currentY, 'face:', currentPlayer.facingTowards);
                const isInFieldOfView = (() => {
                    switch (currentPlayer.facingTowards) {
                        case 'up':
                            return position.x === currentX && position.y > currentY;
                        case 'down':
                            return position.x === currentX && position.y < currentY;
                        case 'right':
                            return position.y === currentY && position.x > currentX;
                        case 'left':
                            return position.y === currentY && position.x < currentX;
                        default:
                            return false;
                    }
                })();
                console.log('[DEBUG] isInFieldOfView for player', position.id, ':', isInFieldOfView);
                player.mesh.visible = isInFieldOfView;
            }
        } 
        else {
            // Créer un nouveau joueur
            const newPlayer = new Player(position.x, position.y, scene, 10, grid);
            newPlayer.createMesh();

            // Vérifier si le joueur est dans le champ de vision
            if (currentPlayer) {
                const { x: currentX, y: currentY, faceToward } = currentPlayer;
                console.log('[DEBUG] (new) player', position.id, 'at', position.x, position.y, '| current:', currentX, currentY, 'face:', faceToward);
                // Déterminer les coordonnées dans le champ de vision
                const isInFieldOfView = (() => {
                    switch (faceToward) {
                        case 'up':
                            return position.x === currentX && position.y > currentY;
                        case 'down':
                            return position.x === currentX && position.y < currentY;
                        case 'right':
                            return position.y === currentY && position.x > currentX;
                        case 'left':
                            return position.y === currentY && position.x < currentX;
                        default:
                            return false;
                    }
                })();
                console.log('[DEBUG] (new) isInFieldOfView for player', position.id, ':', isInFieldOfView);
                // Rendre le joueur visible uniquement s'il est dans le champ de vision
                newPlayer.mesh.visible = isInFieldOfView;
            }
            
            // Définir la couleur selon qu'il s'agit du joueur actuel ou d'un autre joueur
            if (position.id !== user_id) {
                newPlayer.mesh.material.color.set(0xff0000); // Couleur rouge pour les autres joueurs
            }
            
            newPlayer.player_id = position.id;
            players.push(newPlayer);
        }
    });
    
    // Vérifier et supprimer les joueurs qui ne sont plus présents
    for (let i = players.length - 1; i >= 0; i--) {
        const player = players[i];
        if (!positions.some(pos => pos.id === player.player_id)) {
            scene.remove(player.mesh);
            players.splice(i, 1);
        } else if (player.player_id === user_id) {
            // Cacher le modèle du joueur actuel (on utilise la caméra à la place)
            player.mesh.visible = false;
        } // Ne rien faire ici pour les autres joueurs, la visibilité est déjà gérée plus haut
    }
    
    return scene;
}

export function updateLight(player_x, player_y, cellSize, scene) {
    
  
    // Add a new point light at the player's position
    const light = new THREE.PointLight(0x0000ff, 1, cellSize * 5); // Adjust intensity and distance as needed
    light.position.set(player_x * cellSize + cellSize / 2, 5, player_y * cellSize + cellSize / 2);
    scene.add(light);
  }