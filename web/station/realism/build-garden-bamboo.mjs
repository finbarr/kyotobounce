// Rebuild the four rooftop bamboo beds from the operator's garden photographs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-bamboo-',F=Math.max(...layout.panels.find(p=>p.id==='garden-promenade-public-floor').vertices.map(v=>v.y));
const oldBed=layout.panels.find(p=>p.id==='garden-promenade-k008-bamboo-bed');assert(oldBed);
const retiredIds=layout.panels.filter(p=>p.id.startsWith('garden-promenade-k008-bamboo-')||p.id.startsWith('garden-promenade-add-garden-bamboo-')).map(p=>p.id);assert.equal(retiredIds.length,171);
// Recover the four original closed planter footprints; keep their skewed edges.
const key=v=>[v.x,v.y,v.z].map(n=>n.toFixed(5)).join(','),adj=new Map(),positions=new Map();
for(let i=0;i<oldBed.triangles.length;i+=3){const ks=oldBed.triangles.slice(i,i+3).map(i=>{const v=oldBed.vertices[i],k=key(v);positions.set(k,v);return k;});for(const k of ks){if(!adj.has(k))adj.set(k,new Set());for(const n of ks)adj.get(k).add(n);}}
const footprints=[];
while(adj.size){const pending=[adj.keys().next().value],seen=new Set();while(pending.length){const k=pending.pop();if(seen.has(k))continue;seen.add(k);for(const n of adj.get(k)||[])if(!seen.has(n))pending.push(n);adj.delete(k);}const vs=[...seen].map(k=>positions.get(k)),top=Math.max(...vs.map(v=>v.y)),corners=vs.filter(v=>Math.abs(v.y-top)<1e-5),center={x:corners.reduce((n,v)=>n+v.x,0)/corners.length,z:corners.reduce((n,v)=>n+v.z,0)/corners.length};assert.equal(corners.length,4);corners.sort((a,b)=>Math.atan2(a.z-center.z,a.x-center.x)-Math.atan2(b.z-center.z,b.x-center.x));footprints.push({corners,center,top});}
footprints.sort((a,b)=>a.center.z-b.center.z||a.center.x-b.center.x);assert.equal(footprints.length,4);
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[],floor:F};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
const mat=(name,color,roughness=.83,metallic=0)=>({name:'Garden bamboo | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('pale yellow planters',[.60,.51,.16],.64,.12),mat('planter ribs',[.50,.42,.11],.65,.12),mat('rim',[.27,.29,.28],.45,.55),mat('mulch',[.21,.16,.09]),mat('mature culms',[.23,.28,.055]),mat('young culms',[.36,.40,.11]),mat('fine branches',[.24,.30,.058]),mat('nodes',[.42,.40,.16]),mat('support frames',[.56,.53,.21],.64),mat('deep leaves',[.09,.19,.023]),mat('green leaves',[.20,.32,.045]),mat('young leaves',[.31,.41,.078]),mat('bindings',[.054,.043,.027])];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
let state=571;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),between=(a,b)=>a+(b-a)*random();
const batches=new Map();
function mesh(id,g,mi,role,collision=false){const k=[id,mi,role,collision].join('|');if(!batches.has(k))batches.set(k,{id,mi,role,collision,vertices:[],indices:[]});const b=batches.get(k),ps=g.attributes.position,offset=b.vertices.length;for(let i=0;i<ps.count;i++)b.vertices.push([ps.getX(i),ps.getY(i),ps.getZ(i)]);for(const i of g.index?.array||Array.from({length:ps.count},(_,i)=>i))b.indices.push(i+offset);g.dispose();}
function rod(id,a,b,r0,r1,mi,role,collision=false,sides=6){const A=new T.Vector3(...a),B=new T.Vector3(...b),delta=B.clone().sub(A),g=new T.CylinderGeometry(r1,r0,delta.length(),sides);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());mesh(id,g,mi,role,collision);}
function slab(id,outer,holes,depth,mi,role,collision=true){c.slab(prefix+id,outer,holes,depth,mi,role);const p=c.panels.at(-1);p.material=role==='soil'?'stone':'steel';p.collision=collision;}
let leaves=0,culms=0;const beds=[];
function leaf(id,start,angle,length,width,drop,mi){
 const A=new T.Vector3(...start),u=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),v=new T.Vector3(-Math.sin(angle),0,Math.cos(angle)).applyAxisAngle(u,between(-.65,.65)),vs=[];
 for(const [a,b]of [[0,0],[.28,.48],[.65,.37],[1,0],[.65,-.37],[.28,-.48]])vs.push(A.clone().addScaledVector(u,length*a).addScaledVector(v,width*b).add(new T.Vector3(0,-drop*a*a,0)).toArray());
 const middle=A.clone().addScaledVector(u,length*.48).add(new T.Vector3(0,-drop*.23,0));vs.push(middle.clone().add(new T.Vector3(0,.0018,0)).toArray(),middle.clone().add(new T.Vector3(0,-.0018,0)).toArray());
 const ix=[];for(let i=0;i<6;i++)ix.push(6,i,(i+1)%6,7,(i+1)%6,i);
 const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vs.flat(),3)).setIndex(ix);mesh(id,g,mi,'bamboo-leaves');leaves++;
}
for(const [bed,f]of footprints.entries()){
 const {corners,center,top}=f,w=Math.hypot(corners[1].x-corners[0].x,corners[1].z-corners[0].z),d=Math.hypot(corners[3].x-corners[0].x,corners[3].z-corners[0].z),soil=top-.04;
 function at(u,v,y){const a=corners[0],b=corners[1],e=corners[2],d=corners[3];return P((1-v)*(a.x*(1-u)+b.x*u)+v*(d.x*(1-u)+e.x*u),y,(1-v)*(a.z*(1-u)+b.z*u)+v*(d.z*(1-u)+e.z*u));}
 const ring=(inset,y)=>[[inset/w,inset/d],[1-inset/w,inset/d],[1-inset/w,1-inset/d],[inset/w,1-inset/d]].map(([u,v])=>at(u,v,y));
 slab('planter-'+bed,ring(0,top),[ring(.065,top)],top-F,0,'planter-wall');slab('rim-'+bed,ring(-.012,top+.025),[ring(.083,top+.025)],.04,2,'planter-rim');slab('soil-'+bed,ring(.069,soil),[],.035,3,'soil');
 for(let edge=0;edge<4;edge++){
  const a=corners[edge],b=corners[(edge+1)%4],length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.floor(length/.065);
  for(let i=1;i<count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;rod('fluting-'+bed,P(x,F+.025,z),P(x,top-.022,z),.009,.009,1,'planter-fluting',false,5);}
 }
 const supportHeight=F+2.22,supports=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>({base:at(u?1-.13/w:.13/w,v?1-.13/d:.13/d,soil),head:at(u?1-.40/w:.40/w,v?1-.40/d:.40/d,supportHeight)}));
 for(const [i,p]of supports.entries()){
  rod('frame-leg-'+bed+'-'+i,p.base,p.head,.022,.019,8,'bamboo-support',true,8);rod('frame-rail-'+bed+'-'+i,p.head,supports[(i+1)%4].head,.018,.018,8,'bamboo-support',true,8);
  for(const dy of [-.018,.018]){const g=new T.TorusGeometry(.024,.004,5,8);g.rotateX(Math.PI/2);g.translate(p.head[0],p.head[1]+dy,p.head[2]);mesh('bindings-'+bed,g,12,'bamboo-bindings');}
 }
 const count=bed<2?22:bed===2?14:18;culms+=count;
 for(let cane=0;cane<count;cane++){
  const a=at(between(.16,.84),between(.17,.83),soil),height=between(2.7,4.25),lean=[between(-.22,.22),between(-.22,.22)],radius=between(.012,.021),mi=cane%3===0?5:4;
  const stem=t=>[a[0]+lean[0]*t*t,soil+height*t,a[2]+lean[1]*t*t];
  const caneVertices=[],caneIndices=[];
  for(let s=0;s<=4;s++){const p=stem(s/4),r=radius*(1-s/4)+.0025;for(let k=0;k<8;k++){const angle=k*Math.PI/4;caneVertices.push(p[0]+r*Math.cos(angle),p[1],p[2]+r*Math.sin(angle));}}
  caneVertices.push(...stem(0),...stem(1));
  for(let s=0;s<4;s++)for(let k=0;k<8;k++){const a=s*8+k,b=s*8+(k+1)%8;caneIndices.push(a,b,b+8,a,b+8,a+8);}
  for(let k=0;k<8;k++)caneIndices.push(40,(k+1)%8,k,41,32+k,32+(k+1)%8);
  // Ring winding is outward for the browser's Y-up coordinates.
  const caneGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(caneVertices,3)).setIndex(caneIndices.map((_,i)=>caneIndices[i-i%3+2-i%3]));mesh('culms-'+bed,caneGeometry,mi,'bamboo-culms',true);
  for(let y=.26;y<height-.08;y+=.28){const t=y/height,p=stem(t);rod('nodes-'+bed,[p[0],p[1]-.008,p[2]],[p[0],p[1]+.008,p[2]],radius*(1-t)+.004,radius*(1-t)+.004,7,'bamboo-nodes',false,8);}
  const phase=random()*Math.PI*2;
  for(let branch=0;branch<11;branch++){
   const t=.22+branch*.067,a=stem(t),angle=phase+branch*2.39,reach=between(.38,.64)*(1-.22*t),end=[a[0]+Math.cos(angle)*reach,a[1]+between(.08,.22),a[2]+Math.sin(angle)*reach];
   rod('branches-'+bed,a,end,.0045,.0018,6,'bamboo-branches',false,5);
   for(let j=0;j<8;j++){
    const s=.30+j*.09,p=a.map((v,k)=>v+(end[k]-v)*s),side=j%2?-1:1,la=angle+side*between(.55,1.15),length=between(.12,.22)*(1-.28*t);
    leaf('leaves-'+bed,p,la,length,between(.022,.035),between(.015,.045),9+Math.floor(random()*3));
   }
   // Side sprays make branching crowns instead of a single comb of leaves.
   for(const side of [-1,1]){
    const s=between(.45,.65),fork=a.map((v,k)=>v+(end[k]-v)*s),fa=angle+side*between(.5,.85),reach=between(.16,.28),tip=[fork[0]+Math.cos(fa)*reach,fork[1]+between(-.04,.08),fork[2]+Math.sin(fa)*reach];
    rod('branches-'+bed,fork,tip,.0026,.0012,6,'bamboo-branches',false,5);
    for(let j=0;j<5;j++){const p=fork.map((v,k)=>v+(tip[k]-v)*(.25+j*.16));leaf('leaves-'+bed,p,fa+(j%2?-1:1)*between(.6,1.1),between(.14,.24)*(1-.18*t),between(.023,.038),between(.02,.055),9+Math.floor(random()*3));}
   }
  }
 }
 // Short sprays at soil level replace the old solid green planter surface.
 for(let tuft=0;tuft<25;tuft++){const p=at(between(.10,.90),between(.12,.88),soil+.025);for(let j=0;j<7;j++)leaf('underplanting-'+bed,p,random()*Math.PI*2,between(.10,.20),between(.013,.023),between(-.10,-.035),9+j%3);}
 beds.push({bed,corners:corners.map(p=>({x:p.x,z:p.z})),top,soil,center,culms:count,supportHeight});
}
for(const b of batches.values()){c.add(prefix+b.id+'-'+b.mi,b.vertices,b.indices,b.mi,b.role);const p=c.panels.at(-1);p.collision=b.collision;p.material=b.role==='bamboo-support'?'wood':b.collision?'wood':'stone';}
const paths=[['Western bamboo aisle',[[-191.8,-17.3],[-191.8,-9],[-191.8,0],[-191.8,3]]],['Eastern bamboo aisle',[[-176.2,-17.3],[-176.2,-9],[-176.2,1],[-176.2,3]]]];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
const blocked=[{label:'Western bamboo planter',start:pt(-191.5,-16),yaw:-90,axis:'x',limit:-192.43,sign:1},{label:'Eastern bamboo planter',start:pt(-176.3,-16),yaw:90,axis:'x',limit:-175.58,sign:-1}];
const report=await c.save(out,'garden-bamboo.glb',{componentPrefix:prefix,sourceCollection:'Rooftop garden bamboo and support frames',builder:'web/station/realism/build-garden-bamboo.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Rebuild the four bamboo beds with slender jointed culms, fine branching leaf sprays, inward-leaning support frames, soil and ribbed planters.',geometry:{spawn:parent.spawn,floor:F,beds,culms,leaves,routes,chromeRoutes:routes.map(r=>r.label),blocked,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[]},references:['https://www.kyoto-station-building.co.jp/service/square/'],limits:['The existing planter footprints are retained; cane counts, leaf placement and frame dimensions are fitted estimates from photographs.','Central planting beds, lawn, seating and lamps remain for separate refinement.']});
await writeFile(out+'/views.json',JSON.stringify([
 ['arrival',[-185,F+1.65,-23.8],[-194,F+2,-15]],['western-bed',[-189.3,F+1.65,-15],[-194,F+2,-16]],['support-close',[-191.3,F+1.35,-17.5],[-193.2,F+1.45,-16]],['garden-center',[-185,F+1.65,-12],[-185,F+2,0]],['eastern-bed',[-169,F+1.65,-11],[-174,F+2,-16]],['northern-beds',[-185,F+1.65,3.5],[-185,F+2,-3]]
],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,culms,leaves,retired:retiredIds.length});
