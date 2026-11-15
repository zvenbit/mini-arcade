import {setupPastime,control,keyboardGrid,readSave,writeSave,levelPicker,readRecords} from '../shared/pastime-ui.js';
import {newGame,move,undo,connected,wetCells,hint,validSave} from './logic.js';
let state=newGame(),buttons=[],hinted=-1;const saved=readSave('pipes:run',null);if(validSave(saved))state=saved;const records=readRecords('pipes');
const {ui,settings,detail}=setupPastime({id:'pipes',title:'水管接通',eyebrow:'LITTLE WATER GARDEN',emblem:'≈',help:'点击水管顺时针旋转 90°。\n把左上水源接到右下出口 · 方向键选格 · Enter 旋转',restart});
document.querySelector('.scores small').textContent='旋转';document.querySelectorAll('.scores small')[1].textContent='最少旋转';
const select=levelPicker(settings,state.level,level=>{state=newGame(level);hinted=-1;build();save();ui.hide();ui.sound('start');});
const legend=document.createElement('div');legend.className='pipe-legend';legend.innerHTML='<span class="water-label">① 进水</span><button type="button" class="pipe-help">ⓘ 玩法图解</button><span class="exit-label">② 出水</span>';ui.surface.append(legend);
const boardWrap=document.createElement('div');boardWrap.className='pipe-board-wrap';ui.surface.append(boardWrap);
const inlet=document.createElement('span');inlet.className='pipe-port source-port';inlet.setAttribute('aria-label','蓝色进水口，左上角左侧');inlet.innerHTML='<b>→</b>';
const outlet=document.createElement('span');outlet.className='pipe-port exit-port';outlet.setAttribute('aria-label','金色出水口，右下角右侧');outlet.innerHTML='<b>→</b>';boardWrap.append(inlet,outlet);
const guide=document.createElement('dialog');guide.className='pipe-guide';guide.setAttribute('aria-labelledby','pipe-guide-title');guide.innerHTML='<button type="button" class="guide-close" aria-label="关闭玩法图解">×</button><p class="guide-eyebrow">HOW TO PLAY</p><h2 id="pipe-guide-title">接通两端，就过关</h2><img src="../../assets/pipe-how-to.svg" alt="通关示意：从左上蓝色进水口，经连接的水管，到达右下金色出水口。"><p>点击水管旋转，让相邻接口面对面。<br><strong>蓝色水流到达金色出口即可，不必连接所有管道。</strong></p><button type="button" class="guide-done">明白了，开始接水</button>';document.body.append(guide);
let resumeAfterGuide=false;
function openGuide(){if(guide.open)return;resumeAfterGuide=!ui.blocked;ui.pause();guide.showModal();guide.querySelector('.guide-done').focus();}
function closeGuide(){guide.close();}
legend.querySelector('.pipe-help').addEventListener('click',openGuide);guide.querySelector('.guide-close').addEventListener('click',closeGuide);guide.querySelector('.guide-done').addEventListener('click',closeGuide);
guide.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();closeGuide();}else if(e.code==='KeyP')e.stopPropagation();});
guide.addEventListener('close',()=>{if(resumeAfterGuide&&ui.mode==='paused')ui.hide();resumeAfterGuide=false;legend.querySelector('.pipe-help').focus();});
const grid=document.createElement('div');grid.className='pipe-grid';grid.setAttribute('aria-label','水管棋盘');boardWrap.append(grid);
const hintButton=control(ui,'✦ 找一段',()=>{if(ui.blocked||connected(state))return;hinted=hint(state);state.hints++;render();save();ui.sound('hint');});
const undoButton=control(ui,'↶ 撤销',()=>{if(!undo(state))return;hinted=-1;ui.hide();render();save();ui.sound('undo');});
function save(){const {target,path,...run}=state;writeSave('pipes:run',run);}
function pipeArt(mask){
  const straight=mask===5||mask===10,turn=straight?(mask===5?0:90):({3:0,6:90,12:180,9:270}[mask]);
  return `<span class="pipe-rotor ${straight?'straight':'elbow'}" style="--turn:${turn}deg"><span class="pipe-underlay"></span><span class="pipe-art pipe-dry"></span><span class="pipe-art pipe-wet"></span></span>`;
}
function build(){boardWrap.style.setProperty('--size',state.size);grid.style.setProperty('--size',state.size);grid.replaceChildren();buttons=state.board.map((_,i)=>{const b=document.createElement('button');b.type='button';b.className='pipe-cell';b.addEventListener('click',()=>{if(ui.blocked||!move(state,i))return;hinted=-1;ui.sound('pipe');render();save();if(connected(state))finish();});grid.append(b);return b;});keyboardGrid(grid,buttons,state.size);render();}
function render(){const wet=wetCells(state);outlet.classList.toggle('connected',connected(state));inlet.classList.toggle('flowing',wet.length>0);buttons.forEach((b,i)=>{if(b.dataset.mask!==String(state.board[i])){b.dataset.mask=state.board[i];b.innerHTML=pipeArt(state.board[i]);}b.classList.toggle('wet',wet.includes(i));b.classList.toggle('hinted',hinted===i);b.classList.toggle('inlet',i===0);b.classList.toggle('outlet',i===state.board.length-1);const directions=[[1,'上'],[2,'右'],[4,'下'],[8,'左']].filter(([bit])=>state.board[i]&bit).map(([,name])=>name).join('、');b.setAttribute('aria-label',`第 ${Math.floor(i/state.size)+1} 行第 ${i%state.size+1} 列，接口朝${directions}${wet.includes(i)?'，已通水':''}`);});ui.score(state.moves,records[state.level]??'—');ui.status(hinted>=0?'金色边框的水管需要调整方向':'让蓝色水流从左上走到右下');detail.textContent=`第 ${state.level} / 30 关 · 已通水 ${wet.length} 段 · 提示 ${state.hints}`;undoButton.disabled=!state.history.length;hintButton.disabled=connected(state);}
function finish(){if(!Number.isSafeInteger(records[state.level])||state.moves<records[state.level]){records[state.level]=state.moves;writeSave('pipes:records',records);}render();ui.show('win','水流接通啦！',`旋转 ${state.moves} 次，水已经到达出口。不必连接所有水管。`,state.level<30?'下一关':'再玩本关',()=>{state=newGame(state.level<30?state.level+1:state.level);select.value=state.level;hinted=-1;build();save();ui.hide();ui.sound('start');});}
function restart(){resumeAfterGuide=false;if(guide.open)guide.close();state=newGame(Number(select.value));hinted=-1;build();save();ui.hide();ui.sound('start');}
ui.onPause(save);window.addEventListener('pagehide',save);build();if(connected(state))finish();else ui.show('ready',validSave(saved)?'接着修好这段水路':'给花园接上水','把蓝色进水口接到金色出水口。点击「玩法图解」查看通关示意，只需接通一条水路。',validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
