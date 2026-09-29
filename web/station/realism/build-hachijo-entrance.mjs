// A ground entrance and real stair opening link the forecourt to the Shinkansen hall.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!layout.panels.some(p=>p.id==='shinkansen-paid-floor'));
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Hachijo entrance | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=[{...mat('retained concourse',[.45,.43,.38],.45),name:'Shinkansen | concourse stone'},mat('warm stone',[.63,.54,.41]),mat('ceiling',[.73,.72,.65]),mat('stainless',[.36,.39,.40],.3,.8),mat('charcoal',[.065,.072,.07],.42),mat('gate blue',[.035,.19,.45],.38,.15),mat('tactile',[.70,.47,.045]),{...mat('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]},mat('printed signs',[1,1,1]),{...mat('glazing',[.34,.43,.43]),pbrMetallicRoughness:{baseColorFactor:[.34,.43,.43,.25],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},mat('indicator',[.08,.5,.19]),{...mat('retained concrete',[.48,.47,.43],.7),name:'Shinkansen | concrete'}];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],high=3.675,ceiling=3.225,x0=44,x1=50,start=-169,run=11*.32,midA=start+run,midB=midA+1.8,end=midB+run;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab('hachijo-entrance-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('hachijo-entrance-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.045,.045);}}
const hole=rect(x0,x1,start-.5,end);
slab('paid-floor',rect(-45,145,-174,-128),high,.45,0,'concourse-floor',[hole]);
for(const[a,b,id]of[[-45,39,'west'],[55,145,'east']])box('ground-south-'+id,a,b,-174.15,-174,ceiling,0,11);
// The public foyer sits in front of the retained ground floor; its paid side has a stair.
box('public-floor',28,66,-184,-174,0,-.35,1,'public-floor');
box('public-ceiling',28,66,-184,-174,ceiling+.2,ceiling,2,'ceiling');
for(const x of[36,57])box('foyer-column-'+x,x-.22,x+.22,-182.02,-181.58,ceiling,0,1,'column');
box('foyer-beam',28,66,-182.05,-181.55,ceiling,3.04,2,'ceiling-beam');
for(const x of[28,66]){box('foyer-side-base-'+x,x-.075,x+.075,-184,-174,.7,0);box('foyer-side-glass-'+x,x-.03,x+.03,-184,-174,ceiling,.7,9,'glazing');for(const z of[-184,-181.5,-179,-176.5,-174])box('side-mullion-'+x+'-'+z,x-.06,x+.06,z-.05,z+.05,ceiling,.7,3,'window-frame');}
for(const[a,b,id]of[[28,39,'west'],[55,66,'east']]){box('front-base-'+id,a,b,-184.10,-184,.55,0);box('front-glass-'+id,a,b,-184.06,-184.02,2.8,.55,9,'glazing');for(let x=a;x<=b;x+=2.2)box('front-mullion-'+id+'-'+x,x-.045,x+.045,-184.09,-183.98,2.8,.55,3,'window-frame');}
box('front-fascia',28,66,-184.15,-183.95,ceiling,2.8,2,'fascia');
for(const x of[39,55])box('entry-jamb-'+x,x-.12,x+.12,-184.15,-183.85,2.8,0,3,'door-frame');
for(const[a,b,id]of[[39.15,41.0,'west'],[53,54.85,'east']]){box('retracted-door-'+id,a,b,-184.05,-184,2.6,.05,9,'door-glazing');for(const x of[a,b])box('door-rail-'+id+'-'+x,x-.025,x+.025,-184.09,-183.96,2.6,.05,3,'door-frame');}
box('door-transom',39,55,-184.08,-184,2.8,2.60,9,'glazing');
box('entry-canopy',26,68,-188,-183.95,3.65,3.45,2,'canopy');
for(const x of[28.5,65.5])box('canopy-post-'+x,x-.12,x+.12,-187.5,-187.25,3.45,0,3,'column');
// One pavement joins the existing eastern stair landing without coplanar overlap.
box('forecourt-front',-36,78,-203,-184,0,-.3,1,'forecourt-floor');
for(const[a,b,id]of[[-36,28,'west'],[66,78,'east']])box('forecourt-side-'+id,a,b,-184,-181,0,-.3,1,'forecourt-floor');
// The paid lower lobby is enclosed around the stair, with the through-route visible.
for(const x of[39,55])box('paid-side-'+x,x-.075,x+.075,-174,-156,ceiling,0);
box('paid-rear',39,55,-156,-155.85,ceiling,0);
for(const x of[x0,x1])box('stair-cheek-'+x,x-.065,x+.065,start,end,high,0,11);
for(let flight=0;flight<2;flight++){
 const a=flight?midB:start,y=flight?high/2:0;
 for(let i=0;i<11;i++)box('step-'+flight+'-'+i,x0,x1,a+i*.32,a+(i+1)*.32,y+(i+1)*high/22,y+(i+1)*high/22-.3,11,'stair-tread');
 for(const x of[x0+.20,x1-.20])rail('stair-'+flight+'-'+x,[x,y,a],[x,y+high/2,a+run]);
}
box('middle-landing',x0,x1,midA,midB,high/2,high/2-.3,11,'stair-landing');
for(const x of[x0+.20,x1-.20])rail('middle-'+x,[x,high/2,midA],[x,high/2,midB]);
for(const x of[x0,x1])rail('opening-'+x,[x,high,start-.5],[x,high,end]);
rail('opening-south',[x0,high,start-.5],[x1,high,start-.5]);
const gateZ=-174.5,cabinets=[40.5,43.1,45.3,47.5,49.7,51.9],openLane=46.4;
for(const[i,x]of cabinets.entries()){
 box('gate-'+i,x-.25,x+.25,gateZ-1,gateZ+1,1.00,.04,3,'ticket-gate');
 box('gate-hood-'+i,x-.26,x+.26,gateZ-.97,gateZ+.97,1.09,1.0,5,'gate-hood');
 for(const s of[-1,1]){box('reader-'+i+'-'+s,x-.17,x+.17,gateZ+s*.66-.15,gateZ+s*.66+.15,1.115,1.09,4,'reader');box('indicator-'+i+'-'+s,x-.08,x+.08,gateZ+s*.85-.025,gateZ+s*.85+.025,1.13,1.115,10,'indicator');c.panels.at(-1).collision=false;}
 if(i<cabinets.length-1){const nx=cabinets[i+1];if(i===2){for(const q of[x+.30,nx-.30])box('open-leaf-'+q,q-.035,q+.035,gateZ-.65,gateZ+.65,.9,.10,5,'open-gate-leaf');}else box('closed-flap-'+i,x+.25,nx-.25,gateZ-.05,gateZ+.05,.9,.1,5,'closed-gate');}
}
for(const[a,b,id]of[[39,cabinets[0]-.25,'west'],[cabinets.at(-1)+.25,55,'east']])box('gate-boundary-'+id,a,b,gateZ-.08,gateZ+.08,1.1,0,3,'gate-boundary');
box('gate-floor-band',39,55,-177,-173.1,.002,0,4,'floor-inlay');c.panels.at(-1).collision=false;
const faces=[];function sign(id,x,z,w,h,y,side,row){box(id,x-w/2,x+w/2,z-.018,z+.018,y+h,y,8,'sign');c.panels.at(-1).collision=false;faces.push({id:'hachijo-entrance-'+id,x,z,w,h,y,side,row});}
box('gate-header-support',39,55,-174.7,-174.3,ceiling,2.38,2,'fascia');
sign('gate-header',47,gateZ-.22,15.7,.68,2.45,-1,0);
sign('gate-exit',47,gateZ+.22,15.7,.68,2.45,1,1);
sign('outer-header',47,-184.19,15.3,.39,2.81,-1,2);
sign('upper-direction',47,end+1,5.7,.56,high+2.18,1,3);
for(const x of[44.4,49.6])beam('upper-sign-hanger-'+x,[x,high+2.74,end+1],[x,7.5,end+1],.035,.035);
// The gate photograph establishes a staffed window, blue machine heads and panel ceiling.
box('office-base',29,35,-176.6,-176.1,.95,0,1,'counter');box('office-glazing',29,35,-176.4,-176.36,2.4,.95,9,'glazing');
for(const x of[29,32,35])box('office-frame-'+x,x-.04,x+.04,-176.46,-176.32,2.45,.9,3,'window-frame');
sign('information',32,-176.48,5.7,.40,2.46,-1,4);
for(let i=0;i<3;i++){const x=59+i*1.7;box('machine-'+i,x-.55,x+.55,-175.8,-174.9,1.8,0,3,'ticket-machine');box('machine-hood-'+i,x-.55,x+.55,-175.82,-174.89,1.86,1.25,5,'machine-hood');sign('machine-screen-'+i,x,-175.85,.87,.64,.96,-1,5);box('machine-slot-'+i,x-.26,x+.26,-175.84,-175.81,.69,.64,4,'ticket-slot');}
sign('tickets',60.7,-175.86,5.1,.40,2.45,-1,6);
for(let x=29.5;x<66;x+=2.5)box('ceiling-seam-x-'+x,x-.014,x+.014,-183.95,-174,ceiling,ceiling-.012,4,'ceiling-seam');
for(const z of[-181.5,-179,-176.5])box('ceiling-seam-z-'+z,28.05,65.95,z-.014,z+.014,ceiling,ceiling-.012,4,'ceiling-seam');
box('public-tactile',openLane-.2,openLane+.2,-190.5,-177.1,.008,.002,6,'tactile');c.panels.at(-1).collision=false;
box('gate-tactile',openLane-.2,openLane+.2,-177.1,start-.55,.008,.003,6,'tactile');c.panels.at(-1).collision=false;
for(const[z,y]of[[start-.6,0],[end+.6,high]]){box('stair-tactile-'+z,x0+.3,x1-.3,z-.22,z+.22,y+.007,y,6,'tactile');c.panels.at(-1).collision=false;}
const lights=[];function light(id,x,z,y){box('fixture-'+id,x-.45,x+.45,z-.45,z+.45,y+.03,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:'hachijo-entrance-emitter-'+id,position:{x,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted fixtures from the attributed Hachijo gate photograph',note:'Uses the existing two-light pool.'});}
for(const x of[33,46.4,60])for(const z of[-182,-178])light('foyer-'+x+'-'+z,x,z,ceiling-.04);
light('paid-lobby',46.4,-171.2,ceiling-.04);light('stair',47,-164,7.45);light('canopy',47,-186.2,3.4);
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===9?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
const passage=await read('.local/v2/current/components/public-passage/report.json'),exit=passage.geometry.exits.find(e=>e.side===1);
const main=[point(-55,high,-190.5),point(exit.x0,high,-190.5),point(exit.midA,exit.half,-190.5),point(exit.midB,exit.half,-190.5),point(exit.end,0,-190.5),point(-38,0,-190.5),...[-20,0,20,38,openLane].map(x=>point(x,0,-190.5)),point(openLane,0,-179),point(openLane,0,-171),point(openLane,0,start),point(openLane,high/2,midA),point(openLane,high/2,midB),point(openLane,high,end),point(openLane,high,-155)];
pair('Public terrace via forecourt and Hachijo gate to concourse',main);
for(const x of[41,53])pair('Upper opening aisle '+x,[point(x,high,-171.8),point(x,high,-160),point(x,high,-154)]);
pair('Upper concourse west connection',[point(46.4,high,-153),point(26,high,-153),point(6,high,-153),point(-14,high,-153),point(-39,high,-153)]);
pair('Public foyer to ticket machines',[point(46.4,0,-181),point(60.7,0,-181),point(60.7,0,-177)]);
pair('Public foyer to information window',[point(46.4,0,-181),point(32,0,-181),point(32,0,-178)]);
const report=await c.save(out,'hachijo-entrance.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the southern public pavement through the Hachijo gate and two stair flights to the Shinkansen concourse.',geometry:{high,ceiling,start,midA,midB,end,hole,routes,retiredIds:['shinkansen-paid-floor','shinkansen-ground-south-wall']},references:['research/kyoto-station/maps/jr-central-kyoto-20260420.gif','research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/plans/hachijo-municipal-brochure.pdf','research/kyoto-station/photos/hachijo-gate-mister0124-2022.jpg'],limits:['Dimensions, floor elevations, stair count, gate equipment and entrance position are fitted approximations.','The gate photograph is dated December 2022 and is used only as reference.','Moving escalators, lifts, the eastern entrance, shops and complete Hachijo forecourt remain unfinished.']});
const labels=[['新幹線のりば（八条口）','Shinkansen Tracks (Hachijo Entrance)'],['八条口 出口','Hachijo Exit'],['京都駅 八条口','KYOTO STATION  /  HACHIJO'],['八条口 出口','Hachijo Exit'],['ご案内','Information'],['きっぷ','Tickets'],['きっぷうりば','Tickets'],['新幹線のりば','Shinkansen Concourse'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2304"><rect width="2048" height="2304" fill="#eeeedc"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||(i===7?faces.find(f=>f.id.endsWith('upper-direction')):faces[0]),sx=(2048/256)/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><rect width="2048" height="256" fill="#eeeedc"/><g transform="translate(1024,0) scale(${sx},1)"><text y="119" text-anchor="middle" font-size="85" fill="#172128">${jp}</text><text y="197" text-anchor="middle" font-size="48" fill="#172128">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/hachijo-signs.png',png);await writeFile(out+'/hachijo-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/hachijo-entrance.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
// Print the correct face; side edges and unused backs sample the blank atlas row.
for(const p of native.panels.filter(p=>p.browserMaterial===8)){
 const f=faces.find(f=>f.id===p.id);assert(f);
 p.uv=p.vertices.map((v,i)=>{
  const triangle=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=triangle.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z);
  const row=flat&&side===f.side?f.row:flat&&f.id.endsWith('upper-direction')?7:8;
  const u=row===8?.5:.5-side*(v.x-f.x)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/2304;
  uv.push(u,t);return{x:u,y:1-t};
 });
}
const prim=j.meshes[8].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});
j.images=[{name:'Original Hachijo entrance labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[8].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/hachijo-entrance.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'hachijo-signs.png',sha256:sha(png),material:mats[8].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
