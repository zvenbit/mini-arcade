import { createAudio } from './audio.js?v=flow-4';

export function createUI({ title, eyebrow, help, theme, onStart, onRestart }) {
  document.body.className = theme;
  document.body.innerHTML = `
    <main class="game-shell">
      <header class="game-header">
        <div><p class="eyebrow"></p><h1></h1></div>
        <div class="scores"><div><small>得分</small><strong id="score">0</strong></div><div><small>最佳</small><strong id="best">0</strong></div></div>
      </header>
      <div class="toolbar"><p id="status" role="status"></p><div><button id="sound" type="button">声音：开</button><button id="pause" aria-label="暂停游戏">暂停</button><button id="restart">新一局</button></div></div>
      <div id="arena" class="arena">
        <div id="surface"></div>
        <section id="overlay" class="overlay" hidden aria-label="游戏状态">
          <div class="overlay-card"><p class="eyebrow" id="overlay-tag"></p><h2 id="overlay-title"></h2><p id="overlay-text"></p><button id="primary"></button></div>
        </section>
      </div>
      <div id="touch-controls" class="touch-controls"></div>
      <p class="help"></p>
      <p id="storage-note" class="storage-note" role="status" hidden>当前浏览器无法保存成绩，本局仍可正常游玩。</p>
    </main>`;
  document.querySelector('h1').textContent = title;
  document.querySelector('.eyebrow').textContent = eyebrow;
  document.querySelector('.help').textContent = help;
  const overlay = document.getElementById('overlay');
  const audio = createAudio(theme, document.getElementById('sound'));
  let overlayAction = onStart;
  let overlayMode = '';
  let pauseHook = () => {};
  const ui = {
    sound: name => audio.play(name),
    surface: document.getElementById('surface'),
    arena: document.getElementById('arena'),
    controls: document.getElementById('touch-controls'),
    get blocked() { return !overlay.hidden; },
    get mode() { return overlayMode; },
    score(value, best) {
      document.getElementById('score').textContent = value;
      document.getElementById('best').textContent = best;
    },
    status(text) { document.getElementById('status').textContent = text; },
    show(mode, title, text, button, action = onRestart) {
      overlayMode = mode;
      document.getElementById('overlay-tag').textContent = { ready: 'READY TO PLAY', paused: 'TAKE A BREAK', over: 'ONE MORE TRY', win: 'WELL PLAYED' }[mode];
      document.getElementById('overlay-title').textContent = title;
      document.getElementById('overlay-text').textContent = text;
      document.getElementById('primary').textContent = button;
      overlayAction = action;
      overlay.hidden = false;
      document.getElementById('pause').disabled = mode !== 'paused';
      document.getElementById('pause').textContent = mode === 'paused' ? '继续' : '暂停';
      pauseHook();
      audio.setActive(false);
      if (mode === 'win' || mode === 'over') audio.play(mode);
    },
    hide() {
      overlay.hidden = true;
      overlayMode = '';
      document.getElementById('pause').disabled = false;
      document.getElementById('pause').textContent = '暂停';
      document.getElementById('pause').setAttribute('aria-label', '暂停游戏');
      audio.setActive(true);
    },
    pause() {
      if (ui.blocked) return;
      ui.show('paused', '休息一下', '准备好了就继续这一局。', '继续游戏', () => ui.hide());
      document.getElementById('pause').setAttribute('aria-label', '继续游戏');
    },
    onPause(callback) { pauseHook = callback; }
  };
  document.getElementById('primary').addEventListener('click', () => overlayAction());
  document.getElementById('restart').addEventListener('click', onRestart);
  document.getElementById('pause').addEventListener('click', () => ui.mode === 'paused' ? ui.hide() : ui.pause());
  window.addEventListener('blur', () => ui.pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) ui.pause(); });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'arcade:pause') ui.pause();
    if (event.data?.type === 'arcade:restart') onRestart();
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Escape' && event.code !== 'KeyP') return;
    event.preventDefault();
    if (event.repeat) return;
    if (ui.mode === 'paused') ui.hide();
    else ui.pause();
    if (event.code === 'Escape' && window.parent !== window) window.parent.postMessage({ type: 'arcade:escape' }, location.origin);
  });
  return ui;
}

export function readSave(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`mini-arcade-game:${key}`)) ?? fallback; }
  catch { return fallback; }
}

export function writeSave(key, value) {
  try { localStorage.setItem(`mini-arcade-game:${key}`, JSON.stringify(value)); }
  catch { document.getElementById('storage-note').hidden = false; }
}

export function readBest(key) {
  const value = readSave(`${key}:best`, 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function directionControls(container, callback) {
  const directions = [['up', '↑', '向上'], ['left', '←', '向左'], ['down', '↓', '向下'], ['right', '→', '向右']];
  container.classList.add('direction-pad');
  for (const [direction, label, name] of directions) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = direction;
    button.setAttribute('aria-label', name);
    button.addEventListener('click', () => callback(direction));
    container.append(button);
  }
}

export function swipeControls(target, callback) {
  let start = null;
  target.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointerup', event => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    callback(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  target.addEventListener('pointercancel', () => { start = null; });
}

export const keyDirections = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
