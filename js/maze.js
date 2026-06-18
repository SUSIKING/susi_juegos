import { WALL, PATH, levelParams } from './config.js?v=012';

export function buildMaze(level){
  const params = levelParams(level);
  const rand = seededRandom(params.seed);
  const rows = params.rows;
  const cols = params.cols;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(WALL));
  const stack = [[1, 1]];
  const dirs = [[2,0],[-2,0],[0,2],[0,-2]];

  grid[1][1] = PATH;

  while(stack.length){
    const [x, y] = stack[stack.length - 1];
    const options = dirs
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx] === WALL);

    if(!options.length){
      stack.pop();
      continue;
    }

    const [nx, ny, dx, dy] = options[Math.floor(rand() * options.length)];
    grid[y + dy / 2][x + dx / 2] = PATH;
    grid[ny][nx] = PATH;
    stack.push([nx, ny]);
  }

  for(let y = 1; y < rows - 1; y++){
    for(let x = 1; x < cols - 1; x++){
      if(grid[y][x] !== WALL || rand() >= params.loopRate) continue;
      const near = [[1,0],[-1,0],[0,1],[0,-1]]
        .filter(([dx, dy]) => grid[y + dy]?.[x + dx] === PATH).length;
      if(near >= 2) grid[y][x] = PATH;
    }
  }

  const start = { x: 1, y: 1 };
  const goal = farthestPathCell(grid, start.x, start.y);
  grid[goal.y][goal.x] = PATH;

  return { grid, rows, cols, start, goal, params };
}

export function farthestPathCell(grid, sx, sy){
  const queue = [[sx, sy, 0]];
  const seen = new Set([cellKey(sx, sy)]);
  let farthest = { x: sx, y: sy, d: 0 };

  for(let i = 0; i < queue.length; i++){
    const [x, y, d] = queue[i];
    if(d > farthest.d) farthest = { x, y, d };

    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = x + dx;
      const ny = y + dy;
      const key = cellKey(nx, ny);
      if(grid[ny]?.[nx] === PATH && !seen.has(key)){
        seen.add(key);
        queue.push([nx, ny, d + 1]);
      }
    }
  }

  return farthest;
}

function seededRandom(seed){
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cellKey(x, y){
  return `${x},${y}`;
}
