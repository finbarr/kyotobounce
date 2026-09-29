// Open two subway gate routes and connect them to an island platform and two tracks.
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
import {retiredSubwayPlatformPanels} from './subway-platforms-scope.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!layout.panels.some(p=>p.id==='subway-passage-paid-screen'));
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Subway platforms | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}}),reuse=(name,rgb,r=.65,metal=0)=>({...mat(name,rgb,r,metal),name:'Subway passage | '+name});
const mats=[reuse('pale stone',[.58,.56,.50],.45),mat('concrete',[.43,.43,.40]),reuse('stainless',[.38,.41,.42],.3,.8),mat('track bed',[.12,.13,.13]),reuse('ceiling',[.72,.73,.70]),reuse('tactile',[.70,.47,.045]),mat('warm cream',[.69,.68,.56],.4),{...reuse('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]},mat('printed signs',[1,1,1]),reuse('dark trim',[.055,.061,.058],.42),{...mat('door glazing',[.25,.34,.35]),pbrMetallicRoughness:{baseColorFactor:[.25,.34,.35,.3],roughnessFactor:.2,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},reuse('blue lining',[.045,.16,.26],.4)];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],floor=-6.2,platform=-11.2,ceiling=-2.8,deckBottom=floor-.35,platformCeiling=platform+3.4,railHead=platform-1;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab('subway-platforms-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=0,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=2,role='steelwork')=>c.beam('subway-platforms-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.045,.045);}}
const stairs=[{id:'south',start:-118},{id:'central',start:-15}].map(s=>({...s,x0:174,x1:180,midA:s.start+4.8,midB:s.start+6.6,end:s.start+11.4}));
const holes=stairs.map(s=>rect(s.x0,s.x1,s.start,s.end+.45));
// The structural deck supplies the platform ceiling. Its notch preserves the old lobby floor.
slab('paid-deck',[[162,-190],[192,-190],[192,80],[162,80],[162,-120],[170,-120],[170,-137.68],[162,-137.68]],floor,.35,0,'concourse-floor',holes);
box('platform',171,183,-140,16,platform,platform-1.55,0,'platform-floor');
slab('platform-ceiling',rect(162,192,-140,16),platformCeiling+.15,.15,4,'ceiling',holes);
box('tunnel-base',162,192,-190,80,platform-1.55,platform-1.95,3,'track-floor');
for(const x of[162,192])box('tunnel-wall-'+x,x-.12,x+.12,-190,80,deckBottom,platform-1.95,1,'tunnel-wall');
for(const z of[-190,80])box('tunnel-limit-'+z,162,192,z-.15,z+.15,deckBottom,platform-1.95,3,'tunnel-end');
// Paid concourse receives the southern gate and the central gate vestibule.
box('paid-ceiling-south',170,190,-135,-120,ceiling+.18,ceiling,4,'ceiling');
box('paid-ceiling-south-main',163,190,-120,-100,ceiling+.18,ceiling,4,'ceiling');
box('paid-ceiling-central',163,190,-48,2,ceiling+.18,ceiling,4,'ceiling');
for(const[a,b,id]of[[-135,-100,'south'],[-48,2,'central']])box('paid-east-'+id,189.925,190.075,a,b,ceiling,floor);
box('paid-south-wall',168.15,190,-135.075,-134.925,ceiling,floor);
for(const z of[-100,2])box('paid-north-wall-'+z,163,190,z-.075,z+.075,ceiling,floor);
box('central-hall-south',163,190,-48.075,-47.925,ceiling,floor);
for(const[a,b,id]of[[-120,-100,'south'],[-36,2,'central']])box('paid-west-'+id,162.925,163.075,a,b,ceiling,floor);
box('retained-lobby-east-end',169.925,170.075,-137.68,-135,ceiling,floor);
box('public-south-return',155.5,163,-120,-119.85,ceiling,floor);
for(const[a,b,id]of[[-120,-48,'south'],[-36,24,'north']]){
 box('public-wall-'+id,155.425,155.575,a,b,ceiling,floor);
 box('public-base-'+id,155.375,155.425,a,b,floor+.28,floor,9,'skirting');
 box('public-band-'+id,155.382,155.418,a,b,floor+2.55,floor+2.30,11,'wall-band');
}
box('central-vestibule-floor',155.5,162,-48,-36,floor,floor-.30,0,'public-floor');
box('central-vestibule-ceiling',155.5,163,-48,-36,ceiling+.18,ceiling,4,'ceiling');
for(const z of[-48,-36])box('central-vestibule-wall-'+z,155.5,163,z-.075,z+.075,ceiling,floor);
// Gate leaves are static and visibly retracted in the two usable exploration lanes.
for(const z of[-128.60,-126.90])box('south-open-leaf-'+z,164.7,166.4,z-.025,z+.025,floor+.92,floor+.10,2,'retracted-gate');
const gates=[-46.6,-44.4,-42.2,-40,-37.8];
for(const[i,z]of gates.entries()){
 box('central-gate-'+i,159.7,161.6,z-.25,z+.25,floor+1.02,floor+.04,2,'ticket-gate');box('central-reader-'+i,159.8,160.1,z-.16,z+.16,floor+1.06,floor+1.02,9,'reader');
 if(i<gates.length-1&&i!==2)box('central-flap-'+i,160.6,160.7,z+.25,gates[i+1]-.25,floor+.92,floor+.10,11,'closed-gate');
}
for(const z of[-41.9,-40.3])box('central-open-leaf-'+z,159.8,161.5,z-.025,z+.025,floor+.92,floor+.10,2,'retracted-gate');
for(const[a,b,id]of[[-48,-46.85,'south'],[-37.55,-36,'north']])box('central-gate-end-'+id,159.7,161.6,a,b,floor+1.05,floor,6,'gate-boundary');
for(const s of stairs){
 box(s.id+'-stair-back',s.x0,s.x1,s.start-.04,s.start+.04,floor,platform,6,'stair-enclosure');
 for(let f=0;f<2;f++){const a=f?s.midB:s.start,base=f?(floor+platform)/2:floor;for(let i=0;i<15;i++)box(s.id+'-step-'+f+'-'+i,s.x0,s.x1,a+i*.32,a+(i+1)*.32,base-i/6,base-i/6-.30,1,'stair-tread');for(const x of[s.x0+.2,s.x1-.2])rail(s.id+'-flight-'+f+'-'+x,[x,base,a],[x,base-2.5,a+4.8]);}
 box(s.id+'-midlanding',s.x0,s.x1,s.midA,s.midB,(floor+platform)/2,(floor+platform)/2-.3,1,'stair-landing');
 for(const x of[s.x0+.2,s.x1-.2])rail(s.id+'-middle-'+x,[x,(floor+platform)/2,s.midA],[x,(floor+platform)/2,s.midB]);
 for(const x of[s.x0,s.x1]){box(s.id+'-cheek-'+x,x-.06,x+.06,s.start,s.end+.45,floor,platform-.3,6,'stair-wall');rail(s.id+'-well-'+x,[x,floor,s.start],[x,floor,s.end+.45]);}
 rail(s.id+'-well-end',[s.x0,floor,s.end+.45],[s.x1,floor,s.end+.45]);
 box(s.id+'-well-header',s.x0,s.x1,s.end+.40,s.end+.50,floor,platformCeiling,6,'stair-header');
 box(s.id+'-bottom-riser',s.x0,s.x1,s.end,s.end+.035,platform+1/6,platform-.3,1,'stair-riser');
}
// Repeated equipment uses one native panel per material/role batch.
const groups=new Map();function group(id,geometry,mi,role){let g=groups.get(id);if(!g){g={v:[],ix:[],mi,role};groups.set(id,g);}const p=geometry.attributes.position,o=g.v.length;for(let i=0;i<p.count;i++)g.v.push([p.getX(i),p.getY(i),p.getZ(i)]);for(const i of geometry.index.array)g.ix.push(i+o);geometry.dispose();}
function groupBox(id,x,z,w,d,top,bottom,mi,role){const g=new T.BoxGeometry(w,top-bottom,d);g.translate(x,(top+bottom)/2,-z);group(id,g,mi,role);}
for(const[x,n]of[[167.75,2],[186.25,1]]){
 box('track-'+n+'-bed',x-1.65,x+1.65,-190,80,railHead-.32,platform-1.55,3,'track-bed');
 for(let z=-189.5;z<80;z+=.65)groupBox('track-sleepers-'+n,x,z,2.7,.24,railHead-.20,railHead-.32,1,'sleepers');
 for(const side of[-1,1])for(const[id,w,top,depth]of[['foot',.14,railHead-.15,.04],['web',.018,railHead-.05,.10],['head',.068,railHead,.05]]){const rx=x+side*(1.435/2+.034);box('rail-'+n+'-'+side+'-'+id,rx-w/2,rx+w/2,-190,80,top,top-depth,2,'rail');}
 beam('overhead-'+n,[x,platformCeiling-.35,-190],[x,platformCeiling-.35,80],.02,.02,2,'overhead-wire');c.panels.at(-1).collision=false;
}
for(const x of[171.20,182.80]){
 for(let i=0;i<28;i++){const a=-139+i*5.5,b=a+5.5;groupBox('door-pockets',x,a+1.4,.18,2.8,platform+1.35,platform+.06,6,'door-pocket');groupBox('door-bottoms',x,a+4.15,.08,2.7,platform+.32,platform+.07,2,'closed-platform-door');groupBox('door-glass',x,a+4.15,.045,2.7,platform+1.26,platform+.32,10,'door-glazing');groupBox('door-caps',x,a+4.15,.09,2.7,platform+1.35,platform+1.26,2,'closed-platform-door');for(const z of[a+2.8,b])groupBox('door-posts',x,z,.16,.06,platform+1.35,platform+.06,2,'closed-platform-door');}
 box('platform-end-pocket-'+x,x-.09,x+.09,-140,-139,platform+1.35,platform,6,'door-pocket');box('platform-end-pocket-north-'+x,x-.09,x+.09,15,16,platform+1.35,platform,6,'door-pocket');
}
for(const z of[-139.9,15.9])rail('platform-end-'+z,[171.2,platform,z],[182.8,platform,z]);
for(let z=-132;z<16;z+=12){if(stairs.some(s=>z>s.start-3&&z<s.end+3))continue;for(const x of[174.5,179.5]){const g=new T.CylinderGeometry(.31,.31,deckBottom-platform,20);g.translate(x,(deckBottom+platform)/2,-z);group('platform-columns',g,6,'column');const base=new T.CylinderGeometry(.33,.33,.22,20);base.translate(x,platform+.11,-z);group('column-bases',base,9,'column-base');}}
// Floors, edge tactile strips and ceiling lines follow the photographed platform character.
function strip(id,a,b,d,e,y=platform){box(id,a,b,d,e,y+.007,y,5,'tactile');c.panels.at(-1).collision=false;}
for(const x of[171.70,182.30])strip('platform-tactile-'+x,x-.18,x+.18,-139.4,15.4);
for(const s of stairs){strip(s.id+'-upper-tactile',174.3,179.7,s.start-.7,s.start-.3,floor);strip(s.id+'-lower-tactile',174.3,179.7,s.end+.45,s.end+.85);}
strip('central-gate-spur',151.4,165,-41.3,-40.9,floor);
for(const z of[-137,-134])strip('south-join-'+z,168.2,169.5,z,z+.38,floor);
for(let z=-139;z<16;z+=2)groupBox('floor-joints',177,z,11.1,.009,platform+.004,platform+.001,9,'floor-joint');
for(const x of[173,175,177,179,181])groupBox('floor-joints',x,-62,.009,154,platform+.004,platform+.001,9,'floor-joint');
for(const x of[172.5,181.5])box('platform-ceiling-channel-'+x,x-.10,x+.10,-139,15,platformCeiling,platformCeiling-.08,2,'ceiling-channel');
for(const z of[-82,-26]){box('bench-seat-'+z,175.5,178.5,z-.30,z+.30,platform+.48,platform+.38,6,'bench');for(const x of[175.8,178.2])box('bench-leg-'+z+'-'+x,x-.07,x+.07,z-.20,z+.20,platform+.38,platform,2,'bench-leg');}
for(const[id,g]of groups){c.add('subway-platforms-'+id,g.v,g.ix,g.mi,g.role);if(g.role==='floor-joint')c.panels.at(-1).collision=false;}
const faces=[];function sign(id,axis,pos,center,w,h,y,side,row,back=6){if(axis==='z')box(id,center-w/2,center+w/2,pos-.02,pos+.02,y+h,y,8,'sign');else box(id,pos-.02,pos+.02,center-w/2,center+w/2,y+h,y,8,'sign');c.panels.at(-1).collision=false;faces.push({id:'subway-platforms-'+id,axis,pos,center,w,h,y,side,row,back});}
sign('central-gate-sign','x',159.4,-42,10.5,.62,floor+2.45,-1,0,3);
for(const s of stairs){sign(s.id+'-stair-sign','z',s.start-.6,177,5.6,.52,floor+2.3,-1,1,3);for(const x of[174.5,179.5])beam(s.id+'-sign-hanger-'+x,[x,floor+2.82,s.start-.6],[x,ceiling,s.start-.6],.035,.035);sign(s.id+'-lower-sign','z',s.end+1.5,177,7,.55,platform+2.8,-1,2,3);for(const x of[174,180])beam(s.id+'-lower-hanger-'+x,[x,platform+3.35,s.end+1.5],[x,platformCeiling,s.end+1.5],.035,.035);}
for(const z of[-130,-78,-27,10]){sign('platform-one-'+z,'x',191.85,z,6,.55,platform+1.8,-1,4);sign('platform-two-'+z,'x',162.15,z,6,.55,platform+1.8,1,5);}
const lights=[];function light(id,x,z,y,mi=7){box('fixture-'+id,x-.12,x+.12,z-1.0,z+1.0,y+.025,y,mi,'fixture');c.panels.at(-1).collision=false;lights.push({id:'subway-platforms-light-'+id,position:{x,y:y-.07,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.97,b:.85},intensity:12,range:10,spotAngle:120,innerSpotAngle:76,source:'Fitted from Kyoto subway platform photograph',note:'Shares the existing two-light pool.'});}
for(let z=-132;z<16;z+=12)for(const x of[172.5,181.5])light('platform-'+x+'-'+z,x,z,platformCeiling-.11);
for(const z of[-126,-112,-42,-28,-14,0])for(const x of[168,185])light('concourse-'+x+'-'+z,x,z,ceiling-.05);
light('central-vestibule',157,-42,ceiling-.05);
for(const p of c.panels)p.material=p.browserMaterial===2?'steel':p.browserMaterial===10?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
for(const s of stairs){const entry=s.id==='south'?[point(160,floor,-127.75),point(166.8,floor,-127.75),point(177,floor,-127.75),point(177,floor,s.start)]:[point(151.25,floor,-41.1),point(163.5,floor,-41.1),point(177,floor,-41.1),point(177,floor,-17),point(177,floor,s.start)];pair(s.id+' gate to subway platform',[...entry,point(177,(floor+platform)/2,s.midA),point(177,(floor+platform)/2,s.midB),point(177,platform,s.end),point(177,platform,s.end+4)]);}
pair('Public passage past central gate',[point(151.25,floor,-53),point(151.25,floor,-32)]);
pair('South platform end',[point(177,platform,-136),point(181.7,platform,-136),point(181.7,platform,-125)]);
pair('North platform end',[point(177,platform,13.5),point(172.3,platform,13.5),point(172.3,platform,4)]);
routes.push({label:'Platform connection between the two stair landings',points:[point(177,platform,-102),point(181.7,platform,-102),...[-80,-55,-30,-6,4].map(z=>point(181.7,platform,z)),point(177,platform,4)]});
const blocked=[{label:'West platform doors',start:point(172.3,platform,-78),yaw:-90,axis:'x',limit:171.5,sign:1},{label:'East platform doors',start:point(181.7,platform,-78),yaw:90,axis:'x',limit:182.5,sign:-1}];
const removal=await read(manifest.replace('assets.json','removal.json'));
const report=await c.save(out,'subway-platforms.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open separate southern and central subway gate halls to two stairs, one island platform and two underground tracks.',geometry:{floor,platform,ceiling,deckBottom,platformCeiling,railHead,stairs,holes,routes,blocked,retiredIds:removal.removedIds},references:['research/kyoto-station/maps/subway-kyoto-plan.pdf','research/kyoto-station/photos/subway-platform-nesnad-2022.jpg','https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm','https://www.city.kyoto.lg.jp/kotsu/page/0000009812.html'],limits:['Concourse/platform dimensions, floor levels, stair counts and track alignment are fitted approximations.','Platform doors and open ticket lanes are static; no train operation, lifts or moving escalators are included.','The north and central-2 gates and the B2/Porta connection remain unfinished.']});
const labels=[['地下鉄 中央1改札','Subway / Central 1 Gate'],['1 竹田・奈良　　2 国際会館','1 Takeda / Nara    2 Kokusaikaikan'],['京都　K11','Kyoto / Karasuma Line'],['改札口・出口','Gates / Exit'],['1　竹田・近鉄奈良方面','1 Takeda / Kintetsu Nara'],['2　四条・国際会館方面','2 Shijo / Kokusaikaikan'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1792"><rect width="2048" height="1792" fill="#112a62"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><g transform="translate(1024,0) scale(${sx},1)" fill="#f6f4e7"><text y="115" text-anchor="middle" font-size="72">${jp}</text><text y="190" text-anchor="middle" font-size="46">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/subway-platforms-signs.png',png);await writeFile(out+'/subway-platforms-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/subway-platforms.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===8)){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side===f.side?f.row:f.back):6;const u=row===6?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/1792;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[8].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original subway platform labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[8].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/subway-platforms.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'subway-platforms-signs.png',sha256:sha(png),material:mats[8].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
