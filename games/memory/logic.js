export const DIFFICULTIES = { easy:6, normal:8, hard:12, expert:15, master:20 };
export const FRUITS = ['草莓','菠萝','橙子','葡萄','苹果','梨','柠檬','樱桃','西瓜','蓝莓','蜜桃','香蕉','猕猴桃','火龙果','椰子','牛油果','芒果','木瓜','荔枝','无花果'];
export function newGame(difficulty = 'easy', rng = Math.random) {
  if (!DIFFICULTIES[difficulty]) difficulty = 'easy';
  const fruits = Array.from({length:DIFFICULTIES[difficulty] <= 12 ? 12 : FRUITS.length}, (_,i) => i);
  function shuffle(items) {
    for (let i=items.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
    return items;
  }
  const chosen = shuffle(fruits).slice(0,DIFFICULTIES[difficulty]);
  const deck = shuffle([...chosen,...chosen]);
  return { version:1, difficulty, deck, matched:deck.map(() => false), open:[], turns:0, elapsed:0, started:false };
}
export function flip(state, index) {
  if (!Number.isInteger(index) || index<0 || index>=state.deck.length || state.matched[index] || state.open.includes(index) || state.open.length === 2 || won(state)) return 'ignored';
  state.started = true;
  state.open.push(index);
  if (state.open.length === 1) return 'flip';
  state.turns++;
  const [a,b] = state.open;
  if (state.deck[a] !== state.deck[b]) return 'miss';
  state.matched[a] = state.matched[b] = true;
  state.open = [];
  return won(state) ? 'win' : 'match';
}
export function conceal(state) { state.open = []; }
export function won(state) { return state.matched.every(Boolean); }
export function validSave(s) {
  if (!s || s.version !== 1 || !Object.hasOwn(DIFFICULTIES,s.difficulty) || !Array.isArray(s.deck) || s.deck.length !== DIFFICULTIES[s.difficulty]*2) return false;
  if (!s.deck.every(n=>Number.isInteger(n) && n>=0 && n<FRUITS.length)) return false;
  const unique = new Set(s.deck);
  if (unique.size !== DIFFICULTIES[s.difficulty] || [...unique].some(n => s.deck.filter(v=>v===n).length !== 2)) return false;
  if (!Array.isArray(s.matched) || s.matched.length !== s.deck.length || !s.matched.every(v=>typeof v==='boolean')) return false;
  if ([...unique].some(n => s.deck.filter((v,i)=>v===n && s.matched[i]).length === 1)) return false;
  if (!Array.isArray(s.open) || s.open.length>2 || new Set(s.open).size!==s.open.length || !s.open.every(i=>Number.isInteger(i) && i>=0 && i<s.deck.length && !s.matched[i])) return false;
  if (s.open.length===2 && s.deck[s.open[0]]===s.deck[s.open[1]]) return false;
  return Number.isSafeInteger(s.turns) && s.turns>=s.matched.filter(Boolean).length/2 && Number.isFinite(s.elapsed) && s.elapsed>=0 && typeof s.started==='boolean' && (s.started || (s.turns===0 && s.open.length===0 && s.elapsed===0));
}
