'use strict';
const TowerView = (() => {
  const W=Tower.width, BH=1440, base=1325;
  const regions=['#231e2b','#2c202a','#232230','#292531','#32253a','#362544'];
  const bricktones=['#2b2533','#362731','#2d2b39','#302b39','#3a2b42','#48324d'];
  const cpMarks=['B1','02','03','04','05','RF'];
  const signX=[30,125,253,297,174,97];
  function rng(seed){let v=seed;return ()=>((v=(v*1664525+1013904223)>>>0)/4294967296);}
  const int=Math.round;
  function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(int(x),int(y),int(w),int(h));}
  function line(ctx,x1,y1,x2,y2,color){let x=int(x1),y=int(y1);const ex=int(x2),ey=int(y2),dx=Math.abs(ex-x),sx=x<ex?1:-1,dy=-Math.abs(ey-y),sy=y<ey?1:-1;let e=dx+dy;for(;;){rect(ctx,x,y,1,1,color);if(x===ex&&y===ey)break;const e2=e*2;if(e2>=dy){e+=dy;x+=sx;}if(e2<=dx){e+=dx;y+=sy;}}}
  function text(ctx,msg,x,y,color,size=7,align='left'){ctx.save();ctx.fillStyle=color;ctx.font='700 '+size+'px ui-monospace, Menlo, Consolas, monospace';ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(msg,int(x),int(y));ctx.restore();}
  function bgLayer(){
    const img=document.createElement('canvas');img.width=W;img.height=BH;
    const c=img.getContext('2d'),random=rng(745);c.imageSmoothingEnabled=false;
    function pipe(x,y,w,h,vertical=true){
      rect(c,x,y,w,h,'#171824');rect(c,x+2,y+1,w-3,h-2,'#463443');
      if(vertical){rect(c,x+3,y,2,h,'#66505a');rect(c,x+w-3,y,1,h,'#312734');for(let k=8;k<h;k+=32){rect(c,x-2,y+k,w+4,4,'#28202c');rect(c,x-1,y+k,w+2,1,'#69515b');rect(c,x+1,y+k+1,1,1,'#997269');}}
      else{rect(c,x+1,y+2,w-2,2,'#69505a');for(let k=10;k<w;k+=33){rect(c,x+k,y-1,4,h+2,'#302431');rect(c,x+k,y,1,h,'#735663');}}
    }
    function windowGrid(x,y,w,h,floor){
      rect(c,x-3,y-3,w+6,h+6,'#171722');rect(c,x-2,y-2,w+4,h+4,'#4d3c4a');rect(c,x,y,w,h,'#212431');
      const glow=['#514352','#625059','#46515e','#5b4958','#6b536b','#725573'][floor];rect(c,x+2,y+2,w-4,h-4,glow);
      for(let i=6;i<w;i+=11)rect(c,x+i,y,2,h,'#25232e');
      for(let i=7;i<h;i+=12)rect(c,x,y+i,w,2,'#272532');
      rect(c,x-4,y+h,w+8,3,'#241f2b');rect(c,x-3,y+h,w+6,1,'#78585e');
    }
    function lamp(x,y){
      rect(c,x-13,y-2,26,6,'#1c1b25');rect(c,x-9,y-1,18,3,'#876357');rect(c,x-6,y,12,2,'#e5a376');rect(c,x-4,y,8,1,'#f8cb93');
      const g=c.createRadialGradient(x,y,1,x,y,25);g.addColorStop(0,'#f2a56626');g.addColorStop(1,'#ef975100');c.fillStyle=g;c.fillRect(x-25,y-12,50,40);
    }
    function fan(x,y){
      rect(c,x-24,y-24,48,48,'#161722');rect(c,x-22,y-22,44,44,'#433843');rect(c,x-20,y-20,40,40,'#1d1c29');
      for(let n=0;n<4;n++){const s=n*Math.PI/2+.22;c.save();c.translate(x,y);c.rotate(s);c.fillStyle='#3a3444';c.beginPath();c.moveTo(0,0);c.lineTo(4,-15);c.lineTo(14,-12);c.lineTo(12,-6);c.fill();c.restore();}
      for(let k=-18;k<20;k+=5)rect(c,x-20,y+k,40,1,'#302c38');rect(c,x-3,y-3,6,6,'#514351');
    }
    for(let row=0;row<BH;row+=8){
      const altitude=base-row, floor=Math.max(0,Tower.spawnIndices.filter(i=>Tower.ledges[i].y<=altitude).length-1);
      rect(c,0,row,W,8,regions[floor]);
      for(let x=(row%16===0?-8:0);x<W;x+=17){
        if(random()>.35)rect(c,x+1,row+1,15,6,bricktones[floor]);
        if(random()>.72)rect(c,x+2,row+2,4+random()*8,1,'#ffffff09');
      }
    }
    // Upper floors open onto the skyline. Distant windows remain darker than playable ledges.
    const skyBottom=base-760, sky=c.createLinearGradient(0,40,0,skyBottom);sky.addColorStop(0,'#221935');sky.addColorStop(.60,'#513954');sky.addColorStop(1,'#8a565c');c.fillStyle=sky;c.fillRect(0,0,W,skyBottom);
    for(let i=0;i<130;i++){const x=random()*W,y=random()*skyBottom;rect(c,x,y,random()>.91?2:1,1,'#c69b9d');}
    const mx=389,my=base-1190,r=25;
    for(let y=-r;y<=r;y++){const dx=Math.floor(Math.sqrt(r*r-y*y));rect(c,mx-dx,my+y,dx*2,1,'#edb67f');}
    for(let i=0;i<21;i++)rect(c,mx-30+random()*52,my-19+random()*36,5+random()*16,2,'#cf9075');
    for(let layer=0;layer<2;layer++){
      let x=-5;while(x<W){const w=8+random()*30,h=22+random()*(layer?62:53),y=skyBottom-(layer?10:50)-h;const col=layer?'#312939':'#473449';rect(c,x,y,w,skyBottom-y,col);if(random()>.5)rect(c,x+w*.35,y-7,w*.3,7,col);for(let j=x+3;j<x+w-2;j+=6)for(let k=y+6;k<skyBottom-5;k+=9)if(random()>.62)rect(c,j,k,2,3,layer?'#a76a57':'#825567');x+=w-1;}
    }
    // Silhouettes extend well above the roof, so the last jumps frame the city.
    for(let j=0;j<9;j++){
      const x=j*60-10,yy=230+Math.round(Math.sin(j*3.8)*32),ww=22+(j%3)*7;
      rect(c,x,yy,ww,skyBottom-yy,'#382c42');rect(c,x+4,yy-4,ww-8,4,'#382c42');
      if(j%2===0){rect(c,x+ww-8,yy-15,2,12,'#382c42');rect(c,x+ww-9,yy-16,4,2,'#ad7271');}
      for(let wy=yy+8;wy<skyBottom-12;wy+=13)for(let wx=x+4;wx<x+ww-3;wx+=7)if(random()>.44)rect(c,wx,wy,2,3,random()>.5?'#875b67':'#67495b');
    }
    for(let q=0;q<5;q++){
      const idx=Tower.spawnIndices[q], y=base-Tower.ledges[idx].y, top=y-178;
      if(q<4){
        [10,455].forEach((x,j)=>pipe(x,top-14,8+j*3,199));
        pipe(q%2?26:270,top+20,q%2?140:164,7,false);
        for(let j=0;j<3;j++){const x=39+j*158+(q%2)*19;windowGrid(x,top+27,29,31,q);}
        fan(q%2?293:174,top+102);lamp(85,top+13);lamp(372,top+83);
        for(const x of [90,410]){line(c,x,top,x+13,top+23,'#51414c');line(c,x+13,top+23,x+28,top+29,'#51414c');line(c,x+28,top+29,x+48,top+31,'#51414c');}
      }else{pipe(35,top+80,8,93);windowGrid(394,top+115,43,29,4);}
    }
    // Landmarks separate the boiler, lift and machine rooms at a glance.
    const boilers=base-182;
    for(let n=0;n<2;n++){
      const x=211+n*33,top=boilers-99;
      rect(c,x+4,top,20,4,'#654952');rect(c,x,top+4,28,52,'#352935');rect(c,x+2,top+4,23,50,'#543b46');
      rect(c,x+4,top+6,3,44,'#71505a');pipe(x-1,top+13,30,4,false);pipe(x-1,top+39,30,4,false);
      rect(c,x+9,top+23,9,7,'#2e2633');rect(c,x+11,top+24,5,4,'#bf856a');rect(c,x+13,top+24,1,2,'#61444e');
    }
    const lift=base-378;
    for(const x of [88,102])rect(c,x,lift-161,2,161,'#554552');
    for(let k=0;k<15;k++)rect(c,90,lift-153+k*11,12,2,'#4e414e');
    const machine=base-578;fan(98,machine-105);pipe(110,machine-54,129,7,false);
    for(let j=0;j<4;j++){rect(c,236+j*9,machine-47,5,28,'#4f3b48');rect(c,236+j*9,machine-47,1,27,'#6a505a');}
    const by=base;rect(c,46,by-34,22,34,'#171824');rect(c,48,by-31,18,31,'#403443');
    for(let i=0;i<4;i++)rect(c,51+i*3,by-27,2,12,'#201e2a');
    rect(c,61,by-11,2,2,'#b5936c');rect(c,205,by-21,112,5,'#4c3740');
    for(let i=0;i<17;i++){const x=i*29+3;rect(c,x,by+11,21,2,'#674052');}
    // The basement drops into a service trench beneath the first catwalk.
    rect(c,0,by+18,W,91,'#1b1924');rect(c,0,by+18,W,5,'#352b37');
    for(let x=0;x<W;x+=16){line(c,x,by+18,x+4,by+22,'#80584e');line(c,x+1,by+18,x+5,by+22,'#80584e');}
    pipe(0,by+36,W,11,false);pipe(0,by+72,W,6,false);
    for(const x of [98,234,369]){rect(c,x,by+24,4,68,'#332b38');rect(c,x+1,by+25,1,65,'#51404b');}
    const furnaceX=388,furnaceY=by-55;
    rect(c,furnaceX-2,furnaceY+5,34,49,'#1a1923');rect(c,furnaceX+1,furnaceY+3,28,46,'#4a3540');
    rect(c,furnaceX+3,furnaceY+5,3,40,'#664652');rect(c,furnaceX+7,furnaceY+18,16,17,'#281c29');
    rect(c,furnaceX+8,furnaceY+23,14,10,'#a35a49');rect(c,furnaceX+10,furnaceY+27,10,6,'#d47b54');
    for(let j=0;j<5;j++)rect(c,furnaceX+8+j*3,furnaceY+20,1,14,'#4c333b');
    pipe(furnaceX+8,furnaceY-18,7,21);pipe(furnaceX+5,furnaceY-20,37,6,false);
    return img;
  }
  function make(canvas){
    const ctx=canvas.getContext('2d',{alpha:false}),back=bgLayer();
    const mural=document.getElementById('mural-art');
    const heroSheet=document.getElementById('hero-poses'), moveSheet=document.getElementById('hero-moves'), dogSheet=document.getElementById('terrier-poses');
    let actorTime=0, gait=0, pixelsPerUnit=1;
    const dogs=new Map([0,25].map(i=>[i,{
      x:Tower.ledges[i].x+(i===0?13:20),face:1,stride:0,still:0
    }]));
    const touchPad=document.getElementById('touch-pad'),roofAction=document.getElementById('roof-action');
    function hangPoster(){
      if(!mural.naturalWidth)return;
      const c=back.getContext('2d'),x=62,y=base-112;
      rect(c,x-2,y-2,99,46,'#191722');rect(c,x-1,y-1,97,44,'#654854');
      c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.68;c.drawImage(mural,x,y,95,38);c.restore();
      rect(c,x,y+38,95,4,'#352c38');rect(c,x+3,y+39,27,1,'#a17b74');rect(c,x+34,y+39,17,1,'#735d65');
      for(const px of [x,x+93])for(const py of [y,y+40])rect(c,px,py,2,1,'#ae8c83');
    }
    if(mural.complete)hangPoster();else mural.addEventListener('load',hangPoster,{once:true});
    let w=480,h=205,camX=0,bottom=-25,lastWorld=-1,cssX=1,cssY=1,thumbClearance=0;const dust=[],echo=[];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    function resize(){
      const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
      const ratio=b.width/b.height;
      // Keep upcoming jumps in view on a phone while preserving square pixels.
      w=Math.min(W,Math.max(205,Math.round(ratio*285)));
      h=Math.max(105,Math.round(w/ratio));
      cssX=b.width/w;cssY=b.height/h;
      const dpr=Math.min(window.devicePixelRatio||1,Math.sqrt(9000000/(b.width*b.height)));
      const pixelsX=Math.max(1,Math.round(b.width*dpr)),pixelsY=Math.max(1,Math.round(b.height*dpr));
      if(canvas.width!==pixelsX||canvas.height!==pixelsY){canvas.width=pixelsX;canvas.height=pixelsY;}
      pixelsPerUnit=pixelsY/h;
      ctx.setTransform(pixelsX/w,0,0,pixelsPerUnit,0,0);
      ctx.imageSmoothingEnabled=false;
      const padBox=touchPad.getBoundingClientRect();
      thumbClearance=padBox.height?(b.bottom-padBox.top+12)/cssY:0;
    }
    function spawnParticles(s,type){
      const p=s.p;
      const colors=type==='death'?['#ff875c','#ffd4a1','#c6595b']:type==='checkpoint'?['#e1ce84','#9bc3a4']:['#a99aa7','#76657a'];
      const count=type==='death'?25:type==='checkpoint'?18:5;
      for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=(type==='death'?20:8)+Math.random()*48;dust.push({x:p.x,y:p.y+(type==='death'?9:1),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed+22,life:.21+Math.random()*.24,color:colors[i%colors.length]});}
    }
    function groundMargin(){return Math.min(h*.42,Math.max(32,h*.18,thumbClearance));}
    function snap(s){camX=Tower.clamp(s.p.x-w*.46,0,W-w);bottom=Math.max(-groundMargin(),s.p.y-h*.40);dust.length=0;echo.length=0;}
    function event(s,e){
      if(e==='spawn'){
        snap(s);gait=0;
        for(const [i,dog] of dogs){
          dog.x=Tower.ledges[i].x+(i===0?13:20);dog.face=1;dog.stride=0;dog.still=0;
        }
      }
      if(['death','land','jump','drop','checkpoint','press-open'].includes(e))spawnParticles(s,e);
    }
    // Four columns, two rows. Every pose is registered to its feet, including tucked jumps.
    function paintPose(sheet,frame,x,y,facing,unit,baseline,stretch=1,alpha=1){
      if(!sheet.naturalWidth)return;
      const cell=sheet.naturalWidth/4;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(facing*unit,unit*stretch);
      ctx.globalAlpha=alpha;
      // Filter only when shrinking a sprite. Large displays keep its individual pixels.
      ctx.imageSmoothingEnabled=pixelsPerUnit*unit<1;
      ctx.drawImage(sheet,(frame%4)*cell,Math.floor(frame/4)*cell,cell,cell,-cell/2,-baseline,cell,cell);
      ctx.restore();
    }
    function contactShadow(x,y,radius){
      ctx.save();ctx.fillStyle='#1c152994';ctx.beginPath();
      ctx.ellipse(x,y+.5,radius,1.0,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function drawChar(x,y,p){
      let sheet=heroSheet,pose=0,stretch=1;
      const grounded=p.ground!==null;
      if(p.dash>0)pose=7;
      else if(p.crouched && moveSheet.naturalWidth) {
        sheet=moveSheet;pose=Math.abs(p.vx)>5?1+Math.floor(gait)%3:0;
      }
      else if(p.fastFall && moveSheet.naturalWidth) {sheet=moveSheet;pose=6;}
      else if(!grounded)pose=p.vy>15?5:6;
      else if(p.impactTime>0 && moveSheet.naturalWidth) {sheet=moveSheet;pose=7;}
      else if(moveSheet.naturalWidth && (p.turnTime>0 || (p.braking && p.turnAge>.04))) {
        sheet=moveSheet;pose=p.turnTime>0?5:4;
      }
      else if(Math.abs(p.vx)>18)pose=1+Math.floor(gait)%4;
      if(grounded){
        contactShadow(x,y,p.crouched?7.2:5.9);
        if(!reduced.matches){
          const breath=pose===0?.006*Math.sin(actorTime*3):0;
          stretch=1+breath-.055*Math.min(1,p.landTime/.12);
        }
        if(p.crouched && sheet!==moveSheet)stretch*=.55;
      }
      paintPose(sheet,pose,x,y,p.facing,.25,137,stretch);
    }
    function drawPress(s,X,Y) {
      const gate=Tower.press,x=X(gate.left),width=gate.right-gate.left;
      const ground=Y(gate.floor),top=Y(gate.floor+gate.top);
      if(top>h || ground+gate.skirt<0 || x+width<0 || x>w)return;
      const lift=s.pressLift, eased=lift*lift*(3-2*lift);
      const lip=Y(gate.floor+gate.clearance+(gate.top-gate.clearance-9)*eased);
      // The dark access opening and the striped metal lip show exactly where the head must fit.
      rect(ctx,x,ground-gate.clearance,width,gate.clearance,'#141921a6');
      rect(ctx,x,ground,width,gate.skirt,'#322b36');
      rect(ctx,x,ground,3,gate.skirt,'#765c62');
      rect(ctx,x+width-3,ground,3,gate.skirt,'#544251');
      for(let k=10;k<gate.skirt;k+=13) {
        rect(ctx,x+4,ground+k,width-8,2,'#584751');
        line(ctx,x+4,ground+k+10,x+width-5,ground+k+2,'#68525c');
      }
      rect(ctx,x-2,top,width+4,8,'#24212d');rect(ctx,x-2,top,width+4,2,'#a08a85');
      rect(ctx,x+3,top+8,4,lip-top-8,'#8e7778');rect(ctx,x+9,top+8,width-14,lip-top-8,'#433844');
      for(let y=top+11;y<lip-4;y+=6)rect(ctx,x+8,y,width-11,2,'#655261');
      rect(ctx,x-1,lip-6,width+2,6,'#49383a');rect(ctx,x-1,lip-7,width+2,1,'#e1b38e');
      for(let k=0;k<width-2;k+=7) {
        line(ctx,x+k,lip-2,x+k+3,lip-5,'#e1a76b');
        line(ctx,x+k+1,lip-2,x+k+4,lip-5,'#e1a76b');
      }
      const lit=s.pressOpen?'#b3e6b4':'#ffc18b';
      rect(ctx,x-5,lip-6,3,4,lit);rect(ctx,x+width+2,lip-6,3,4,lit);
      if(!s.pressOpen) {
        rect(ctx,x-3,ground-2,width+6,2,'#bf8e68');
        text(ctx,'DUCK →',x+width/2,lip-18,'#ffe4b4',Math.max(6,9/cssY),'center');
      }
    }
    function drawEmitters(time,X,Y) {
      for(const emitter of Tower.emitters) {
        const y=Y(emitter.y);
        if(y < -12 || y>h+12)continue;
        const bolt=Tower.boltAt(emitter,time);
        ctx.save();ctx.translate(X(emitter.x),y);ctx.scale(emitter.dir,1);
        rect(ctx,-14,-7,9,14,'#282733');rect(ctx,-13,-6,7,12,'#595663');
        rect(ctx,-13,-5,2,2,'#c4a18d');rect(ctx,-13,3,2,2,'#c4a18d');
        rect(ctx,-9,-4,10,8,'#313843');rect(ctx,-7,-3,6,6,'#657981');
        for(const x of [-6,-3])rect(ctx,x,-4,1,8,bolt.warning?'#b1eee1':'#739795');
        rect(ctx,0,-3,2,6,'#292f3a');rect(ctx,1,-2,1,4,bolt.warning?'#e7fff1':'#9bbdb9');
        if(bolt.warning) {
          const progress=bolt.phase/emitter.charge;
          ctx.globalAlpha=.27+progress*.34;
          for(let x=5;x<emitter.reach;x+=9)rect(ctx,x,0,3,1,'#92e5de');
          ctx.globalAlpha=1;
          const power=2+progress*3;rect(ctx,2,-power/2,power,power,'#b8f3dc');
        }
        if(bolt.active) {
          const x=(bolt.x-emitter.x)*emitter.dir;
          rect(ctx,x-13,-1,11,2,'#72cece5c');rect(ctx,x-8,-1,9,3,'#56adb8');
          rect(ctx,x-3,-2,6,4,'#a9e5dc');rect(ctx,x,-1,4,2,'#ffffde');
        }
        ctx.restore();
      }
    }
    function drawSigns(X,Y){
      // Paint lettering directly onto the device-resolution canvas, in front of the brickwork.
      for(let i=0;i<Tower.spawnIndices.length;i++){
        const x=X(signX[i]),y=Y(Tower.ledges[Tower.spawnIndices[i]].y+39);
        if(y< -16||y>h||x< -26||x>w)continue;
        rect(ctx,x,y,25,14,'#25222e');rect(ctx,x,y,25,1,'#937b77');
        rect(ctx,x+1,y+12,23,1,'#51424c');
        text(ctx,cpMarks[i],x+12.5,y+2,'#ead0b6',Math.max(8.4,11/cssY),'center');
      }
      const x=X(74),y=Y(29);
      if(y> -14&&y<h&&x<w){
        rect(ctx,x-2,y-1,38,11,'#342a33');
        text(ctx,'NO EXIT',x,y,'#d9b09e',Math.max(7.5,10.5/cssY));
      }
    }
    function drawDog(ledge,left,y,p,dt){
      const dog=dogs.get(ledge.i);
      const above=p.y-ledge.y>36;
      const nearby=Math.abs(p.y-ledge.y)<70;
      // The terrier follows along its safe ledge, then watches the climb from the edge.
      let target=dog.x;
      if(nearby){
        const side=p.x>=dog.x?-1:1;
        target=Tower.clamp(p.x+side*18,ledge.x+11,ledge.x+ledge.w-11);
      }
      const distance=target-dog.x;
      let frame;
      if(Math.abs(distance)>1.2){
        const step=Tower.clamp(distance,-19*dt,19*dt);
        dog.x+=step;dog.face=Math.sign(distance);dog.stride+=Math.abs(step)/2.6;dog.still=0;
        frame=2+Math.floor(dog.stride)%4;
      }else{
        dog.still+=dt;
        if(Math.abs(p.x-dog.x)>3)dog.face=p.x>dog.x?1:-1;
        const sitting=dog.still>2.5||above;
        const phase=(actorTime+(ledge.i===0?0:1.5))%4.4;
        const perk=!reduced.matches&&phase>3.45&&phase<4.15;
        frame=(sitting?6:0)+(perk?1:0);
      }
      const footX=left+dog.x-ledge.x;
      contactShadow(footX,y,6.2);
      paintPose(dogSheet,frame,footX,y,dog.face,.215,108);
    }
    function draw(s,dt){
      if(lastWorld>s.worldTime)snap(s);lastWorld=s.worldTime;
      const p=s.p,t=s.worldTime;
      actorTime+=dt;
      if(!s.dead&&p.ground!==null)gait+=Math.abs(p.vx)*dt/10.5;
      const lerp=1-Math.exp(-dt*8),camTarget=Tower.clamp(p.x-w*.46,0,W-w);
      camX+=(camTarget-camX)*lerp;bottom+=(Math.max(-groundMargin(),s.lifeHigh-h*.42)-bottom)*lerp;
      const shake=!reduced.matches&&s.dead>.32?Math.sin(t*155)*1.6:0;
      const cx=int(camX+shake),cy=int(h+bottom);const X=x=>int(x)-cx,Y=y=>cy-int(y);
      rect(ctx,0,0,w,h,'#241d30');ctx.drawImage(back,-cx,cy-base);drawSigns(X,Y);drawPress(s,X,Y);
      for(let i=0;i<20;i++){const ax=(i*71.7+Math.sin(t*.4+i)*4)%W, ay=(i*47+t*(2+i%3))%1400;const yy=Y(ay);if(yy>=0&&yy<=h)rect(ctx,X(ax),yy,1,1,'#c19a8b70');}
      for(const l of Tower.ledges){
        const y=Y(l.y);if(y< -22||y>h+14)continue;
        const crumb=s.crumbles[l.i];if(crumb>.48)continue;
        const x=X(Tower.ledgeX(l,t))+(crumb>0&&!reduced.matches?int(Math.sin(t*95)):0),ww=l.w,cp=Tower.spawnIndices.includes(l.i),wood=l.type==='crumble';
        if(l.type==='move'){const lo=X(l.x-l.travel),hi=X(l.x+l.travel+l.w);rect(ctx,lo,y+9,hi-lo,2,'#766775');rect(ctx,lo,y+7,2,6,'#ab8990');rect(ctx,hi-1,y+7,2,6,'#ab8990');}
        rect(ctx,x-1,y,ww+2,9,'#161521');rect(ctx,x,y,ww,2,wood?'#e2b185':l.type==='move'?'#95c5c3':'#d3b6aa');
        rect(ctx,x,y+2,ww,2,wood?'#a57762':l.type==='move'?'#4f828a':'#8e757b');rect(ctx,x,y+4,ww,4,wood?'#6a4851':'#534555');rect(ctx,x+2,y+8,ww-4,2,'#302735');
        for(let j=4;j<ww-2;j+=9){rect(ctx,x+j,y+4,3,1,wood?'#956655':'#6e5b67');rect(ctx,x+j+2,y+6,1,1,'#211e2d');}
        if(wood){for(let j=8;j<ww-2;j+=12){line(ctx,x+j,y+1,x+j-2,y+4,'#644953');line(ctx,x+j-2,y+4,x+j,y+7,'#443440');}}
        else if(l.type!=='move'){for(const j of [3,ww-10]){line(ctx,x+j,y+10,x+j,y+16,'#443645');line(ctx,x+j,y+16,x+j+7,y+9,'#6c5360');}}
        if(cp && s.difficulty==='hard'){
          const flagX=x+3;
          rect(ctx,flagX,y-18,2,18,'#4f444c');rect(ctx,flagX,y-18,1,17,'#ab9790');
          rect(ctx,flagX-11,y-18,11,7,s.checkpoint>=Tower.spawnIndices.indexOf(l.i)?'#91b592':'#9b8587');
          rect(ctx,flagX-13,y-16,4,4,'#6a8978');
        }
        if(dogs.has(l.i))drawDog(l,x,y,p,dt);
      }
      for(const v0 of Tower.vents){const v=Tower.ventAt(v0,t),x=X(v.x),y=Y(v.y);if(y<0||y>h+30)continue;rect(ctx,x-1,y-2,9,3,'#453440');rect(ctx,x,y-2,7,1,'#c48c73');
        for(let j=0;j<3;j++)rect(ctx,x+j*2,y-2,1,2,'#2a2330');
        if(v.warning||v.active){const span=v.active?25:7;for(let j=0;j<9;j++){const height=(t*47+j*2.9)%span;rect(ctx,x+2+Math.sin(j*2+height*.3)*(1+height*.09),y-height-1,v.active?3:2,3,v.active?(j%2?'#f19e70':'#ffe0aa'):'#ba8d85');}}
      }
      for(const z of Tower.spikes){const l=Tower.ledges[z.i],y=Y(l.y),x=X(Tower.ledgeX(l,t)+(z.edge==='right'?l.w-z.w:0));for(let k=0;k<z.w-1;k+=4){rect(ctx,x+k,y-2,4,2,'#c97872');rect(ctx,x+k+1,y-4,2,3,'#f4a18b');rect(ctx,x+k+2,y-6,1,4,'#f8c6a4');}}
      for(const ss of Tower.saws){const b=Tower.sawAt(ss,t),x=X(b.x),y=Y(b.y);if(y< -12||y>h+12)continue;rect(ctx,X(ss.x)-1,Y(ss.y+ss.amp)-2,2,ss.amp*2+4,'#665161');for(let k=0;k<12;k++){const angle=k*Math.PI/6+t*5;rect(ctx,x+Math.cos(angle)*6-1,y+Math.sin(angle)*6-1,3,3,'#edac9c');}rect(ctx,x-5,y-3,11,7,'#aa707c');rect(ctx,x-3,y-5,7,11,'#c78186');rect(ctx,x-2,y-2,5,5,'#684555');rect(ctx,x,y,1,1,'#ffd6a6');}
      drawEmitters(t,X,Y);
      const bx=X(Tower.finish.x),by=Y(Tower.finish.y);
      if(by>=-5&&by<h+35){rect(ctx,bx-9,by-4,18,4,'#302934');rect(ctx,bx-8,by-5,16,2,'#d0b8aa');rect(ctx,bx-6,by-9,12,4,'#df5445');rect(ctx,bx-5,by-10,10,2,'#ff9169');rect(ctx,bx-3,by-10,6,1,'#ffe6ac');if(!Tower.approachingButton(s))text(ctx,'RESET',bx,by-24,'#ffdaae',8,'center');}
      if(Tower.approachingButton(s)){
        roofAction.style.left=(bx*cssX)+'px';roofAction.style.top=((by+3)*cssY)+'px';
      }
      if(p.dash>0&&!reduced.matches){echo.push({x:p.x,y:p.y,life:.10,face:p.facing});}
      for(let k=echo.length-1;k>=0;k--){const e=echo[k];e.life-=dt;if(e.life<0){echo.splice(k,1);continue;}if(k%2===0)paintPose(heroSheet,7,X(e.x),Y(e.y),e.face,.25,137,1,.24*e.life/.10);}
      if(!s.dead)drawChar(Math.round((p.x-cx)*pixelsPerUnit)/pixelsPerUnit,Math.round((cy-p.y)*pixelsPerUnit)/pixelsPerUnit,p);
      for(let k=dust.length-1;k>=0;k--){const a=dust[k];a.life-=dt;if(a.life<=0){dust.splice(k,1);continue;}a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy-=120*dt;rect(ctx,X(a.x),Y(a.y),2,2,a.color);}
      if(s.dead>.35&&!reduced.matches)rect(ctx,0,0,w,h,'#f16f5e16');
      if(s.dead){text(ctx,s.difficulty==='nightmare'?'BACK TO THE BASEMENT':'RETRY',w/2,h/2-3,'#ffe2c4',9,'center');}

    }
    resize();return {resize,draw,event,snap};
  }
  return {make};
})();
