// Join the two public sides of the station through the underground concourse.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
import {northOpening} from './subway-passage-scope.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!layout.panels.some(p=>p.id==='hachijo-east-east-ground-extension'));
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Subway passage | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=[{...mat('retained foyer',[.58,.54,.45]),name:'Hachijo East | stone'},mat('pale stone',[.58,.56,.50],.45),mat('ceiling',[.72,.73,.70]),mat('stainless',[.38,.41,.42],.3,.8),mat('dark trim',[.055,.061,.058],.42),mat('blue lining',[.045,.16,.26],.4),mat('tactile',[.70,.47,.045]),{...mat('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]},mat('printed signs',[1,1,1]),{...mat('glazing',[.34,.43,.43]),pbrMetallicRoughness:{baseColorFactor:[.34,.43,.43,.25],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},mat('gate green',[.10,.35,.20]),mat('concrete',[.48,.47,.43])];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],low=-6.2,ceiling=-2.8,northHigh=-.17949519805228592;
const slab=(id,poly,y,depth,mi=1,role='floor',holes=[])=>c.slab('subway-passage-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('subway-passage-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.045,.045);}}
const steps=36,run=18*.32,south={x0:150,x1:155.5,start:-151,midA:-151+run,midB:-151+run+1.8,end:-151+2*run+1.8,from:0,to:low},north={x0:138,x1:144,start:32,midA:32+run,midB:32+run+1.8,end:32+2*run+1.8,from:low,to:northHigh};
assert(Math.abs(north.end-northOpening.maxZ)<1e-8);
const southHole=rect(south.x0,south.x1,south.start,south.end+.5);
slab('foyer-floor',rect(145,174,-174,-128),0,.35,0,'public-floor',[southHole]);
// Three adjacent floor plates form one public route; no duplicated coplanar floors.
box('south-lobby-floor',147,170,south.end,-120,low,low-.30,1,'public-floor');
box('main-floor',147,155.5,-120,24,low,low-.30,1,'public-floor');
box('north-turn-floor',137,158,24,32,low,low-.30,1,'public-floor');
box('south-ceiling',147,170,south.end,-120,ceiling+.18,ceiling,2,'ceiling');
box('main-ceiling',147,155.5,-120,24,ceiling+.18,ceiling,2,'ceiling');
box('north-ceiling',137,158,24,32,ceiling+.18,ceiling,2,'ceiling');
// Keep sufficient head clearance where each flight meets the lower hall.
for(const [id,s]of [['south',south],['north',north]]){
 const dy=(s.to-s.from)/steps,middle=(s.from+s.to)/2;
 for(let flight=0;flight<2;flight++){
  const z=flight?s.midB:s.start,base=flight?middle:s.from;
  for(let i=0;i<18;i++){const y=base+(dy>0?i+1:i)*dy;box(id+'-step-'+flight+'-'+i,s.x0,s.x1,z+i*.32,z+(i+1)*.32,y,y-.30,11,'stair-tread');}
  for(const x of[s.x0+.20,s.x1-.20])rail(id+'-flight-'+flight+'-'+x,[x,base,z],[x,base+18*dy,z+run]);
 }
 box(id+'-middle',s.x0,s.x1,s.midA,s.midB,middle,middle-.30,11,'stair-landing');
 for(const x of[s.x0+.20,s.x1-.20])rail(id+'-middle-'+x,[x,middle,s.midA],[x,middle,s.midB]);
 const top=0,guardStart=id==='north'?northOpening.minZ:s.start,guardEnd=id==='south'?s.end+.5:s.end;
 for(const x of[s.x0,s.x1])box(id+'-cheek-'+x,x-.07,x+.07,guardStart,guardEnd,top,low-.30,1,'retaining-wall');
 for(const x of[s.x0,s.x1])rail(id+'-opening-'+x,[x,top,guardStart],[x,top,guardEnd]);
 const z=id==='south'?guardEnd:guardStart;rail(id+'-opening-end',[s.x0,top,z],[s.x1,top,z]);
 box(id+'-well-headwall',s.x0,s.x1,z-.07,z+.07,top,ceiling,1,'retaining-wall');
 if(id==='south')box('south-bottom-riser',s.x0,s.x1,s.end,s.end+.035,low+(0-low)/steps,low-.30,11,'stair-riser');
}
// South public foyer and the subway boundary; the rail-side concourse is a later increment.
for(const x of[147,170])box('south-side-'+x,x-.075,x+.075,south.end,-120,ceiling,low);
for(const[a,b,id]of[[147,south.x0,'west'],[south.x1,170,'east']])box('south-return-'+id,a,b,south.end-.15,south.end,ceiling,low);
box('south-north-return',155.5,170,-120,-119.85,ceiling,low);
for(const x of[147,155.5])box('corridor-wall-'+x,x-.075,x+.075,-120,24,ceiling,low);
for(const x of[137,158])box('north-turn-side-'+x,x-.075,x+.075,24,32,ceiling,low);
for(const[a,b,id]of[[137,147,'west'],[155.5,158,'east']])box('north-turn-south-'+id,a,b,23.85,24,ceiling,low);
for(const[a,b,id]of[[137,north.x0,'west'],[north.x1,158,'east']])box('north-turn-north-'+id,a,b,32,32.15,ceiling,low);
// Public corridor finishes follow the operator route photographs, with fitted dimensions.
for(const x of[147.10,155.40]){
 box('corridor-base-'+x,x-.025,x+.025,-120,24,low+.28,low,4,'skirting');
 box('corridor-band-'+x,x-.018,x+.018,-120,24,low+2.55,low+2.30,5,'wall-band');
 for(let z=-116;z<24;z+=4)box('wall-joint-'+x+'-'+z,x-.020,x+.020,z-.012,z+.012,ceiling,low+.30,4,'wall-joint');
}
for(let z=-116;z<24;z+=4){box('ceiling-joint-'+z,147.1,155.4,z-.012,z+.012,ceiling,ceiling-.010,4,'ceiling-joint');}
for(const x of[149.5,153])box('ceiling-longitudinal-'+x,x-.012,x+.012,-120,24,ceiling,ceiling-.010,4,'ceiling-joint');
const gates=[-133.5,-131.2,-128.9,-126.6,-124.3,-122];
for(const[i,z]of gates.entries()){box('gate-'+i,164.6,166.5,z-.25,z+.25,low+1.02,low+.04,3,'ticket-gate');box('gate-hood-'+i,164.65,166.45,z-.26,z+.26,low+1.1,low+1.02,10,'gate-hood');box('gate-reader-'+i,164.85,165.15,z-.16,z+.16,low+1.12,low+1.1,4,'reader');if(i<gates.length-1)box('gate-flap-'+i,165.47,165.57,z+.25,gates[i+1]-.25,low+.92,low+.1,10,'closed-gate');}
box('paid-screen-base',168,168.15,-135,-121,low+1.2,low,1,'paid-boundary');box('paid-screen',168.05,168.10,-135,-121,ceiling,low+1.2,9,'glazing');
for(const z of[-135,-121])box('gate-end-'+z,164.6,168.15,z-.075,z+.075,ceiling,low,1,'gate-boundary');
box('gate-fascia',164.3,164.6,-135,-121,ceiling,low+2.4,2,'fascia');
// Ticket machines and a recessed information wall are reachable from the unpaid lobby.
for(let i=0;i<3;i++){const x=159+i*2;box('machine-'+i,x-.55,x+.55,-136.2,-135.3,low+1.85,low,3,'ticket-machine');box('machine-hood-'+i,x-.55,x+.55,-136.24,-135.28,low+1.85,low+1.2,4,'machine-hood');}
// Original bilingual labels keep the south/north routes legible without copying photographs.
const faces=[];function sign(id,axis,pos,center,w,h,y,side,row,back=8){if(axis==='z')box(id,center-w/2,center+w/2,pos-.018,pos+.018,y+h,y,8,'sign');else box(id,pos-.018,pos+.018,center-w/2,center+w/2,y+h,y,8,'sign');c.panels.at(-1).collision=false;faces.push({id:'subway-passage-'+id,axis,pos,center,w,h,y,side,row,back});}
sign('south-stair-sign','z',south.start-.5,152.75,5.2,.48,2.3,-1,0,1);
for(const x of[150.4,155.1])beam('south-sign-hanger-'+x,[x,2.78,south.start-.5],[x,3.18,south.start-.5],.035,.035);
sign('south-return-sign','z',south.end+1.1,152.75,5.2,.45,low+2.45,1,1,2);
sign('gate-sign','x',164.27,-128,13.5,.64,low+2.45,-1,0);
for(const z of[-112,-64,-16]){sign('corridor-directions-'+z,'z',z,151.25,5.8,.43,low+2.7,-1,2,1);for(const x of[148.6,153.9])beam('direction-hanger-'+z+'-'+x,[x,low+3.13,z],[x,ceiling,z],.035,.035);}
sign('north-stair-sign','z',32,141,5.5,.44,low+2.7,-1,3,0);
sign('north-surface-sign','z',north.end-.3,141,5.5,.48,2.1,1,0,3);
for(const x of[138.15,143.85])box('north-sign-post-'+x,x-.045,x+.045,north.end-.36,north.end-.24,2.58,-.30,3,'sign-post');
for(let i=0;i<3;i++)sign('machine-screen-'+i,'z',-135.26,159+i*2,.84,.58,low+1,1,4);
sign('route-map','x',147.10,-129.5,3.4,1.05,low+1.2,1,5);
// Visual inlays do not add steps or tiny collision edges.
function strip(id,a,b,d,e,y=low){box(id,a,b,d,e,y+.007,y,6,'tactile');c.panels.at(-1).collision=false;}
strip('south-upper-tactile',150.3,155.2,south.start-.7,south.start-.27,0);
strip('south-bottom-tactile',150.3,155.2,south.end+.4,south.end+.85);
strip('north-bottom-tactile',138.3,143.7,31.3,31.73);
strip('south-route',152.5,152.9,south.end+.85,-120);
strip('north-south-route',151,151.4,-120,27.8);
strip('north-turn-route',140.8,151.4,27.6,28.0);
strip('north-stair-route',140.8,141.2,28,31.3);
strip('gate-route',152.9,164.3,-128.2,-127.8);
const lights=[];function light(id,x,z,y=ceiling-.05){box('fixture-'+id,x-.55,x+.55,z-.40,z+.40,y+.03,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:'subway-passage-light-'+id,position:{x,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:.97,g:.98,b:1},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted from Kintetsu route and Kyoto subway references',note:'Shares the existing two-light pool.'});}
for(let z=-116;z<24;z+=7)light('corridor-'+z,151.25,z);
for(const[x,z]of[[152,-133],[158,-127],[163,-132],[152,28],[141,28]])light('lobby-'+x+'-'+z,x,z);
for(const[id,s]of[['south',south],['north',north]]){const y=(s.from+s.to)/2+2.1,z=s.midA+.9;box(id+'-wall-light',s.x0+.071,s.x0+.17,z-.4,z+.4,y+.18,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:'subway-passage-light-'+id+'-stair',position:{x:s.x0+.20,y:y+.05,z},direction:{x:0,y:-1,z:0},linearColor:{r:.97,g:.98,b:1},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted stair wall fixture',note:'Shares the existing two-light pool.'});}
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===9?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Hachijo East stair and subway south lobby',[point(147.1,0,-157),point(152.75,0,-153),point(152.75,0,south.start),point(152.75,low/2,south.midA),point(152.75,low/2,south.midB),point(152.75,low,south.end),point(152.75,low,-130),point(160,low,-130)]);
pair('Public underground north-south passage',[point(152.75,low,-130),point(151.25,low,-121),...[-100,-75,-50,-25,0,22].map(z=>point(151.25,low,z)),point(151.25,low,28),point(141,low,28)]);
pair('North subway stair to forecourt',[point(141,low,28),point(141,low,north.start),point(141,(low+northHigh)/2,north.midA),point(141,(low+northHigh)/2,north.midB),point(141,northHigh,north.end),point(141,-.18983621669111408,47)]);
pair('JR entrance bypass remains open',[point(147.1,0,-155),point(147.1,0,-143),point(147.1,0,-130.8),point(147.1,0,-126)]);
pair('South ticket machines',[point(160,low,-130),point(161,low,-133.8)]);
const report=await c.save(out,'subway-passage.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect Hachijo East to the north forecourt through a public underground passage with stairs at both ends.',geometry:{low,ceiling,northHigh,south,north,southHole,northOpening,routes,retiredIds:['hachijo-east-east-ground-extension']},references:['research/kyoto-station/maps/subway-kyoto-plan.pdf','research/kyoto-station/maps/kintetsu-subway-route-2026.pdf','research/kyoto-station/maps/floor-b2.svg'],limits:['Corridor alignment, elevations, stair counts, exit location and finishes are fitted approximations, not a surveyed section.','The central B1 retail deck is a separate level; its B2/Porta connection remains unfinished.','Subway platforms, tracks, lifts, escalators and the paid concourse remain unfinished; gates are closed static boundaries.']});
const labels=[['地下鉄 京都駅','Subway Kyoto Station'],['八条東口・JR線','Hachijo East / JR Lines'],['烏丸口・北側広場','Karasuma / North Forecourt'],['地上・北側広場','Street / North Forecourt'],['きっぷ','Tickets'],['京都駅 地下連絡通路','Kyoto Station Underground Passage'],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2304"><rect width="2048" height="2304" fill="#eeeedc"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><rect width="2048" height="256" fill="#eeeedc"/><g transform="translate(1024,0) scale(${sx},1)"><text y="119" text-anchor="middle" font-size="85" fill="#172128">${jp}</text><text y="197" text-anchor="middle" font-size="48" fill="#172128">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/subway-passage-signs.png',png);await writeFile(out+'/subway-passage-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/subway-passage.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===8)){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map((v,i)=>{const triangle=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=triangle.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side===f.side?f.row:f.back):8;const u=row===8?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/2304;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[8].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});
j.images=[{name:'Original subway passage labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[8].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/subway-passage.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'subway-passage-signs.png',sha256:sha(png),material:mats[8].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
