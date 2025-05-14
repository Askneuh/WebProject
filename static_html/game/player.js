import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Player {
    constructor(x, y, scene, cellSize, grid, facingTowards = "down") {
        this.x = x;
        this.y = y;
        this.scene = scene;
        this.cellSize = cellSize;
        this.grid = grid;
        this.mesh = null;
        this.player_id = null;
        this.facingTowards = facingTowards; // Placeholder for face direction
    }

    createOnServer() {
        fetch(`http://localhost:3000/createNewPlayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // This is already present but needs proper CORS setup
            body: JSON.stringify({ x: this.x, y: this.y })
        }).then(res => {
            if (!res.ok) {
                // Add more detailed error logging
                console.error('Response details:', res.status, res.statusText);
                return res.text().then(text => { throw new Error(text) });
            }
            return res.json();
        }).then(data => {
            this.player_id = data.player_id;
            console.log("Player created:", data);
        }).catch(error => {
            console.error("Error creating player on server:", error);
        });
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(this.cellSize * 0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.x * this.cellSize, this.cellSize * 0.3, this.y * this.cellSize);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        const arrowGeometry = new THREE.ConeGeometry(this.cellSize * 0.1, this.cellSize * 0.3, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.arrow.position.set(0, this.cellSize * 0.6, 0);
        this.arrow.rotation.x = Math.PI / 2;
        this.mesh.add(this.arrow);
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
        this.mesh.position.set(x * this.cellSize, this.cellSize * 0.3, y * this.cellSize);
    }

    canMove(direction, otherPlayers = []) {
        const cell = this.grid[this.y][this.x];
        let targetX = this.x;
        let targetY = this.y;
        if (direction === "up") {
            if (this.y <= 0 || this.grid[this.y - 1][this.x].walls[2]) return false;
            targetY--;
        } else if (direction === "down") {
            if (this.y >= this.grid.length - 1 || this.grid[this.y + 1][this.x].walls[0]) return false;
            targetY++;
        } else if (direction === "left") {
            if (this.x <= 0 || this.grid[this.y][this.x - 1].walls[1]) return false;
            targetX--;
        } else if (direction === "right") {
            if (this.x >= this.grid[0].length - 1 || this.grid[this.y][this.x + 1].walls[3]) return false;
            targetX++;
        } else {
            return false;
        }
        // Collision avec les autres joueurs
        for (const p of otherPlayers) {
            if (p.x === targetX && p.y === targetY) {
                return false;
            }
        }
        return true;
    }

    faceTowards(direction) {
        this.facingTowards = direction;
        switch (direction) {
            case Direction.UP:
                this.mesh.rotation.y = Math.PI;
                break;
            case Direction.DOWN:
                this.mesh.rotation.y = 0;
                break;
            case Direction.LEFT:
                this.mesh.rotation.y = -Math.PI / 2;
                break;
            case Direction.RIGHT:
                this.mesh.rotation.y = Math.PI / 2;
                break;
        }
        return this.facingTowards;
    }
}

export const Direction = Object.freeze({
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right"
});