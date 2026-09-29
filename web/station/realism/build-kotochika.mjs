// Public rooms beside the North/Central 1 passage; dimensions fitted to this station.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json'),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Kotochika public rooms | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale terrazzo',[.54,.52,.47],.45),mat('brushed metal',[.45,.47,.48],.32,.8),{...mat('frontage glass',[.66,.77,.8]),pbrMetallicRoughness:{baseColorFactor:[.66,.77,.8,.16],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark frames',[.027,.022,.024]),mat('ivory wall',[.67,.64,.58]),mat('ceiling',[.74,.73,.69]),mat('timber',[.26,.13,.055]),{...mat('diffuser',[1,.93,.79]),emissiveFactor:[1,.93,.79]},mat('printed wayfinding',[1,1,1]),mat('stone border',[.24,.23,.21],.45)];
const prefix='kotochika-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],Y=spec.floor,C=spec.ceiling,lights=[],faces=[];
const rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],slab=(id,a,b,d,e,y,depth,mi=0,role='floor')=>c.slab(prefix+id,rect(a,b,d,e).map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,a,b,d,e,top,top-bottom,mi,role);};
const decorative=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,w,row,side){box(id,x-.025,x+.025,z-w/2,z+w/2,Y+3.12,Y+2.68,8,'sign');decorative();faces.push({id:prefix+id,pos:x,center:z,w,h:.44,y:Y+2.68,side,row});}
function counter(id,a,b,d,e){box(id+'-base',a,b,d,e,Y+.85,Y+.09,6,'counter');box(id+'-top',a-.035,b+.035,d-.035,e+.035,Y+.91,Y+.85,0,'counter-top');box(id+'-toe',a,b,d,e,Y+.09,Y,3,'counter-plinth');}
function fixture(id,x,z){box(id,x-.8,x+.8,z-.08,z+.08,C-.04,C-.075,7,'fixture');decorative();lights.push({id:prefix+id+'-light',position:{x,y:C-.13,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.93,b:.8},intensity:9,range:9,spotAngle:120,innerSpotAngle:80});}
// Retained passage and paid deck supply the middle and easternmost strips.
slab('east-floor',155.5,162,-36,8,Y,.22);slab('east-ceiling',155.5,163,-36,8,C+.18,.18,5,'ceiling');
slab('west-floor',138.2,147,-15,24,Y,.22);slab('west-ceiling',138.2,147,-15,24,C+.18,.18,5,'ceiling');
box('west-perimeter',138.12,138.28,-15,24,C,Y);
box('west-south',138.2,147,-14.88,-14.72,C,Y);box('west-north',138.2,147,23.92,24.08,C,Y);
// Close the 2 m gap between the two existing paid cores behind the plaza.
box('plaza-paid-boundary',162.925,163.075,2,4,C,Y);
const rooms=[{id:'south-east',x:155.5,a:155.5,b:162.9,d:-36,e:-24,door:-30,side:-1,row:0},{id:'middle-east',x:155.5,a:155.5,b:162.9,d:-24,e:-12,door:-18,side:-1,row:1},{id:'north-east',x:155.5,a:155.5,b:162.9,d:-12,e:-2,door:-7,side:-1,row:2},{id:'cafe-west',x:147,a:138.28,b:147,d:-14.72,e:-2,door:-8,side:1,row:3},{id:'north-west',x:147,a:138.28,b:147,d:10,e:23.92,door:17,side:1,row:4}];
const partitions=new Set();
for(const r of rooms){
 for(const z of[r.d,r.e]){if(r.side===-1&&z===-36||r.side===1&&[r.d,r.e].some(q=>q===z&&[-14.72,23.92].includes(q)))continue;const key=r.side+':'+z;if(partitions.has(key))continue;partitions.add(key);box(r.id+'-partition-'+z,r.a,r.b,z-.07,z+.07,C,Y);}
 const lo=r.d+.09,hi=r.e-.09,da=r.door-1.65,db=r.door+1.65;
 box(r.id+'-fascia',r.x-.08,r.x+.08,lo,hi,C,Y+2.6,3);
 for(const [i,[a,b]]of[[lo,da],[db,hi]].entries()){
  box(r.id+'-base-'+i,r.x-.07,r.x+.07,a,b,Y+.18,Y,9);
  box(r.id+'-glass-'+i,r.x-.012,r.x+.012,a,b,Y+2.6,Y+.18,2,'frontage-glazing');
  for(const z of[a,b])box(r.id+'-mullion-'+i+'-'+z,r.x-.045,r.x+.045,z-.035,z+.035,Y+2.6,Y+.18,3,'frontage-frame');
 }
 // Small counters sit at the back, with a clear 3.3 m doorway and generous aisle.
 const back=r.side===-1?r.b-1.35:r.a+.35;
 counter(r.id+'-counter',back,back+1,r.d+1.25,r.e-1.25);
 if(r.id==='cafe-west')for(const z of[-12,-4.1]){
  box(r.id+'-table-'+z,141,142.5,z-.65,z+.65,Y+.74,Y+.68,6,'table');box(r.id+'-table-leg-'+z,141.65,141.85,z-.13,z+.13,Y+.68,Y,3,'table-leg');
  for(const x of[140.6,142.9]){box(r.id+'-seat-'+x+'-'+z,x-.24,x+.24,z-.24,z+.24,Y+.45,Y+.39,6,'seat');box(r.id+'-seat-base-'+x+'-'+z,x-.12,x+.12,z-.12,z+.12,Y+.39,Y,3,'seat-base');}
 }
 sign(r.id+'-label',r.x+r.side*.1,r.door,3.25,r.row,r.side);
 fixture(r.id+'-fixture',r.side===-1?159:143,r.door);
 box(r.id+'-threshold',r.x-.55,r.x+.55,da,db,Y+.003,Y+.001,9,'floor-inlay');decorative();
}
// Plaza edges and seating leave the central passage and both gate approaches open.
for(const z of[-1.85,9.85]){box('plaza-band-'+z,138.4,146.8,z-.04,z+.04,Y+.003,Y+.001,9,'floor-inlay');decorative();}
for(const z of[.5,6.5]){box('plaza-bench-'+z,138.65,139.25,z-1.15,z+1.15,Y+.45,Y+.37,6,'bench');for(const q of[z-.8,z+.8])box('plaza-bench-leg-'+q,138.78,139.12,q-.09,q+.09,Y+.37,Y,3,'bench-leg');}
for(const[x,z]of[[142,3],[159,3]])fixture('plaza-fixture-'+x,x,z);
sign('plaza-sign',138.32,3,4.5,5,1);
// Perimeter skirtings and ceiling seams give room edges a readable finish.
box('west-skirting',138.27,138.33,-14.7,23.9,Y+.16,Y,9,'skirting');
for(const[x1,x2,start,end]of[[138.4,146.8,-12,24],[155.7,162.7,-32,8]])for(let z=start;z<end;z+=4){box('ceiling-joint-'+x1+'-'+z,x1,x2,z-.012,z+.012,C,C-.018,1,'ceiling-joint');decorative();}
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,z)=>({x,y:Y,z}),routes=[];
function pair(label,coords){const ps=coords.map(([x,z])=>point(x,z)),points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/24);for(let j=1;j<=n;j++)points.push(point(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Public gate approaches and plaza',[[151.25,-40],[151.25,-18],[151.25,3],[142,3],[151.25,3],[151.25,18.9],[158,18.9]]);
pair('All five public rooms',[[151.25,-30],[158.5,-30],[151.25,-30],[151.25,-18],[158.5,-18],[151.25,-18],[151.25,-7],[158.5,-7],[151.25,-7],[151.25,-8],[143.5,-8],[151.25,-8],[151.25,17],[143.5,17]]);
pair('Retained B2 upper approach',[[138,-27],[151.25,-27],[151.25,3],[159,3]]);
const blocked=[{label:'Plaza paid boundary',start:point(161.5,3),yaw:90,axis:'x',limit:162.75,sign:-1}];
const report=await c.save(out,'kotochika.glb',{componentPrefix:prefix,sourceCollection:'Kotochika public rooms and plaza',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open five public shop and cafe rooms and a plaza beside the North/Central 1 gate passage; retain the B2 approach and paid boundaries.',geometry:{floor:Y,ceiling:C,rooms,routes,blocked,spawn:point(151.25,-30),retiredIds:spec.retiredIds,retiredLights:[]},references:['https://kotochika.kyoto/kyoto/','https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf'],limits:['The operator map establishes public shops and plaza; room dimensions, generic fitouts and coordinates are fitted approximations.','The eastern public bypass and full loop around the paid cores remain unfinished.']});
const labels=[['フード・スイーツ','FOOD / SWEETS'],['ファッション・雑貨','FASHION / GOODS'],['くらし・ギフト','GIFTS / ACCESSORIES'],['カフェ','CAFE'],['雑貨・おみやげ','GOODS / GIFTS'],['コトチカ広場','KOTOCHIKA PLAZA'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1792"><rect width="2048" height="1792" fill="#292326"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fff9e9" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="44">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/kotochika-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/kotochika.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===8)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat&&side===f.side?f.row:6,u=row===6?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/7;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[8].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Kotochika directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[8].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/kotochika.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'kotochika-signs.png',sha256:sha(png),material:mats[8].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
