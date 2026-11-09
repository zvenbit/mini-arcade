import { decoratePuzzle, animateMove } from '../shared/puzzle-art.js?v=art-1';
import { createUI, readSave, writeSave, directionControls, swipeControls, keyDirections } from '../shared/ui.js?v=puzzles-1';
import { levels } from './levels.js';
import { parseLevel, step, isWon, inCorner, validState } from './logic.js';
let saved=readSave('sokoban:progress',{})||{};
let unlocked=Number.isInteger(saved.unlocked)?Math.max(0,Math.min(levels.length-1,saved.unlocked)):0;
let current=Number.isInteger(saved.current)?Math.max(0,Math.min(unlocked,saved.current)):0;
let best=saved.best&&typeof saved.best==='object'?saved.best:{};
let level=parseLevel(levels[current].rows), state, history=[];
const ui=createUI({title:'推箱子',eyebrow:'LANTERN WORKSHOP',help:'方向键 / WASD 或滑动移动 · Z 撤销 · R 重开 · 箱子只能推，不能拉',theme:'sokoban',onStart:()=>ui.hide(),onRestart:restart});
document.title='推箱子 · 小游戏大厅';
const labels=document.querySelectorAll('.scores small');labels[0].textContent='步数';labels[1].textContent='推动';
document.getElementById('restart').textContent='重开本关';
const settings=document.createElement('div');settings.className='puzzle-settings';settings.innerHTML='<label>关卡 <select id="level" aria-label="推箱子关卡"></select></label><button id="undo">↶ 撤销</button><span class="level-note" id="level-best"></span>';
ui.arena.before(settings);
const select=settings.querySelector('select');
levels.forEach((entry,i)=>select.add(new Option(`${String(i+1).padStart(2,'0')} · ${entry.name}`,i)));
const board=document.createElement('div');board.className='sokoban-board';board.setAttribute('role','img');ui.surface.append(board);
let cells=[], facing='right';
function initial() { return {player:level.player,boxes:[...level.boxes],moves:0,pushes:0}; }
function save() { writeSave('sokoban:progress',{unlocked,current,best,state,history:history.slice(-500)}); }
function render() {
  board.dataset.width=level.width;
  board.style.gridTemplateColumns=`repeat(${level.width},1fr)`;
  if(cells.length!==level.width*level.height) {
    board.replaceChildren();cells=Array.from({length:level.width*level.height},()=>{const cell=document.createElement('div');cell.setAttribute('aria-hidden','true');board.append(cell);return cell;});
  }
  cells.forEach((cell,i)=>{
    const box=state.boxes.includes(i),goal=level.goals.includes(i);
    cell.className=`soko-cell${level.walls.includes(i)?' wall':''}${goal?' goal':''}${box&&goal?' on-goal':''}`;
    cell.replaceChildren();
    if(box){const crate=document.createElement('span');crate.className='crate';cell.append(crate);}
    if(state.player===i){const worker=document.createElement('span');worker.className=`worker${facing==='left'?' facing-left':''}`;const sprite=document.createElement('span');sprite.className='worker-art';worker.append(sprite);cell.append(worker);}
  });
  const placed=state.boxes.filter(i=>level.goals.includes(i)).length;
  board.setAttribute('aria-label',`第 ${current+1} 关棋盘，工人在 ${Math.floor(state.player/level.width)+1} 行 ${state.player%level.width+1} 列，已归位 ${placed}/${state.boxes.length} 个箱子`);
  ui.score(state.moves,state.pushes);
  ui.status(inCorner(level,state)?'箱子卡在角落了，点“撤销”可以退回。':`第 ${current+1} / ${levels.length} 关 · 已归位 ${placed}/${state.boxes.length}`);
  select.value=current;[...select.options].forEach((option,i)=>{option.disabled=i>unlocked;option.textContent=`${String(i+1).padStart(2,'0')} · ${levels[i].name}${i>unlocked?' 🔒':''}`;});
  document.getElementById('undo').disabled=!history.length;
  document.getElementById('level-best').textContent=Number.isSafeInteger(best[current])?`最佳 ${best[current]} 步`:'把木箱推上金色圆点';
}
function finish() {
  if(!isWon(level,state))return;
  if(!Number.isSafeInteger(best[current])||state.moves<best[current])best[current]=state.moves;
  unlocked=Math.max(unlocked,Math.min(levels.length-1,current+1));save();render();art.celebrate();
  ui.show('win',current===levels.length-1?'仓库整理大师！':'整理得漂亮！',`第 ${current+1} 关用了 ${state.moves} 步、推动 ${state.pushes} 次。${current===levels.length-1?'所有关卡已解锁，可回头挑战更少步数。':''}`,current===levels.length-1?'再挑战本关':'下一关',()=>load(current===levels.length-1?current:current+1));
}
function load(index) { current=index;level=parseLevel(levels[current].rows);state=initial();history=[];ui.hide();save();render();ui.sound('start'); }
function restart(){load(current);}
function move(direction) {
  if(ui.blocked||isWon(level,state))return;
  const before=state;
  if(direction==='left'||direction==='right')facing=direction;
  const next=step(level,state,direction);if(!next){ui.sound('blocked');return;}
  history.push({player:state.player,boxes:[...state.boxes],moves:state.moves,pushes:state.pushes});if(history.length>500)history.shift();state=next;
  ui.sound(next.pushed?'push':'move');save();render();animateMove(board,before,state);finish();
}
function undo() {
  if(!history.length || (ui.blocked&&ui.mode!=='win'))return;
  state=history.pop();ui.hide();save();render();ui.sound('undo');
}
select.addEventListener('change',()=>{const next=Number(select.value);if(next>=0&&next<=unlocked)load(next);});
document.getElementById('undo').addEventListener('click',undo);
directionControls(ui.controls,move);swipeControls(board,move);
document.addEventListener('keydown',event=>{
  if(event.target.closest('select,input'))return;
  if(keyDirections[event.code]){event.preventDefault();move(keyDirections[event.code]);}
  else if(event.code==='KeyZ'){event.preventDefault();if(!event.repeat)undo();}
  else if(event.code==='KeyR'){event.preventDefault();if(!event.repeat)restart();}
});
if(validState(level,saved.state)) {
  state=saved.state;
  if(Array.isArray(saved.history)&&saved.history.every(s=>validState(level,s)))history=saved.history.slice(-500);
} else state=initial();
const art=decoratePuzzle(ui,'sokoban');
render();if(isWon(level,state))finish();
