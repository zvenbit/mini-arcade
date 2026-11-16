export const W=420,H=600,FLOOR=548,BIRD_X=110,RADIUS=14;
export function newGame(){return{y:250,vy:0,distance:0,passed:0,time:0,started:false,pipes:[{x:W-50,w:66,center:260,gap:176,passed:false}],ended:false};}
export function flap(s){if(s.ended)return false;s.started=true;s.vy=-330;return true;}
function overlaps(y,pipe){
  const x=Math.max(pipe.x,Math.min(BIRD_X,pipe.x+pipe.w));
  for(const [top,bottom] of [[0,pipe.center-pipe.gap/2],[pipe.center+pipe.gap/2,FLOOR]]){
    const nearY=Math.max(top,Math.min(y,bottom));
    if((BIRD_X-x)**2+(y-nearY)**2<RADIUS**2)return true;
  }return false;
}
export function step(s,dt,rng=Math.random){
  if(s.ended||!s.started)return [];dt=Math.min(Math.max(dt,0),.05);const events=[],parts=Math.max(1,Math.ceil(dt*120)),h=dt/parts;
  for(let n=0;n<parts;n++){
    const speed=Math.min(185,140+s.passed*1.5);s.time+=h;s.distance+=speed*h;s.vy=Math.min(480,s.vy+1150*h);s.y+=s.vy*h;
    if(s.y<RADIUS){s.y=RADIUS;s.vy=Math.max(0,s.vy);}
    for(const p of s.pipes)p.x-=speed*h;
    if(s.y+RADIUS>=FLOOR||s.pipes.some(p=>overlaps(s.y,p))){s.y=Math.min(s.y,FLOOR-RADIUS);s.ended=true;events.push('crash');break;}
    for(const p of s.pipes)if(!p.passed&&p.x+p.w<BIRD_X-RADIUS){p.passed=true;s.passed++;events.push('point');}
    const last=s.pipes.at(-1);
    if(last.x<W-230){const gap=Math.max(146,176-s.passed),center=Math.max(135,Math.min(405,last.center+(rng()-.5)*120));s.pipes.push({x:last.x+230,w:66,center,gap,passed:false});}
    s.pipes=s.pipes.filter(p=>p.x+p.w>-5);
  }return events;
}
export const score=s=>s.passed;
