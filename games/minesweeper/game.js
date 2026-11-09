import { decoratePuzzle } from '../shared/puzzle-art.js?v=art-1';
import { createUI, readSave, writeSave } from '../shared/ui.js?v=puzzles-1';
import { difficulties, createBoard, reveal, flag, validSave } from './logic.js';
let state = readSave('minesweeper:run', null);
const restored = validSave(state);
if (!restored) state = createBoard();
let flagMode = false, lastTick = performance.now();
const storedRecords = readSave('minesweeper:records', {});
const records = storedRecords && typeof storedRecords === 'object' && !Array.isArray(storedRecords) ? storedRecords : {};
const ui = createUI({title:'扫雷',eyebrow:'MINT GARDEN',help:'点击翻开 · 右键或 F 插旗 · 方向键选格 · 数字周围旗数正确时再次点击可快速展开',theme:'minesweeper',onStart:()=>ui.hide(),onRestart:restart});
document.title='扫雷 · 小游戏大厅';
const labels=document.querySelectorAll('.scores small'); labels[0].textContent='剩余雷数'; labels[1].textContent='用时';
const settings=document.createElement('div'); settings.className='puzzle-settings';
settings.innerHTML='<label>难度 <select id="difficulty" aria-label="扫雷难度"></select></label><button id="flag-mode" aria-pressed="false">⚑ 插旗模式</button><span id="record" class="level-note"></span>';
ui.arena.before(settings);
const select=settings.querySelector('select');
for (const [key,value] of Object.entries(difficulties)) { const option=new Option(`${value.label} ${value.size}×${value.size}`,key); select.add(option); }
select.value=state.difficulty;
const scroller=document.createElement('div'); scroller.className='mine-scroll';
const grid=document.createElement('div'); grid.className='mine-board'; grid.setAttribute('role','group'); grid.setAttribute('aria-label','扫雷棋盘'); scroller.append(grid); ui.surface.append(scroller);
const note=document.createElement('p'); note.className='puzzle-note'; ui.arena.after(note);
let buttons=[];
function save() { writeSave('minesweeper:run',state); }
function time(seconds) { const n=Math.floor(seconds); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
function render(flipped=[],planted=-1) {
  if (buttons.length!==state.cells.length) {
    grid.replaceChildren(); buttons=state.cells.map((_,i)=>{
      const b=document.createElement('button'); b.className='mine-cell'; b.type='button'; b.dataset.index=i;
      b.addEventListener('click',()=>act(i,flagMode));
      b.addEventListener('contextmenu',event=>{event.preventDefault(); act(i,true);});
      b.addEventListener('keydown',event=>{
        const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-state.size,ArrowDown:state.size};
        if (event.key in offsets) { event.preventDefault(); buttons[Math.max(0,Math.min(buttons.length-1,i+offsets[event.key]))].focus(); }
        if (event.code==='KeyF') {event.preventDefault(); if(!event.repeat) act(i,true);}
      }); grid.append(b); return b;
    });
  }
  grid.style.gridTemplateColumns=`repeat(${state.size},1fr)`; grid.classList.toggle('dense',state.size===16);
  buttons.forEach((b,i)=>{
    const mine=state.cells[i]===-1, open=state.open[i], exposed=state.result==='lost'&&mine;
    b.className=`mine-cell${open?' revealed':''}${state.flags[i]?' flagged':''}${exposed?' mine revealed':''}${state.exploded===i?' exploded':''}${state.result==='lost'&&state.flags[i]&&!mine?' wrong-flag':''}${flipped.includes(i)?' flipped':''}${planted===i?' planted':''}`;
    b.dataset.number=open?state.cells[i]:'';
    b.textContent=exposed?'✹':state.flags[i]?(state.result==='lost'&&!mine?'×':'⚑'):open?(state.cells[i]||''):'';
    b.setAttribute('aria-label',`${Math.floor(i/state.size)+1}行${i%state.size+1}列，${exposed?'地雷':state.flags[i]?'已插旗':open?state.cells[i]===0?'空白':`周围 ${state.cells[i]} 颗雷`:'未翻开'}`);
  });
  ui.score(state.mines-state.flags.filter(Boolean).length,time(state.elapsed));
  const best=records[state.difficulty]; document.getElementById('record').textContent=Number.isFinite(best)?`最佳 ${time(best)}`:'首点安全';
  ui.status(state.result==='won'?'全部安全格已找到！':state.result==='lost'?'踩到地雷了，点“新一局”再试试':state.started?'仔细看数字，安全走下一步':'第一步及周围不会有雷，放心点开');
  note.textContent=state.size===16?'高级棋盘可左右滑动查看；手机请切换插旗模式标记地雷。':'手机点击翻开；先点“插旗模式”，再点格子即可标记。';
}
function finish() {
  if (state.result==='won') {
    if (!Number.isFinite(records[state.difficulty]) || state.elapsed<records[state.difficulty]) {records[state.difficulty]=state.elapsed;writeSave('minesweeper:records',records);}
    save(); render(); art.celebrate(); ui.show('win','安全过关！',`${difficulties[state.difficulty].label}用时 ${time(state.elapsed)}，全部安全格已找到。`,'查看棋盘',()=>ui.hide());
  } else if (state.result==='lost') { ui.show('over','差一点就成功了',`本局用时 ${time(state.elapsed)}，看看地雷的位置，再挑战一次。`,'查看棋盘',()=>ui.hide()); }
}
function act(index,mark) {
  if (ui.blocked || state.result) return;
  const previous=[...state.open];
  const changed=mark?flag(state,index):reveal(state,index);
  if (!changed) return;
  ui.sound(mark?'flag':'reveal'); save(); render(state.open.flatMap((open,i)=>open&&!previous[i]?[i]:[]),mark&&state.flags[index]?index:-1); if (state.result) finish();
}
function restart() { state=createBoard(select.value); flagMode=false; updateFlag(); lastTick=performance.now(); ui.hide(); save(); render(); ui.sound('start'); }
function updateFlag() { const b=document.getElementById('flag-mode'); b.setAttribute('aria-pressed',String(flagMode)); b.textContent=flagMode?'⚑ 插旗中 · 点此翻开':'⚑ 插旗模式'; }
document.getElementById('flag-mode').addEventListener('click',()=>{flagMode=!flagMode;updateFlag();ui.sound('flag');});
select.addEventListener('change',restart);
setInterval(()=>{const now=performance.now(); if(state.started&&!state.result&&!ui.blocked&&!document.hidden) {state.elapsed+=(now-lastTick)/1000;ui.score(state.mines-state.flags.filter(Boolean).length,time(state.elapsed));} lastTick=now;},250);
ui.onPause(save); window.addEventListener('pagehide',save);
const art=decoratePuzzle(ui,'minesweeper');
render();
if (restored&&state.started&&!state.result) ui.show('paused','继续上次的扫雷',`${difficulties[state.difficulty].label}，已用时 ${time(state.elapsed)}。`,'继续游戏',()=>{lastTick=performance.now();ui.hide();});
