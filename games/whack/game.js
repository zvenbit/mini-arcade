import {setupPastime,readSave,writeSave,keyboardGrid} from '../shared/pastime-ui.js';
import {newGame,hit,tick,validSave} from './logic.js';
let state=newGame(),last=0,checkpoint=0;const saved=readSave('whack:run',null);if(validSave(saved))state=saved;
let best=readSave('whack:best',0);if(!Number.isSafeInteger(best)||best<0)best=0;
const {ui,detail,settings}=setupPastime({id:'whack',title:'打地鼠',eyebrow:'HAPPY ORCHARD',emblem:'✦',help:'点击冒头的地鼠，金色地鼠分数更高。\n数字键 1～9 对应棋盘 · P / Esc 暂停',restart});
settings.innerHTML='<div class="pastime-note">60 秒果园挑战<br><span>普通 +10 · 金色 +20<br>连续命中最高额外 +10</span></div>';
const meter=document.createElement('div');meter.className='whack-meter';meter.innerHTML='<span>剩余时间</span><strong></strong><div><i></i></div>';ui.surface.append(meter);
const grid=document.createElement('div');grid.className='whack-grid';grid.setAttribute('aria-label','九个地鼠洞，数字键一到九');ui.surface.append(grid);
const buttons=state.holes.map((_,i)=>{const b=document.createElement('button');b.type='button';b.className='mole-hole';b.innerHTML=`<span class="hole-shadow"></span><span class="mole-clip"><span class="mole-art"></span></span><span class="hole-rim"></span><small>${i+1}</small><span class="hit-points" aria-hidden="true"></span><span class="hit-burst" aria-hidden="true"></span><span class="toy-hammer" aria-hidden="true"></span>`;b.addEventListener('click',()=>strike(i));b.querySelector('.toy-hammer').addEventListener('animationend',()=>b.classList.remove('bonk'));grid.append(b);return b;});keyboardGrid(grid,buttons,3);
function save(){writeSave('whack:run',state);writeSave('whack:best',best);}
function setText(el,value){const text=String(value);if(el.textContent!==text)el.textContent=text;}
function render(){buttons.forEach((b,i)=>{const h=state.holes[i];b.classList.toggle('up',h.life>0);b.classList.toggle('golden',h.kind===2);b.setAttribute('aria-label',`${i+1} 号洞，${h.life?h.kind===2?'金色地鼠':'地鼠冒头':'空洞'}`);});setText(meter.querySelector('strong'),`${Math.ceil(state.time)} 秒`);meter.querySelector('i').style.width=`${state.time/60*100}%`;meter.classList.toggle('urgent',state.time<=10);setText(document.getElementById('score'),state.score);setText(document.getElementById('best'),best);setText(document.getElementById('status'),state.combo>=2?`连续命中 ${state.combo} 次！`:'看准冒头的小家伙，再敲一下');setText(detail,`命中 ${state.hits} · 漏掉 ${state.misses}`);}
function strike(i){if(ui.blocked)return;const result=hit(state,i);if(!result)return;ui.sound(result.points?'whack':'miss');const b=buttons[i];b.classList.remove('hit','bonk');void b.offsetWidth;b.classList.add('hit');if(result.points)b.classList.add('bonk');b.querySelector('.hit-points').textContent=result.points?`+${result.points}`:'落空';best=Math.max(best,state.score);render();}
function finish(){save();ui.show('over','果园休息时间！',`本局 ${state.score} 分，命中 ${state.hits} 次。最高纪录 ${best} 分。`,'再挑战一次',restart);}
function restart(){state=newGame();checkpoint=0;buttons.forEach(b=>b.classList.remove('hit','bonk'));ui.hide();ui.sound('start');render();save();}
ui.onPause(save);window.addEventListener('pagehide',save);
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select'))return;const match=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);if(match){e.preventDefault();strike(Number(match[1])-1);}});
render();if(state.ended)finish();else ui.show('ready',validSave(saved)?'继续果园挑战':'地鼠们准备好啦', '60 秒内尽量多命中。越往后冒头越快，金色地鼠记得抓住！',validSave(saved)?'继续游戏':'开始游戏',()=>{ui.hide();ui.sound('start');});
function frame(now){const dt=Math.min(.1,(now-(last||now))/1000);last=now;if(!ui.blocked&&!state.ended){tick(state,dt);checkpoint+=dt;render();if(checkpoint>=3){checkpoint=0;save();}if(state.ended)finish();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
