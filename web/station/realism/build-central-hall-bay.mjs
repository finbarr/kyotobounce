// Original stone, glazing and joints on the source-bound hall gate and one upper bay.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const sb=await readFile(specPath),s=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await readFile(s.source.file)),s.source.sha256);
const plain=(name,color,roughness,metal=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metal}});
const mats=[plain('hall-bay-pale-stone',[1,1,1],.63),plain('hall-bay-rose-stone',[1,1,1],.53),plain('hall-bay-dark-stone',[1,1,1],.35),plain('hall-bay-glass',[.10,.16,.17],.16,.08),plain('hall-bay-metal',[.40,.43,.44],.29,.84),plain('hall-bay-joint',[.045,.049,.045],.93),plain('hall-bay-light',[.83,.86,.79],.35),plain('hall-bay-grille',[.18,.19,.18],.51,.45)];
mats[3].pbrMetallicRoughness.baseColorFactor[3]=.48;mats[3].alphaMode='BLEND';mats[6].emissiveFactor=[.30,.32,.26];
const c=construction(mats,{flatNormals:true}),{westX:L,eastX:R,headY:H}=s.gate,b=s.bay,k=s.context;
const world=(x,y,d)=>[x,y,s.frame.frontZ+s.frame.slope*x+d];
const gateBandY=s.gate.facadeDetails?.darkBandTopY??3.7,gateRecesses=s.gate.facadeDetails?.recesses??[];
// Subtract rectangular source recesses only from the thin face tiles. The closed
// backing remains behind the blind recess; no public opening is introduced.
function subtractRect(a,h){const x0=Math.max(a[0],h.x0),x1=Math.min(a[1],h.x1),y0=Math.max(a[2],h.y0),y1=Math.min(a[3],h.y1);if(x1<=x0||y1<=y0)return[a];return [[a[0],x0,a[2],a[3]],[x1,a[1],a[2],a[3]],[x0,x1,a[2],y0],[x0,x1,y1,a[3]]].filter(r=>r[1]-r[0]>1e-7&&r[3]-r[2]>1e-7);}
function box(id,x0,x1,y0,y1,d0,d1,m,role,collision=true){assert(x1>x0&&y1>y0&&d1>d0,id);const g=new T.BoxGeometry(x1-x0,y1-y0,d1-d0),a=g.attributes.position,vs=Array.from({length:a.count},(_,i)=>world(a.getX(i)+(x0+x1)/2,a.getY(i)+(y0+y1)/2,a.getZ(i)+(d0+d1)/2));c.add('hall-bay-'+id,vs,Array.from(g.index.array),m,role);const p=c.panels.at(-1);p.collision=collision;p.material=role==='floor'?'granite':role.includes('floor')?'stone':m===3?'glass':'facade';g.dispose();}
// Closed backing plus individual thin face slabs give real recessed panel joints.
function wall(id,x0,x1,y0,y1,depth,material,moduleX=1.5,moduleY=1.15){box(id+'-back',x0,x1,y0,y1,depth,depth+.24,5,'stone-backing');let n=0;const nx=Math.max(1,Math.ceil((x1-x0)/moduleX-.001)),ny=Math.max(1,Math.ceil((y1-y0)/moduleY-.001));for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x=x0+(x1-x0)*i/nx,X=x0+(x1-x0)*(i+1)/nx,y=y0+(y1-y0)*j/ny,Y=y0+(y1-y0)*(j+1)/ny;let pieces=[[x+.006,X-.006,y+.006,Y-.006]];if(id==='east-gate-pale'||id==='west-gate-pale')for(const h of gateRecesses)pieces=pieces.flatMap(r=>subtractRect(r,h.bounds));const number=n++;for(const [part,r]of pieces.entries())box(id+'-tile-'+number+(pieces.length>1?'-part-'+part:''),...r,depth-.04,depth,material,'stone-panel');}}
wall('east-gate-dark',R,k.eastX,k.floorY,gateBandY,0,2);wall('west-gate-dark',k.westX,L,k.floorY,gateBandY,0,2);
wall('east-gate-pale',R,k.eastX,gateBandY,H,0,0);wall('west-gate-pale',k.westX,L,gateBandY,H,0,0);
for(const h of gateRecesses){const b=h.bounds;box('gate-recess-'+h.id,b.x0,b.x1,b.y0,b.y1,-.003,.012,5,'blind-recess');}
wall('gate-lintel',k.westX,k.eastX,H,k.lowerBandTopY,0,0);
wall('upper-opaque-band',k.westX,k.eastX,k.lowerBandTopY,k.frontWallTopY,0,0);
// Gate soffit is open behind: no wall crosses the public opening.
box('soffit-back',L,R,H,H+.22,0,b.depthM,5,'soffit');let cell=0;
for(let x=L;x<R-.01;x+=1.1)for(let d=0;d<b.depthM-.01;d+=1.1){const x1=Math.min(x+1.1,R),d1=Math.min(d+1.1,b.depthM);box('soffit-'+cell++,x+.012,x1-.012,H-.025,H,d+.012,d1-.012,4,'ceiling-panel');}
let lamps=0;for(let x=L+1.2;x<R-.6;x+=2.8)for(let d=1;d<b.depthM-.5;d+=2.4)box('soffit-light-'+lamps++,x-.17,x+.17,H-.036,H-.026,d-.17,d+.17,6,'light-decoration',false);
// Optional passage returns keep the source opening clear and continue its stone finish.
let returnPanels=0;
if(s.gate.returns)for(const [side,x,sign]of [['west',L,-1],['east',R,1]]){
 const span=(a,b)=>sign<0?[x-b,x-a]:[x+a,x+b];
 for(const [name,y0,y1,material]of [['dark',k.floorY,gateBandY,2],['pale',gateBandY,H,0]]){
  box('gate-return-'+side+'-'+name+'-back',...span(.04,.28),y0,y1,0,b.depthM,5,'gate-return-backing');
  const nd=Math.ceil(b.depthM/1.4),ny=Math.ceil((y1-y0)/1.15);
  for(let i=0;i<nd;i++)for(let j=0;j<ny;j++){
   box('gate-return-'+side+'-'+name+'-'+i+'-'+j,...span(0,.04),y0+(y1-y0)*j/ny+.006,y0+(y1-y0)*(j+1)/ny-.006,b.depthM*i/nd+.006,b.depthM*(i+1)/nd-.006,material,'gate-return-stone');returnPanels++;
  }
 }
}
let slabs=0;
if(s.floor){
 const fp=s.floor.footprint,toWorld=(ring,y)=>ring.map(([x,d])=>world(x,y,d));
 c.slab('hall-bay-floor-back',toWorld(fp.outer,k.floorY-.002),fp.holes.map(h=>toWorld(h,k.floorY-.002)),.198,2,'floor');
 for(const tile of s.floor.tiles){c.slab('hall-bay-floor-slab-'+tile.id,toWorld(tile.outer,k.floorY),tile.holes.map(h=>toWorld(h,k.floorY)),.04,2,'floor');slabs++;}
 // A course circle may span paving joints. One native Surface ID covers all
 // contiguous floor parts, while the browser keeps their actual tile geometry.
 const first=c.panels.findIndex(p=>p.id==='hall-bay-floor-back'),parts=c.panels.slice(first);
 assert(parts.every(p=>p.id.startsWith('hall-bay-floor-')&&p.browserMaterial===2));
 const merged={...parts[0],id:'hall-bay-floor-surface',material:'granite',vertices:[],triangles:[]};
 for(const p of parts){const offset=merged.vertices.length;merged.vertices.push(...p.vertices);merged.triangles.push(...p.triangles.map(i=>i+offset));}
 c.panels.splice(first,parts.length,merged);

}else{
 // Legacy study retained for reproducibility; corrected specs supply the actual footprint.
 box('floor-back',k.westX,k.eastX,k.floorY-.20,k.floorY-.04,-k.floorApproachM,0,5,'floor');
 for(let x=k.westX;x<k.eastX-.01;x+=1.2)for(let d=-k.floorApproachM;d<-.01;d+=1.2)box('floor-slab-'+slabs++,x+.005,Math.min(x+1.2,k.eastX)-.005,k.floorY-.04,k.floorY,d+.005,Math.min(d+1.2,0)-.005,2,'floor');
}
// Complete source-derived well curbs and guards. Renderer X/Z are retained;
// the specification applies the same explicit Y datum as the hall floor.
for(const part of s.basement?.solids||[]){
 const ring=r=>r.map(([x,z])=>[x,part.topY,z]);
 c.slab('hall-bay-well-'+part.id,ring(part.outer),part.holes.map(ring),part.depthM,part.materialIndex,part.role);
 c.panels.at(-1).material=part.materialIndex===3?'glass':'facade';
}
// The municipal glass/cap objects share an open interface. Preserve every side
// triangle and close each interface at its actual boundary vertices.
for(const part of s.basement?.meshes||[]){
 const vertices=part.vertices.map(v=>v.slice()),indices=part.indices.slice();
 const rings=part.boundaryLoops.map(r=>r.slice());
 for(let k=0;k<rings.length;k++){
  const clockwise=T.ShapeUtils.isClockWise(rings[k].map(i=>new T.Vector2(vertices[i][0],vertices[i][2])));
  if(clockwise===(k===0))rings[k].reverse();
 }
 const shape=rings.map(r=>r.map(i=>new T.Vector2(vertices[i][0],vertices[i][2]))),flat=rings.flat();
 for(const tri of T.ShapeUtils.triangulateShape(shape[0],shape.slice(1))){
  const ids=tri.map(i=>flat[i]),vs=ids.map(i=>new T.Vector3(...vertices[i])),ny=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).y;
  assert(Math.abs(ny)>1e-12);if(Math.sign(ny)!==part.capNormalY)[ids[1],ids[2]]=[ids[2],ids[1]];indices.push(...ids);
 }
 c.add('hall-bay-well-'+part.id,vertices,indices,part.materialIndex,part.role);
 c.panels.at(-1).material=part.materialIndex===3?'glass':'facade';
}
// Representative upper bay: north-facing rose frame, glass and stone head.
const A=b.westX,B=b.eastX,Y=b.baseY,G=b.glazingBaseY,Tp=b.glazingTopY,D=b.depthM;
box('upper-floor',A,B,Y-.24,Y,0,D,2,'upper-floor');
box('rose-left',A,A+.62,Y,G,0,.32,1,'stone-jamb');box('rose-right',B-.62,B,Y,G,0,.32,1,'stone-jamb');box('rose-header',A+.62,B-.62,G-.55,G,0,.32,1,'stone-header');
box('front-glass',A,B,G,Tp,.05,.075,3,'glass');wall('head',A,B,Tp,b.headY,0,0,1.4,1.3);
// Side face at X=A has a real rectangular opening; returns extend into the bay.
const sill=Y+.65,head=G-.7,dLo=.85,dHi=D-.8;
box('west-side-sill',A-.20,A,Y,sill,0,D,2,'stone-sill');box('west-side-head',A-.20,A,head,G,0,D,2,'stone-header');
box('west-side-front-jamb',A-.20,A,sill,head,0,dLo,2,'stone-jamb');box('west-side-back-jamb',A-.20,A,sill,head,dHi,D,2,'stone-jamb');
box('west-side-glass',A-.025,A-.005,G,Tp,0,D,3,'glass');box('west-side-upper-stone',A-.22,A,Tp,b.headY,0,D,0,'stone-head');
box('east-return',B,B+.22,Y,b.headY,0,D,0,'stone-return');box('rear-closure',A,B,Y,b.headY,D,D+.22,0,'inferred-rear-wall');box('ceiling',A,B,b.headY-.22,b.headY,0,D,0,'ceiling');
box('interior-ledge',A+.3,B-.3,Y+1.05,Y+1.15,D-1,D-.1,2,'interior-ledge');
// Thin mullions are visual detail. Structural wall/glass panels retain collision.
let frames=0;for(let x=A;x<=B+.01;x+=(B-A)/4)box('front-mullion-'+frames++,x-.025,x+.025,G,Tp,-.018,.11,4,'frame-decoration',false);
for(const y of [G,(G+Tp)/2,Tp])box('front-transom-'+frames++,A,B,y-.025,y+.025,-.018,.11,4,'frame-decoration',false);
for(let d=0;d<=D+.01;d+=D/5)box('side-mullion-'+frames++,A-.06,A+.04,G,Tp,d-.025,d+.025,4,'frame-decoration',false);
for(const y of [G,(G+Tp)/2,Tp])box('side-transom-'+frames++,A-.06,A+.04,y-.025,y+.025,0,D,4,'frame-decoration',false);
// Grilles are approximate modules on the opaque band; hidden ducts are out of scope.
let vents=0;for(const x of [-9.2,-3.5,1.0,12.2]){const width=2.1,y0=16.2,y1=18.35;box('grille-recess-'+vents,x-width/2,x+width/2,y0,y1,-.065,-.045,5,'grille-decoration',false);for(let y=y0+.04;y<y1-.02;y+=.11)box('grille-blade-'+vents+'-'+y.toFixed(2),x-width/2+.035,x+width/2-.035,y,y+.03,-.105,-.066,7,'grille-decoration',false);vents++;}
const report=await c.save(out,'central-hall-bay.glb',{status:s.status,specSha256:sha(sb),source:s.source,reference:s.reference,geometry:{upperBays:1,gateWidthM:R-L,gateDarkBandTopY:gateBandY,sourceRecesses:gateRecesses.length,returnDepthM:D,soffitCells:cell,lamps,slabs,returnPanels,floorAreaM2:s.floor?.totalAreaM2??null,excludedApproachAreaM2:s.floor?.excludedApproachAreaM2??null,mullions:frames,grilleGroups:vents,basementSolids:(s.basement?.solids.length??0)+(s.basement?.meshes?.length??0),basement:s.basement?{datumDecision:s.basement.datumDecision,limits:s.basement.limits,sourceInventory:s.basement.sourceInventory}:null},assumptions:s.assumptions,toolSha256:sha(await readFile(new URL(import.meta.url)))});
// Original deterministic 512px material maps. No photograph pixels are used.
let {json:j,bin}=readGLB(await readFile(out+'/central-hall-bay.glb')),chunks=[bin.subarray(0,j.buffers[0].byteLength)],offset=chunks[0].length;
const append=bytes=>{const pad=Buffer.alloc((4-offset%4)%4);chunks.push(pad);offset+=pad.length;const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;return id;};
j.images=[];j.textures=[];j.samplers=[{wrapS:10497,wrapT:10497,magFilter:9729,minFilter:9987}];let seed=20260927;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
for(const [m,color,rough] of [[0,[183,184,174],.63],[1,[166,120,115],.53],[2,[58,62,59],.35]]){const N=512,col=Buffer.alloc(N*N*3),normal=Buffer.alloc(N*N*3),mr=Buffer.alloc(N*N*3);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*3,n=rand(),grain=(n-.5)*15+(n>.974?19:0)+(n<.028?-22:0),cloud=0;for(let k=0;k<3;k++)col[i+k]=Math.max(0,Math.min(255,Math.round(color[k]+grain+cloud)));normal[i]=128+Math.round((rand()-.5)*9);normal[i+1]=128+Math.round((rand()-.5)*9);normal[i+2]=255;mr[i]=255;mr[i+1]=Math.round(Math.min(1,rough+(n-.5)*.08)*255);mr[i+2]=0;}
 const ids=[];for(const [name,data]of [['base',col],['normal',normal],['roughness',mr]]){const png=await sharp(data,{raw:{width:N,height:N,channels:3}}).png().toBuffer();ids.push(j.textures.length);j.textures.push({sampler:0,source:j.images.length});j.images.push({name:j.materials[m].name+'-'+name,mimeType:'image/png',bufferView:append(png)});}
 const mat=j.materials[m];mat.pbrMetallicRoughness.baseColorTexture={index:ids[0]};mat.pbrMetallicRoughness.roughnessFactor=1;mat.pbrMetallicRoughness.metallicRoughnessTexture={index:ids[2]};mat.normalTexture={index:ids[1],scale:.25};}
