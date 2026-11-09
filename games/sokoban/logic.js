export const directions = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
export function parseLevel(rows) {
  const width = Math.max(...rows.map(row => row.length)), height = rows.length;
  const walls = [], goals = [], boxes = []; let player = -1;
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    const i=y*width+x, c=rows[y][x] || '#';
    if (c === '#') walls.push(i);
    if ('.*+'.includes(c)) goals.push(i);
    if ('$*'.includes(c)) boxes.push(i);
    if ('@+'.includes(c)) player=i;
  }
  return { width, height, walls, goals, boxes, player };
}
export function step(level, state, direction) {
  const delta = directions[direction]; if (!delta) return null;
  const target = (index) => {
    const x=index%level.width+delta[0], y=Math.floor(index/level.width)+delta[1];
    return x<0 || y<0 || x>=level.width || y>=level.height ? -1 : y*level.width+x;
  };
  const next=target(state.player);
  if (next<0 || level.walls.includes(next)) return null;
  const boxes=[...state.boxes], box=boxes.indexOf(next);
  if (box>=0) {
    const to=target(next);
    if (to<0 || level.walls.includes(to) || boxes.includes(to)) return null;
    boxes[box]=to;
  }
  return { player:next, boxes, moves:state.moves+1, pushes:state.pushes+(box>=0?1:0), pushed:box>=0 };
}
export const isWon = (level, state) => state.boxes.every(i => level.goals.includes(i));
export function inCorner(level, state) {
  const wall=i=>i<0 || i>=level.width*level.height || level.walls.includes(i);
  return state.boxes.some(i=>!level.goals.includes(i) && (wall(i-1)||wall(i+1)) && (wall(i-level.width)||wall(i+level.width)));
}
export function validState(level, state) {
  return state && Number.isInteger(state.player) && state.player>=0 && state.player<level.width*level.height && !level.walls.includes(state.player)
    && Array.isArray(state.boxes) && state.boxes.length===level.boxes.length && new Set(state.boxes).size===state.boxes.length
    && state.boxes.every(i=>Number.isInteger(i)&&i>=0&&i<level.width*level.height&&!level.walls.includes(i)&&i!==state.player)
    && Number.isSafeInteger(state.moves)&&state.moves>=0&&Number.isSafeInteger(state.pushes)&&state.pushes>=0&&state.pushes<=state.moves;
}
