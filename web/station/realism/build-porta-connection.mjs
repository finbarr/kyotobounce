// B1 turnback descents, B2 public aisles and the subway stair/ramp connection.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),l=await read(m.layout),s=await read(specPath),B1=s.b1,B2=s.b2,S=s.subway,C=B1-.4;
const rampStart=137-(S-B2)*20;
const mat=(name,rgb,r=.6,metal=0)=>({name:'Porta connection | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const materials=[{...mat('retained B1 floor',[.32,.30,.27],.78),name:'Registered hall | Hall descent | lower floor'},mat('pale stone',[.60,.57,.49],.4),mat('stainless',[.48,.51,.52],.32,.8),{...mat('glass',[.65,.79,.83],.15,.05),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.035,.04,.043]),mat('warm wall',[.64,.61,.52]),mat('ceiling',[.75,.73,.66]),mat('tactile',[.70,.48,.04]),{...mat('diffuser',[1,.94,.80]),emissiveFactor:[1,.94,.80]},mat('shop fitout',[.36,.23,.13]),mat('signs',[1,1,1])];
const tm=s.tactileMaterial;materials.push({...mat('retained tactile',['r','g','b'].map(k=>tm.linearColor[k]),tm.roughness,tm.metallic),name:tm.label});
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=1,role='floor',holes=[])=>c.slab('porta-connection-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=5,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=2,role='steelwork')=>c.beam('porta-connection-'+id,P(...a),P(...b),w,h,mi,role);
const closed=(shape)=>shape.coordinates.map(r=>r.slice(0,-1));
for(const [i,shape]of s.retainedTactile.entries()){const rings=closed(shape);slab('retained-tactile-'+i,rings[0],s.tactileY,s.tactileDepth,11,'retained-tactile',rings.slice(1));}
for(const [i,shape]of s.retainedTactileBacking.entries()){const rings=closed(shape);slab('retained-tactile-base-'+i,rings[0],.0001,.0001,11,'retained-tactile-base',rings.slice(1));c.panels.at(-1).collision=false;}
const b1=closed(s.b1Floor);slab('b1-deck',b1[0],B1,.18,0,'b1-floor',b1.slice(1));
const holes=s.banks.map(b=>closed(b.hole)[0]);
slab('b2-deck',rect(-24,138,-14,25),B2,.22,1,'b2-floor',s.b2PitHoles.map(h=>closed(h)[0]));
slab('b2-ceiling',rect(-24,138,-14,25),C+.18,.18,6,'ceiling',holes);
// Enclose the public mall and give its aisles real shop fronts and cross-passages.
box('north-wall',-24,138,24.9,25.1,C,B2);box('west-wall',-24.1,-23.9,-14,25,C,B2);
box('east-wall',137.9,138.1,-14,25,C,B2);
for(const[a,b]of[[-24,82],[rampStart,128]])box('south-wall-'+a,a,b,-14.1,-13.9,C,B2);
function shop(id,a,b,d,e,face){
 box(id+'-back',a,b,face>0?d:d+(e-d)-.12,face>0?d+.12:e,C,B2);
 for(const x of[a,b])box(id+'-side-'+x,x-.06,x+.06,d,e,C,B2);
 const z=face>0?e:d,mid=(a+b)/2;
 for(const[x0,x1,n]of[[a,mid-.95,'left'],[mid+.95,b,'right']]){
  box(id+'-glass-'+n,x0,x1,z-.018,z+.018,C-.25,B2+.12,3,'shop-glazing');
  box(id+'-sill-'+n,x0,x1,z-.07,z+.07,B2+.12,B2,2,'sill');
 }
 box(id+'-lintel',a,b,z-.12,z+.12,C,B2+2.65,2,'shop-portal');
 for(const x of[a,mid-.95,mid+.95,b])box(id+'-post-'+x,x-.045,x+.045,z-.07,z+.07,B2+2.65,B2,2,'shop-portal');
 const centerZ=(d+e)/2;
 for(let x=a+1.5;x<b-1;x+=3.5){box(id+'-display-'+x,x-.6,x+.6,centerZ-.4,centerZ+.4,B2+.85,B2,9,'display');box(id+'-shelf-'+x,x-.7,x+.7,centerZ-.5,centerZ+.5,B2+1.65,B2+1.58,9,'display');}
}
for(const[a,b]of[[-24,-9],[-5,16],[20,40],[44,64],[68,88],[92,112],[116,138]])shop('north-shop-'+a,a,b,20,25,-1);
for(const[a,b]of[[-24,-8],[-4,15],[19,39],[43,63],[67,81],[88,108],[112,128]])shop('south-shop-'+a,a,b,-14,-6,1);
for(const[a,b]of[[-21,-8],[10,30],[34,58],[62,82],[92,113],[117,133]]){
 shop('island-south-'+a,a,b,10,13,-1);shop('island-north-'+a,a,b,13,16,1);
}
// Connection from the mall to the existing subway concourse: stairs and a gradual ramp.
assert(rampStart>86.72&&rampStart<86.74);
slab('east-aisle',rect(128,138,-29,-14),B2,.22);slab('stair-approach',rect(128,140.5,-35,-29),B2,.22);
slab('ramp-approach',rect(82,rampStart,-43,-14),B2,.22);
for(const x of[82,rampStart])box('ramp-approach-side-'+x,x-.06,x+.06,x===82?-43:-39,-14,C,B2);
box('ramp-entry-back',82,rampStart,-43.08,-42.92,C,B2);
slab('ramp-approach-ceiling',rect(82,rampStart,-43,-14),C+.18,.18,6,'ceiling');
for(const x of[128,138])box('east-aisle-side-'+x,x-.06,x+.06,-29,-14,C,B2);
box('stair-approach-north',138,140.5,-29.06,-28.94,C,B2);
box('approach-south',128,137,-35.06,-34.94,C,B2);box('approach-retaining',137,140.5,-35.06,-34.94,S,B2);
box('east-aisle-west',127.94,128.06,-35,-29,C,B2);
slab('east-aisle-ceiling',rect(128,138,-29,-14),C+.18,.18,6,'ceiling');
slab('stair-approach-ceiling',rect(128,140.5,-35,-29),C+.18,.18,6,'ceiling');
const rampY=x=>B2+(x-rampStart)/20;
function slopeSlab(id,a,b,z0,z1,fn,offset,depth,mi,role){c.slab('porta-connection-'+id,[[a,z0],[b,z0],[b,z1],[a,z1]].map(([x,z])=>P(x,fn(x)+offset,z)),[],depth,mi,role);}
slopeSlab('ramp',rampStart,137,-43,-39,rampY,0,.22,1,'ramp-floor');
slopeSlab('ramp-ceiling',rampStart,137,-43,-39,rampY,3.58,.18,6,'ceiling');
for(const z of[-43,-39]){slopeSlab('ramp-wall-'+z,rampStart,137,z-.06,z+.06,rampY,3.4,3.4,5,'ramp-wall');beam('ramp-handrail-'+z,[rampStart,B2+1,z+(z===-43?.18:-.18)],[137,S+1,z+(z===-43?.18:-.18)],.04,.04);}
slab('upper-landing',[[137,-43],[147,-43],[147,-29],[145,-29],[145,-35],[137,-35]],S,.22);
slab('upper-ceiling',[[137,-43],[147,-43],[147,-29],[145,-29],[145,-35],[137,-35]],S+3.58,.18,6,'ceiling');
for(const z of[-43,-29])box('upper-end-'+z,z===-43?137:145,147,z-.06,z+.06,S+3.4,S);
box('upper-north-return',137,145,-35.06,-34.94,S+3.4,S);
box('upper-west-return',136.94,137.06,-39,-35,S+3.4,S);
const rise=(S-B2)/15;
for(let i=0;i<15;i++)box('subway-step-'+i,140.5+i*.3,140.5+(i+1)*.3,-35,-29,B2+(i+1)*rise,B2+i*rise-.22,1,'stair-tread');
const stairY=x=>B2+(x-140.5)/4.5*(S-B2);
slopeSlab('stair-ceiling',140.5,145,-35,-29,stairY,3.58,.18,6,'ceiling');
for(const z of[-35,-29])slopeSlab('stair-side-'+z,140.5,145,z-.06,z+.06,stairY,3.4,3.4,5,'stair-wall');
for(const z of[-34.8,-29.2])beam('subway-stair-rail-'+z,[140.5,B2+1,z],[145,S+1,z],.05,.05);
for(const[a,b,id]of[[-120,-43,'south'],[-29,24,'north']]){
 box('subway-wall-'+id,146.925,147.075,a,b,-2.8,S,5);box('subway-base-'+id,147.075,147.125,a,b,S+.28,S,4);box('subway-band-'+id,147.082,147.118,a,b,S+2.55,S+2.3,4);
}
// Exact retained first-bank geometry supplies compatible lower-bank pits and chassis.
const escalators=[],combSupports=[],blend=.35,turn=.4;
function level(z,r,h){const slope=h/r;if(z< -blend)return 0;if(z<blend)return slope*(z+blend)**2/(4*blend);if(z<r-blend)return slope*z;if(z<r+blend)return h-slope*(r+blend-z)**2/(4*blend);return h;}
function pathFor(run,height,flat){const points=[],n=Math.ceil((run+2*flat)/.04);for(let i=0;i<=n;i++){const z=-flat+(run+2*flat)*i/n;points.push({x:0,y:level(z,run,height),z});}const path=points.map(p=>({...p}));for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:height-turn+turn*Math.cos(t),z:run+flat+turn*Math.sin(t)});}for(const p of points.slice(0,-1).reverse())path.push({...p,y:p.y-2*turn});for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:-turn-turn*Math.cos(t),z:-flat-turn*Math.sin(t)});}return{path,publicPointCount:points.length,chainLengthM:path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.y-path[i].y,p.z-path[i].z),0)};}
for(const bank of s.banks)for(const [index,id]of bank.templates.entries()){
 const old=l.escalators.find(e=>e.id===id),run=bank.run,height=bank.height,flat=old.flatLength,u=old.uphill,r={x:-u.z,z:u.x},name='porta-connection-'+bank.side+'-escalator-'+(index+1),O={...old.lowerCenter,y:B2};
 const world=(z,w,y)=>P(O.x+u.x*z+r.x*w,O.y+y,O.z+u.z*z+r.z*w);
 function along(z){if(z< -old.flatLength)return z+old.flatLength-flat;if(z<0)return z*flat/old.flatLength;if(z<=old.run)return z*run/old.run;if(z<=old.run+old.flatLength)return run+(z-old.run)*flat/old.flatLength;return run+flat+z-old.run-old.flatLength;}
 for(const p of l.panels.filter(p=>p.id.startsWith(id+'-'))){
  const transform=v=>{const dx=v.x-old.lowerCenter.x,dz=v.z-old.lowerCenter.z,z=dx*u.x+dz*u.z,w=dx*r.x+dz*r.z,nz=along(z);return world(nz,w,level(nz,run,height)+v.y-old.lowerCenter.y-level(z,old.run,old.height));};
  c.add(p.id.replace(id,name),p.vertices.map(transform),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),2,p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
 }
 const path=pathFor(run,height,flat),stepCount=Math.ceil(path.chainLengthM/.4),e={...old,id:name,lowerCenter:O,run,height,...path,stepCount,pitchM:path.chainLengthM/stepCount,status:'Fitted B1-to-B2 bank below retained first bank; dimensions provisional.'};escalators.push(e);
 for(const end of ['lower','upper']){const p=c.panels.find(p=>p.id===name+'-'+end+'-comb-transfer'),zs=p.vertices.map(v=>(v.x-O.x)*u.x+(v.z-O.z)*u.z);combSupports.push({support:p.id,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)});}
 for(const side of[-1,1]){
  const w=side*(e.width/2+.10),n=Math.ceil((run+2*flat)/.25);
  for(let i=0;i<n;i++){const a=-flat+(run+2*flat)*i/n,b=-flat+(run+2*flat)*(i+1)/n,A=world(a,w,level(a,run,height)+.50),B=world(b,w,level(b,run,height)+.50);c.beam(name+'-glass-'+side+'-'+i,A,B,.022,.86,3,'escalator-glass');c.beam(name+'-handrail-'+side+'-'+i,world(a,w,level(a,run,height)+.98),world(b,w,level(b,run,height)+.98),.075,.065,4,'escalator-handrail');}
 }
}
// Guard the upper floor along the outer long edges of each new well.
// The slope handrails alone fall below B1 and cannot protect its cut edges.
for(const bank of s.banks){
 const lanes=escalators.filter(e=>e.id.startsWith('porta-connection-'+bank.side+'-'));
 const u=lanes[0].uphill,r={x:-u.z,z:u.x};
 const middle={x:(lanes[0].lowerCenter.x+lanes[1].lowerCenter.x)/2,z:(lanes[0].lowerCenter.z+lanes[1].lowerCenter.z)/2};
 for(const e of lanes){
  const side=Math.sign((e.lowerCenter.x-middle.x)*r.x+(e.lowerCenter.z-middle.z)*r.z),w=side*(e.width/2+.19);
  const point=(a,y)=>[e.lowerCenter.x+u.x*a+r.x*w,y,e.lowerCenter.z+u.z*a+r.z*w];
  const a=.8,b=e.run+e.flatLength-.03;
  beam(bank.side+'-b1-glass-'+e.id,point(a,B1+.55),point(b,B1+.55),.024,1.05,3,'well-guard');
  beam(bank.side+'-b1-cap-'+e.id,point(a,B1+1.1),point(b,B1+1.1),.05,.055,2,'well-guard');
 }
}
// Trim, original signs and light fittings remain batched static geometry.
const lights=[];function light(id,x,z,y){box('light-'+id,x-.10,x+.10,z-.9,z+.9,y+.03,y,8,'fixture');c.panels.at(-1).collision=false;lights.push({id:'porta-connection-emitter-'+id,position:{x,y:y-.04,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.96,b:.83},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted from Porta route photographs',note:'Existing two-light pool.'});}
for(let x=-18;x<138;x+=12)for(const z of[1,18])light(x+'-'+z,x,z,C-.05);
for(let x=rampStart+3;x<137;x+=9)light('ramp-'+x,x,-41,rampY(x)+3.32);
for(const z of[-21,-32]){light('east-'+z,132,z,C-.05);light('approach-'+z,84,z,C-.05);}light('upper',146,-38,S+3.3);
for(const z of[0,17])for(let x=-20;x<136;x+=3)box('floor-inlay-'+x+'-'+z,x,x+2.6,z,z+.06,B2+.004,B2+.001,4,'floor-inlay');
for(let x=-21;x<138;x+=4)for(const[a,b]of(x>-16&&x<16?[[-14,0],[10,25]]:[[-14,25]]))box('ceiling-grid-'+x+'-'+a,x-.012,x+.012,a,b,C,C-.025,2,'ceiling-joint');
for(let z=-12;z<25;z+=3)for(const[a,b]of(z>=0&&z<=10?[[-24,-16],[16,138]]:[[-24,138]]))box('ceiling-cross-'+z+'-'+a,a,b,z-.012,z+.012,C,C-.025,2,'ceiling-joint');
for(const z of[-34.8,-29.2])box('stair-tactile-'+z,140.0,140.4,z,z+.18,B2+.006,B2,7,'tactile');
const faces=[];function sign(id,x,z,y,w,row){box('sign-'+id,x-w/2,x+w/2,z-.025,z+.025,y+.5,y,10,'sign');c.panels.at(-1).collision=false;faces.push({id:'porta-connection-sign-'+id,x,z,y,w,row});}
sign('b2-arrival',1.2,8.7,B2+2.5,5,0);for(const x of[35,75,115])sign('east-'+x,x,4.5,B2+2.5,5,1);sign('subway',144,-29.5,S+2.4,5,2);sign('ramp-entry',84,-14.5,B2+2.5,4,3);
for(const p of c.panels){if(p.id.includes('-escalator-')){p.material=p.browserMaterial===3?'glass':p.browserMaterial===4?'rubber':'steel';}else p.material=p.browserMaterial===11?tm.physical:p.browserMaterial===2?'steel':p.browserMaterial===3?'glass':'stone';if(['floor-inlay','ceiling-joint','tactile','sign','fixture'].includes(p.role))p.collision=false;}
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/20);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Porta main aisle to subway stairs',[point(1.2,B2,3),point(132,B2,3),point(132,B2,-33),point(140.5,B2,-33),point(145,S,-33),point(150,S,-33)]);
pair('Porta north aisle and cross passage',[point(1.2,B2,3),point(1.2,B2,18),point(134,B2,18),point(134,B2,3)]);
pair('Porta ramp route',[point(84,B2,-10),point(84,B2,-41),point(rampStart,B2,-41),point(137,S,-41),point(150,S,-41)]);
pair('Retained subway through passage',[point(151.25,S,-47),point(151.25,S,-26)]);
const report=await c.save(out,'porta-connection.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'B1 turnback to B2 Porta, moving lower banks, public mall aisles and subway stair/ramp connection.',geometry:{B1,B2,subway:S,ceiling:C,rampStart,routes,retiredIds:s.retiredIds},references:['https://www.porta.co.jp/navigation','research/kyoto-station/maps/porta-shopguide-2026.pdf','research/kyoto-station/maps/floor-b2.svg'],limits:s.assumptions});
await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports})+'\n');
const labels=[['ポルタ B2F','Porta / South area'],['地下鉄・八条口 →','Subway / Hachijo Exit'],['ポルタ・中央コンコース','Porta / Central Concourse'],['地下鉄 スロープ →','Ramp to Subway']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1280"><rect width="2048" height="1280" fill="#202f39"/>';
for(const[i,[jp,en]]of labels.entries())svg+=`<g transform="translate(0,${i*256})" fill="#fff9e8" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text x="1024" y="110" font-size="78">${jp}</text><text x="1024" y="195" font-size="52">${en}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/porta-signs.png',png);await writeFile(out+'/porta-signs.svg',svg);
const {json:j,bin}=readGLB(await readFile(out+'/porta-connection.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===10)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),row=flat?f.row:4,u=row===4?.5:.5-side*(v.x-f.x)/f.w,t=(row*256+256*(1-(v.y-f.y)/.5))/1280;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[10].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Porta direction labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[10].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const nb=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',nb);await writeFile(out+'/porta-connection.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);report.texture={file:'porta-signs.png',sha256:sha(png),material:materials[10].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lanes:escalators.length});
