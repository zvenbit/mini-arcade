import {setup,control,clockText,readSave,writeSave} from '../shared/board-ui.js';
import {newGame,move,undo,solved,validSave,neighbors,keyboardTarget} from './logic.js?v=2';
let state=newGame(),last=0,saveClock=0,buttons=[];
const records=readSave('sliding:records',{});const bests=records&&typeof records==='object'&&!Array.isArray(records)?records:{};
const {ui,settings,detail}=setup({id:'sliding',title:'数字华容道',eyebrow:'LITTLE NUMBER WORKSHOP',emblem:'8',help:'点击空格旁的数字，把它滑进空位。\n按从左到右、从上到下排好 · 方向键控制数字块滑动方向',restart});
document.querySelector('.scores small').textContent='步数';document.querySelectorAll('.scores small')[1].textContent='最佳步数';
settings.innerHTML='<label for="puzzle-size">棋盘大小</label><select id="puzzle-size" aria-label="选择华容道大小"><option value="3">轻松 · 3 × 3</option><option value="4">挑战 · 4 × 4</option></select>';
const sizeSelect=document.getElementById('puzzle-size');
const board=document.createElement('div');board.className='sliding-grid';board.setAttribute('aria-label','数字滑块棋盘');ui.surface.append(board);
const undoButton=control(ui,'↶ 撤销一步',()=>{if(!undo(state))return;ui.hide();render();save();ui.sound('undo');});
const goal=document.createElement('div');goal.className='puzzle-goal';settings.append(goal);
function save(){writeSave('sliding:run',state);}
function best(){const value=bests[state.size];return value&&Number.isSafeInteger(value.steps)&&value.steps>0?value:null;}
function build(){
  board.replaceChildren();board.style.setProperty('--size',state.size);board.dataset.size=state.size;
  buttons=Array.from({length:state.size*state.size},(_,value)=>{
    const b=document.createElement('button');b.type='button';b.className='number-tile';b.textContent=value||'';b.dataset.number=value;
    b.setAttribute('aria-label',value?`数字 ${value}`:'空位');if(!value){b.disabled=true;b.setAttribute('aria-hidden','true');}
    b.addEventListener('click',()=>choose(state.board.indexOf(value)));board.append(b);return b;
  });
  goal.replaceChildren();const label=document.createElement('small');label.textContent='目标顺序';goal.append(label);const sample=document.createElement('div');sample.style.setProperty('--size',state.size);
  for(let i=1;i<=state.board.length;i++){const span=document.createElement('span');span.textContent=i===state.board.length?'':i;sample.append(span);}goal.append(sample);render();
}
function render(){
  const blank=state.board.indexOf(0),available=neighbors(blank,state.size);let correct=0;
  state.board.forEach((value,index)=>{const b=buttons[value];b.style.setProperty('--x',index%state.size);b.style.setProperty('--y',Math.floor(index/state.size));
    b.classList.toggle('in-place',value>0&&value===index+1);b.classList.toggle('movable',available.includes(index));b.setAttribute('aria-disabled',String(!available.includes(index)||solved(state.board)));
    if(value&&value===index+1)correct++;
  });
  ui.score(state.steps,best()?.steps??'—');detail.textContent=`用时 ${clockText(state.elapsed)} · 已归位 ${correct} / ${state.board.length-1}`;
  ui.status(solved(state.board)?'全部归位，整理得真漂亮':'点击亮起的数字，滑入空位');undoButton.disabled=!state.history.length;
}
function finish(){
  const previous=best();if(!previous||state.steps<previous.steps||state.steps===previous.steps&&state.elapsed<previous.elapsed){bests[state.size]={steps:state.steps,elapsed:state.elapsed};writeSave('sliding:records',bests);}
  render();save();ui.show('win','数字都回家啦！',`用 ${state.steps} 步、${clockText(state.elapsed)} 完成 ${state.size} × ${state.size} 拼图。`,'再玩一局',restart);
}
function choose(index){if(ui.blocked||!move(state,index))return;ui.sound('slide');render();save();if(solved(state.board))finish();}
function restart(){state=newGame(Number(sizeSelect.value));saveClock=0;build();save();ui.hide();ui.sound('start');}
sizeSelect.addEventListener('change',restart);
document.addEventListener('keydown',event=>{
  if(ui.blocked||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('select,input'))return;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))return;
  event.preventDefault();const target=keyboardTarget(state,event.code);if(target!==-1)choose(target);
});
ui.onPause(save);window.addEventListener('pagehide',save);const saved=readSave('sliding:run',null);if(validSave(saved))state=saved;sizeSelect.value=state.size;build();
if(solved(state.board))ui.show('win','上次的拼图完成啦',`上次用了 ${state.steps} 步，准备好挑战下一局了吗？`,'再玩一局',restart);
else ui.show('ready',validSave(saved)?'接着整理这块拼图':'把数字送回家',`将 1～${state.board.length-1} 按顺序排列，最后一个位置留空。每局都由合法移动打乱，保证有解。`,validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
function tick(now){const dt=Math.min(.1,(now-(last||now))/1000);last=now;if(!ui.blocked&&!solved(state.board)&&state.started){const second=Math.floor(state.elapsed);state.elapsed+=dt;saveClock+=dt;if(Math.floor(state.elapsed)!==second)render();if(saveClock>3){saveClock=0;save();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
