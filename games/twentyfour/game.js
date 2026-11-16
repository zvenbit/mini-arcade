import {setupPastime,control,readSave,writeSave} from '../shared/pastime-ui.js?v=twenty-1';
import {deal,cards,combine,solve,display} from './logic.js';
let numbers=deal(),moves=[],items=cards(numbers),selected=-1,op='+',assisted=false,total=readSave('twentyfour:wins',0);
if(!Number.isSafeInteger(total)||total<0)total=0;
const saved=readSave('twentyfour:run',null);
if(saved&&Array.isArray(saved.numbers)&&saved.numbers.length===4&&saved.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=9)&&Array.isArray(saved.moves)&&saved.moves.length<=3&&saved.moves.every(m=>m&&Number.isInteger(m.a)&&Number.isInteger(m.b)&&['+','−','×','÷'].includes(m.op))){
  let restored=cards(saved.numbers);for(const m of saved.moves)restored=restored&&combine(restored,m.a,m.b,m.op);
  if(restored&&solve(cards(saved.numbers))){numbers=saved.numbers;moves=saved.moves;items=restored;assisted=!!saved.assisted;}
}
const {ui,settings,detail}=setupPastime({id:'twentyfour',title:'24 点',eyebrow:'THE LITTLE NUMBER CLUB',emblem:'24',help:'先选一张牌，再选运算符和另一张牌。\n四张牌各用一次，算出 24；允许分数和负数。',restart});
document.body.classList.add('club');
document.querySelectorAll('.scores small')[0].textContent='目标';document.querySelectorAll('.scores small')[1].textContent='独立解出';
settings.innerHTML='<p class="pastime-note">四张牌，一种灵感<br><span>不限时 · 每一组都能解</span></p>';
ui.surface.innerHTML='<div class="number-table"><div class="target-medal">24<small>MAKE TWENTY FOUR</small></div><p class="original-cards"></p><div class="number-cards" aria-label="可选数字牌"></div><div class="number-ops" aria-label="运算符"></div><p class="number-equation" aria-live="polite"></p><div class="solution-box" hidden></div></div>';
const cardArea=ui.surface.querySelector('.number-cards'),ops=ui.surface.querySelector('.number-ops'),equation=ui.surface.querySelector('.number-equation'),solution=ui.surface.querySelector('.solution-box');
for(const symbol of ['+','−','×','÷']){const b=document.createElement('button');b.textContent=symbol;b.setAttribute('aria-label',`运算 ${symbol}`);b.onclick=()=>{if(ui.blocked)return;op=symbol;render();ui.sound('tap');};ops.append(b);}
const back=control(ui,'↶ 撤销',()=>{if(ui.blocked||!moves.length)return;moves.pop();rebuild();selected=-1;solution.hidden=true;render();save();ui.sound('undo');});
control(ui,'↺ 重算',()=>{if(ui.blocked)return;moves=[];rebuild();selected=-1;solution.hidden=true;render();save();});
control(ui,'✦ 看解法',()=>{if(ui.blocked)return;assisted=true;solution.hidden=false;solution.textContent=`一种解法：${solve(cards(numbers))} = 24`;save();ui.sound('hint');});
control(ui,'换一组',restart);
function rebuild(){items=cards(numbers);for(const m of moves)items=combine(items,m.a,m.b,m.op);}
function save(){writeSave('twentyfour:run',{numbers,moves,assisted});writeSave('twentyfour:wins',total);}
function choose(i){if(ui.blocked)return;if(selected<0){selected=i;ui.sound('tap');render();return;}if(selected===i){selected=-1;render();return;}
 const next=combine(items,selected,i,op);if(!next){ui.status('不能除以 0，换个运算符试试');ui.sound('miss');return;}
 moves.push({a:selected,b:i,op});items=next;selected=-1;ui.sound('place');render();
 if(items.length===1&&Math.abs(items[0].value-24)<1e-8){if(!assisted)total++;save();ui.score(24,total);ui.show('win','刚好 24！',`${items[0].expr} = 24${assisted?' · 本题看过解法':' · 独立解出！'}`,'下一组',restart);}else{save();if(items.length===1)ui.status('还不是 24，试试撤销或重算');}
}
function render(){ui.score(24,total);detail.textContent=`已合并 ${moves.length} 次${assisted?' · 已查看解法':''}`;ui.surface.querySelector('.original-cards').textContent=`本题数字：${numbers.join(' · ')}`;cardArea.replaceChildren();items.forEach((item,i)=>{const b=document.createElement('button');b.className='number-card';b.classList.toggle('selected',i===selected);b.setAttribute('aria-label',`数字 ${display(item.value)}，${item.expr}`);const small=document.createElement('small');small.textContent=item.expr===String(item.value)?['♠','♥','♣','♦'][item.id%4]:item.expr;const strong=document.createElement('strong');strong.textContent=display(item.value);b.append(small,strong);b.onclick=()=>choose(i);cardArea.append(b);});[...ops.children].forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===op)));back.disabled=!moves.length;equation.textContent=selected>=0?`${display(items[selected].value)} ${op} … 请选择另一张牌`:items.length===1?`${items[0].expr} = ${display(items[0].value)}`:'选数字 → 选运算 → 再选数字';ui.status('让最后一张数字牌等于 24');}
function restart(){numbers=deal();items=cards(numbers);moves=[];selected=-1;assisted=false;solution.hidden=true;ui.hide();render();save();ui.sound('start');}
ui.onPause(save);window.addEventListener('pagehide',save);if(items.length===1&&Math.abs(items[0].value-24)<1e-8){numbers=deal();items=cards(numbers);moves=[];assisted=false;}
render();ui.show('ready','四张牌，凑成 24','先选一张数字牌，再选运算符和另一张牌。计算结果会成为新牌，直到剩下 24。','开始算一算',()=>{ui.hide();ui.sound('start');});
