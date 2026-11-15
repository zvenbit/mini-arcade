import {setupPastime,control,keyboardGrid,readSave,writeSave} from '../shared/pastime-ui.js';
import {dragPlacement} from './drag.js';
import {newGame,SHAPES,cellsFor,canPlace,hasMove,place,undo,validSave} from './logic.js';
let state=newGame(),selected=0,drag=null,suppressClick=-1,hover=-1,clearUntil=0,cleared=[];const saved=readSave('block1010:run',null);if(validSave(saved))state=saved;
let best=readSave('block1010:best',0);if(!Number.isSafeInteger(best)||best<0)best=0;
const {ui,settings,detail}=setupPastime({id:'block1010',title:'1010 方块拼盘',eyebrow:'JEWEL BLOCK WORKSHOP',emblem:'▦',help:'拖起下方方块，绿色预览时松手放下。\n也可点选再点棋盘 · 填满整行或整列消除',restart});
settings.innerHTML='<div class="pastime-note">慢慢拼，不限时<br><span>每格 +1 · 每行 / 列 +10<br>三个方块都用完后补充</span></div>';
const board=document.createElement('div');board.className='block-grid';board.setAttribute('aria-label','十乘十方块棋盘');ui.surface.append(board);
const buttons=Array.from({length:100},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='block-cell';b.dataset.index=i;b.addEventListener('click',()=>drop(i));b.addEventListener('pointerenter',()=>{if(!drag)preview(i);});b.addEventListener('focus',()=>{if(!drag)preview(i);});board.append(b);return b;});keyboardGrid(board,buttons,10);
board.addEventListener('pointerleave',()=>{if(!drag)preview(-1);});
const tray=document.createElement('div');tray.className='piece-tray';tray.setAttribute('aria-label','待放置的三个方块');ui.surface.append(tray);
const pieces=Array.from({length:3},(_,slot)=>{
  const b=document.createElement('button');b.type='button';b.className='tray-piece';
  b.addEventListener('click',()=>{if(suppressClick===slot){suppressClick=-1;return;}select(slot);});
  b.addEventListener('pointerdown',e=>{
    if(ui.blocked||drag||state.pieces[slot]===null||e.button!==0||!e.isPrimary)return;
    suppressClick=-1;select(slot);
    const art=b.querySelector('.piece-art'),rect=art.getBoundingClientRect(),shape=SHAPES[state.pieces[slot]],w=Math.max(...shape.map(([x])=>x))+1,h=Math.max(...shape.map(([,y])=>y))+1;
    const px=(e.clientX-rect.left)/rect.width*w-.5,py=(e.clientY-rect.top)/rect.height*h-.5;
    const [grabX,grabY]=shape.reduce((best,cell)=>Math.hypot(cell[0]-px,cell[1]-py)<Math.hypot(best[0]-px,best[1]-py)?cell:best,shape[0]);
    const first=buttons[0].getBoundingClientRect(),second=buttons[1].getBoundingClientRect(),below=buttons[10].getBoundingClientRect();
    drag={id:e.pointerId,slot,shape,grabX,grabY,x:e.clientX,y:e.clientY,moved:false,button:b,ghost:null,lift:e.pointerType==='touch'?Math.max(42,first.height*1.6):0,cellWidth:first.width,cellHeight:first.height,stepX:second.left-first.left,stepY:below.top-first.top,left:first.left,top:first.top};
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;
    if(drag.moved){e.preventDefault();updateDrag(e);}
  });
  b.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const moved=drag.moved,slot=drag.slot;
    const position=moved?updateDrag(e):null;
    cancelDrag();
    if(moved){suppressClick=slot;if(position?.fits&&canPlace(state,slot,position.index)){selected=slot;drop(position.index);}else{ui.sound('miss');ui.status('这里放不下，方块已回到下方');}}
  });
  b.addEventListener('pointercancel',cancelDrag);b.addEventListener('lostpointercapture',cancelDrag);tray.append(b);return b;
});
const undoButton=control(ui,'↶ 撤销一步',()=>{cancelDrag();if(!undo(state))return;selected=state.pieces.findIndex(p=>p!==null);cleared=[];ui.hide();render();save();ui.sound('undo');});
function updateDrag(e){
  const d=drag;if(!d)return null;
  if(!d.ghost){
    const ghost=document.createElement('div');ghost.className='drag-piece';ghost.setAttribute('aria-hidden','true');
    const art=pieces[d.slot].querySelector('.piece-art').cloneNode(true);
    art.style.setProperty('--unit',`${d.cellWidth}px`);art.style.gap=`${d.stepY-d.cellHeight}px ${d.stepX-d.cellWidth}px`;
    const badge=document.createElement('span');badge.className='drag-badge';ghost.append(art,badge);document.body.append(ghost);d.ghost=ghost;d.button.classList.add('dragging');
  }
  const position=dragPlacement({...d,x:e.clientX,y:e.clientY},d.shape),legal=position.fits&&canPlace(state,d.slot,position.index);
  d.ghost.style.left=`${position.ghostX}px`;d.ghost.style.top=`${position.ghostY}px`;
  d.ghost.classList.toggle('valid',legal);d.ghost.classList.toggle('invalid',!legal);d.ghost.querySelector('.drag-badge').textContent=legal?'✓ 松手放下':'× 这里放不下';
  buttons.forEach((b,i)=>{b.classList.toggle('ghost',position.cells.includes(i));b.classList.toggle('invalid',position.cells.includes(i)&&!legal);});
  return position;
}
function cancelDrag(){const d=drag;drag=null;if(d){d.ghost?.remove();d.button.classList.remove('dragging');if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}preview(-1);}
window.addEventListener('resize',cancelDrag);
function save(){writeSave('block1010:run',state);writeSave('block1010:best',best);}
function select(slot){if(drag||ui.blocked||state.pieces[slot]===null)return;selected=slot;renderTray();preview(hover);ui.sound('tap');}
function renderTray(){pieces.forEach((b,slot)=>{const shape=state.pieces[slot];b.disabled=shape===null;b.classList.toggle('selected',slot===selected&&shape!==null);b.setAttribute('aria-pressed',String(slot===selected&&shape!==null));b.setAttribute('aria-label',`第 ${slot+1} 个方块${shape===null?'，已使用':`，${SHAPES[shape].length} 格`}`);
  if(b.dataset.shape===String(shape))return;b.dataset.shape=shape;b.replaceChildren();
  if(shape===null){const check=document.createElement('span');check.textContent='✓';check.className='piece-used';b.append(check);return;}
  const cells=SHAPES[shape],w=Math.max(...cells.map(([x])=>x))+1,h=Math.max(...cells.map(([,y])=>y))+1;const art=document.createElement('span');art.className='piece-art';art.style.setProperty('--cols',w);art.style.setProperty('--rows',h);
  for(const [x,y] of cells){const cube=document.createElement('i');cube.className='jewel';cube.dataset.color=shape%5+1;cube.style.gridColumn=x+1;cube.style.gridRow=y+1;art.append(cube);}b.append(art);
});}
function preview(index){hover=index;const cells=index>=0&&selected>=0?cellsFor(state.pieces[selected],index):null,legal=index>=0&&canPlace(state,selected,index);buttons.forEach((b,i)=>{b.classList.toggle('ghost',!!cells?.includes(i));b.classList.toggle('invalid',!!cells?.includes(i)&&!legal);});}
function render(){buttons.forEach((b,i)=>{b.dataset.color=state.board[i];b.classList.toggle('clearing',cleared.includes(i));b.setAttribute('aria-label',`第 ${Math.floor(i/10)+1} 行第 ${i%10+1} 列，${state.board[i]?'已有方块':'空位'}`);});ui.score(state.score,best);detail.textContent=`已放 ${state.moves} 次 · 消除 ${state.lines} 行 / 列`;undoButton.disabled=!state.previous;renderTray();preview(-1);ui.status('选一个方块，在棋盘上为它找个位置');}
function drop(index){if(ui.blocked)return;const result=place(state,selected,index);if(!result){ui.sound('miss');ui.status('这里放不下，换个位置试试');return;}
  best=Math.max(best,state.score);selected=state.pieces.findIndex(p=>p!==null);cleared=result.cleared;clearUntil=performance.now()+180;ui.sound(result.lines?'blockline':'place');render();save();if(result.lines)ui.status(`漂亮！同时消除 ${result.lines} 行 / 列`);if(!hasMove(state))finish();
}
function finish(){ui.show('over','拼盘装满啦',`本局 ${state.score} 分，消除 ${state.lines} 行 / 列。可以撤销最后一步再想想。`,'再玩一局',restart);}
function restart(){cancelDrag();state=newGame();selected=0;cleared=[];ui.hide();render();save();ui.sound('start');}
ui.onPause(()=>{cancelDrag();save();});window.addEventListener('pagehide',save);
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select'))return;const m=/^Digit([1-3])$/.exec(e.code);if(m){e.preventDefault();select(Number(m[1])-1);}});
selected=state.pieces.findIndex(p=>p!==null);render();if(!hasMove(state))finish();else ui.show('ready',validSave(saved)?'接着拼这盘方块':'给每块宝石找个家','填满任意一行或一列就会消除。方块不能旋转，不限时；点击或拖动均可放置。',validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
function frame(now){if(cleared.length&&now>=clearUntil){cleared=[];buttons.forEach(b=>b.classList.remove('clearing'));}requestAnimationFrame(frame);}requestAnimationFrame(frame);
