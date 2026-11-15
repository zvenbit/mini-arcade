export const DURATION=60;
export function newGame(){return {version:1,time:DURATION,score:0,hits:0,misses:0,combo:0,spawnIn:.25,holes:Array.from({length:9},()=>({life:0,kind:0})),ended:false};}
export function hit(s,index){
  if(s.ended||!Number.isInteger(index)||index<0||index>=9)return null;
  const hole=s.holes[index];
  if(!hole.life){s.combo=0;return {points:0};}
  const points=(hole.kind===2?20:10)+Math.min(s.combo,5)*2;
  s.score+=points;s.hits++;s.combo++;hole.life=0;hole.kind=0;return {points};
}
export function tick(s,dt,rng=Math.random){
  if(s.ended||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,s.time);s.time=Math.max(0,s.time-dt);
  for(const hole of s.holes)if(hole.life>0){hole.life=Math.max(0,hole.life-dt);if(!hole.life){s.misses++;s.combo=0;hole.kind=0;}}
  if(s.time===0){s.ended=true;s.holes.forEach(h=>{h.life=0;h.kind=0;});return;}
  s.spawnIn-=dt;
  if(s.spawnIn<=0){
    const empty=s.holes.map((h,i)=>h.life? -1:i).filter(i=>i>=0);
    const progress=1-s.time/DURATION;
    if(empty.length&&9-empty.length<2+(progress>.5?1:0)){
      const i=empty[Math.floor(rng()*empty.length)];s.holes[i]={life:1.5-progress*.65,kind:rng()<.16?2:1};
    }
    s.spawnIn=.8-progress*.4;
  }
}
export function validSave(s){return !!s&&s.version===1&&Number.isFinite(s.time)&&s.time>=0&&s.time<=DURATION&&['score','hits','misses','combo'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)&&s.combo<=s.hits&&Number.isFinite(s.spawnIn)&&s.spawnIn>=0&&s.spawnIn<=1&&typeof s.ended==='boolean'&&s.ended===(s.time===0)&&Array.isArray(s.holes)&&s.holes.length===9&&s.holes.every(h=>h&&Number.isFinite(h.life)&&h.life>=0&&h.life<=1.5&&[0,1,2].includes(h.kind)&&(h.life>0)===(h.kind>0));}
