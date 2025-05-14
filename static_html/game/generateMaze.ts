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
  const grid: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push(new Cell(x, y));
    }
    grid.push(row);
  }

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

  function removeWalls(a: Cell, b: Cell) {
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