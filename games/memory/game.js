import {createUI,readSave,writeSave} from '../shared/ui.js?v=blocks-memory-1';
import {THEMES,playingCard,cardLabel,storageKeys} from './themes.js';
import {frame} from '../shared/collection-ui.js';
import {newGame,flip,conceal,won,validSave,DIFFICULTIES} from './logic.js?v=20-pairs';
let state=newGame();
let pending=0, last=0, saveClock=0;
let theme=readSave('memory:theme','cards');
if(!Object.hasOwn(THEMES,theme))theme='cards';
function readRecords(){const value=readSave(storageKeys(theme).records,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
let bests=readRecords();
const ui=createUI({title:'翻牌配对',eyebrow:THEMES[theme].eyebrow,theme:'memory',help:'翻开两张相同的水果卡，找到全部配对。\n点击 / 轻触翻牌 · 方向键选牌 · P 暂停',onStart:()=>ui.hide(),onRestart:restart});
const panel=frame(ui,'pineapple');
document.querySelector('.scores small').textContent='步数';
document.querySelectorAll('.scores small')[1].textContent='最佳步数';
const settings=document.createElement('div');settings.className='memory-settings';
settings.innerHTML='<label for="card-theme">牌面主题</label><select id="card-theme" aria-label="选择牌面主题"><option value="cards">经典纸牌</option><option value="fruits">缤纷果园</option></select><label for="difficulty">选择难度</label><select id="difficulty" aria-label="选择翻牌难度"><option value="easy">轻松 · 6 对</option><option value="normal">标准 · 8 对</option><option value="hard">挑战 · 12 对</option><option value="expert">进阶 · 15 对</option><option value="master">大师 · 20 对</option></select><div class="memory-progress"><span id="pair-count">0 / 6 对</span><span id="memory-time">0:00</span></div><div class="progress-track"><i id="pair-progress"></i></div><p>主题各自保存进度 · 切换难度开始新局</p>';
panel.insertBefore(settings,ui.controls);
ui.controls.hidden=true;
const select=document.getElementById('difficulty');
const themeSelect=document.getElementById('card-theme');
const board=document.createElement('div');board.className='memory-board';board.setAttribute('aria-label','水果配对棋盘');ui.surface.append(board);
let buttons=[];
const time=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
function save(){writeSave(storageKeys(theme).run,state);}
function record(){const value=bests[state.difficulty];return value&&Number.isSafeInteger(value.turns)&&value.turns>=DIFFICULTIES[state.difficulty]&&Number.isFinite(value.elapsed)&&value.elapsed>=0?value:null;}
function stats(){
  const paired=state.matched.filter(Boolean).length/2;
  ui.score(state.turns,record()?.turns??'—');
  document.getElementById('pair-count').textContent=`${paired} / ${DIFFICULTIES[state.difficulty]} 对`;
  document.getElementById('memory-time').textContent=time(state.elapsed);
  document.getElementById('pair-progress').style.width=`${paired/DIFFICULTIES[state.difficulty]*100}%`;
  ui.status(won(state)?'全部配对完成啦':pending>0?'记住位置，再试一对':state.open.length?'再翻一张，找到它的伙伴':THEMES[theme].hint);
}
function render(){
  buttons.forEach((button,i)=>{
    const revealed=state.open.includes(i)||state.matched[i];
    button.classList.toggle('flipped',revealed);button.classList.toggle('matched',state.matched[i]);button.disabled=state.matched[i];
    button.setAttribute('aria-pressed',String(revealed));
    button.setAttribute('aria-label',`${i+1} 号牌，${state.matched[i]?'已配对的 ':revealed?'':'未翻开'}${revealed?cardLabel(theme,state.deck[i]):''}`);
  });stats();
}
function build(){
  board.replaceChildren();board.dataset.difficulty=state.difficulty;
  buttons=state.deck.map((fruit,index)=>{
    const button=document.createElement('button');button.className='memory-card';button.dataset.index=index;
    const inner=document.createElement('span');inner.className='card-inner';inner.setAttribute('aria-hidden','true');
    const back=document.createElement('span');back.className='card-back';back.innerHTML=theme==='cards'?'<span>♠</span>':'<span>✦</span>';
    const face=document.createElement('span');face.className='card-face';
    if(theme==='cards'){
      const card=playingCard(fruit);face.classList.add('playing-face');face.classList.toggle('red-suit',card.red);
      for(const position of ['top','bottom']){
        const corner=document.createElement('span');corner.className=`card-corner ${position}`;
        const rank=document.createElement('b');rank.textContent=card.rank;
        const symbol=document.createElement('small');symbol.textContent=card.symbol;
        corner.append(rank,symbol);face.append(corner);
      }
      const pips=document.createElement('span');pips.className='card-pips';pips.dataset.count=card.count;
      for(let n=0;n<card.count;n++){
        const pip=document.createElement('i');pip.className='suit-art';
        pip.style.backgroundPosition=`${card.suit%2*100}% ${Math.floor(card.suit/2)*100}%`;
        pips.append(pip);
      }
      face.append(pips);
    }else{
      const art=document.createElement('i');
      const extra=fruit>=12,sprite=extra?fruit-12:fruit;
      art.className=`fruit-art${extra?' fruit-extra':''}`;
      art.style.backgroundPosition=`${(sprite%4)/3*100}% ${Math.floor(sprite/4)/(extra?1:2)*100}%`;
      face.append(art);
    }
    inner.append(back,face);button.append(inner);
    button.addEventListener('click',()=>choose(index));board.append(button);return button;
  });render();
}
function finish(){
  const previous=record();
  if(!previous||state.turns<previous.turns||(state.turns===previous.turns&&state.elapsed<previous.elapsed)){bests[state.difficulty]={turns:state.turns,elapsed:state.elapsed};writeSave(storageKeys(theme).records,bests);}
  stats();save();
  ui.show('win',THEMES[theme].win,`用 ${state.turns} 步、${time(state.elapsed)} 找到了全部 ${DIFFICULTIES[state.difficulty]} 对${THEMES[theme].noun}。配对命中率 ${Math.round(DIFFICULTIES[state.difficulty]/state.turns*100)}%。`,'再玩一局',restart);
}
function choose(index){
  if(ui.blocked||pending>0)return;
  const result=flip(state,index);
  if(result==='ignored')return;
  if(result==='miss')pending=.95;
  ui.sound(result==='win'?'match':result);
  render();save();
  if(result==='match') {
    for(let offset=1;offset<=buttons.length;offset++) {
      const next=buttons[(index+offset)%buttons.length];
      if(!next.disabled){next.focus({preventScroll:true});break;}
    }
  }
  if(result==='win')finish();
}
function restart(){state=newGame(select.value);pending=saveClock=0;build();save();ui.hide();ui.sound('start');}
select.addEventListener('change',restart);
board.addEventListener('keydown',event=>{
  const i=buttons.indexOf(document.activeElement);if(i<0)return;
  const columns=getComputedStyle(board).gridTemplateColumns.split(' ').length;
  const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.code];
  if(delta===undefined)return;event.preventDefault();
  let next=i+delta;while(next>=0&&next<buttons.length&&buttons[next].disabled)next+=delta;
  buttons[next]?.focus();
});
ui.onPause(save);window.addEventListener('pagehide',save);
function applyTheme(){
  const copy=THEMES[theme];document.body.dataset.cardTheme=theme;
  themeSelect.value=theme;document.querySelector('.game-header .eyebrow').textContent=copy.eyebrow;
  board.setAttribute('aria-label',`${copy.name}配对棋盘`);
  document.querySelector('.help').textContent=theme==='cards'?'花色和点数都相同才是一对。\n点击 / 轻触翻牌 · 方向键选牌 · P 暂停':'翻开两张相同的水果卡，找到全部配对。\n点击 / 轻触翻牌 · 方向键选牌 · P 暂停';
  const emblem=document.querySelector('.collection-emblem');emblem.className=`collection-emblem ${theme==='cards'?'card-emblem':'pineapple'}`;
  emblem.textContent=theme==='cards'?'♠':'';
}
function loadTheme(){
  const saved=readSave(storageKeys(theme).run,null);
  state=validSave(saved)?saved:newGame(select.value||'easy');
  if(state.open.length===2)conceal(state);
  pending=saveClock=0;select.value=state.difficulty;applyTheme();build();
  if(won(state))ui.show('win','上次的好成绩还在',`你用 ${state.turns} 步完成了上次挑战，换个难度或再来一局吧。`,'再玩一局',restart);
  else ui.show('ready',validSave(saved)?'继续你的配对之旅':theme==='cards'?'来一局纸牌配对':'给水果找个伙伴',`${theme==='cards'?'找出花色、点数都相同的两张牌。':'翻开两张一样的水果卡。'}本局 ${DIFFICULTIES[state.difficulty]} 对，步数越少越棒。`,validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
}
themeSelect.addEventListener('change',()=>{
  save();theme=themeSelect.value;writeSave('memory:theme',theme);bests=readRecords();loadTheme();
});
loadTheme();
function tick(now){
  const dt=Math.min(.1,(now-(last||now))/1000);last=now;
  if(!ui.blocked&&!won(state)){
    if(state.started){const second=Math.floor(state.elapsed);state.elapsed+=dt;saveClock+=dt;if(Math.floor(state.elapsed)!==second)stats();}
    if(pending>0){pending=Math.max(0,pending-dt);if(!pending){conceal(state);render();save();}}
    if(saveClock>=3){saveClock=0;save();}
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
