const DURATION = .12;
export function createClearEffect(outcome, palette, reduced = false) {
  const particles = reduced ? [] : outcome.rows.flatMap(y => Array.from({length:30}, (_,i) => {
    const x = (i % 10) * 30 + 15;
    return {x, y:y*30+15, vx:(Math.random()-.5)*360, vy:-90-Math.random()*220,
      size:2+Math.random()*4, color:palette[outcome.before[y][i%10]], spin:Math.random()*6};
  }));
  return {time:0, duration:DURATION, outcome, particles, reduced};
}
export function drawClearEffect(ctx, effect) {
  const {time, duration, outcome, particles, reduced} = effect;
  const fade = Math.max(0, 1-time/duration);
  const motionTime = time * (.32 / duration);
  const beamFade = Math.max(0,1-time/(duration*.5));
  ctx.save();
  for(const y of outcome.rows) {
    const glow=ctx.createLinearGradient(0,0,300,0);
    glow.addColorStop(0,`rgba(100,170,255,${beamFade*.25})`);
    glow.addColorStop(.5,`rgba(255,248,195,${beamFade*.95})`);
    glow.addColorStop(1,`rgba(100,170,255,${beamFade*.25})`);
    ctx.fillStyle=glow;ctx.fillRect(0,y*30,300,30);
    ctx.fillStyle=`rgba(255,255,245,${beamFade})`;
    const width=reduced?300:Math.min(300,110+motionTime*4000);
    ctx.fillRect((300-width)/2,y*30+14,width,1+beamFade*5);
  }
  for(const p of particles) {
    ctx.save();ctx.globalAlpha=fade*fade;ctx.translate(p.x+p.vx*motionTime,p.y+p.vy*motionTime+180*motionTime*motionTime);
    ctx.rotate(p.spin+motionTime*3);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;
    ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();
  }
  ctx.restore();
}
