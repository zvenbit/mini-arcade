export const W=440,H=620;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function newGame(difficulty=1){return{difficulty,player:220,ai:220,target:220,ball:{x:220,y:310,vx:135,vy:290},you:0,cpu:0,rally:0,wait:1.2,ended:false,time:0};}
export function step(s,dt,target=s.player){
  if(s.ended)return [];dt=Math.min(Math.max(dt,0),.05);s.time+=dt;const events=[];s.player=clamp(target,46,W-46);
  const speed=[155,215,275][s.difficulty],aim=s.ball.vy<0?s.ball.x+Math.sin(s.time*2.1)*[48,29,13][s.difficulty]:W/2;
  s.ai=clamp(s.ai+clamp(aim-s.ai,-speed*dt,speed*dt),46,W-46);
  if(s.wait>0){s.wait=Math.max(0,s.wait-dt);return events;}
  for(let i=0;i<6;i++){
    const b=s.ball,h=dt/6,oldY=b.y;b.x+=b.vx*h;b.y+=b.vy*h;
    if(b.x<17){b.x=34-b.x;b.vx=Math.abs(b.vx);events.push('wall');}if(b.x>W-17){b.x=2*(W-17)-b.x;b.vx=-Math.abs(b.vx);events.push('wall');}
    for(const [y,x,down] of [[H-55,s.player,true],[55,s.ai,false]]){
      if((down?b.vy>0&&oldY<=y-10&&b.y>=y-10:b.vy<0&&oldY>=y+10&&b.y<=y+10)&&Math.abs(b.x-x)<=54){
        const angle=clamp((b.x-x)/54,-1,1)*1.05,v=Math.min(650,Math.hypot(b.vx,b.vy)+14);b.vx=Math.sin(angle)*v;b.vy=Math.cos(angle)*v*(down?-1:1);b.y=y+(down?-10:10);s.rally++;events.push('hit');
      }
    }
    if(b.y<-14||b.y>H+14){const won=b.y<0;s[won?'you':'cpu']++;events.push(won?'point':'miss');s.rally=0;s.ended=s.you>=7||s.cpu>=7;s.wait=1.1;s.ball={x:W/2,y:H/2,vx:135*(s.you%2?-1:1),vy:290*(won?1:-1)};break;}
  }return events;
}
