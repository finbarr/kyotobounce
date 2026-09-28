// Original periodic granite, in metres. Reference photographs are not inputs.
// A square paving joint is optional; palette and grain scale remain art choices.
import assert from 'node:assert/strict';
export function graniteMaps({resolution=512,tileMetres=.6,seed=0x4e495741,color=[.42,.43,.42],jointWidthM=.003}={}) {
 assert(Number.isInteger(resolution)&&resolution>=64&&tileMetres>0&&jointWidthM>=0&&jointWidthM<tileMetres/10);
 const N=resolution,height=new Float32Array(N*N),tone=new Float32Array(N*N);
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 for(let i=0;i<N*N;i++){tone[i]=(random()-.5)*.11;height[i]=(random()-.5)*.00008;}
 for(let i=0;i<19000;i++) {
  const x=Math.floor(random()*N),y=Math.floor(random()*N),radius=.55+random()*1.5,dark=random()<.4,delta=dark?-.15-random()*.13:.07+random()*.14,relief=(random()-.5)*.0003;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const distance=Math.hypot(dx,dy);if(distance>radius)continue;
   const at=((y+dy+N)%N)*N+(x+dx+N)%N,w=1-distance/(radius+.3);tone[at]+=delta*w;height[at]+=relief*w;
  }
 }
 const base=Buffer.alloc(N*N*3),rough=Buffer.alloc(N*N*3),normal=Buffer.alloc(N*N*3),clamp=x=>Math.max(0,Math.min(255,Math.round(x))),grout=new Float32Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,edge=Math.min(x+.5,N-x-.5,y+.5,N-y-.5)*tileMetres/N;
  const joint=Math.max(0,1-edge/Math.max(jointWidthM/2,1e-9));grout[i]=joint;
  height[i]-=joint*.0008;
  for(let k=0;k<3;k++)base[i*3+k]=clamp((color[k]+tone[i]-joint*.065)*255);
  rough[i*3]=255;rough[i*3+1]=clamp((.78+Math.abs(tone[i])*.35+joint*.06)*255);rough[i*3+2]=0;
 }
 for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
  const i=y*N+x,dx=(height[y*N+(x+1)%N]-height[y*N+(x+N-1)%N])/(2*tileMetres/N),dy=(height[((y+1)%N)*N+x]-height[((y+N-1)%N)*N+x])/(2*tileMetres/N),length=Math.hypot(dx,dy,1);
  normal[i*3]=clamp((.5-.5*dx/length)*255);normal[i*3+1]=clamp((.5-.5*dy/length)*255);normal[i*3+2]=clamp((.5+.5/length)*255);
 }
 return {resolution:N,tileMetres,jointWidthM,color,maps:[['granite-color',base],['granite-roughness',rough],['granite-normal',normal]]};
}
