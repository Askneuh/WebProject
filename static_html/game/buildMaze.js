import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.visited = false;
        this.walls = [true, true, true, true]; // [top, right, bottom, left]
    }
}

export function generateMaze(cols, rows) {
    const grid = [];
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
            row.push(new Cell(x, y));
        }
        grid.push(row);
    }

    const stack = [];
    const start = grid[0][0];
    start.visited = true;
    stack.push(start);

    function getNeighbour(cell) {
        const { x, y } = cell;
        const neighbors = [];

        if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
        if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);
        if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
        if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);

        if (neighbors.length > 0) {
            return neighbors[Math.floor(Math.random() * neighbors.length)];
        }
        return null;
    }

    function removeWalls(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        if (dx === 1) { a.walls[1] = false; b.walls[3] = false; }
        else if (dx === -1) { a.walls[3] = false; b.walls[1] = false; }
        if (dy === 1) { a.walls[2] = false; b.walls[0] = false; }
        else if (dy === -1) { a.walls[0] = false; b.walls[2] = false; }
    }

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const next = getNeighbour(current);

        if (next) {
            next.visited = true;
            stack.push(next);
            removeWalls(current, next);
        } else {
            stack.pop();
        }
    }

    return grid;
}

// Chargement des textures
let wallTexture = null;
let floorTexture = null;

export async function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    // Chargement de la texture pour les murs
    wallTexture = await new Promise((resolve) => {
        textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_bump.jpg',
            texture => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                resolve(texture);
            }
        );
    });
    
    // Chargement de la texture pour le sol
    floorTexture = await new Promise((resolve) => {
        textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_diffuse.jpg',
            texture => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(20, 20);
                resolve(texture);
            }
        );
    });
    
    return { wallTexture, floorTexture };
}

export function buildMaze(grid, scene, cellSize = 2) {
    // Création du sol
    if (floorTexture) {
        const floorGeometry = new THREE.PlaneGeometry(cellSize * grid[0].length, cellSize * grid.length);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(
            (grid[0].length * cellSize) / 2 - cellSize / 2,
            0,
            (grid.length * cellSize) / 2 - cellSize / 2
        );
        scene.add(floor);
    }

    const wallHeight = 4;
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        map: wallTexture,
        roughness: 0.7,
        metalness: 0.2,
        bumpMap: wallTexture,
        bumpScale: 0.3
    });
    const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, 0.5);

    // Ajouter un effet de lumière ambiante sombre pour créer une ambiance
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    // Ajouter des lumières ponctuelles pour créer une ambiance de jeu de peur
    const pointLight1 = new THREE.PointLight(0x4466ff, 1, 50);
    pointLight1.position.set(cellSize * 5, wallHeight * 2, cellSize * 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6644, 1, 50);
    pointLight2.position.set(cellSize * 15, wallHeight * 2, cellSize * 15);
    scene.add(pointLight2);

    grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            const cx = x * cellSize;
            const cy = y * cellSize;

            if (cell.walls[0]) {
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(cx, wallHeight / 2, cy - cellSize / 2);
                scene.add(wall);
            }
            if (cell.walls[1]) {
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.rotation.y = Math.PI / 2;
                wall.position.set(cx + cellSize / 2, wallHeight / 2, cy);
                scene.add(wall);
            }
            if (cell.walls[2]) {
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(cx, wallHeight / 2, cy + cellSize / 2);
                scene.add(wall);
            }
            if (cell.walls[3]) {
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.rotation.y = Math.PI / 2;
                wall.position.set(cx - cellSize / 2, wallHeight / 2, cy);
                scene.add(wall);
            }
        });
    });
    return scene;
}

const cellSize = 10;
const mazeSize = 20;
const maze = generateMaze(mazeSize, mazeSize);
export function getMaze() {
    return maze;    
}