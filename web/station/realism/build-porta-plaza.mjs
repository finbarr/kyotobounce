// The first connected part of Porta's plaza B1 west area: two public aisles,
// cross-passages, subway arrival and a fitted stair to the existing B2 mall.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw),spec=await read(specPath);assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Porta connection | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.60,.57,.49],.4),mat('stainless',[.48,.51,.52],.32,.8),{...mat('glass',[.65,.79,.83],.15,.05),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.035,.04,.043]),mat('warm wall',[.64,.61,.52]),mat('ceiling',[.75,.73,.66]),mat('tactile',[.70,.48,.04]),{...mat('diffuser',[1,.94,.80]),emissiveFactor:[1,.94,.80]},mat('shop fitout',[.36,.23,.13]),{...mat('plaza signs',[1,1,1]),name:'Porta plaza | printed signs'}, {...mat('stone bands',[.26,.22,.18],.45),name:'Porta plaza | stone bands'}];
const prefix='porta-plaza-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],Y=spec.plaza,B=spec.b2,C=spec.ceiling;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.05,.05);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.6);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.04,.04);}}
const outer=[[12,25.2],[130,25.2],[130,24],[137,24],[137,61],[12,61]];
const deck=[[12,25.2],[16,25.2],[16,30],[20,30],[20,25.2],[130,25.2],[130,24],[137,24],[137,61],[12,61]];
slab('deck',deck,Y,.25);slab('ceiling',outer,C+.18,.18,5,'ceiling');
box('west-wall',11.92,12.08,25.2,61,C,Y);box('north-wall',12,137,60.92,61.08,C,Y);
box('east-wall',136.92,137.08,32,61,C,Y);box('subway-south-wall',130,137,23.925,24.075,C,Y);box('south-return',129.925,130.075,24,25.2,C,Y);
for(const[a,b]of[[12,16],[20,130]])box('south-wall-'+a,a,b,25.125,25.275,C,Y);
// Preserve the remainder of the retired B2 wall and its exact original height.
const b2Ceiling=-4.913582801818848-.4;
for(const[a,b]of[[-24,16],[20,138]])box('b2-north-wall-'+a,a,b,24.9,25.1,b2Ceiling,B);
box('stair-header',16,20,25.1,25.2,C,b2Ceiling);
slab('b2-threshold',rect(16,20,25,25.2),B,.25);
const stair={x0:16,x1:20,start:25.2,end:30,steps:15,going:.32,rise:(Y-B)/15};
for(let i=0;i<15;i++)box('stair-step-'+i,16,20,25.2+i*.32,25.2+(i+1)*.32,B+(i+1)*stair.rise,B+(i+1)*stair.rise-.3,0,'stair-tread');
for(const x of[16,20]){box('stair-cheek-'+x,x-.06,x+.06,25.2,30,Y,B-.3);rail('stair-flight-'+x,[x+(x===16?.2:-.2),B,25.2],[x+(x===16?.2:-.2),Y,30]);rail('stair-well-'+x,[x,Y,25.2],[x,Y,30]);}
// Shops enclose the public circulation; open portals lead into shallow fitted rooms.
function shop(id,a,b,d,e,face){
 const z=face>0?e:d,back=face>0?d:e,mid=(a+b)/2;
 box(id+'-back',a,b,back-.06,back+.06,C,Y);
 for(const x of[a,b])box(id+'-side-'+x,x-.06,x+.06,d,e,C,Y);
 for(const[x0,x1,side]of[[a,mid-1.1,'left'],[mid+1.1,b,'right']]){
  box(id+'-glass-'+side,x0,x1,z-.018,z+.018,Y+2.7,Y+.12,2,'shop-glazing');
  box(id+'-sill-'+side,x0,x1,z-.075,z+.075,Y+.12,Y,1,'shop-sill');
 }
 box(id+'-fascia',a,b,z-.12,z+.12,C,Y+2.7,4,'shop-fascia');
 for(const x of[a,mid-1.1,mid+1.1,b])box(id+'-post-'+x,x-.045,x+.045,z-.075,z+.075,Y+2.7,Y,1,'shop-portal');
 for(const x of[a+1.8,b-1.8]){box(id+'-display-'+x,x-.65,x+.65,(d+e)/2-.45,(d+e)/2+.45,Y+.75,Y,8,'display');box(id+'-display-top-'+x,x-.68,x+.68,(d+e)/2-.48,(d+e)/2+.48,Y+.8,Y+.75,0,'display-top');}
 beam(id+'-front-light',[a+.4,C-.12,z+face*.17],[b-.4,C-.12,z+face*.17],.09,.06,7,'shop-light');
}
for(const[a,b]of[[24,44],[44,64],[64,84],[84,104],[104,124]])shop('south-shop-'+a,a,b,25.275,31,1);
for(const[a,b]of[[12,32],[32,52],[52,72],[72,92],[92,114],[114,137]])shop('north-shop-'+a,a,b,55,60.92,-1);
for(const[a,b]of[[24,42],[42,60],[64,81],[81,98],[114,137]]){shop('island-south-'+a,a,b,39,44,-1);shop('island-north-'+a,a,b,44,49,1);}
// Pale tiles with dark transverse bands follow the operator's navigation photographs.
function inlay(id,a,b,d,e,mi=10){box(id,a,b,d,e,Y+(mi===6?.007:.003),Y+.0005,mi,'floor-inlay');c.panels.at(-1).collision=false;}
for(const[z0,z1]of[[31.3,38.7],[49.3,54.7]]){
 for(let x=24;x<136;x+=4)inlay('band-'+z0+'-'+x,x,x+.5,z0,z1);
 for(let x=14;x<136;x+=2)inlay('joint-'+z0+'-'+x,x-.006,x+.006,z0,z1,3);
 for(let z=z0+1.7;z<z1;z+=2)inlay('joint-z-'+z,12.2,136.8,z-.006,z+.006,3);
}
inlay('south-guide',18,134,34.8,35.2,6);inlay('subway-guide',133.8,134.2,27.8,35.2,6);inlay('subway-join',134,151.2,27.8,28.2,6);
inlay('stair-guide',17.8,18.2,30.8,35.2,6);inlay('stair-warning',16.3,19.7,30.4,30.8,6);
// Recessed ceiling bands, transverse ribs and grilles leave the walking space clear.
for(const z of[35,52])for(let x=15;x<135;x+=8){
 box('ceiling-recess-'+x+'-'+z,x,x+5,z-1.1,z+1.1,C-.005,C-.035,3,'ceiling-recess');
 for(let a=x+.25;a<x+5;a+=.5)box('grille-'+a+'-'+z,a-.012,a+.012,z-1.1,z+1.1,C-.035,C-.06,1,'ceiling-grille');
 box('ceiling-rib-'+x+'-'+z,x+5.5,x+5.65,z-3,z+3,C,C-.15,5,'ceiling-rib');
}
for(const x of[22.8,60.7,98.5,125.2]){box('column-'+x,x-.25,x+.25,38.35,38.85,C,Y,4,'column');box('column-base-'+x,x-.28,x+.28,38.32,38.88,Y+.22,Y,10,'column-base');}
const faces=[];function sign(id,axis,pos,center,w,h,y,side,row,back=5){if(axis==='z')box(id,center-w/2,center+w/2,pos-.025,pos+.025,y+h,y,9,'sign');else box(id,pos-.025,pos+.025,center-w/2,center+w/2,y+h,y,9,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,axis,pos,center,w,h,y,side,row,back});}
sign('subway-entry-sign','x',135.8,28,5.5,.55,Y+2.4,1,0,1);
sign('stair-sign','z',30.6,18,3.7,.45,Y+2.45,1,2,0);
sign('south-street-sign','x',103,35,6.4,.5,Y+2.55,1,3,1);
sign('north-street-sign','x',103,52,5,.5,Y+2.55,-1,1,4);
sign('cross-street-sign','z',48.3,106,7,.5,Y+2.55,1,2,4);
const lights=[];function light(id,x,z,y=C-.11){box('fixture-'+id,x-1.4,x+1.4,z-.06,z+.06,y+.03,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:{x,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.80},intensity:12,range:12,spotAngle:120,innerSpotAngle:78,source:'Fitted Porta aisle fixtures guided by operator photographs',note:'Shares the existing two-light pool.'});}
for(const z of[35,52])for(let x=18;x<137;x+=12)light(x+'-'+z,x,z);
for(const[x,z]of[[18,43],[62,43],[106,43],[134,28]])light(x+'-'+z,x,z);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Subway to Porta south street',[point(151.25,Y,18.9),point(151.25,Y,28),point(134,Y,28),point(134,Y,35),point(108,Y,35),point(82,Y,35),point(56,Y,35),point(30,Y,35),point(18,Y,35)]);
pair('B2 mall to plaza B1 stairs',[point(18,B,18),point(18,B,25.2),point(18,Y,30),point(18,Y,35)]);
pair('Porta north and south aisle loop',[point(18,Y,35),point(18,Y,52),point(44,Y,52),point(70,Y,52),point(96,Y,52),point(134,Y,52),point(134,Y,50),point(106,Y,50),point(106,Y,35)]);
pair('Porta middle cross-passage',[point(62,Y,35),point(62,Y,52)]);
pair('Porta southern shop entrance',[point(94,Y,35),point(94,Y,28.4)]);
pair('Porta northern shop entrance',[point(82,Y,52),point(82,Y,58)]);
// Every straight leg fits the native verifier's 35-second movement deadline.
for(const r of routes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);if(distance>29){const n=Math.ceil(distance/26);r.points.splice(i,0,...Array.from({length:n-1},(_,k)=>point(a.x+(b.x-a.x)*(k+1)/n,a.y+(b.y-a.y)*(k+1)/n,a.z+(b.z-a.z)*(k+1)/n)));i+=n-1;}}
// Require at least 0.20 m of center clearance from the well edge. The native
// capsule radius is 0.24 m with 0.025 m skin, so 0.30 m is not its contact limit.
const blocked=[{label:'B1 stair west well guard',start:point(14.8,Y,28),yaw:90,axis:'x',limit:15.8,sign:-1},{label:'B1 stair east well guard',start:point(21.2,Y,28),yaw:-90,axis:'x',limit:20.2,sign:1}];
const report=await c.save(out,'porta-plaza.glb',{componentPrefix:prefix,sourceCollection:'Porta plaza B1 public connection',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the subway North public hall and existing B2 mall through the first connected west-area Porta B1 aisles.',geometry:{floor:Y,b2:B,ceiling:C,stair,outer,deck,routes,blocked,spawn:point(26,Y,35),retiredIds:spec.retiredIds,retiredLights:[]},references:['research/kyoto-station/maps/porta-shopguide-2026.pdf','research/kyoto-station/maps/floor-b1.svg','https://www.porta.co.jp/navigation'],limits:['Only the first connected part of the west area is built; the farther west shops, east area, street exits, lifts and Kotochika fitout remain unfinished.','Dimensions, elevations, stair count, shop divisions and finishes are fitted approximations. The plans establish connectivity, not surveyed dimensions.','The new B2 connection is a fitted stair; the existing eastern subway ramp remains available.']});
const labels=[['ポルタ 西エリア','Porta / West Area'],['地下鉄 北改札 →','Subway / North Gate →'],['南エリア B2F','South Area / B2F'],['南通り　← 南エリア','South Street / ← South Area'],['北通り','North Street'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><g transform="translate(1024,0) scale(${sx},1)" fill="#fffbea"><text y="115" text-anchor="middle" font-size="72">${jp}</text><text y="190" text-anchor="middle" font-size="46">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/porta-plaza-signs.png',png);await writeFile(out+'/porta-plaza-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/porta-plaza.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side===f.side?f.row:f.back):5;const u=row===5?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/1536;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Porta public-route labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/porta-plaza.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'porta-plaza-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
