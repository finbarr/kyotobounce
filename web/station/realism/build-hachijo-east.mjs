// Hachijo East: a public foyer between the Shinkansen and conventional entrances.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!layout.panels.some(p=>p.id==='hachijo-entrance-paid-floor'));
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Hachijo East | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=[{...mat('concourse',[.45,.43,.38],.45),name:'Shinkansen | concourse stone'},mat('stone',[.58,.54,.45]),mat('ceiling',[.73,.72,.65]),mat('stainless',[.36,.39,.40],.3,.8),mat('charcoal',[.055,.061,.058],.42),mat('blue',[.035,.19,.45],.38,.15),mat('tactile',[.70,.47,.045]),{...mat('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]},mat('printed signs',[1,1,1]),{...mat('glazing',[.34,.43,.43]),pbrMetallicRoughness:{baseColorFactor:[.34,.43,.43,.25],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},mat('green',[.06,.34,.18]),{...mat('concrete',[.48,.47,.43],.7),name:'Shinkansen | concrete'}];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],high=3.675,ceiling=3.225;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab('hachijo-east-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('hachijo-east-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.045,.045);}}
const old=await read('.local/v2/current/components/hachijo-entrance/report.json');
const x0=124,x1=130,start=-163,run=11*.32,midA=start+run,midB=midA+1.8,end=midB+run,hole=rect(x0,x1,start-.5,end);
slab('paid-floor',rect(-45,145,-174,-128),high,.45,0,'concourse-floor',[old.geometry.hole,hole]);
box('ground-south',55,142,-174.15,-174,ceiling,0,11);
// Existing ground floor supplies the paid lobby and the western part of the public hall.
box('east-ground-extension',145,174,-174,-128,0,-.35,1,'public-floor');
box('front-foyer',138,174,-184,-174,0,-.35,1,'public-floor');
box('forecourt',78,178,-203,-184,0,-.30,1,'forecourt-floor');
box('forecourt-west-join',78,138,-184,-181,0,-.30,1,'forecourt-floor');
box('forecourt-east-join',174,178,-184,-181,0,-.30,1,'forecourt-floor');
box('east-roof',145,174,-174,-128,high,ceiling,2,'ceiling');
box('foyer-ceiling',138,174,-184,-174,high,ceiling,2,'ceiling');
box('canopy',136,176,-188,-184,3.65,3.45,2,'canopy');
for(const x of[139,171])box('canopy-column-'+x,x-.18,x+.18,-187.7,-187.3,3.45,0,1,'column');
for(const x of[138,174])box('front-side-'+x,x-.10,x+.10,-184,-174,ceiling,0,1);
box('outer-east-wall',173.85,174,-174,-128,ceiling,0);
// Open entry, retracted glass leaves and a high fascia leave a clear level threshold.
for(const[a,b,id]of[[138,143,'west'],[157,174,'east']]){box('front-base-'+id,a,b,-184.1,-184,.6,0);box('front-glass-'+id,a,b,-184.05,-184.01,2.8,.6,9,'glazing');}
box('front-header',138,174,-184.12,-183.95,ceiling,2.8,2,'fascia');
for(const x of[143,157])box('door-jamb-'+x,x-.07,x+.07,-184.1,-183.90,2.8,0,3,'door-frame');
for(const[a,b,id]of[[143.1,144.8,'west'],[155.2,156.9,'east']])box('open-door-'+id,a,b,-184.05,-184,2.65,.04,9,'open-door');
// The public passage remains outside both paid areas; a shallow shop bay gives it an edge.
box('shop-south',156,174,-177,-176.85,ceiling,0);
box('shop-north',156,174,-147.15,-147,ceiling,0);
for(const[d,e,id]of[[-177,-170,'south'],[-157,-147,'north']]){box('shop-front-base-'+id,155.9,156.05,d,e,.6,0);box('shop-front-glass-'+id,155.95,156,d,e,2.65,.6,9,'glazing');}
box('shop-header',155.85,156.10,-177,-147,ceiling,2.65,4,'fascia');
box('shop-counter',160,161,-167,-159,1.05,0,1,'counter');
for(const z of[-173,-153])box('shop-table-'+z,168,170,z-1,z+1,.75,.65,4,'table');
for(const z of[-173,-153])box('shop-table-leg-'+z,168.9,169.1,z-.10,z+.10,.65,0,3,'table-leg');
// Ground paid lobby: enter west through gates, turn north and climb to the concourse.
box('paid-west',116,116.15,-174,-150,ceiling,0);
box('paid-north',116,142,-150,-149.85,ceiling,0);
for(const[d,e,id]of[[-174,-169,'south'],[-155,-128,'north']])box('public-west-'+id,141.85,142,d,e,ceiling,0);
for(const x of[x0,x1])box('stair-cheek-'+x,x-.065,x+.065,start,end,high,0,11);
for(let flight=0;flight<2;flight++){const a=flight?midB:start,y=flight?high/2:0;for(let i=0;i<11;i++)box('step-'+flight+'-'+i,x0,x1,a+i*.32,a+(i+1)*.32,y+(i+1)*high/22,y+(i+1)*high/22-.3,11,'stair-tread');for(const x of[x0+.20,x1-.20])rail('stair-'+flight+'-'+x,[x,y,a],[x,y+high/2,a+run]);}
box('middle-landing',x0,x1,midA,midB,high/2,high/2-.3,11,'stair-landing');
for(const x of[x0+.20,x1-.20])rail('middle-'+x,[x,high/2,midA],[x,high/2,midB]);
for(const x of[x0,x1])rail('opening-'+x,[x,high,start-.5],[x,high,end]);
rail('opening-south',[x0,high,start-.5],[x1,high,start-.5]);
// Gates are oriented across their routes; one lane per operator is retracted.
const gateZs=[-168.5,-166.1,-163.7,-161.3,-158.9,-155.5],openZ=-164.9;
for(const[i,z]of gateZs.entries()){
 box('shinkansen-gate-'+i,140.9,143.1,z-.25,z+.25,1.02,.04,3,'ticket-gate');box('shinkansen-hood-'+i,140.93,143.07,z-.26,z+.26,1.10,1.02,5,'gate-hood');
 for(const x of[141.2,142.8]){box('shinkansen-reader-'+i+'-'+x,x-.14,x+.14,z-.17,z+.17,1.12,1.10,4,'reader');box('shinkansen-indicator-'+i+'-'+x,x-.04,x+.04,z-.08,z+.08,1.135,1.12,10,'indicator');c.panels.at(-1).collision=false;}
 if(i<gateZs.length-1){const nz=gateZs[i+1];if(i===1)for(const q of[z+.3,nz-.3])box('shinkansen-open-'+q,141.4,142.6,q-.03,q+.03,.9,.1,5,'open-gate');else box('shinkansen-closed-'+i,141.95,142.05,z+.25,nz-.25,.9,.1,5,'closed-gate');}
}
for(const[d,e,id]of[[-169,gateZs[0]-.25,'south'],[gateZs.at(-1)+.25,-155,'north']])box('gate-end-'+id,141.9,142.1,d,e,1.1,0,3,'gate-boundary');
box('shinkansen-gate-header',141.85,142.15,-169,-155,ceiling,2.4,2,'fascia');
box('information-counter',143,144,-174,-171,1.0,0,1,'counter');box('information-window',142.95,143,-174,-171,2.35,1.0,9,'glazing');
// JR Hachijo East opens onto the southern conventional platform at its fitted elevation.
const jrXs=[143.5,145.9,148.3,150.7,153.1],jrLane=147.1;
for(const[i,x]of jrXs.entries()){box('jr-gate-'+i,x-.25,x+.25,-130.2,-128.2,1.02,.04,3,'ticket-gate');box('jr-hood-'+i,x-.26,x+.26,-130.17,-128.23,1.10,1.02,10,'gate-hood');for(const z of[-129.9,-128.5])box('jr-reader-'+i+'-'+z,x-.17,x+.17,z-.14,z+.14,1.12,1.10,4,'reader');if(i<jrXs.length-1){const nx=jrXs[i+1];if(i===1)for(const q of[x+.3,nx-.3])box('jr-open-'+q,q-.03,q+.03,-129.8,-128.6,.9,.1,10,'open-gate');else box('jr-closed-'+i,x+.25,nx-.25,-129.25,-129.15,.9,.1,10,'closed-gate');}}
for(const[a,b,id]of[[142,143.25,'west'],[153.35,155,'east']])box('jr-gate-end-'+id,a,b,-129.3,-129.1,1.1,0,3,'gate-boundary');
box('jr-gate-header',142,155,-129.4,-129.0,ceiling,2.4,2,'fascia');
box('north-shop-wall',155,174,-128.15,-128,ceiling,0);
const edge=x=>-126.1+.018*x;
slab('jr-platform-join',[[142,-128],[155,-128],[155,edge(155)],[142,edge(142)]],0,.35,11,'platform-connection');
for(const x of[142,155])rail('jr-link-'+x,[x,0,-128],[x,0,edge(x)]);
// Original signs have a separate front/back UV assignment to avoid mirrored lettering.
const faces=[];function sign(id,axis,pos,center,w,h,y,side,row,back=8){if(axis==='z')box(id,center-w/2,center+w/2,pos-.018,pos+.018,y+h,y,8,'sign');else box(id,pos-.018,pos+.018,center-w/2,center+w/2,y+h,y,8,'sign');c.panels.at(-1).collision=false;faces.push({id:'hachijo-east-'+id,axis,pos,center,w,h,y,side,row,back});}
sign('outer-sign','z',-184.16,150,13.4,.39,2.81,-1,0);
sign('shinkansen-sign','x',142.20,-162,13.5,.65,2.47,1,1,2);
sign('jr-sign','z',-129.45,148.5,12.6,.65,2.47,-1,3,2);
sign('upper-exit','z',end+1,127,5.7,.56,high+2.18,1,2,4);
for(const x of[124.4,129.6])beam('upper-hanger-'+x,[x,high+2.74,end+1],[x,7.5,end+1],.035,.035);
sign('shop-name','x',155.80,-163.5,10,.44,2.70,-1,5);
sign('information','x',143.10,-172.5,2.9,.38,2.4,1,6);
for(let i=0;i<3;i++){const x=164+i*2;box('ticket-machine-'+i,x-.55,x+.55,-180,-179,1.85,0,3,'ticket-machine');box('ticket-machine-hood-'+i,x-.55,x+.55,-180.03,-178.98,1.85,1.2,5,'machine-hood');sign('machine-screen-'+i,'z',-180.06,x,.84,.58,1,-1,7);}
// Tactile strips and ceiling seams are visual details, with continuous walking floors beneath.
function decoration(id,a,b,d,e,y,mi,role){box(id,a,b,d,e,y+.007,y,mi,role);c.panels.at(-1).collision=false;}
decoration('entry-tactile',jrLane-.2,jrLane+.2,-191,-130.5,0,6,'tactile');
decoration('gate-tactile',126.6,jrLane+.2,openZ-.2,openZ+.2,0,6,'tactile');
decoration('stair-tactile-bottom',x0+.3,x1-.3,start-.65,start-.22,0,6,'tactile');
decoration('stair-tactile-top',x0+.3,x1-.3,end+.3,end+.73,high,6,'tactile');
box('shinkansen-floor-band',140.5,143.5,-169,-155,.002,0,4,'floor-inlay');c.panels.at(-1).collision=false;
for(const x of[146,150,154,160,166,172])box('ceiling-seam-x-'+x,x-.012,x+.012,-183.9,-128.1,ceiling,ceiling-.01,4,'ceiling-seam');
for(let z=-182;z< -128;z+=3)box('ceiling-seam-z-'+z,142.1,173.8,z-.012,z+.012,ceiling,ceiling-.01,4,'ceiling-seam');
const lights=[];function light(id,x,z,y=ceiling-.04){box('fixture-'+id,x-.55,x+.55,z-.42,z+.42,y+.03,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:'hachijo-east-light-'+id,position:{x,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.84},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted from Kintetsu route photographs dated 20 January 2026',note:'Shares the existing two-light pool.'});}
for(const z of[-180,-172,-164,-156,-148,-140,-132])light('hall-'+z,148,z);
for(const z of[-180,-164,-151])light('shop-'+z,168,z);
light('paid',133,-167);light('stair',127,-158,7.45);light('canopy',148,-186,3.4);
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===9?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Hachijo forecourt to eastern Shinkansen concourse',[point(70,0,-191),point(95,0,-191),point(120,0,-191),point(jrLane,0,-191),point(jrLane,0,-179),point(jrLane,0,openZ),point(139,0,openZ),point(127,0,openZ),point(127,0,start),point(127,high/2,midA),point(127,high/2,midB),point(127,high,end),point(127,high,-150)]);
pair('Eastern public foyer to conventional platform',[point(jrLane,0,-179),point(jrLane,0,-163),point(jrLane,0,-145),point(jrLane,0,-130.8),point(jrLane,0,-126),point(jrLane,0,-124+.018*jrLane),point(158,0,-124+.018*158)]);
pair('Eastern to main Hachijo concourse connection',[point(127,high,-150),point(108,high,-150),point(88,high,-150),point(68,high,-150),point(46.4,high,-150)]);
pair('Foyer to ticket machines and shop',[point(jrLane,0,-181),point(168,0,-181),point(172.5,0,-181),point(172.5,0,-178.5),point(154,0,-178.5),point(154,0,-164),point(158,0,-164)]);
pair('Upper eastern stair bypass',[point(134,high,-169),point(134,high,-160),point(134,high,-150)]);
const report=await c.save(out,'hachijo-east.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the eastern public foyer to the Shinkansen concourse and JR conventional platform, retaining the main Hachijo route.',geometry:{high,ceiling,start,midA,midB,end,hole,routes,retiredIds:['hachijo-entrance-paid-floor','hachijo-entrance-ground-south-east']},references:['research/kyoto-station/maps/jr-central-kyoto-20260420.gif','research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/maps/kintetsu-subway-route-2026.pdf'],limits:['The public/paid relationships follow operator maps; elevations, dimensions, gate counts, placement and finishes are fitted.','The eastern public subway descent, eastern JR transfer bridge and lift/escalator equipment remain unfinished.','Shop bay and static gate equipment are provisional; no research photograph pixels are used.']});
const labels=[['八条東口','Hachijo East Entrance'],['新幹線のりば','Shinkansen Tracks'],['八条東口 出口','Hachijo East Exit'],['JR線のりば','JR Lines'],['新幹線のりば','Shinkansen Concourse'],['カフェ','CAFE'],['ご案内','Information'],['きっぷ','Tickets'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2304"><rect width="2048" height="2304" fill="#eeeedc"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><rect width="2048" height="256" fill="#eeeedc"/><g transform="translate(1024,0) scale(${sx},1)"><text y="119" text-anchor="middle" font-size="85" fill="#172128">${jp}</text><text y="197" text-anchor="middle" font-size="48" fill="#172128">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/hachijo-east-signs.png',png);await writeFile(out+'/hachijo-east-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/hachijo-east.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===8)){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map((v,i)=>{const triangle=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=triangle.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side===f.side?f.row:f.back):8;const u=row===8?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/2304;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[8].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});
j.images=[{name:'Original Hachijo East labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[8].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/hachijo-east.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'hachijo-east-signs.png',sha256:sha(png),material:mats[8].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
