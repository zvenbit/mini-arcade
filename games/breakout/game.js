import { createUI, readBest, readSave, writeSave } from '../shared/ui.js';
import { createLevel, launchBall, movePaddle, update, paddleY, levelCount } from './logic.js?v=breakout-50';
import { validCheckpoint } from './levels.js';

const saved = readSave('breakout:checkpoint', null);
let checkpoint = validCheckpoint(saved) ? saved : { version: 1, level: 1, score: 0 };
let state = createLevel(checkpoint.level, checkpoint.score);
let best = readBest('breakout');
let lastFrame = 0;
const keys = new Set();
const ui = createUI({ title: '打砖块', eyebrow: 'MAKE EVERY BOUNCE COUNT', theme: 'breakout', help: '移动鼠标、拖动挡板或按 ← → / A D · 空格或点击棋盘发球', onStart: start, onRestart: restart });
const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 960;
canvas.setAttribute('aria-label', '打砖块游戏区域，拖动或移动鼠标控制挡板');
ui.surface.append(canvas);
const ctx = canvas.getContext('2d');
ctx.scale(2, 2);
const colors = ['#43b9f4', '#57c6ff', '#ffd75a', '#ff9a66', '#ed6d80', '#9c91f4'];

function rect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}

function draw() {
  const background = ctx.createLinearGradient(0, 0, 0, 480);
  background.addColorStop(0, '#123f81');
  background.addColorStop(1, '#142957');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 480, 480);
  for (let i = 0; i < 32; i++) {
    ctx.fillStyle = i % 3 ? '#7aacf336' : '#d6ebff70';
    ctx.fillRect((i * 107 + 29) % 480, (i * 71 + 17) % 480, 2, 2);
  }
  for (const brick of state.bricks) {
    if (!brick.active) continue;
    const progress = 1 - state.collapseRemaining / .22;
    const y = state.collapseRemaining > 0 ? brick.fromY + (brick.y - brick.fromY) * progress : brick.y;
    if (y < 0) continue;
    rect(brick.x, y + 4, brick.width, brick.height, 5, '#071c4155');
    rect(brick.x, y, brick.width, brick.height, 5, colors[brick.row % colors.length]);
    rect(brick.x + 3, y + 2, brick.width - 6, 2, 1, '#ffffff60');
    if (brick.hp > 1) {
      ctx.fillStyle = '#12284d'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(brick.hp, brick.x + brick.width / 2, y + 11);
    }
  }
  ctx.fillStyle = '#aecbfa'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`已清 ${state.clearedRows}/${state.totalRows} 行 · 清空整行后全体下移`, 240, 14);
  if (state.collapseRemaining > 0) {
    ctx.fillStyle = '#ffe16b'; ctx.font = 'bold 15px system-ui';
    ctx.fillText('整行消除 ↓ 剩余砖块下移', 240, 420);
  }
  const paddleWidth = state.paddleWidth;
  rect(state.paddle - paddleWidth / 2, paddleY + 4, paddleWidth, 12, 6, '#071c4177');
  rect(state.paddle - paddleWidth / 2, paddleY, paddleWidth, 12, 6, '#ffdf66');
  rect(state.paddle - paddleWidth / 2 + 5, paddleY + 2, paddleWidth - 10, 3, 2, '#fff1b2');
  ctx.shadowColor = '#c1e7ff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ui.score(state.score, best);
  ui.status(`第 ${state.level} / ${levelCount} 关 · 生命 ${'♥'.repeat(state.lives)}`);
}

function start() { launchBall(state); lastFrame = performance.now(); ui.hide(); ui.sound('start'); }
function beginLevel(level, score) {
  checkpoint = { version: 1, level, score };
  writeSave('breakout:checkpoint', checkpoint);
  state = createLevel(level, score);
  keys.clear(); start(); draw();
}
function restart() { beginLevel(1, 0); }
function movePointer(event) {
  if (ui.blocked) return;
  const bounds = canvas.getBoundingClientRect();
  movePaddle(state, (event.clientX - bounds.left) / bounds.width * 480);
}
canvas.addEventListener('pointermove', movePointer);
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary) return;
  canvas.setPointerCapture(event.pointerId);
  movePointer(event);
  if (state.mode === 'serve' && !ui.blocked) launchBall(state);
});
for (const [direction, label] of [['left', '←'], ['right', '→']]) {
  const button = document.createElement('button');
  button.textContent = label;
  button.setAttribute('aria-label', direction === 'left' ? '挡板向左' : '挡板向右');
  button.addEventListener('pointerdown', event => { button.setPointerCapture(event.pointerId); keys.add(direction); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(direction));
  ui.controls.append(button);
}
ui.onPause(() => keys.clear());
document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const direction = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
  if (direction) { event.preventDefault(); if (!ui.blocked) keys.add(direction); }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    if (ui.mode === 'ready') start();
  }
});
document.addEventListener('keyup', event => {
  const direction = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
  if (direction) keys.delete(direction);
});

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, .035);
  lastFrame = now;
  if (!ui.blocked) {
    movePaddle(state, state.paddle + ((keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0)) * 380 * dt);
    update(state, dt, ui.sound);
    if (state.score > best) { best = state.score; writeSave('breakout:best', best); }
    if (state.mode === 'serve') {
      ui.show('ready', '还有机会！', `剩余 ${state.lives} 条生命，调整状态继续。`, '继续发球', start);
      ui.sound('lose');
    }
    if (state.mode === 'over') ui.show('over', '再接住下一球', `第 ${state.level} 关挑战结束。重试本关会恢复入关分数和 3 条生命。`, '重试本关', () => beginLevel(checkpoint.level, checkpoint.score));
    if (state.mode === 'cleared') {
      checkpoint = { version: 1, level: state.level + 1, score: state.score };
      writeSave('breakout:checkpoint', checkpoint);
      ui.show('win', '这一关，清空！', `已通过第 ${state.level} / ${levelCount} 关。进度已保存，下一关恢复 3 条生命。`, '下一关', () => beginLevel(checkpoint.level, checkpoint.score));
    }
    if (state.mode === 'won') ui.show('win', '漂亮，50 关全部击破！', `获得 ${state.score} 分，完成全部挑战！`, '从第 1 关再玩', restart);
  }
  draw();
  requestAnimationFrame(frame);
}
draw();
ui.show('ready', `第 ${state.level} / ${levelCount} 关`, '所有砖块都在屏幕内。清空一整行，剩余砖块全部下移一行。后期出现多层砖，每关 3 条生命。', state.level > 1 ? '继续闯关' : '开始游戏', start);
requestAnimationFrame(frame);
