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

export function buildMaze(grid, scene, cellSize = 2) {
    const wallHeight = 4;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, 0.5);

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