export const WIDTH = 10, HEIGHT = 20;
const SHAPES = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]],
  [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,0,7],[7,7,7],[0,0,0]]
];
export function cells(piece) {
  let matrix = SHAPES[piece.type - 1].map(row => [...row]);
  for (let i = 0; i < piece.rotation; i++) matrix = matrix[0].map((_, x) => matrix.map(row => row[x]).reverse());
  return matrix.flatMap((row, y) => row.flatMap((value, x) => value ? [{ x:x + piece.x, y:y + piece.y, value }] : []));
}
export function fits(board, piece) {
  return cells(piece).every(({x,y}) => x >= 0 && x < WIDTH && y < HEIGHT && (y < 0 || !board[y][x]));
}
export function refill(state, rng = Math.random) {
  while (state.queue.length < 7) {
    const bag = [1,2,3,4,5,6,7];
    for (let i = 6; i > 0; i--) { const j = Math.floor(rng() * (i+1)); [bag[i],bag[j]] = [bag[j],bag[i]]; }
    state.queue.push(...bag);
  }
}
function spawn(state, type) {
  state.active = { type, rotation:0, x:type === 2 ? 4 : 3, y:type === 1 ? -1 : 0 };
  if (!fits(state.board, state.active)) state.over = true;
}
export function newGame(rng = Math.random) {
  const state = { version:1, board:Array.from({length:HEIGHT}, () => Array(WIDTH).fill(0)), queue:[], active:null, held:0, holdUsed:false, score:0, lines:0, combo:-1, over:false };
  refill(state, rng); spawn(state, state.queue.shift()); refill(state, rng);
  return state;
}
export function level(state) { return Math.min(20, 1 + Math.floor(state.lines / 10)); }
export function move(state, dx, dy = 0) {
  if (state.over) return false;
  const next = {...state.active, x:state.active.x + dx, y:state.active.y + dy};
  if (!fits(state.board, next)) return false;
  state.active = next; return true;
}
export function rotate(state, direction = 1) {
  if (state.over) return false;
  const next = {...state.active, rotation:(state.active.rotation + direction + 4) % 4};
  // Small wall/floor kicks keep rotation forgiving without moving through occupied cells.
  for (const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]]) {
    const candidate = {...next, x:next.x+dx, y:next.y+dy};
    if (fits(state.board, candidate)) { state.active = candidate; return true; }
  }
  return false;
}
export function ghost(state) {
  const piece = {...state.active};
  while (fits(state.board, {...piece, y:piece.y+1})) piece.y++;
  return piece;
}
export function lock(state, rng = Math.random) {
  if (state.over) return {cleared:0, rows:[]};
  const squares = cells(state.active);
  if (squares.some(cell => cell.y < 0)) { state.over = true; return {cleared:0, rows:[]}; }
  for (const {x,y,value} of squares) state.board[y][x] = value;
  const rows = state.board.flatMap((row,index) => row.every(Boolean) ? [index] : []);
  const before = rows.length ? state.board.map(row => [...row]) : null;
  const oldScore = state.score;
  const oldLevel = level(state);
  state.board = state.board.filter(row => !row.every(Boolean));
  while (state.board.length < HEIGHT) state.board.unshift(Array(WIDTH).fill(0));
  state.combo = rows.length ? state.combo+1 : -1;
  state.score += ([0,100,300,500,800][rows.length] + Math.max(0,state.combo)*50) * oldLevel;
  state.lines += rows.length;
  state.holdUsed = false;
  refill(state, rng); spawn(state, state.queue.shift()); refill(state, rng);
  return {cleared:rows.length, rows, before, points:state.score-oldScore};
}
export function hardDrop(state, rng = Math.random) {
  if (state.over) return {cleared:0, rows:[]};
  const landing = ghost(state);
  state.score += Math.max(0,landing.y-state.active.y)*2;
  state.active = landing;
  return lock(state, rng);
}
export function hold(state, rng = Math.random) {
  if (state.over || state.holdUsed) return false;
  const current = state.active.type;
  if (state.held) spawn(state, state.held);
  else { refill(state, rng); spawn(state, state.queue.shift()); refill(state, rng); }
  state.held = current; state.holdUsed = true;
  return true;
}
export function validSave(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.board) || s.board.length !== HEIGHT || !s.board.every(row => Array.isArray(row) && row.length === WIDTH && row.every(n => Number.isInteger(n) && n>=0 && n<=7))) return false;
  if (!Array.isArray(s.queue) || s.queue.length < 3 || s.queue.length > 13 || !s.queue.every(n => Number.isInteger(n) && n>=1 && n<=7)) return false;
  if (![s.score,s.lines].every(n => Number.isSafeInteger(n) && n>=0) || !Number.isInteger(s.combo) || s.combo < -1 || !Number.isInteger(s.held) || s.held<0 || s.held>7 || typeof s.holdUsed !== 'boolean' || typeof s.over !== 'boolean') return false;
  const p = s.active;
  if (!p || ![p.type,p.rotation,p.x,p.y].every(Number.isInteger) || p.type<1 || p.type>7 || p.rotation<0 || p.rotation>3 || p.x < -4 || p.x>10 || p.y < -4 || p.y>=20) return false;
  return s.over || fits(s.board,p);
}
