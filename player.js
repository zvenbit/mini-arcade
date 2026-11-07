import { element, notify, applyTheme, loadGames, setFavoriteButton, toggleFavorite, recordPlay } from './common.js?v=breakout-50';

const stage = document.getElementById('stage');
const statePanel = document.getElementById('stage-state');
const wrapper = document.getElementById('player-wrap');
const favorite = document.getElementById('favorite');
const help = document.getElementById('help-dialog');
const win = document.getElementById('win-dialog');
let game;
let frame;
let loadTimer;
let launchVersion = 0;
let recorded = false;

function returnUrl() {
  const defaultUrl = new URL('index.html', location.href);
  try {
    const candidate = new URL(new URLSearchParams(location.search).get('return') || defaultUrl.href, location.href);
    const directoryPath = new URL('.', defaultUrl).pathname;
    const isLobby = candidate.pathname === defaultUrl.pathname || candidate.pathname === directoryPath;
    if (candidate.origin === defaultUrl.origin && isLobby) return candidate.href;
  } catch {}
  return defaultUrl.href;
}

document.getElementById('back').href = returnUrl();
document.getElementById('win-back').href = returnUrl();
applyTheme();

function showError(title, detail, retry = true) {
  statePanel.hidden = false;
  statePanel.querySelector('.loader').hidden = true;
  document.getElementById('stage-title').textContent = title;
  document.getElementById('stage-detail').textContent = detail;
  document.getElementById('retry-load').hidden = !retry;
}

function pauseGame() {
  frame?.contentWindow?.postMessage({ type: 'arcade:pause' }, location.origin);
}

function updateFavorite() {
  const enabled = setFavoriteButton(favorite, game.id, game.name);
  favorite.querySelector('span').textContent = enabled ? '已收藏' : '收藏';
}

function updateFullscreen() {
  const expanded = Boolean(document.fullscreenElement) || wrapper.classList.contains('is-expanded');
  document.getElementById('fullscreen').querySelector('span').textContent = expanded ? '退出全屏' : '全屏游戏';
  document.getElementById('fullscreen').setAttribute('aria-pressed', String(expanded));
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (wrapper.classList.contains('is-expanded')) {
    wrapper.classList.remove('is-expanded');
    document.body.classList.remove('expanded');
  } else {
    try {
      if (!wrapper.requestFullscreen) throw new Error('Fullscreen unavailable');
      await wrapper.requestFullscreen();
    } catch {
      wrapper.classList.add('is-expanded');
      document.body.classList.add('expanded');
    }
  }
  updateFullscreen();
  frame?.focus();
}

async function launch() {
  clearTimeout(loadTimer);
  frame?.remove();
  const version = ++launchVersion;
  statePanel.hidden = false;
  statePanel.querySelector('.loader').hidden = false;
  document.getElementById('stage-title').textContent = '准备进入游戏…';
  document.getElementById('stage-detail').textContent = '冒险马上开始';
  document.getElementById('retry-load').hidden = true;
  try {
    const response = await fetch(game.entry, { method: 'HEAD' });
    if (version !== launchVersion) return;
    if (!response.ok) throw new Error('Game unavailable');
    frame = element('iframe');
    frame.title = `${game.name} 游戏`;
    frame.allow = 'fullscreen; autoplay';
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', () => {
      if (version !== launchVersion) return;
      clearTimeout(loadTimer);
      // Ignore an external navigation after the game has already loaded.
      try {
        if (!frame.contentDocument?.body) return;
      } catch { return; }
      statePanel.hidden = true;
      if (!recorded) { recordPlay(game.id); recorded = true; }
      for (const id of ['help', 'fullscreen']) document.getElementById(id).disabled = false;
      frame.focus();
    });
    frame.src = game.entry;
    stage.append(frame);
    loadTimer = setTimeout(() => {
      showError('游戏加载时间有些长', '请检查网络和游戏文件，或重新加载。');
    }, 20000);
  } catch {
    if (version !== launchVersion) return;
    showError('暂时无法打开游戏', '请检查游戏目录是否已完整上传，再重新加载。');
  }
}

favorite.addEventListener('click', () => { toggleFavorite(game.id); updateFavorite(); });
document.getElementById('help').addEventListener('click', () => { pauseGame(); help.showModal(); });
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
}
help.addEventListener('close', () => frame?.focus());
document.getElementById('fullscreen').addEventListener('click', () => toggleFullscreen().catch(() => notify('暂时无法切换全屏，请重试。')));
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && wrapper.classList.contains('is-expanded')) toggleFullscreen();
});
for (const id of ['retry-load', 'play-again']) {
  document.getElementById(id).addEventListener('click', () => { if (win.open) win.close(); launch(); });
}
document.getElementById('restart').addEventListener('click', () => {
  if (game.restartMessage && frame) {
    frame.contentWindow.postMessage({ type: 'arcade:restart' }, location.origin);
    frame.focus();
  } else {
    launch();
  }
});
window.addEventListener('storage', () => { applyTheme(); if (game) updateFavorite(); });
window.addEventListener('pagehide', () => { clearTimeout(loadTimer); pauseGame(); });
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame?.contentWindow || !event.data) return;
  if (event.data.type === 'arcade:completed' && game?.id === 'rooftop-reset' && !win.open) win.showModal();
  if (event.data.type === 'arcade:escape' && wrapper.classList.contains('is-expanded')) toggleFullscreen();
});

try {
  const games = await loadGames();
  const id = new URLSearchParams(location.search).get('game');
  game = games.find(item => item.id === id);
  if (!game) {
    document.getElementById('game-name').textContent = '没有找到这款游戏';
    showError('这款游戏暂未收录', '点击左上角返回大厅，选择一款已经收录的游戏。', false);
  } else {
    document.title = `${game.name} · 小游戏大厅`;
    document.getElementById('game-name').textContent = game.name;
    document.getElementById('game-category').textContent = `${game.category} / ${game.subtitle || '小游戏'}`;
    document.getElementById('game-description').textContent = game.description || game.name;
    document.getElementById('game-notes').textContent = game.notes || '';
    document.getElementById('help-notes').textContent = game.notes || '';
    document.getElementById('control-list').replaceChildren(...(game.controls || ['请查看游戏内的操作说明。']).map(text => element('li', '', text)));
    const hints = game.controlHints || [];
    const strip = document.querySelector('.controls-strip');
    strip.replaceChildren(...hints.map(([key, description]) => {
      const item = element('span');
      item.append(element('kbd', '', key), document.createTextNode(description));
      return item;
    }));
    strip.hidden = hints.length === 0;
    document.querySelector('.touch-hint').textContent = game.touchHelp || '使用游戏内触屏控件操作。';
    document.querySelector('.touch-hint').hidden = !(game.devices || []).includes('touch');
    const source = document.getElementById('source');
    const sourceUrl = game.source && new URL(game.source, location.href);
    if (sourceUrl && ['http:', 'https:'].includes(sourceUrl.protocol)) source.href = sourceUrl.href;
    else source.hidden = true;
    document.getElementById('game-info').hidden = false;
    favorite.disabled = false;
    updateFavorite();
    await launch();
  }
} catch {
  document.getElementById('game-name').textContent = '游戏暂时无法加载';
  showError('游戏清单加载失败', '请刷新页面重试，并确认 games.json 文件可访问。', false);
}
