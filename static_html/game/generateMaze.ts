export class Cell {
  x: number;
  y: number;
  visited: boolean;
  walls: boolean[];
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.visited = false;
    this.walls = [true, true, true, true]; // [top, right, bottom, left]
  }
}

export function generateMaze(cols: number, rows: number): Cell[][] {
  // Fonction de génération de labyrinthe aléatoire classique
  const grid: Cell[][] = Array(rows).fill(0).map((_, y) => 
    Array(cols).fill(0).map((_, x) => new Cell(x, y))
  );

  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  function getNeighbour(cell: Cell): Cell | null {
    const { x, y } = cell;
    const neighbors: Cell[] = [];

    if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
    if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);
    if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);

    if (neighbors.length > 0) {
      return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    return null;
  }

  function removeWalls(a: Cell, b: Cell): void {
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

export function generateMilitaryBunker(): Cell[][] {
    const COLS = 20;
    const ROWS = 20;
    const grid: Cell[][] = Array(ROWS).fill(0).map((_, y) => 
        Array(COLS).fill(0).map((_, x) => new Cell(x, y))
    );

    // D'abord, on crée un labyrinthe de base pour s'assurer que tout est connecté
    const baseMaze = generateMaze(COLS, ROWS);
    
    // Couloirs centraux en croix - ouverture large
    for (let i = 8; i < 12; i++) {
        // Couloir horizontal
        for (let j = 0; j < COLS; j++) {
            baseMaze[i][j].walls[0] = false; // Ouverture haut
            baseMaze[i][j].walls[2] = false; // Ouverture bas
            if (i > 8) baseMaze[i-1][j].walls[2] = false;
            if (i < 11) baseMaze[i+1][j].walls[0] = false;
        }
        
        // Couloir vertical
        for (let j = 0; j < ROWS; j++) {
            baseMaze[j][i].walls[1] = false; // Ouverture droite
            baseMaze[j][i].walls[3] = false; // Ouverture gauche
            if (i > 8) baseMaze[j][i-1].walls[1] = false;
            if (i < 11) baseMaze[j][i+1].walls[3] = false;
        }
    }
    
    // 4 bunkers aux coins (zones plus ouvertes)
    const bunkerRegions = [
        {x1: 1, y1: 1, x2: 6, y2: 6},     // NW
        {x1: 13, y1: 1, x2: 18, y2: 6},   // NE
        {x1: 1, y1: 13, x2: 6, y2: 18},   // SW
        {x1: 13, y1: 13, x2: 18, y2: 18}  // SE
    ];
    
    bunkerRegions.forEach(region => {
        // Créer des zones ouvertes pour les bunkers
        for (let y = region.y1; y <= region.y2; y++) {
            for (let x = region.x1; x <= region.x2; x++) {
                // Ouvrir l'intérieur du bunker
                if (x > region.x1) baseMaze[y][x].walls[3] = false;
                if (x < region.x2) baseMaze[y][x].walls[1] = false;
                if (y > region.y1) baseMaze[y][x].walls[0] = false;
                if (y < region.y2) baseMaze[y][x].walls[2] = false;
                
                // Garder quelques murs stratégiques aux bords du bunker
                if ((x === region.x1 || x === region.x2 || y === region.y1 || y === region.y2) && 
                    Math.random() < 0.5) {
                    // Garder un mur aléatoire pour créer des obstacles stratégiques
                    const wallIndex = Math.floor(Math.random() * 4);
                    baseMaze[y][x].walls[wallIndex] = true;
                }
            }
        }
        
        // Créer une entrée vers le couloir central
        const midY = Math.floor((region.y1 + region.y2) / 2);
        const midX = Math.floor((region.x1 + region.x2) / 2);
        
        if (region.x1 < 7) {  // Bunkers ouest
            for (let x = region.x2; x < 8; x++) {
                baseMaze[midY][x].walls[0] = false;
                baseMaze[midY][x].walls[2] = false;
                baseMaze[midY-1][x].walls[2] = false;
                baseMaze[midY+1][x].walls[0] = false;
            }
        } else {  // Bunkers est
            for (let x = region.x1; x > 11; x--) {
                baseMaze[midY][x].walls[0] = false;
                baseMaze[midY][x].walls[2] = false;
                baseMaze[midY-1][x].walls[2] = false;
                baseMaze[midY+1][x].walls[0] = false;
            }
        }
        
        if (region.y1 < 7) {  // Bunkers nord
            for (let y = region.y2; y < 8; y++) {
                baseMaze[y][midX].walls[1] = false;
                baseMaze[y][midX].walls[3] = false;
                baseMaze[y][midX-1].walls[1] = false;
                baseMaze[y][midX+1].walls[3] = false;
            }
        } else {  // Bunkers sud
            for (let y = region.y1; y > 11; y--) {
                baseMaze[y][midX].walls[1] = false;
                baseMaze[y][midX].walls[3] = false;
                baseMaze[y][midX-1].walls[1] = false;
                baseMaze[y][midX+1].walls[3] = false;
            }
        }
    });

    return baseMaze;
}

export function generateSecretLab(): Cell[][] {
    const COLS = 20;
    const ROWS = 20;
    
    // Commencer avec un labyrinthe aléatoire de base
    const grid = generateMaze(COLS, ROWS);
    
    // Ouvrir des salles circulaires à des positions stratégiques
    const createLabRoom = (centerX: number, centerY: number, radius: number) => {
        for (let y = Math.max(0, centerY - radius); y <= Math.min(ROWS - 1, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x <= Math.min(COLS - 1, centerX + radius); x++) {
                const dist = Math.sqrt((x-centerX)**2 + (y-centerY)**2);
                if (dist <= radius) {
                    // Éliminer les murs intérieurs
                    if (x < COLS - 1) grid[y][x].walls[1] = false;
                    if (x > 0) grid[y][x].walls[3] = false;
                    if (y < ROWS - 1) grid[y][x].walls[2] = false;
                    if (y > 0) grid[y][x].walls[0] = false;
                    
                    // S'assurer que la cellule adjacente a aussi son mur ouvert
                    if (x < COLS - 1) grid[y][x+1].walls[3] = false;
                    if (x > 0) grid[y][x-1].walls[1] = false;
                    if (y < ROWS - 1) grid[y+1][x].walls[0] = false;
                    if (y > 0) grid[y-1][x].walls[2] = false;
                }
            }
        }
    };

    // Créer des salles circulaires de différentes tailles
    createLabRoom(5, 5, 2);      // Salle NW
    createLabRoom(15, 5, 2);     // Salle NE
    createLabRoom(10, 10, 3);    // Grande salle centrale
    createLabRoom(5, 15, 2);     // Salle SW
    createLabRoom(15, 15, 2);    // Salle SE
    
    // Créer un corridor ADN central qui connecte le tout - moins de murs
    for (let y = 0; y < ROWS; y++) {
        // Utiliser une fonction sinusoïdale pour créer le motif d'ADN
        const amplitude = 3; // Amplitude de l'oscillation
        const wavelength = 15; // Longueur d'onde
        
        // Premier brin de l'hélice
        const x1 = Math.floor(COLS/2 + amplitude * Math.sin(y * 2 * Math.PI / wavelength));
        if (x1 >= 0 && x1 < COLS) {
            // Ouvrir un couloir de 2 cellules de large
            grid[y][x1].walls[1] = false;
            grid[y][x1].walls[3] = false;
            if (x1 < COLS - 1) grid[y][x1+1].walls[3] = false;
            if (x1 > 0) grid[y][x1-1].walls[1] = false;
        }
        
        // Second brin parallèle
        const x2 = Math.floor(COLS/2 + amplitude * Math.sin((y + wavelength/2) * 2 * Math.PI / wavelength));
        if (x2 >= 0 && x2 < COLS) {
            grid[y][x2].walls[1] = false;
            grid[y][x2].walls[3] = false;
            if (x2 < COLS - 1) grid[y][x2+1].walls[3] = false;
            if (x2 > 0) grid[y][x2-1].walls[1] = false;
        }
        
        // Connections horizontales entre les deux brins
        if (y % 5 === 0 && Math.min(x1, x2) >= 0 && Math.max(x1, x2) < COLS) {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            for (let x = minX; x <= maxX; x++) {
                grid[y][x].walls[0] = false;
                grid[y][x].walls[2] = false;
                if (y > 0) grid[y-1][x].walls[2] = false;
                if (y < ROWS - 1) grid[y+1][x].walls[0] = false;
            }
        }
    }
    
    return grid;
}

export function generateMayanTemple(): Cell[][] {
    const COLS = 20;
    const ROWS = 20;
    
    // Commencer avec un labyrinthe basique
    const grid = generateMaze(COLS, ROWS);
    
    // Structure pyramidale - ouvrir des zones en niveaux concentriques
    for (let level = 0; level < 4; level++) {
        const size = 18 - level * 4;  // Taille décroissante pour chaque niveau
        const offset = Math.floor((20 - size) / 2);  // Centrer la structure
        
        // Créer un chemin circulaire à chaque niveau
        for (let y = offset; y < offset + size; y++) {
            for (let x = offset; x < offset + size; x++) {
                // Traiter uniquement le périmètre du niveau
                if (y === offset || y === offset + size - 1 || x === offset || x === offset + size - 1) {
                    // Ouvrir les murs pour créer un chemin continu
                    if (x < COLS - 1 && y === offset) {
                        grid[y][x].walls[1] = false; // Bord supérieur
                        grid[y][x+1].walls[3] = false;
                    }
                    if (x < COLS - 1 && y === offset + size - 1) {
                        grid[y][x].walls[1] = false; // Bord inférieur
                        grid[y][x+1].walls[3] = false;
                    }
                    if (y < ROWS - 1 && x === offset) {
                        grid[y][x].walls[2] = false; // Bord gauche
                        grid[y+1][x].walls[0] = false;
                    }
                    if (y < ROWS - 1 && x === offset + size - 1) {
                        grid[y][x].walls[2] = false; // Bord droit
                        grid[y+1][x].walls[0] = false;
                    }
                }
            }
        }
        
        // Créer des passages entre les niveaux de la pyramide
        if (level < 3) {
            // Position des passages (4 directions)
            const positions = [
                { x: offset + size / 2, y: offset }, // Passage nord
                { x: offset + size - 1, y: offset + size / 2 }, // Passage est
                { x: offset + size / 2, y: offset + size - 1 }, // Passage sud
                { x: offset, y: offset + size / 2 } // Passage ouest
            ];
            
            for (const pos of positions) {
                const x = Math.floor(pos.x);
                const y = Math.floor(pos.y);
                
                if (x === offset) { // Bord gauche
                    grid[y][x].walls[3] = false;
                    if (x > 0) grid[y][x-1].walls[1] = false;
                } else if (x === offset + size - 1) { // Bord droit
                    grid[y][x].walls[1] = false;
                    if (x < COLS - 1) grid[y][x+1].walls[3] = false;
                } else if (y === offset) { // Bord supérieur
                    grid[y][x].walls[0] = false;
                    if (y > 0) grid[y-1][x].walls[2] = false;
                } else if (y === offset + size - 1) { // Bord inférieur
                    grid[y][x].walls[2] = false;
                    if (y < ROWS - 1) grid[y+1][x].walls[0] = false;
                }
            }
        }
    }
    
    // Autel central (zone de contrôle)
    const centerX = Math.floor(COLS / 2) - 1;
    const centerY = Math.floor(ROWS / 2) - 1;
    
    // Créer une petite zone fermée pour l'autel (2x2)
    for (let y = centerY; y < centerY + 2; y++) {
        for (let x = centerX; x < centerX + 2; x++) {
            // Réinstaller les murs pour l'autel
            grid[y][x].walls = [true, true, true, true];
        }
    }
    
    // Créer une entrée à l'autel
    grid[centerY][centerX].walls[0] = false;
    if (centerY > 0) grid[centerY-1][centerX].walls[2] = false;
    
    // Escaliers rituels - des passages directs vers le centre
    const createStairway = (startX: number, startY: number, dirX: number, dirY: number) => {
        let x = startX;
        let y = startY;
        
        while (x >= 0 && x < COLS && y >= 0 && y < ROWS && 
               (Math.abs(x - centerX) > 2 || Math.abs(y - centerY) > 2)) {
            // Ouvrir le chemin en avançant vers le centre
            if (dirX > 0) {
                grid[y][x].walls[1] = false;
                if (x < COLS - 1) grid[y][x+1].walls[3] = false;
            } else if (dirX < 0) {
                grid[y][x].walls[3] = false;
                if (x > 0) grid[y][x-1].walls[1] = false;
            }
            
            if (dirY > 0) {
                grid[y][x].walls[2] = false;
                if (y < ROWS - 1) grid[y+1][x].walls[0] = false;
            } else if (dirY < 0) {
                grid[y][x].walls[0] = false;
                if (y > 0) grid[y-1][x].walls[2] = false;
            }
            
            x += dirX;
            y += dirY;
        }
    };
    
    // Quatre escaliers des coins vers le centre
    createStairway(0, 0, 1, 1);       // NW → Centre
    createStairway(COLS-1, 0, -1, 1);  // NE → Centre
    createStairway(0, ROWS-1, 1, -1);  // SW → Centre
    createStairway(COLS-1, ROWS-1, -1, -1); // SE → Centre
    
    return grid;
}

export function generateSpaceStation(): Cell[][] {
    const COLS = 20;
    const ROWS = 20;
    // Commencer avec une carte vide (pas de labyrinthe)
    const grid: Cell[][] = Array(ROWS).fill(0).map((_, y) => 
        Array(COLS).fill(0).map((_, x) => {
            const cell = new Cell(x, y);
            // Par défaut, tous les murs sont fermés
            return cell;
        })
    );
    
    // Centre de la carte
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    
    // Anneau extérieur - un cercle de cellules ouvertes
    const outerRadius = 8;
    const innerRadius = 7;
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const dist = Math.sqrt((x - centerX)**2 + (y - centerY)**2);
            
            // Créer l'anneau avec une petite épaisseur
            if (dist >= innerRadius && dist <= outerRadius) {
                // Ouvrir les cellules adjacentes dans l'anneau
                const angle = Math.atan2(y - centerY, x - centerX);
                
                // Calculer les coordonnées des cellules voisines sur l'anneau
                const nextAngle = angle + 0.2;
                const prevAngle = angle - 0.2;
                
                const nextX = Math.round(centerX + Math.cos(nextAngle) * dist);
                const nextY = Math.round(centerY + Math.sin(nextAngle) * dist);
                const prevX = Math.round(centerX + Math.cos(prevAngle) * dist);
                const prevY = Math.round(centerY + Math.sin(prevAngle) * dist);
                
                // Ouvrir les murs pour créer un chemin continu le long de l'anneau
                if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
                    // Déterminer quel mur ouvrir en fonction de la direction
                    if (nextX > x) {
                        grid[y][x].walls[1] = false; // Mur droit
                        grid[nextY][nextX].walls[3] = false; // Mur gauche
                    } else if (nextX < x) {
                        grid[y][x].walls[3] = false; // Mur gauche
                        grid[nextY][nextX].walls[1] = false; // Mur droit
                    }
                    
                    if (nextY > y) {
                        grid[y][x].walls[2] = false; // Mur bas
                        grid[nextY][nextX].walls[0] = false; // Mur haut
                    } else if (nextY < y) {
                        grid[y][x].walls[0] = false; // Mur haut
                        grid[nextY][nextX].walls[2] = false; // Mur bas
                    }
                }
                
                if (prevX >= 0 && prevX < COLS && prevY >= 0 && prevY < ROWS) {
                    // Même chose pour la cellule précédente
                    if (prevX > x) {
                        grid[y][x].walls[1] = false;
                        grid[prevY][prevX].walls[3] = false;
                    } else if (prevX < x) {
                        grid[y][x].walls[3] = false;
                        grid[prevY][prevX].walls[1] = false;
                    }
                    
                    if (prevY > y) {
                        grid[y][x].walls[2] = false;
                        grid[prevY][prevX].walls[0] = false;
                    } else if (prevY < y) {
                        grid[y][x].walls[0] = false;
                        grid[prevY][prevX].walls[2] = false;
                    }
                }
            }
        }
    }
    
    // Centre - une zone ouverte plus petite
    const centerRadius = 3;
    for (let y = centerY - centerRadius; y <= centerY + centerRadius; y++) {
        for (let x = centerX - centerRadius; x <= centerX + centerRadius; x++) {
            if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                const dist = Math.sqrt((x - centerX)**2 + (y - centerY)**2);
                if (dist <= centerRadius) {
                    // Ouvrir les murs entre cellules adjacentes
                    if (x < COLS - 1) {
                        grid[y][x].walls[1] = false;
                        grid[y][x+1].walls[3] = false;
                    }
                    if (y < ROWS - 1) {
                        grid[y][x].walls[2] = false;
                        grid[y+1][x].walls[0] = false;
                    }
                }
            }
        }
    }
    
    // Rayons - connectent l'anneau au centre
    const numRayons = 5;
    for (let i = 0; i < numRayons; i++) {
        const angle = (i * 2 * Math.PI) / numRayons;
        
        // Tracer un rayon du centre vers l'anneau
        for (let r = 1; r <= outerRadius; r++) {
            const x = Math.round(centerX + Math.cos(angle) * r);
            const y = Math.round(centerY + Math.sin(angle) * r);
            
            if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                // Élargir le rayon pour créer un corridor
                for (let offset = -1; offset <= 1; offset++) {
                    // Calculer les positions perpendiculaires au rayon
                    const offsetX = Math.round(centerX + Math.cos(angle + Math.PI/2) * offset + Math.cos(angle) * r);
                    const offsetY = Math.round(centerY + Math.sin(angle + Math.PI/2) * offset + Math.sin(angle) * r);
                    
                    if (offsetX >= 0 && offsetX < COLS && offsetY >= 0 && offsetY < ROWS) {
                        // Direction radiale - ouvrir les murs dans la direction du rayon
                        const nextR = r + 0.5;
                        const nextX = Math.round(centerX + Math.cos(angle) * nextR);
                        const nextY = Math.round(centerY + Math.sin(angle) * nextR);
                        
                        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
                            // Déterminer la direction principale
                            if (nextX > offsetX) {
                                grid[offsetY][offsetX].walls[1] = false;
                                grid[nextY][nextX].walls[3] = false;
                            } else if (nextX < offsetX) {
                                grid[offsetY][offsetX].walls[3] = false;
                                grid[nextY][nextX].walls[1] = false;
                            }
                            
                            if (nextY > offsetY) {
                                grid[offsetY][offsetX].walls[2] = false;
                                grid[nextY][nextX].walls[0] = false;
                            } else if (nextY < offsetY) {
                                grid[offsetY][offsetX].walls[0] = false;
                                grid[nextY][nextX].walls[2] = false;
                            }
                        }
                        
                        // Direction perpendiculaire - ouvrir les murs pour élargir le corridor
                        if (offset > -1) {
                            const leftX = Math.round(centerX + Math.cos(angle + Math.PI/2) * (offset-1) + Math.cos(angle) * r);
                            const leftY = Math.round(centerY + Math.sin(angle + Math.PI/2) * (offset-1) + Math.sin(angle) * r);
                            
                            if (leftX >= 0 && leftX < COLS && leftY >= 0 && leftY < ROWS) {
                                // Déterminer la direction perpendiculaire
                                if (leftX < offsetX) {
                                    grid[offsetY][offsetX].walls[3] = false;
                                    grid[leftY][leftX].walls[1] = false;
                                } else if (leftX > offsetX) {
                                    grid[offsetY][offsetX].walls[1] = false;
                                    grid[leftY][leftX].walls[3] = false;
                                }
                                
                                if (leftY < offsetY) {
                                    grid[offsetY][offsetX].walls[0] = false;
                                    grid[leftY][leftX].walls[2] = false;
                                } else if (leftY > offsetY) {
                                    grid[offsetY][offsetX].walls[2] = false;
                                    grid[leftY][leftX].walls[0] = false;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return grid;
}

export function generateCasinoMap(): Cell[][] {
    const COLS = 20;
    const ROWS = 20;
    const grid: Cell[][] = Array(ROWS).fill(0).map((_, y) => 
        Array(COLS).fill(0).map((_, x) => new Cell(x, y))
    );

    // Grande salle centrale ouverte - zone de combat principal
    for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
            grid[y][x].walls.fill(false);
        }
    }

    // Alcôves pour embuscades - petites zones stratégiques autour de la salle principale
    const createAlcove = (startX: number, startY: number, direction: string) => {
        // Créer une alcôve de 2x2
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                    grid[y][x].walls.fill(false);
                }
            }
        }
        
        // Ouverture vers la direction spécifiée
        if (direction === "right") {
            grid[startY][startX + 1].walls[1] = false;
            grid[startY + 1][startX + 1].walls[1] = false;
            if (startX + 2 < COLS) {
                grid[startY][startX + 2].walls[3] = false;
                grid[startY + 1][startX + 2].walls[3] = false;
            }
        } else if (direction === "left") {
            grid[startY][startX].walls[3] = false;
            grid[startY + 1][startX].walls[3] = false;
            if (startX - 1 >= 0) {
                grid[startY][startX - 1].walls[1] = false;
                grid[startY + 1][startX - 1].walls[1] = false;
            }
        } else if (direction === "up") {
            grid[startY][startX].walls[0] = false;
            grid[startY][startX + 1].walls[0] = false;
            if (startY - 1 >= 0) {
                grid[startY - 1][startX].walls[2] = false;
                grid[startY - 1][startX + 1].walls[2] = false;
            }
        } else if (direction === "down") {
            grid[startY + 1][startX].walls[2] = false;
            grid[startY + 1][startX + 1].walls[2] = false;
            if (startY + 2 < ROWS) {
                grid[startY + 2][startX].walls[0] = false;
                grid[startY + 2][startX + 1].walls[0] = false;
            }
        }
    };

    // Créer des alcôves autour de la salle principale
    // Côté gauche
    for (let i = 0; i < 3; i++) {
        createAlcove(3, 5 + i * 3, "right");
    }
    
    // Côté droit
    for (let i = 0; i < 3; i++) {
        createAlcove(15, 5 + i * 3, "left");
    }
    
    // Côté haut
    for (let i = 0; i < 3; i++) {
        createAlcove(6 + i * 3, 3, "down");
    }
    
    // Côté bas
    for (let i = 0; i < 3; i++) {
        createAlcove(6 + i * 3, 15, "up");
    }

    // Chemin VIP exposé traversant toute la carte
    for (let x = 0; x < COLS; x++) {
        grid[10][x].walls[0] = false;
        grid[10][x].walls[2] = false;
        
        // Ajouter du mobilier pour la couverture tactique
        if (x > 4 && x < 15 && x % 3 === 0) {
            grid[9][x].walls[2] = true;
            grid[11][x].walls[0] = true;
        }
    }

    // Coffres comme objectif - zone fortifiée avec accès restreint
    for (let y = 17; y < 20; y++) {
        for (let x = 8; x < 12; x++) {
            // Zone entièrement fermée sauf en haut
            grid[y][x].walls.fill(true);
            if (y > 17) grid[y][x].walls[0] = false;
        }
    }
    
    // Ouvrir l'accès aux coffres mais le rendre étroit
    grid[17][9].walls[0] = false;
    grid[17][10].walls[0] = false;
    grid[16][9].walls[2] = false;
    grid[16][10].walls[2] = false;
    
    // Points hauts stratégiques
    const createHighPoint = (x: number, y: number) => {
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
            // Point haut = cellule fermée avec visibilité
            grid[y][x].walls.fill(true);
            // Mais avec une entrée
            if (x > 0) grid[y][x].walls[3] = false; // Entrée ouest
            if (x > 0) grid[y][x-1].walls[1] = false;
        }
    };
    
    // Créer quelques points hauts stratégiques
    createHighPoint(2, 2);
    createHighPoint(17, 2);
    createHighPoint(2, 17);
    createHighPoint(17, 17);

    return grid;
}