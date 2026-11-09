import { icon, element, notify, readPreferences, savePreferences, toggleFavorite, setFavoriteButton, applyTheme, loadGames, gameUrl, saveScroll, restoreScroll } from './common.js?v=breakout-50';
import { mountStats } from './stats.js?v=visits-1';

const grid = document.getElementById('game-grid');
const search = document.getElementById('search');
const sort = document.getElementById('sort');
const empty = document.getElementById('empty');
let games = [];
let state;

function readState() {
  const query = new URLSearchParams(location.search);
  return {
    view: ['all', 'recent', 'favorites'].includes(query.get('view')) ? query.get('view') : 'all',
    query: (query.get('q') || '').slice(0, 100),
    category: query.get('category') || '全部',
    sort: query.get('sort') === 'name' ? 'name' : 'added'
  };
}

function updateUrl() {
  const url = new URL(location.href);
  url.search = '';
  for (const [key, value] of Object.entries({ view: state.view, q: state.query, category: state.category, sort: state.sort })) {
    if (value && !['all', '全部', 'added'].includes(value)) url.searchParams.set(key, value);
  }
  history.replaceState(null, '', url);
}

function favoriteControl(game) {
  const button = element('button', 'favorite-button');
  button.append(icon('heart'));
  setFavoriteButton(button, game.id, game.name);
  button.addEventListener('click', () => {
    toggleFavorite(game.id);
    if (state.view === 'favorites') {
      render();
    } else {
      setFavoriteButton(button, game.id, game.name);
    }
  });
  return button;
}

function createCard(game) {
  const card = element('article', 'game-card');
  const link = element('a', 'game-cover');
  link.href = gameUrl(game.id);
  link.setAttribute('aria-label', `开始玩 ${game.name}`);
  link.addEventListener('click', saveScroll);
  const cover = element('img');
  cover.src = game.cover;
  cover.alt = '';
  cover.width = 400;
  cover.height = 400;
  if (game.coverPosition) {
    cover.classList.add('cover-atlas');
    cover.style.left = `${-game.coverPosition[0] * 100}%`;
    cover.style.top = `${-game.coverPosition[1] * 100}%`;
  }
  link.append(cover, element('span', 'cover-badge', '已收录'));
  if (game.titleArt) {
    const title = element('img', 'title-art');
    title.src = game.titleArt;
    title.alt = '';
    link.append(title);
  }
  const play = element('span', 'play-bubble');
  play.append(icon('arrow'));
  link.append(play);
  const bottom = element('div', 'card-bottom');
  const copy = element('div', 'card-copy');
  const title = element('a');
  title.href = link.href;
  title.addEventListener('click', saveScroll);
  title.append(element('h3', '', game.name));
  copy.append(title, element('p', '', [game.category, game.subtitle].filter(Boolean).join(' · ')));
  const tools = element('div', 'card-tools');
  for (const device of game.devices || []) {
    if (!['keyboard', 'touch'].includes(device)) continue;
    const badge = element('span');
    badge.title = device === 'keyboard' ? '支持键盘操作' : '支持触屏操作';
    badge.setAttribute('aria-label', badge.title);
    const symbol = icon(device);
    symbol.classList.add('device-icon');
    badge.append(symbol);
    tools.append(badge);
  }
  tools.append(favoriteControl(game));
  bottom.append(copy, tools);
  card.append(link, bottom);
  return card;
}

function renderFeatured() {
  const container = document.getElementById('featured');
  const game = games.find(item => item.featured);
  container.hidden = !game || state.view !== 'all' || Boolean(state.query) || state.category !== '全部';
  if (container.hidden) return;
  const image = element('img', 'featured-art');
  image.src = game.featuredCover || game.cover;
  image.alt = '';
  const copy = element('div', 'featured-copy');
  copy.append(element('p', 'eyebrow', '精选游戏 · FEATURED'), element('h2', '', game.name), element('p', '', game.description));
  const link = element('a', 'button primary', '开始游戏');
  link.href = gameUrl(game.id);
  link.append(icon('arrow'));
  link.addEventListener('click', saveScroll);
  container.replaceChildren(image, copy, link);
}

