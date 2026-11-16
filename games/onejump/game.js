import {setupPastime,control,readSave,writeSave} from '../shared/pastime-ui.js?v=twenty-1';
import {newGame,step,flap,score,W,H,FLOOR,BIRD_X} from './logic.js?v=flappy-2';
import {rounded,gradient,ball,makeCanvas,loadSprites,sprite} from '../shared/club-canvas.js';
let s=newGame(),last=0,best=readSave('onejump:flappy-best',0),feathers=[],wing=0;
if(!Number.isSafeInteger(best)||best<0)best=0;
const {ui,settings,detail}=setupPastime({id:'onejump',title:'Flappy Bird',eyebrow:'FLY THROUGH THE FOREST',emblem:'↑',help:'点击画面或按 Space / ↑ / W 扑腾。\n每穿过一组管道 +1 分；撞管道或地面结束。',restart});
document.body.classList.add('club','flappy');
settings.innerHTML='<p class="pastime-note">轻点扑腾，松手下落<br><span>穿过管道 +1 · 稳住飞行节奏</span></p>';
const [canvas,ctx]=makeCanvas(ui,W,H,'小鸡飞行：点击向上扑腾，穿过上下管道之间的空隙'),art=loadSprites();
canvas.tabIndex=0;
const backdrop=new Image();backdrop.src='../../assets/onejump-forest.png';
function hop(){if(ui.blocked||!flap(s))return;wing=.16;ui.sound('jump');feathers.push({x:BIRD_X-15,y:s.y+10,life:.3});}
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&e.isPrimary){e.preventDefault();hop();}});
const hopButton=control(ui,'↑ 扑腾 / SPACE',()=>{});hopButton.classList.add('jump-button');
hopButton.addEventListener('pointerdown',e=>{if(e.button===0&&e.isPrimary){e.preventDefault();hop();}});
hopButton.addEventListener('click',e=>{if(e.detail===0)hop();});
document.addEventListener('keydown',e=>{if(e.target.closest('input,select')||e.ctrlKey||e.metaKey||e.altKey)return;if(['Space','ArrowUp','KeyW'].includes(e.code)){if(e.code==='Space'&&e.target.closest('button')&&e.target!==hopButton)return;e.preventDefault();if(!e.repeat){if(ui.mode==='ready'||ui.mode==='over')restart();hop();}}});
function pipe(p,top){
 const gapTop=p.center-p.gap/2,gapBottom=p.center+p.gap/2,y=top?-12:gapBottom,height=top?gapTop+12:FLOOR-gapBottom;
 ctx.save();ctx.shadowColor='#073f4e80';ctx.shadowBlur=9;ctx.shadowOffsetX=4;ctx.shadowOffsetY=4;
 rounded(ctx,p.x+5,y,p.w-10,height,7,gradient(ctx,p.x,y,p.w,0,['#165d58','#67e1a8','#c0f1a8','#2a9d7b','#155d56']));
 const rimY=top?gapTop-19:gapBottom;rounded(ctx,p.x,rimY,p.w,20,5,gradient(ctx,p.x,rimY,0,20,['#fff0af','#eabd60','#ba7c2f']));
 ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;rounded(ctx,p.x+10,y+4,5,Math.max(0,height-24),2,'#e8fff45c');ctx.restore();
}
function render(){ctx.clearRect(0,0,W,H);rounded(ctx,0,0,W,H,12,gradient(ctx,0,0,0,H,['#1a8893','#93dba6']));
 if(backdrop.complete&&backdrop.naturalWidth){const drawH=FLOOR/.745,drawW=backdrop.naturalWidth/backdrop.naturalHeight*drawH;ctx.drawImage(backdrop,(W-drawW)/2,0,drawW,drawH);}
 for(const p of s.pipes){pipe(p,true);pipe(p,false);}
 rounded(ctx,0,FLOOR,W,H-FLOOR,0,gradient(ctx,0,FLOOR,0,H-FLOOR,['#cda76c','#977348']));rounded(ctx,0,FLOOR,W,10,0,gradient(ctx,0,FLOOR,0,10,['#f0f8b6','#6eaf62']));
 ctx.fillStyle='#71553644';for(let i=-1;i<10;i++)rounded(ctx,i*60-s.distance%60,FLOOR+24,31,4,2,'#71553644');
 const bob=s.started?0:Math.sin(performance.now()/220)*5;
 ctx.save();ctx.translate(BIRD_X,s.y+bob);ctx.rotate(Math.max(-.34,Math.min(1,s.vy*.002)));if(!sprite(ctx,art,0,0,-32,-34,64,64))ball(ctx,0,0,18);
 if(wing>0){ctx.fillStyle='#ffdc72';ctx.beginPath();ctx.ellipse(-12,9,12,5,-.8,0,Math.PI*2);ctx.fill();}ctx.restore();
 for(const p of feathers){ctx.globalAlpha=p.life/.3;ctx.fillStyle='#fff6c2';ctx.beginPath();ctx.ellipse(p.x,p.y,5,2,.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.textAlign='center';ctx.font='bold 46px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#245448';ctx.strokeText(String(s.passed),W/2,64);ctx.fillStyle='#fff5c4';ctx.fillText(String(s.passed),W/2,64);
 if(!s.started&&!ui.blocked){rounded(ctx,60,345,300,70,17,'#164f4cdb');ctx.fillStyle='#fff1bc';ctx.font='bold 19px sans-serif';ctx.fillText('点一下，开始飞',W/2,375);ctx.font='13px sans-serif';ctx.fillText('连续轻点穿过管道 · 空格也可以',W/2,400);}
 if(s.ended){ctx.fillStyle='#e96f4b30';ctx.fillRect(0,0,W,H);}
}
function restart(){s=newGame();feathers=[];wing=0;ui.hide();canvas.focus({preventScroll:true});update();ui.sound('start');}
function update(){ui.score(score(s),best);detail.textContent=`已穿过 ${s.passed} 组管道`;ui.status(s.started?'点一下向上飞，松开自然下落':'准备好后，点画面或按空格起飞');}
function save(){writeSave('onejump:flappy-best',best);}
ui.onPause(save);window.addEventListener('pagehide',save);update();ui.show('ready','扑腾一下，飞过森林','连续轻点保持高度，从上下管道之间穿过。每组管道 +1 分，碰到管道或地面就结束。','准备起飞',restart);
function frame(now){const dt=Math.min(.04,(now-(last||now))/1000);last=now;if(!ui.blocked&&!s.ended){const events=step(s,dt);for(const e of events)if(e==='point')ui.sound('score');wing=Math.max(0,wing-dt);feathers.forEach(p=>{p.life-=dt;p.x-=90*dt;p.y+=20*dt;});feathers=feathers.filter(p=>p.life>0);const previous=best;best=Math.max(best,score(s));if(best!==previous)save();update();if(s.ended){save();ui.show('over','再扑腾一次！',`本次穿过 ${score(s)} 组管道 · 最佳 ${best} 分`,'重新起飞',restart);}}render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
