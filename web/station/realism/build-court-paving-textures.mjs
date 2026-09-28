// Original periodic stone finishes: no photographic pixels or baked illumination.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import sharp from 'sharp';
const [specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const sb=await readFile(specPath),s=JSON.parse(sb),N=512,span=s.textureSpanM,sha=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:false});
const rows=[];
for(const [fi,finish]of s.finishes.entries()){
 let seed=(0x50415645+fi)>>>0;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const cells=Math.round(span/finish.tileM);assert.equal(cells*finish.tileM,span);
 const tiles=Array.from({length:cells*cells},()=> (rand()-.5)*.035),base=Buffer.alloc(N*N*3),mask=Buffer.alloc(N*N*4),normal=Buffer.alloc(N*N*3),height=new Float32Array(N*N),clamp=x=>Math.max(0,Math.min(255,Math.round(x))),terms=Array.from({length:14},(_,i)=>({x:1+i%4,y:1+Math.floor(i/4),phase:rand()*Math.PI*2,amplitude:.003/(1+i*.15)}));
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,u=(x+.5)/N,v=(y+.5)/N,cu=Math.floor(u*cells),cv=Math.floor(v*cells),edge=Math.min(u*cells-cu,1-(u*cells-cu),v*cells-cv,1-(v*cells-cv))*finish.tileM;
  const joint=Math.max(0,Math.min(1,(finish.jointM/2+span/N/2-edge)/(span/N))),grain=(rand()-.5)*.025;
  let mottling=0;for(const t of terms)mottling+=t.amplitude*Math.cos(2*Math.PI*(u*t.x+v*t.y)+t.phase);
  const tone=tiles[cv*cells+cu]+mottling+grain-joint*.07;
  for(let k=0;k<3;k++)base[i*3+k]=clamp(255*(finish.color[k]+tone));
  const rough=finish.roughness+Math.abs(mottling)*2+joint*.025;mask[i*4]=0;mask[i*4+1]=255;mask[i*4+2]=255;mask[i*4+3]=clamp((1-rough)*255);
  height[i]=grain*.002-joint*.0012;
 }
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,dx=(height[y*N+(x+1)%N]-height[y*N+(x+N-1)%N])/(2*span/N),dy=(height[((y+1)%N)*N+x]-height[((y+N-1)%N)*N+x])/(2*span/N),len=Math.hypot(dx,dy,1);
  normal[i*3]=clamp((.5-.5*dx/len)*255);normal[i*3+1]=clamp((.5-.5*dy/len)*255);normal[i*3+2]=clamp((.5+.5/len)*255);
 }
 const maps=[];for(const [kind,bytes,channels]of [['albedo',base,3],['mask',mask,4],['normal',normal,3]]){const file=`court-paving-${finish.id}-${kind}.png`,png=await sharp(bytes,{raw:{width:N,height:N,channels}}).png().toBuffer();await writeFile(out+'/'+file,png);maps.push({kind,file,sha256:sha(png),bytes:png.length,width:N,height:N});}
 rows.push({...finish,maps});
}
const report={specSha256:sha(sb),resolution:N,spanM:span,finishes:rows,decodedRgba8MipEstimateBytes:2*3*N*N*4*4/3,method:'Seeded tile variation, periodic low-frequency mottling, mineral grain, antialiased joints and metric height normals. Original code-generated maps; no source image input.'};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
