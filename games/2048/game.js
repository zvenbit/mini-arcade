import { createUI, readSave, writeSave, readBest, directionControls, swipeControls, keyDirections } from '../shared/ui.js';
import { moveBoard, spawnTile, canMove, validSave } from './logic.js';

let board = Array(16).fill(0);
let score = 0;
let best = readBest('2048');
let acknowledged = false;
const ui = createUI({ title: '2048', eyebrow: 'ONE MOVE AT A TIME', help: '方向键 / WASD 或滑动棋盘 · 相同数字合并，向 2048 出发', theme: 'numbers', onStart: () => ui.hide(), onRestart: restart });
const grid = document.createElement('div');
grid.className = 'board-2048';
grid.setAttribute('role', 'grid');
grid.setAttribute('aria-label', '2048 棋盘');
ui.surface.append(grid);
const tiles = Array.from({ length: 16 }, () => {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.setAttribute('role', 'gridcell');
  grid.append(tile);
  return tile;
});

function save() {
  writeSave('2048:run', { board, score, acknowledged });
  if (score > best) { best = score; writeSave('2048:best', best); }
}

function render(spawned = -1) {
  tiles.forEach((tile, index) => {
    const value = board[index];
    tile.textContent = value || '';
    tile.dataset.value = value;
    tile.setAttribute('aria-label', `第 ${Math.floor(index / 4) + 1} 行第 ${index % 4 + 1} 列，${value || '空格'}`);
    tile.className = 'tile';
    tile.classList.toggle('large', value >= 128);
    tile.classList.toggle('huge', value >= 4096);
    tile.classList.toggle('new', index === spawned);
  });
  ui.score(score, best);
  ui.status('合并数字，挑战你的下一步');
}

function checkResult() {
  if (board.some(value => value >= 2048) && !acknowledged) {
    ui.show('win', '你好，2048！', `已经获得 ${score} 分，还能继续挑战更大的数字。`, '继续挑战', () => {
      acknowledged = true;
      save();
      ui.hide();
      checkResult();
    });
  } else if (!canMove(board)) {
    ui.show('over', '每一步，都算数', `本局 ${score} 分。棋盘已经没有可合并的数字，再来一局吧。`, '再来一局', restart);
  }
}

function move(direction) {
  if (ui.blocked) return;
  const result = moveBoard(board, direction);
  if (!result.moved) return;
  board = result.board;
  score += result.points;
  const spawned = spawnTile(board);
  save();
  render(spawned);
  ui.sound(result.points ? 'merge' : 'move');
  checkResult();
}

function restart() {
  board = Array(16).fill(0);
  score = 0;
  acknowledged = false;
  spawnTile(board);
  spawnTile(board);
  save();
  ui.hide();
  render();
  ui.sound('start');
}

directionControls(ui.controls, move);
swipeControls(grid, move);
document.addEventListener('keydown', event => {
  const direction = keyDirections[event.code];
  if (!direction || event.metaKey || event.ctrlKey || event.altKey) return;
  event.preventDefault();
  move(direction);
});
const saved = readSave('2048:run', null);
if (validSave(saved)) {
  board = saved.board;
  score = saved.score;
  acknowledged = saved.acknowledged === true;
  best = Math.max(best, score);
  render();
  checkResult();
} else {
  restart();
}
