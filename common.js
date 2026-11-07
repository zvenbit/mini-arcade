const storageKey = 'mini-arcade-v1';
const namespace = 'http://www.w3.org/2000/svg';
let toastTimer;

export function icon(name) {
  const svg = document.createElementNS(namespace, 'svg');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(namespace, 'use');
  use.setAttribute('href', `assets/icons.svg#${name}`);
  svg.append(use);
  return svg;
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function notify(message) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

export function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    return {
      favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(id => typeof id === 'string') : [],
      recent: Array.isArray(saved.recent) ? saved.recent.filter(item => item && typeof item.id === 'string' && Number.isFinite(item.at)) : [],
      theme: saved.theme === 'dark' ? 'dark' : 'light'
    };
  } catch {
    return { favorites: [], recent: [], theme: 'light' };
  }
}

export function savePreferences(preferences) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
    return true;
  } catch {
    notify('浏览器未允许保存记录，请检查隐私或存储设置。');
    return false;
  }
}

export function toggleFavorite(id) {
  const preferences = readPreferences();
  const enabled = !preferences.favorites.includes(id);
  preferences.favorites = enabled ? [...preferences.favorites, id] : preferences.favorites.filter(value => value !== id);
  if (!savePreferences(preferences)) return !enabled;
  notify(enabled ? '已加入收藏，喜欢的游戏随时回来玩。' : '已取消收藏');
  return enabled;
}

export function recordPlay(id) {
  const preferences = readPreferences();
  preferences.recent = [{ id, at: Date.now() }, ...preferences.recent.filter(item => item.id !== id)].slice(0, 100);
  savePreferences(preferences);
}

export function setFavoriteButton(button, id, name) {
  const active = readPreferences().favorites.includes(id);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', `${active ? '取消收藏' : '收藏'} ${name}`);
  return active;
}

export function applyTheme() {
  const dark = readPreferences().theme === 'dark';
  document.body.classList.toggle('dark', dark);
  const button = document.getElementById('theme');
  if (button) {
    button.replaceChildren(icon(dark ? 'sun' : 'moon'));
    button.setAttribute('aria-label', dark ? '切换浅色模式' : '切换深色模式');
  }
}

export async function loadGames() {
  const response = await fetch(new URL('games.json', import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error('游戏清单加载失败');
  const games = await response.json();
  if (!Array.isArray(games)) throw new Error('游戏清单格式错误');
  const ids = new Set();
  for (const game of games) {
    if (!game || !/^[a-z0-9-]+$/.test(game.id) || ids.has(game.id) || typeof game.name !== 'string' || typeof game.category !== 'string') {
      throw new Error('游戏清单包含无效或重复的游戏');
    }
    for (const key of ['entry', 'cover']) {
      if (typeof game[key] !== 'string') throw new Error('游戏清单缺少入口或封面');
      const url = new URL(game[key], import.meta.url);
      if (url.origin !== location.origin || !url.pathname.startsWith(new URL('.', import.meta.url).pathname)) {
        throw new Error('游戏入口与封面需要放在本站目录内');
      }
    }
    ids.add(game.id);
  }
  return games;
}

export function gameUrl(id) {
  const url = new URL('play.html', location.href);
  url.searchParams.set('game', id);
  url.searchParams.set('return', location.pathname + location.search);
  return url.href;
}

export function saveScroll() {
  try { sessionStorage.setItem(`arcade-scroll:${location.pathname}${location.search}`, String(window.scrollY)); } catch {}
}

export function restoreScroll() {
  try {
    const value = Number(sessionStorage.getItem(`arcade-scroll:${location.pathname}${location.search}`));
    if (Number.isFinite(value)) window.scrollTo(0, value);
  } catch {}
}
