import {setupPastime,control,readSave,writeSave,levelPicker,readRecords} from '../shared/pastime-ui.js?v=twenty-1';
import {level,pour,solved,validTubes} from './logic.js';
const labels=['珊瑚红','湖水蓝','葡萄紫','蜂蜜黄','草叶绿','桃子橙'],symbols=['♥','◆','✦','●','♣','▲'];
let number=1,tubes=level(1).tubes,history=[],steps=0,selected=-1,extra=false,flash=-1,flashTime=0;const records=readRecords('watersort'),saved=readSave('watersort:run',null);
if(saved&&Number.isInteger(saved.number)&&saved.number>=1&&saved.number<=30&&validTubes(saved.tubes,level(saved.number).colors)&&Number.isSafeInteger(saved.steps)&&saved.steps>=0){number=saved.number;tubes=saved.tubes;steps=saved.steps;extra=tubes.length===level(number).colors+3;}
const {ui,settings,detail}=setupPastime({id:'watersort',title:'水排序',eyebrow:'THE COLOR POTION GARDEN',emblem:'◒',help:'先选有水的瓶子，再选目标瓶。\n只能倒入空瓶或同色水上方；每瓶最多 4 层。',restart});
document.body.classList.add('club');
document.querySelectorAll('.scores small')[0].textContent='步数';document.querySelectorAll('.scores small')[1].textContent='最佳步数';
const picker=levelPicker(settings,number,n=>{number=n;restart();});
ui.surface.innerHTML='<div class="water-workshop"><p class="water-caption">把每种颜色，送回同一个瓶子</p><div class="bottle-rack" aria-label="彩色水瓶"></div><p class="water-tip">选起一瓶 → 再点另一瓶倒水</p></div>';const rack=ui.surface.querySelector('.bottle-rack');
const back=control(ui,'↶ 撤销',()=>{if(ui.blocked||!history.length)return;tubes=history.pop();steps=Math.max(0,steps-1);selected=-1;render();save();ui.sound('undo');});
const add=control(ui,'＋ 空瓶',()=>{if(ui.blocked||extra)return;tubes.push([]);history=[];extra=true;selected=-1;render();save();ui.sound('hint');ui.status('增加了一个空瓶，本关仍可继续完成');});
function save(){writeSave('watersort:run',{number,tubes,steps});writeSave('watersort:records',records);}
function choose(i){if(ui.blocked)return;if(selected===i){selected=-1;render();return;}if(selected<0){if(!tubes[i].length){ui.status('先选一瓶有水的');return;}selected=i;ui.sound('tap');render();return;}
 const next=pour(tubes,selected,i);if(!next){ui.status('只能倒到空瓶或同色水上方，而且要有空位');ui.sound('miss');selected=tubes[i].length?i:selected;render();return;}
 history.push(tubes.map(t=>[...t]));if(history.length>200)history.shift();tubes=next;steps++;selected=-1;flash=i;flashTime=performance.now()+350;ui.sound('pour');render();save();
 if(solved(tubes)){if(!extra)records[number]=Math.min(records[number]||Infinity,steps);save();ui.show('win','每种颜色都到家了',`第 ${number} 关 · ${steps} 步${extra?' · 使用了辅助空瓶':''}`,number===30?'再挑战第 1 关':'下一关',()=>{number=number%30+1;restart();});}
}
function render(){ui.score(steps,records[number]||'—');detail.textContent=`第 ${number} / 30 关 · ${Math.min(6,3+Math.floor((number-1)/8))} 种颜色${extra?' · 辅助空瓶':''}`;picker.value=number;back.disabled=!history.length;add.disabled=extra;rack.replaceChildren();rack.style.setProperty('--bottles',Math.ceil(tubes.length/2));tubes.forEach((tube,i)=>{const b=document.createElement('button');b.className='water-bottle';b.classList.toggle('selected',selected===i);b.classList.toggle('filled',tube.length===4&&tube.every(v=>v===tube[0]));b.classList.toggle('receiving',i===flash);b.setAttribute('aria-label',`第 ${i+1} 瓶，${tube.length?`从下到上 ${tube.map(c=>labels[c]).join('、')}`:'空瓶'}`);const glass=document.createElement('span');glass.className='bottle-glass';tube.forEach((color,j)=>{const liquid=document.createElement('i');liquid.className='liquid';liquid.dataset.water=color;liquid.style.bottom=`${j*25}%`;liquid.textContent=symbols[color];glass.append(liquid);});const num=document.createElement('small');num.textContent=i+1;b.append(glass,num);b.onclick=()=>choose(i);rack.append(b);});}
function restart(){tubes=level(number).tubes;history=[];steps=0;selected=-1;extra=false;flash=-1;ui.hide();render();save();ui.status('同色水合成一瓶，所有颜色分好就通关');ui.sound('start');}
ui.onPause(save);window.addEventListener('pagehide',save);render();ui.status('同色水合成一瓶，所有颜色分好就通关');ui.show('ready','给颜色排个队','点一瓶再点另一瓶，连续的同色水会一起倒入。可撤销，也可加一个辅助空瓶。30 关都有解。','开始整理',()=>{if(solved(tubes))restart();else ui.hide();ui.sound('start');});
function frame(now){if(flash>=0&&now>flashTime){flash=-1;rack.querySelectorAll('.receiving').forEach(b=>b.classList.remove('receiving'));}requestAnimationFrame(frame);}requestAnimationFrame(frame);
