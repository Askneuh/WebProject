import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Player {
    constructor(x, y, scene, cellSize, grid) {
        this.x = x;
        this.y = y;
        this.scene = scene;
        this.cellSize = cellSize;
        this.grid = grid;
        this.mesh = null;
        this.player_id = null;
        this.facingTowards = null; // Placeholder for face direction
    }

    createOnServer() {
        fetch(`http://localhost:3000/createNewPlayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ x: this.x, y: this.y })
        }).then(res => res.json()).then(data => {
            this.player_id = data.player_id;
            console.log("Player created:", data);
        }).catch(console.error);
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

    canMove(direction) {
        const cell = this.grid[this.y][this.x];
        if (direction === "up") return this.y > 0 && !this.grid[this.y - 1][this.x].walls[2];
        if (direction === "down") return this.y < this.grid.length - 1 && !this.grid[this.y + 1][this.x].walls[0];
        if (direction === "left") return this.x > 0 && !this.grid[this.y][this.x - 1].walls[1];
        if (direction === "right") return this.x < this.grid[0].length - 1 && !this.grid[this.y][this.x + 1].walls[3];
        return false;
    }
    faceTowards(direction) {
        this.facingTowards = direction;
        switch (direction) {
            case Direction.UP:
                this.mesh.rotation.y = Math.PI / 2;
                break;
            case Direction.DOWN:
                this.mesh.rotation.y = -Math.PI / 2;
                break;
            case Direction.LEFT:
                this.mesh.rotation.y = Math.PI;
                break;
            case Direction.RIGHT:
                this.mesh.rotation.y = 0;
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