export const difficulties = {
  easy: { label: '初级', size: 9, mines: 10 },
  medium: { label: '中级', size: 12, mines: 24 },
  hard: { label: '高级', size: 16, mines: 40 }
};
export function neighbors(index, size) {
  const result = [], x = index % size, y = Math.floor(index / size);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size) result.push((y + dy) * size + x + dx);
  }
  return result;
}
export function createBoard(difficulty = 'easy') {
  const { size, mines } = difficulties[difficulty];
  return { difficulty, size, mines, cells: Array(size * size).fill(0), open: Array(size * size).fill(false), flags: Array(size * size).fill(false), started: false, result: '', exploded: -1, elapsed: 0 };
}
export function plant(state, first, random = Math.random) {
  const safe = new Set([first, ...neighbors(first, state.size)]);
  const candidates = state.cells.map((_, i) => i).filter(i => !safe.has(i));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const index of candidates.slice(0, state.mines)) state.cells[index] = -1;
  state.cells.forEach((value, index) => { if (value !== -1) state.cells[index] = neighbors(index, state.size).filter(i => state.cells[i] === -1).length; });
  state.started = true;
}
export function reveal(state, index, random = Math.random) {
  if (state.result || index < 0 || index >= state.cells.length || state.flags[index]) return false;
  if (!state.started) plant(state, index, random);
  const around = neighbors(index, state.size);
  const queue = state.open[index]
    ? (state.cells[index] > 0 && around.filter(i => state.flags[i]).length === state.cells[index] ? around : [])
    : [index];
  let changed = false;
  while (queue.length && !state.result) {
    const current = queue.pop();
    if (state.open[current] || state.flags[current]) continue;
    state.open[current] = true; changed = true;
    if (state.cells[current] === -1) { state.result = 'lost'; state.exploded = current; break; }
    if (state.cells[current] === 0) queue.push(...neighbors(current, state.size));
  }
  if (!state.result && state.open.filter(Boolean).length === state.cells.length - state.mines) state.result = 'won';
  return changed;
}
export function flag(state, index) {
  if (state.result || index < 0 || index >= state.cells.length || state.open[index]) return false;
  if (!state.flags[index] && state.flags.filter(Boolean).length >= state.mines) return false;
  state.flags[index] = !state.flags[index]; return true;
}
export function validSave(state) {
  if (!state || !difficulties[state.difficulty]) return false;
  const { size, mines } = difficulties[state.difficulty], n = size * size;
  if (state.size !== size || state.mines !== mines || typeof state.started !== 'boolean' || !['', 'won', 'lost'].includes(state.result) || !Number.isFinite(state.elapsed) || state.elapsed < 0) return false;
  if (!['cells', 'open', 'flags'].every(key => Array.isArray(state[key]) && state[key].length === n)) return false;
  if (!state.cells.every(v => Number.isInteger(v) && v >= -1 && v <= 8) || ![...state.open, ...state.flags].every(v => typeof v === 'boolean')) return false;
  if (state.flags.filter(Boolean).length > mines || state.open.some((v,i) => v && state.flags[i])) return false;
  if (!state.started) return !state.result && !state.open.some(Boolean) && state.cells.every(v => v === 0);
  if (state.cells.filter(v => v === -1).length !== mines || !state.cells.every((v,i) => v === -1 || v === neighbors(i,size).filter(j => state.cells[j] === -1).length)) return false;
  const exposedMine = state.open.some((v,i) => v && state.cells[i] === -1);
  const won = state.open.filter(Boolean).length === n - mines && !exposedMine;
  return state.result === 'lost' ? exposedMine && state.cells[state.exploded] === -1 : state.result === 'won' ? won : !exposedMine && !won;
}
