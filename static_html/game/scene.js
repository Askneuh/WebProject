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
    const currentPlayer = players.find(player => player.player_id === user_id);

    // Mettre à jour les joueurs existants et ajouter les nouveaux
    positions.forEach((position) => {
        let player = players.find(player => player.player_id === position.id);
        // Harmonisation : utiliser 'facing' partout (backend et frontend)
        const facing = position.facing || position.facingTowards || "down";
        if (player) {
            // Mettre à jour la position du joueur existant
            player.moveTo(position.x, position.y);
            player.facingTowards = facing;
            player.faceTowards(facing);

            // Mettre à jour la visibilité selon le champ de vision
            if (currentPlayer && player.player_id !== user_id) {       
                player.mesh.visible = isInStraightLineOfSight(currentPlayer, player) && !isWallBetween(currentPlayer, player, grid);
            }
        }
        else {
            // Créer un nouveau joueur
            const newPlayer = new Player(position.x, position.y, scene, 10, grid, facing);
            newPlayer.createMesh();
            newPlayer.faceTowards(facing);

            // Définir la couleur selon qu'il s'agit du joueur actuel ou d'un autre joueur
            if (position.id !== user_id) {
                newPlayer.mesh.material.color.set(0xff0000); // Couleur rouge pour les autres joueurs
            }

            newPlayer.player_id = position.id;
            players.push(newPlayer);

            // Vérifier la visibilité pour les nouveaux joueurs
            if (currentPlayer) {
                player.mesh.visible = isInStraightLineOfSight(currentPlayer, player) && !isWallBetween(currentPlayer, player, grid);
            }
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
        }
    }

    return scene;
}

// Fonction pour vérifier si un joueur est dans la ligne de vue directe
function isInStraightLineOfSight(viewer, target) {
    
    // Vérifier si la cible est directement devant le joueur
    switch (viewer.facingTowards) {
        case 'up':
            return (target.y < viewer.y && target.x === viewer.x);
        case 'down':
            return (target.y > viewer.y && target.x === viewer.x);
        case 'right':
            return (target.x > viewer.x && target.y === viewer.y);
        case 'left':
            return (target.x < viewer.x && target.y === viewer.y);
        default:
            return false;
    }
}

export function updateLight(player_x, player_y, cellSize, scene) {
    
  
    const light = new THREE.PointLight(0x0000ff, 1, cellSize * 5); 
    light.position.set(player_x * cellSize + cellSize / 2, 5, player_y * cellSize + cellSize / 2);
    scene.add(light);
  }

function isWallBetween(player, target, maze) {
    // maze est un tableau 2D de Cellules, chaque cellule a .walls [top, right, bottom, left]
    let x = player.x;
    let y = player.y;

    if (player.x === target.x) {
        // Mouvement vertical
        const step = target.y > player.y ? 1 : -1;
        for (let i = y; i !== target.y; i += step) {
            const cell = maze[i][x];
            if (step === 1 && cell.walls[2]) return true; // Mur en bas
            if (step === -1 && cell.walls[0]) return true; // Mur en haut
        }
    } else if (player.y === target.y) {
        // Mouvement horizontal
        const step = target.x > player.x ? 1 : -1;
        for (let i = x; i !== target.x; i += step) {
            const cell = maze[y][i];
            if (step === 1 && cell.walls[1]) return true; // Mur à droite
            if (step === -1 && cell.walls[3]) return true; // Mur à gauche
        }
    } else {
        // Pas sur la même ligne ou colonne
        return true;
    }
    return false;
}