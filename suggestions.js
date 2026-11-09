import { element } from './common.js';

const $ = id => document.getElementById(id);
const dialog = $('wish-dialog');
const api = new URL('./api/suggestions', import.meta.url);
let nextCursor = null;
let loading = false;
let submitting = false;
let pendingRequest = null;
let memoryVisitor = null;
let listRequest = Promise.resolve();

function uuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function visitor() {
  if (memoryVisitor) return memoryVisitor;
  const key = 'mini-arcade-visitor-v1';
  try {
    const saved = localStorage.getItem(key);
    memoryVisitor = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(saved || '') ? saved : uuid();
    localStorage.setItem(key, memoryVisitor);
  } catch { memoryVisitor ||= uuid(); }
  return memoryVisitor;
}
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { cache:'no-store', credentials:'omit', ...options, signal:controller.signal });
    if (!response.ok) {
      const message = response.status === 429 ? '请间隔一分钟再推荐，每个浏览器每天最多提交 5 条。'
        : response.status === 400 ? '请检查内容长度，标题 2–40 字，玩法介绍 5–500 字。'
        : '许愿池暂时连接不上，请稍后重试。';
      throw new Error(message);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError || error.name === 'AbortError' || error instanceof SyntaxError) throw new Error('网络连接不稳定，请重试；已填写的内容会保留。');
    throw error;
  } finally { clearTimeout(timeout); }
}
function status(id, text = '', error = false) {
  $(id).textContent = text;
  $(id).classList.toggle('error', error);
}
const dateFormat = new Intl.DateTimeFormat('zh-CN', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' });
function card(item) {
  const node = element('article', 'wish-card');
  node.dataset.id = String(item.id);
  const top = element('div', 'wish-card-top');
  const tag = element('span', `wish-tag ${item.kind === 'idea' ? 'idea' : ''}`, item.kind === 'idea' ? '脑洞玩法' : '小游戏推荐');
  const date = new Date(item.createdAt * 1000);
  const time = element('time', '', dateFormat.format(date));
  time.dateTime = date.toISOString();
  top.append(tag, time);
  const author = element('div', 'wish-author');
  const name = item.nickname || '匿名玩家';
  author.append(element('span', 'wish-avatar', Array.from(name)[0]), element('span', '', `${name} 的推荐`));
  node.append(top, element('h3', '', item.title), element('p', '', item.description), author);
  return node;
}
async function load(append = false) {
  if (loading) {
    try { await listRequest; } catch {}
    return load(append);
  }
  loading = true;
  $('refresh-wishes').disabled = true;
  $('more-wishes').disabled = true;
  status('wish-status', append ? '正在读取更多推荐…' : '正在打开大家的许愿池…');
  try {
    const url = new URL(api);
    if (append && nextCursor) url.searchParams.set('before', nextCursor);
    listRequest = request(url);
    const data = await listRequest;
    if (!Array.isArray(data.items) || !Number.isSafeInteger(data.total)) throw new Error('推荐数据读取失败，请点击刷新重试。');
    const cards = data.items.map(card);
    if (!append) $('wish-list').replaceChildren();
    $('wish-list').append(...cards);
    nextCursor = data.nextCursor;
    $('wish-count').textContent = data.total;
    $('wish-empty').hidden = data.total !== 0;
    $('more-wishes').hidden = !nextCursor;
    status('wish-status');
  } catch (error) {
    status('wish-status', error.message + ' 点击「刷新推荐」可重新加载。', true);
  } finally {
    loading = false;
    $('refresh-wishes').disabled = false;
    $('more-wishes').disabled = false;
  }
}
function showBoard() {
  $('wish-compose').hidden = true;
  $('wish-board').hidden = false;
  dialog.scrollTop = 0;
  $('write-wish').focus();
}
$('open-wishes').addEventListener('click', () => {
  dialog.showModal();
  load();
});
$('close-wishes').addEventListener('click', () => dialog.close());
$('write-wish').addEventListener('click', () => {
  $('wish-board').hidden = true;
  $('wish-compose').hidden = false;
  dialog.scrollTop = 0;
  $('wish-name').focus();
});
$('back-to-wishes').addEventListener('click', showBoard);
$('refresh-wishes').addEventListener('click', () => load());
$('more-wishes').addEventListener('click', () => load(true));
$('wish-description').addEventListener('input', () => { $('wish-length').textContent = `${$('wish-description').value.length} / 500`; });
$('wish-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  const fields = Object.fromEntries(new FormData(event.currentTarget));
  for (const key of ['title', 'description', 'nickname']) fields[key] = fields[key].trim();
  if (Array.from(fields.title).length < 2 || Array.from(fields.description).length < 5) {
    status('wish-form-status', '标题请至少填写 2 个字，玩法介绍至少 5 个字（不含首尾空格）。', true);
    return;
  }
  const signature = JSON.stringify(fields);
  if (pendingRequest?.signature !== signature) pendingRequest = { signature, id:uuid() };
  submitting = true;
  $('submit-wish').disabled = true;
  $('submit-wish').textContent = '正在提交…';
  // Freeze fields while submitting so a successful response cannot erase new edits.
  const controls = [...$('wish-form').querySelectorAll('input, textarea')];
  controls.forEach(control => { control.disabled = true; });
  status('wish-form-status');
  try {
    const item = await request(api, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...fields, visitorId:visitor(), requestId:pendingRequest.id }) });
    if (!Number.isSafeInteger(item.id)) throw new Error('提交结果未确认，请重试。');
    pendingRequest = null;
    $('wish-form').reset();
    $('wish-length').textContent = '0 / 500';
    showBoard();
    await load();
    if (!$("wish-list").querySelector(`[data-id="${item.id}"]`)) $('wish-list').prepend(card(item));
    $('wish-empty').hidden = true;
    status('wish-status', '推荐已收到，已经出现在大家的许愿池里。');
  } catch (error) { status('wish-form-status', error.message, true); }
  finally {
    submitting = false;
    controls.forEach(control => { control.disabled = false; });
    $('submit-wish').disabled = false;
    $('submit-wish').textContent = '提交推荐 ↗';
  }
});
