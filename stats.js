// Counts are shared by all visitors through the same-origin service.
const api = new URL('./api/', import.meta.url);
const visitorKey = 'mini-arcade-visitor-v1';
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function visitor() {
  try {
    let id = localStorage.getItem(visitorKey);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id || '')) {
      id = uuid(); localStorage.setItem(visitorKey, id);
    }
    return id;
  } catch { return null; } // Visits still count; unidentifiable visitors are not invented.
}

export function mountStats(container, page = 'lobby') {
  if (!container || container.dataset.mounted) return;
  container.dataset.mounted = 'true';
  const site = page === 'lobby';
  container.innerHTML = `<div class="stats-caption"><span class="stats-dot" aria-hidden="true"></span><span>${site ? '大厅访问统计' : '本游戏访问统计'}</span></div>
    <dl class="stats-values"><div><dt>今日访问</dt><dd data-count="today">—</dd></div><div><dt>总访问</dt><dd data-count="total">—</dd></div><div><dt>${site ? '今日访客' : '今日玩家'}</dt><dd data-count="visitorsToday">—</dd></div></dl>
    <p class="stats-status" role="status">正在读取统计…</p><button class="stats-retry text-button" hidden>重试统计</button>`;
  const status = container.querySelector('.stats-status');
  const retry = container.querySelector('.stats-retry');
  const eventId = uuid();
  const visitorId = visitor();
  let recorded = false;
  let busy = false;
  let destroyed = false;
  const formatter = new Intl.NumberFormat('zh-CN');
  async function refresh() {
    if (busy || destroyed) return;
    busy = true; retry.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const endpoint = new URL(recorded ? `stats?page=${encodeURIComponent(page)}` : 'visits', api);
      const options = { signal: controller.signal, cache: 'no-store', credentials: 'omit' };
      if (!recorded) Object.assign(options, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({page, eventId, visitorId}) });
      const response = await fetch(endpoint, options);
      if (!response.ok) throw new Error('Statistics unavailable');
      const data = await response.json();
      const counts = site ? data.site : data.page;
      if (!counts || !['today', 'total', 'visitorsToday'].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0)) throw new Error('Invalid counts');
      recorded = true;
      for (const key of ['today', 'total', 'visitorsToday']) container.querySelector(`[data-count="${key}"]`).textContent = formatter.format(counts[key]);
      status.textContent = ''; status.hidden = true;
    } catch {
      status.hidden = false; status.textContent = '统计暂不可用，游戏仍可正常游玩。';
      retry.hidden = false;
    } finally { clearTimeout(timeout); busy = false; }
  }
  retry.addEventListener('click', refresh);
  const poll = () => setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  let timer = poll();
  window.addEventListener('pagehide', () => { destroyed = true; clearInterval(timer); });
  window.addEventListener('pageshow', event => { if (event.persisted) { destroyed = false; timer = poll(); refresh(); } });
  refresh();
}
