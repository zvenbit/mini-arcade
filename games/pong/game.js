import {setupPastime,control,readSave,writeSave} from '../shared/pastime-ui.js?v=twenty-1';
import {newGame,step,W,H} from './logic.js';
import {rounded,gradient,ball,makeCanvas,loadSprites,sprite} from '../shared/club-canvas.js';
let difficulty=1,s=newGame(difficulty),target=220,keys=new Set(),last=0,trail=[],spark=0,wins=readSave('pong:wins',0);if(!Number.isSafeInteger(wins)||wins<0)wins=0;
const {ui,settings,detail}=setupPastime({id:'pong',title:'乒乓对打',eyebrow:'GARDEN TABLE TENNIS',emblem:'◉',help:'你是下方红拍，左右移动接球。\n鼠标 / 手指移动，或 ← → / A D；先得 7 分获胜。',restart});
document.body.classList.add('club');
document.querySelectorAll('.scores small')[0].textContent='你 · 电脑';document.querySelectorAll('.scores small')[1].textContent='获胜场次';
settings.innerHTML='<label for="pong-difficulty">电脑水平（切换会重新开局）</label><select id="pong-difficulty"><option value="0">休闲练习</option><option value="1" selected>标准对打</option><option value="2">高手挑战</option></select>';
settings.querySelector('select').onchange=e=>{difficulty=Number(e.target.value);restart();};
const [canvas,ctx]=makeCanvas(ui,W,H,'乒乓球桌：上方蓝拍是电脑，下方红拍是你'),art=loadSprites();
function point(e){const r=canvas.getBoundingClientRect();target=(e.clientX-r.left)/r.width*W;}
canvas.addEventListener('pointerdown',e=>{if(ui.blocked||e.button!==0||!e.isPrimary)return;canvas.setPointerCapture(e.pointerId);point(e);});canvas.addEventListener('pointermove',e=>{if(!ui.blocked&&(e.pointerType==='mouse'||canvas.hasPointerCapture(e.pointerId)))point(e);});
for(const [label,key] of [['◀ 左移','ArrowLeft'],['右移 ▶','ArrowRight']]){const b=control(ui,label,()=>{});b.addEventListener('pointerdown',e=>{if(ui.blocked)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(key));b.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!ui.blocked)keys.add(key);}});b.addEventListener('keyup',()=>keys.delete(key));b.addEventListener('blur',()=>keys.delete(key));}
document.addEventListener('keydown',e=>{if(e.target.closest('select,input')||e.ctrlKey||e.metaKey)return;if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();if(!ui.blocked)keys.add(e.code);}});document.addEventListener('keyup',e=>keys.delete(e.code));
function render(){ctx.clearRect(0,0,W,H);rounded(ctx,0,0,W,H,16,gradient(ctx,0,0,W,H,['#116f70','#219d91','#0b7277']));
 ctx.strokeStyle='#dcffdfb0';ctx.lineWidth=3;ctx.strokeRect(15,18,W-30,H-36);ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-18);ctx.stroke();
 ctx.fillStyle='#ffffff12';for(let i=0;i<12;i++)ctx.fillRect(16,i*55,W-32,22);
 ctx.save();ctx.shadowColor='#002d3f';ctx.shadowOffsetY=7;ctx.shadowBlur=9;rounded(ctx,13,H/2-7,W-26,14,4,'#d7e7cc');ctx.restore();ctx.fillStyle='#133a49';for(let x=21;x<W-17;x+=9)ctx.fillRect(x,H/2-4,5,8);for(const x of [8,W-24])rounded(ctx,x,H/2-16,16,32,5,gradient(ctx,x,0,16,0,['#a86b27','#ffeab3','#c58c32']));
 ctx.font='bold 78px Georgia';ctx.textAlign='center';ctx.fillStyle='#eaffef25';ctx.fillText(s.cpu,W/2,192);ctx.fillText(s.you,W/2,470);
 for(const [x,y,blue] of [[s.ai,55,true],[s.player,H-55,false]]){if(!sprite(ctx,art,blue?1:0,1,x-85,y-(blue?80:48),170,120))rounded(ctx,x-44,y-7,88,16,8,blue?'#328fe3':'#f26063');}
 trail.forEach((p,i)=>{ctx.globalAlpha=i/trail.length*.28;ball(ctx,p.x,p.y,7);});ctx.globalAlpha=1;ball(ctx,s.ball.x,s.ball.y,9);
 if(spark>0){ctx.strokeStyle=`rgba(255,240,159,${spark/.18})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.ball.x,s.ball.y,18+(1-spark/.18)*20,0,Math.PI*2);ctx.stroke();}
 if(s.wait>0&&!s.ended){rounded(ctx,125,264,190,82,20,'#164d54d9');ctx.fillStyle='#fff0b9';ctx.font='bold 21px sans-serif';ctx.fillText('准备接球',220,295);ctx.font='15px sans-serif';ctx.fillText('左右移动红色球拍',220,323);}
}
function restart(){s=newGame(difficulty);target=220;keys.clear();trail=[];ui.hide();ui.sound('start');update();}
function update(){ui.score(`${s.you} : ${s.cpu}`,wins);detail.textContent=`连续回击 ${s.rally} 次 · 先得 7 分`;ui.status('你在下方 · 击球位置决定反弹角度');}
ui.onPause(()=>{keys.clear();});ui.show('ready','来一场花园对打','移动下方红拍接球，击中球拍边缘会改变角度。先得 7 分赢下比赛。','发球',()=>{ui.hide();ui.sound('start');});update();
function frame(now){const dt=Math.min(.04,(now-(last||now))/1000);last=now;if(!ui.blocked&&!s.ended){const left=keys.has('ArrowLeft')||keys.has('KeyA'),right=keys.has('ArrowRight')||keys.has('KeyD');if(left||right)target=s.player+(Number(right)-Number(left))*470*dt;const events=step(s,dt,target);target=s.player;trail.push({...s.ball});if(trail.length>7)trail.shift();spark=Math.max(0,spark-dt);for(const event of events){if(event==='hit'){spark=.18;ui.sound('racket');}if(event==='point')ui.sound('score');if(event==='miss')ui.sound('miss');}update();if(s.ended){if(s.you===7){wins++;writeSave('pong:wins',wins);}ui.show(s.you===7?'win':'over',s.you===7?'漂亮，赢下这一场！':'再来一次漂亮回击',`你 ${s.you} : ${s.cpu} 电脑`,'再打一场',restart);}}render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
