import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { MapControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/MapControls.js';
import { Player } from './player.js';

const players = [];
export function initScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 50);
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
    positions.forEach((position) => {
        const player = players.find(player => player.player_id === position.id);
        if (player) {
            player.moveTo(position.x, position.y);
        } 
        else {
            const player = new Player(position.x, position.y, scene, 10, grid);
            player.createMesh();
            if (position.id !== user_id) {
                player.mesh.material.color.set(0xff0000); // Change the color to red
            }
            
            players.push(player);
            player.player_id = position.id;
        }
        players.forEach((player) => {
            if (!positions.some(pos => pos.id === player.player_id)) {
                scene.remove(player.mesh);
                const index = players.indexOf(player);
                if (index > -1) {
                    players.splice(index, 1);
                }
            }
        })
    });
    return scene;
}