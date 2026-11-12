import {setup,control,clockText,keyboardGrid,readSave,writeSave} from '../shared/board-ui.js';
import {newGame,findPair,reshuffle,connect,won,validSave} from './logic.js';
import {FRUITS} from '../memory/logic.js?v=20-pairs';
let state=newGame(),selected=-1,hinted=[],pathTime=0,hintTime=0,last=0,saveClock=0,buttons=[],focusAt;
const records=readSave('link:records',{});const bests=records&&typeof records==='object'&&!Array.isArray(records)?records:{};
const {ui,settings,detail}=setup({id:'link',title:'连连看',eyebrow:'LITTLE FRUIT CONNECTION',emblem:'✦',help:'相同水果可用最多两次转弯的空路连起来。\n路线可绕过棋盘边缘 · 点击选牌 · 方向键选格',restart});
document.querySelector('.scores small').textContent='已消除';document.querySelectorAll('.scores small')[1].textContent='最佳用时';
settings.innerHTML='<label for="link-level">选择难度</label><select id="link-level" aria-label="选择连连看难度"><option value="easy">轻松 · 18 对</option><option value="normal">标准 · 24 对</option><option value="hard">挑战 · 32 对</option></select>';
const difficulty=document.getElementById('link-level');
const wrap=document.createElement('div');wrap.className='link-wrap';const board=document.createElement('div');board.className='link-grid';board.setAttribute('aria-label','水果连连看棋盘');wrap.append(board);
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('link-route');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
const route=document.createElementNS('http://www.w3.org/2000/svg','polyline');svg.append(route);wrap.append(svg);ui.surface.append(wrap);
const hintButton=control(ui,'✦ 提示一对',()=>{if(ui.blocked||won(state))return;const pair=findPair(state);if(pair){hinted=[pair.a,pair.b];hintTime=1.8;selected=-1;state.hints++;ui.sound('reveal');render();save();}});
const shuffleButton=control(ui,'↻ 重新排列',()=>{if(ui.blocked||won(state))return;reshuffle(state);state.shuffles++;selected=-1;hinted=[];route.setAttribute('points','');render();save();ui.sound('rotate');ui.status('已重新排列，找找新的伙伴');});
function save(){writeSave('link:run',state);}
function best(){const v=bests[state.difficulty];return v&&Number.isFinite(v.elapsed)&&v.elapsed>=0?v:null;}
function build(){
  board.replaceChildren();board.style.setProperty('--rows',state.rows+2);board.style.setProperty('--cols',state.cols+2);svg.setAttribute('viewBox',`0 0 ${state.cols+2} ${state.rows+2}`);
  buttons=state.board.map((_,i)=>{const b=document.createElement('button');b.type='button';b.className='link-tile';b.style.gridRow=Math.floor(i/state.cols)+2;b.style.gridColumn=i%state.cols+2;
    const art=document.createElement('i');art.className='link-fruit';art.setAttribute('aria-hidden','true');b.append(art);b.addEventListener('click',()=>choose(i));board.append(b);return b;});
  focusAt=keyboardGrid(board,buttons,state.cols,i=>state.board[i]!==null);render();const first=state.board.findIndex(v=>v!==null);buttons.forEach((b,i)=>b.tabIndex=i===first?0:-1);
}
function render(){
  buttons.forEach((b,i)=>{const value=state.board[i];b.disabled=value===null;b.classList.toggle('cleared',value===null);b.classList.toggle('selected',selected===i);b.classList.toggle('hinted',hinted.includes(i));
    b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',value===null?`${i+1} 号空位`:`${i+1} 号 ${FRUITS[value]}`);
    if(value!==null)b.firstChild.style.backgroundPosition=`${value%4/3*100}% ${Math.floor(value/4)/2*100}%`;
  });
  ui.score(`${state.moves}/${state.rows*state.cols/2}`,best()?clockText(best().elapsed):'—');detail.textContent=`用时 ${clockText(state.elapsed)} · 提示 ${state.hints} · 重排 ${state.shuffles}`;
  ui.status(selected>=0?'再选一个相同水果，试试能不能连上':'看准路线，给水果找个伙伴');hintButton.disabled=shuffleButton.disabled=won(state);
}
function finish(){const previous=best();if(!previous||state.elapsed<previous.elapsed){bests[state.difficulty]={elapsed:state.elapsed};writeSave('link:records',bests);}render();save();ui.show('win','连成一座丰收果园！',`用 ${clockText(state.elapsed)} 消除了全部 ${state.moves} 对，使用 ${state.hints} 次提示、${state.shuffles} 次重排。`,'再玩一局',restart);}
function choose(index){
  if(ui.blocked||state.board[index]===null||won(state))return;state.started=true;hinted=[];
  if(selected===index){selected=-1;render();return;}
  if(selected<0){selected=index;ui.sound('flip');render();save();return;}
  const path=connect(state,selected,index);
  if(!path){selected=index;ui.sound('blocked');render();ui.status('这两张暂时连不上，换一条路线');save();return;}
  selected=-1;route.setAttribute('points',path.map(([r,c])=>`${c+.5},${r+.5}`).join(' '));pathTime=.22;ui.sound('connect');render();save();
  if(won(state)){finish();return;}
  if(!findPair(state)){reshuffle(state);state.shuffles++;render();save();ui.status('暂时无路可连，已自动重新排列');}
  const next=state.board.findIndex((v,i)=>i>index&&v!==null);focusAt(next>=0?next:state.board.findIndex(v=>v!==null));
}
function restart(){state=newGame(difficulty.value);selected=-1;hinted=[];pathTime=hintTime=saveClock=0;route.setAttribute('points','');build();save();ui.hide();ui.sound('start');}
difficulty.addEventListener('change',restart);ui.onPause(save);window.addEventListener('pagehide',save);
const saved=readSave('link:run',null);if(validSave(saved))state=saved;if(!won(state)&&!findPair(state))reshuffle(state);difficulty.value=state.difficulty;build();
if(won(state))ui.show('win','上次的果园已经收好啦',`上次用时 ${clockText(state.elapsed)}，再挑战一次吧。`,'再玩一局',restart);
else ui.show('ready',validSave(saved)?'接着连起这片果园':'让相同水果手牵手','连线最多拐两个弯，中间不能穿过其他水果。棋盘外侧的空道也可以走；遇到难题可以提示或重排。',validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
function tick(now){const dt=Math.min(.1,(now-(last||now))/1000);last=now;
  if(!ui.blocked&&!won(state)){
    if(state.started){const second=Math.floor(state.elapsed);state.elapsed+=dt;saveClock+=dt;if(Math.floor(state.elapsed)!==second)render();}
    if(pathTime>0){pathTime-=dt;svg.style.opacity=Math.max(0,pathTime/.22);if(pathTime<=0)route.setAttribute('points','');}else svg.style.opacity=1;
    if(hintTime>0){hintTime-=dt;if(hintTime<=0){hinted=[];render();}}
    if(saveClock>3){saveClock=0;save();}
  }requestAnimationFrame(tick);
}requestAnimationFrame(tick);
