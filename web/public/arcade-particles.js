// A fixed pool of arcade medals, stars and paper shards. No DOM per particle.
export function arcadeParticles(host){
 const canvas=document.createElement('canvas');canvas.id='combo-confetti';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
 const ctx=canvas.getContext('2d'),pool=Array.from({length:180},()=>({life:0}));let cursor=0,serial=0,width=0,height=0,active=0;
 function resize(){if(width===innerWidth&&height===innerHeight)return;width=innerWidth;height=innerHeight;canvas.width=width;canvas.height=height;}
 return {
  burst(tier=1,jackpot=false){
   resize();const count=jackpot?120:20+tier*8;active=Math.min(pool.length,active+count);
   for(let i=0;i<count;i++){
    const p=pool[cursor++%pool.length],n=serial++,angle=n*2.39996,side=n%2?1:-1;
    Object.assign(p,{life:1.1+(n%8)*.12,max:2,x:jackpot?(side<0?width*.08:width*.92):width*.78,y:jackpot?height*.72:height*.27,
     vx:jackpot?-side*(140+(n*73)%580):Math.cos(angle)*(110+n%220),vy:jackpot?-(180+(n*97)%550):Math.sin(angle)*220-90,
     r:angle,spin:(n%2?1:-1)*(2+n%7),size:5+n%9,kind:n%3,hue:tier>=5?n*47:tier>=4?185+n%100:35+n%30});
   }
  },
  update(dt,enabled=true){
   if(!active)return;resize();ctx.clearRect(0,0,width,height);active=0;dt=Math.min(.05,dt);
   for(const p of pool){
    if(!enabled){p.life=0;continue;}if(p.life<=0)continue;p.life-=dt;active++;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.r+=p.spin*dt;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=`hsl(${p.hue} 95% 65%)`;ctx.strokeStyle='#fff9';ctx.lineWidth=1.5;
    if(p.kind===0){ctx.scale(.25+.75*Math.abs(Math.cos(p.r)),1);ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeRect(-p.size*.35,-p.size*.35,p.size*.7,p.size*.7);}
    else if(p.kind===1){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?p.size*.24:p.size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
    else ctx.fillRect(-p.size/2,-p.size,p.size,p.size*.45);
    ctx.restore();
   }
   canvas.hidden=!active;
  },
  reset(){pool.forEach(p=>p.life=0);ctx.clearRect(0,0,width,height);active=0;canvas.hidden=true;},
  get active(){return active;}
 };
}