function renderCategories() {
  const categories = ['全部', ...new Set(games.map(game => game.category))];
  if (!categories.includes(state.category)) state.category = '全部';
  document.getElementById('categories').replaceChildren(...categories.map(category => {
    const button = element('button', 'chip', category);
    button.textContent = category;
    button.setAttribute('aria-pressed', String(category === state.category));
    button.addEventListener('click', () => {
      state.category = category;
      updateUrl();
      render();
    });
    return button;
  }));
}

function render() {
  const preferences = readPreferences();
  search.value = state.query;
  sort.value = state.sort;
  for (const link of document.querySelectorAll('[data-view]')) {
    const active = link.dataset.view === state.view;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const names = { all: '全部游戏', favorites: '我的收藏', recent: '最近玩过' };
  const query = state.query.trim().toLocaleLowerCase();
  const result = games.filter(game => {
    const inView = state.view === 'favorites' ? preferences.favorites.includes(game.id) : state.view === 'recent' ? preferences.recent.some(item => item.id === game.id) : true;
    return inView && (state.category === '全部' || state.category === game.category) && [game.name, game.category, game.subtitle, game.description].join(' ').toLocaleLowerCase().includes(query);
  });
  result.sort((a, b) => {
    if (state.sort === 'name') return a.name.localeCompare(b.name, 'zh-CN');
    if (state.view === 'recent') return preferences.recent.find(item => item.id === b.id).at - preferences.recent.find(item => item.id === a.id).at;
    return String(b.added || '').localeCompare(String(a.added || ''));
  });
  sort.options[0].textContent = state.view === 'recent' ? '最近游玩' : '最近加入';
  document.getElementById('list-title').replaceChildren(document.createTextNode(names[state.view] + ' '), element('span', '', String(result.length)));
  grid.replaceChildren(...result.map(createCard));
  empty.hidden = result.length > 0;
  const filtered = Boolean(query) || state.category !== '全部';
  document.getElementById('empty-title').textContent = filtered ? '暂时没有找到这款游戏' : state.view === 'favorites' ? '把喜欢的游戏留在这里' : state.view === 'recent' ? '你的第一场冒险，即将开始' : '游戏正在准备中';
  document.getElementById('empty-text').textContent = filtered ? '换个关键词，或看看全部游戏。' : state.view === 'favorites' ? '点击游戏卡片上的爱心，就能在这里找到它。' : '去大厅挑一款游戏，玩一局吧。';
  renderCategories();
  renderFeatured();
}

state = readState();
applyTheme();
document.getElementById('theme').addEventListener('click', () => {
  const preferences = readPreferences();
  preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
  if (savePreferences(preferences)) applyTheme();
});
search.addEventListener('input', () => { state.query = search.value; updateUrl(); render(); });
document.getElementById('search-form').addEventListener('submit', event => event.preventDefault());
sort.addEventListener('change', () => { state.sort = sort.value; updateUrl(); render(); });
document.getElementById('reset-filter').addEventListener('click', () => {
  state = { view: 'all', query: '', category: '全部', sort: 'added' };
  updateUrl();
  render();
});
for (const link of document.querySelectorAll('[data-view]')) {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    state = { view: link.dataset.view, query: '', category: '全部', sort: 'added' };
    updateUrl();
    render();
    window.scrollTo(0, 0);
  });
}
window.addEventListener('storage', () => { applyTheme(); render(); });
window.addEventListener('popstate', () => { state = readState(); render(); restoreScroll(); });
window.addEventListener('pagehide', saveScroll);
window.addEventListener('pageshow', event => { if (event.persisted) { render(); restoreScroll(); } });

try {
  games = await loadGames();
  mountStats(document.getElementById('visit-stats'));
  document.getElementById('loading').hidden = true;
  render();
  requestAnimationFrame(restoreScroll);
} catch {
  document.getElementById('loading').textContent = '游戏列表暂时加载失败，请刷新重试。请通过 HTTP 网站地址访问此页面。';
  notify('请确认 games.json 已上传到网站目录。');
}