for(let m=0;m<3;m++){const p=j.meshes[m].primitives[0],a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],na=j.accessors[p.attributes.NORMAL],nv=j.bufferViews[na.bufferView],uv=new Float32Array(a.count*2);for(let i=0;i<a.count;i++){const xyz=[0,1,2].map(k=>bin.readFloatLE(v.byteOffset+i*12+k*4)),n=[0,1,2].map(k=>bin.readFloatLE(nv.byteOffset+i*12+k*4)),axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),pair=axis===1?[xyz[0],xyz[2]]:axis===0?[xyz[2],xyz[1]]:[xyz[0],xyz[1]];uv[2*i]=pair[0]/.6;uv[2*i+1]=pair[1]/.6;}p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(uv.buffer)),componentType:5126,type:'VEC2',count:a.count});}
j.buffers[0].byteLength=offset;const result=writeGLB(j,Buffer.concat(chunks));await writeFile(out+'/central-hall-bay.glb',result);report.outputs.glbSha256=sha(result);report.outputs.glbBytes=result.length;report.geometry.collidingPanels=c.panels.filter(p=>p.collision).length;report.materials={count:j.materials.length,images:j.images.length,source:'Nine original procedural512px maps; no copied reference pixels.',estimatedRgbaMipBytes:9*512*512*4*4/3};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
