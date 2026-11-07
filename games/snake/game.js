import { createUI, readBest, writeSave, directionControls, swipeControls, keyDirections } from '../shared/ui.js';
import { newSnake, turn, tick, size, vectors } from './logic.js';

let state = newSnake();
let best = readBest('snake');
let lastFrame = 0;
let accumulator = 0;
const ui = createUI({ title: '贪吃蛇', eyebrow: 'A LITTLE GREEN ADVENTURE', theme: 'snake', help: '方向键 / WASD 或滑动棋盘 · 吃苹果长大，小心墙壁和自己', onStart: start, onRestart: restart });
const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 600;
canvas.setAttribute('aria-label', '贪吃蛇游戏棋盘');
ui.surface.append(canvas);
const ctx = canvas.getContext('2d');
const cell = canvas.width / size;

function roundedRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function draw() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#1c513a' : '#20583f';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  if (state.food) {
    const x = (state.food.x + .5) * cell;
    const y = (state.food.y + .55) * cell;
    ctx.fillStyle = '#fb7350';
    ctx.beginPath();
    ctx.arc(x, y, cell * .37, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffc19b';
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 4, 3, 4, .5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8e969';
    ctx.beginPath();
    ctx.ellipse(x + 4, y - 12, 6, 3, -.6, 0, Math.PI * 2);
    ctx.fill();
  }
  [...state.body].reverse().forEach((segment, reverseIndex) => {
    const index = state.body.length - 1 - reverseIndex;
    const head = index === 0;
    roundedRect(segment.x * cell + 1.5, segment.y * cell + 1.5, cell - 3, cell - 3, head ? 10 : 7, head ? '#d8ef6b' : index % 2 ? '#9ed44b' : '#b4e55c');
    if (!head) return;
    const direction = vectors[state.direction];
    const cx = (segment.x + .5) * cell;
    const cy = (segment.y + .5) * cell;
    for (const side of [-1, 1]) {
      const x = cx + direction.x * 6 + direction.y * side * 6;
      const y = cy + direction.y * 6 + direction.x * side * 6;
      ctx.fillStyle = '#fbffea';
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#233e23';
      ctx.beginPath(); ctx.arc(x + direction.x, y + direction.y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  });
  ui.score(state.score, best);
  ui.status(`长度 ${state.body.length} · 每颗苹果 10 分`);
}

function start() { accumulator = 0; lastFrame = performance.now(); ui.hide(); ui.sound('start'); }
function restart() { state = newSnake(); start(); draw(); }
function changeDirection(direction) {
  if (ui.blocked) return;
  const queued = state.queue.length;
  turn(state, direction);
  if (state.queue.length > queued) ui.sound('turn');
}
ui.onPause(() => { accumulator = 0; state.queue = []; });
directionControls(ui.controls, changeDirection);
swipeControls(canvas, changeDirection);
document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const direction = keyDirections[event.code];
  if (direction) { event.preventDefault(); changeDirection(direction); }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON' && ui.mode === 'ready') { event.preventDefault(); start(); }
});

function frame(now) {
  const elapsed = Math.min((now - lastFrame) / 1000, .08);
  lastFrame = now;
  if (!ui.blocked) {
    accumulator += elapsed;
    const interval = Math.max(.075, .15 - Math.floor(state.score / 50) * .009);
    while (accumulator >= interval && !ui.blocked) {
      accumulator -= interval;
      const previousScore = state.score;
      tick(state);
      if (state.score > previousScore) ui.sound('eat');
      if (state.score > best) { best = state.score; writeSave('snake:best', best); }
      if (state.over) ui.show('over', '差一点，再来！', `本局 ${state.score} 分，长度 ${state.body.length}。下一次转弯会更漂亮。`, '再来一局', restart);
      if (state.won) ui.show('win', '整个花园都是你的！', `吃满棋盘，获得 ${state.score} 分。`, '再玩一次', restart);
      draw();
    }
  }
  requestAnimationFrame(frame);
}
draw();
ui.show('ready', '来吃一颗苹果', '控制小蛇寻找苹果。每吃一颗就会长大，碰到墙壁或自己会结束这一局。', '开始游戏', start);
requestAnimationFrame(frame);
