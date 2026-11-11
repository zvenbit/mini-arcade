import { createUI, readSave, writeSave, readBest } from '../shared/ui.js?v=flow-4';
import { frame } from '../shared/collection-ui.js';
import { newGame, cells, fits, level, move, rotate, ghost, lock, hardDrop, hold, validSave } from './logic.js?v=feel-2';
import {createDropControl} from './drop-control.js';
import {createClearEffect,drawClearEffect} from './effects.js?v=snap-012';

let state = newGame();
let best = readBest('tetris');
let savedBest = best, previewKey = '', scoreKey = '', statusKey = '';
let fall = 0, grounded = 0, resets = 0, last = 0, saveClock = 0;
let clearEffect = null;
const dropControl = createDropControl();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const heldKeys = new Map();
const ui = createUI({title:'俄罗斯方块', eyebrow:'CRYSTAL ARCADE', theme:'tetris', help:'← → 移动 · ↑ 旋转 · ↓ 加速 · 双击 ↓ 极速下落\n空格硬降 · C 暂存 · P 暂停', onStart:() => ui.hide(), onRestart:restart});
const panel = frame(ui,'crystal');
const canvas = document.createElement('canvas');
canvas.width = 300; canvas.height = 600;
canvas.setAttribute('aria-label','俄罗斯方块棋盘，10 列 20 行。使用方向键或游戏按钮操作。');
canvas.setAttribute('role','img');
ui.surface.append(canvas);
const ctx = canvas.getContext('2d');
const feedback = document.createElement('div');
feedback.className='clear-feedback';feedback.setAttribute('role','status');feedback.hidden=true;
ui.arena.append(feedback);
const speedHint=document.createElement('p');speedHint.className='drop-hint';speedHint.textContent='双击 ↓ 极速下落';
panel.append(speedHint);
const info = document.createElement('div');
info.className='block-info';
info.innerHTML='<div class="block-metrics"><span>等级 <b id="block-level">1</b></span><span>消行 <b id="block-lines">0</b></span></div><div class="piece-tray"><div><small>暂存 · C</small><div id="held-piece" class="piece-preview"></div></div><div><small>接下来</small><div id="next-pieces"></div></div></div>';
panel.insertBefore(info,ui.controls);
const palette = ['','#37d7f1','#ffd658','#ba76f8','#75d965','#ff7381','#6295ff','#ffad58'];
function save() { writeSave('tetris:run',state); }
function checkpoint() {
  best=Math.max(best,state.score);
  if(best!==savedBest){writeSave('tetris:best',best);savedBest=best;}
  save();
}
function block(x,y,value,alpha=1) {
  if (y<0) return;
  const px=x*30+1.5, py=y*30+1.5;
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.fillStyle=palette[value];
  ctx.beginPath(); ctx.roundRect(px,py,27,27,5); ctx.fill();
  const shine=ctx.createLinearGradient(px,py,px+27,py+27);
  shine.addColorStop(0,'#ffffff80'); shine.addColorStop(.38,'#ffffff10'); shine.addColorStop(1,'#00000045');
  ctx.fillStyle=shine; ctx.fill();
  ctx.strokeStyle='#ffffff70'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#ffffff55'; ctx.fillRect(px+5,py+3,17,2);
  ctx.restore();
}
function preview(type,container) {
  container.replaceChildren();
  if (!type) { container.textContent='—'; return; }
  const squares=cells({type,rotation:0,x:0,y:0});
  const minX=Math.min(...squares.map(c=>c.x)), minY=Math.min(...squares.map(c=>c.y));
  const width=Math.max(...squares.map(c=>c.x))-minX+1;
  const height=Math.max(...squares.map(c=>c.y))-minY+1;
  container.style.setProperty('--cols',width);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const part=document.createElement('i');
    if(squares.some(c=>c.x===x+minX && c.y===y+minY)) { part.style.backgroundColor=palette[type]; part.className='mini-block'; }
    container.append(part);
  }
}
function renderInfo() {
  best=Math.max(best,state.score);
  const scores=`${state.score}:${best}:${state.lines}`;
  if(scores!==scoreKey){
    scoreKey=scores;ui.score(state.score,best);
    document.getElementById('block-level').textContent=level(state);
    document.getElementById('block-lines').textContent=state.lines;
  }
  const pieces=`${state.held}:${state.queue.slice(0,3).join(',')}`;
  if(pieces!==previewKey){
    previewKey=pieces;
    preview(state.held,document.getElementById('held-piece'));
    const next=document.getElementById('next-pieces');next.replaceChildren();
    state.queue.slice(0,3).forEach((type,index)=>{
      const node=document.createElement('div');node.className='piece-preview';
      node.setAttribute('aria-label',`第 ${index+1} 个待出方块`);preview(type,node);next.append(node);
    });
  }
  const status=`${state.over}:${state.holdUsed}`;
  if(status!==statusKey){
    statusKey=status;
    document.getElementById('held-piece').classList.toggle('unavailable',state.holdUsed);
    ui.status(state.over?'本局结束，再挑战一次吧':`每消除 10 行加速 · ${state.holdUsed?'落地后可再次暂存':'填满横行即可消除'}`);
  }
}
function render() {
  ctx.fillStyle='#151c40'; ctx.fillRect(0,0,300,600);
  ctx.strokeStyle='#b6baff10'; ctx.lineWidth=1;
  for(let x=0;x<=10;x++){ctx.beginPath();ctx.moveTo(x*30,0);ctx.lineTo(x*30,600);ctx.stroke();}
  for(let y=0;y<=20;y++){ctx.beginPath();ctx.moveTo(0,y*30);ctx.lineTo(300,y*30);ctx.stroke();}
  state.board.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(x,y,v);}));
  if(!state.over) {
    for(const c of cells(ghost(state))) {
      if(c.y<0)continue;
      ctx.strokeStyle=palette[c.value]+'99';ctx.lineWidth=2;ctx.strokeRect(c.x*30+4,c.y*30+4,22,22);
      ctx.fillStyle=palette[c.value]+'15';ctx.fillRect(c.x*30+4,c.y*30+4,22,22);
    }
    cells(state.active).forEach(c=>block(c.x,c.y,c.value));
  }
  if(clearEffect)drawClearEffect(ctx,clearEffect);
}
function result(outcome) {
  fall=grounded=resets=0;dropControl.reset();updateSpeedHint();
  if(outcome.cleared) {
    clearEffect=createClearEffect(outcome,palette,reducedMotion.matches);
    const title=['','漂亮消行','双行消除！','三行连消！','四行全消！'][outcome.cleared];
    feedback.replaceChildren();
    const strong=document.createElement('strong');strong.textContent=title;
    const detail=document.createElement('span');detail.textContent=`+${outcome.points} 分${state.combo>0?' · 连续 '+(state.combo+1)+' 次消行':''}`;
    feedback.append(strong,detail);feedback.hidden=false;feedback.style.opacity=1;feedback.classList.toggle('big-clear',outcome.cleared>=3);
    ui.sound('clear');
  }
  else ui.sound('drop');
  checkpoint();renderInfo();
  if(state.over) ui.show('over','星光暂时落幕',`本局 ${state.score} 分，消除 ${state.lines} 行。再来一次，给方块留一点空间。`,'重新开始',restart);
}
function action(name) {
  if(ui.blocked || state.over)return;
  const wasGrounded=!fits(state.board,{...state.active,y:state.active.y+1});
  let changed=false;
  if(name==='left'||name==='right') {changed=move(state,name==='left'?-1:1);if(changed)ui.sound('move');}
  if(name==='rotate'||name==='reverse') {changed=rotate(state,name==='reverse'?-1:1);if(changed)ui.sound('rotate');}
  if(name==='down') {changed=move(state,0,1);if(changed){state.score++;fall=0;renderInfo();}}
  if(name==='drop') {result(hardDrop(state));changed=true;}
  if(name==='hold'&&hold(state)) {fall=grounded=resets=0;dropControl.reset();updateSpeedHint();checkpoint();renderInfo();ui.sound('rotate');changed=true;if(state.over)ui.show('over','方块堆到顶了',`本局 ${state.score} 分，再整理一次新的星空。`,'重新开始',restart);}
  if(changed && wasGrounded && ['left','right','rotate','reverse'].includes(name) && resets<15){grounded=0;resets++;}
  // The animation loop draws once per frame, including repeated input steps.
}
function restart() {
  state=newGame();fall=grounded=resets=saveClock=0;clearEffect=null;feedback.hidden=true;dropControl.reset();updateSpeedHint();heldKeys.clear();
  checkpoint();renderInfo();render();ui.hide();ui.sound('start');
}
const bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowUp:'rotate',KeyW:'rotate',KeyZ:'reverse',Space:'drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
function updateSpeedHint(){speedHint.textContent=dropControl.fast?'⇊ 极速下落中':'双击 ↓ 极速下落';speedHint.classList.toggle('active',dropControl.fast);}
function press(token,name){
  if(ui.blocked || state.over)return;
  if(name==='down'){dropControl.tap(performance.now());updateSpeedHint();}
  action(name);
  if(['left','right','down'].includes(name))heldKeys.set(token,{name,remaining:name==='down'?.08:.18});
}
document.addEventListener('keydown',event=>{const name=bindings[event.code];if((event.code==='Space' && event.target.closest('button'))||!name||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('select,input'))return;event.preventDefault();if(!event.repeat)press(event.code,name);});
document.addEventListener('keyup',event=>heldKeys.delete(event.code));
ui.controls.classList.add('block-controls');
for(const [name,label] of [['left','← 左移'],['rotate','↻ 旋转'],['right','右移 →'],['hold','⇄ 暂存'],['down','↓ 加速'],['drop','⇊ 硬降']]) {
  const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',label.replace(/[←↻→⇄↓⇊]/g,'').trim());
  button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);press('touch-'+event.pointerId,name);});
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,event=>heldKeys.delete('touch-'+event.pointerId));
  button.addEventListener('click',event=>{if(event.detail===0){press('accessible-'+name,name);heldKeys.delete('accessible-'+name);}});
  ui.controls.append(button);
}
ui.onPause(()=>{heldKeys.clear();dropControl.reset();updateSpeedHint();checkpoint();});
window.addEventListener('pagehide',checkpoint);
const saved=readSave('tetris:run',null);
if(validSave(saved))state=saved;
renderInfo();render();
ui.show(state.over?'over':'ready',state.over?'再点亮一片星空':saved&&validSave(saved)?'接着这一局':'把星光拼成一行',state.over?`上次获得 ${state.score} 分。`:'移动、旋转水晶方块。填满一行就能消除，轮廓线会告诉你落点。',state.over?'重新开始':saved&&validSave(saved)?'继续游戏':'开始游戏',state.over?restart:()=>{ui.hide();ui.sound('start');});
function tick(now) {
  const dt=Math.min(.08,(now-(last||now))/1000);last=now;
  if(!ui.blocked&&!state.over) {
    saveClock+=dt;
    if(clearEffect){
      clearEffect.time+=dt;
      feedback.style.opacity=Math.min(1,(clearEffect.duration-clearEffect.time)/.04);
      if(clearEffect.time>=clearEffect.duration){clearEffect=null;feedback.hidden=true;}
    }
    // Cosmetic effects never block the next piece or consume its inputs.
    {
      for(const entry of heldKeys.values()){
        if(entry.name==='down' && dropControl.fast)continue;
        entry.remaining-=dt;
        while(entry.remaining<=0){action(entry.name);entry.remaining+=entry.name==='down'?.02:.065;}
      }
      fall+=dt;
      const interval=dropControl.fast?.012:Math.max(.09,.82*Math.pow(.82,level(state)-1));
      while(fall>=interval){
        fall-=interval;
        if(!move(state,0,1)){fall=0;break;}
        if(dropControl.fast){state.score++;renderInfo();}
      }
      if(!fits(state.board,{...state.active,y:state.active.y+1})){
        const softDrop=[...heldKeys.values()].some(entry=>entry.name==='down');
        grounded+=dt;if(grounded>=(dropControl.fast?.04:softDrop?.07:.28))result(lock(state));
      }else grounded=0;
    }
    if(saveClock>3){saveClock=0;checkpoint();}
    render();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
