// Platform 0 floor extensions and a stair from the paid railway concourse.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash}from'node:crypto';import {construction}from'./component-mesh.mjs';import{FontLoader}from'three/addons/loaders/FontLoader.js';import{TextGeometry}from'three/addons/geometries/TextGeometry.js';
const[manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(raw),base.layoutSha256);assert(!layout.boxes.some(p=>p.id==='add-central-gate-rear-depth'));
const font=new FontLoader().parse(JSON.parse(await readFile('research/kyoto-station/fonts/helvetiker_regular.typeface.json'))),m=(name,color,roughness=.7,metallic=0)=>({name:'Platform zero | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[m('platform concrete',[.3,.31,.3]),m('pale stone',[.46,.44,.39]),m('steel',[.28,.31,.32],.35,.8),m('roof',[.38,.4,.38]),m('tactile',[.72,.48,.035]),m('concourse stone',[.39,.36,.31],.48),m('pale ceiling',[.67,.68,.64]),{...m('glass',[.42,.54,.57]),pbrMetallicRoughness:{baseColorFactor:[.42,.54,.57,.2],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true}];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],slope=.018,edge=x=>-41+slope*x,center=x=>-37.5+slope*x;
const slab=(id,p,y,d,mi=0,role='floor')=>c.slab('platform-zero-'+id,p.map(([x,z])=>P(x,y,z)),[],d,mi,role),box=(id,a,b,d,e,top,bottom,mi,role)=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role),beam=(id,a,b,w,h,mi=2)=>c.beam('platform-zero-'+id,P(...a),P(...b),w,h,mi,'steelwork');
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.08,a[2]],[b[0],b[1]+1.08,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/1.8);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.08,p[2]],.045,.045);}}
function strip(id,a,b,offset,width,top,depth,mi,role){slab(id,[[a,edge(a)+offset],[b,edge(b)+offset],[b,edge(b)+offset+width],[a,edge(a)+offset+width]],top,depth,mi,role);}
function sign(id,x,y,z,roof){box(id+'-board',x-.03,x+.06,z-.8,z+.8,y+.9,y,2,'sign');const g=new TextGeometry('0',{font,size:.60,depth:.018,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const w=g.boundingBox.max.x;g.rotateY(-Math.PI/2);g.translate(x-.04,y+.15,-z-w/2);const p=g.attributes.position;c.add('platform-zero-'+id+'-digit',Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),6,'sign-letter');c.panels.at(-1).collision=false;g.dispose();for(const side of[-1,1])beam(id+'-hanger-'+side,[x,y+.9,z+side*.55],[x,roof,z+side*.55],.035,.035);}
// The middle 210 m is the repaired original floor; do not overlay another slab.
for(const[a,b,id]of[[-230,-85,'west'],[125,185,'east']])strip(id+'-floor',a,b,0,9,0,1.5,0,'platform-floor');
strip('coping',-230,185,0,.35,.005,.10,1,'edge');strip('tactile',-229.6,184.6,.60,.35,.011,.011,4,'tactile');c.panels.at(-1).collision=false;
// Close the retained central slab's exposed lower edge down to the ground bed.
strip('central-foundation',-85,125,0,.3,-.60,.9,1,'foundation');
const high=7.35,start=-27,run=21*.32,midA=start+run,midB=midA+1.8,end=midB+run;
box('upper-landing',-39,-27,-45,-34.5,high,high-.38,5,'concourse-floor');box('upper-roof',-39,-26.8,-45,-34.35,12,11.8,6,'roof');
// Retain the partition beside West Square and open only the new platform branch.
for(const[a,b,id]of[[-51,-39,'retained-north']]){box(id+'-guard',a,b,-45.08,-44.92,high+1.1,high,5,'guard');box(id+'-glass',a,b,-45.035,-44.965,11.8,high+1.1,7,'glazing');}
box('upper-north-guard',-39,-27,-34.58,-34.42,high+1.1,high,5,'guard');box('upper-north-glass',-39,-27,-34.535,-34.465,11.8,high+1.1,7,'glazing');
for(const[a,b,id]of[[-45,center(start)-1.8,'south'],[center(start)+1.8,-34.5,'north']]){box('upper-east-'+id,-27.08,-26.92,a,b,high+1.1,high,5,'guard');box('upper-east-glass-'+id,-27.035,-26.965,a,b,11.8,high+1.1,7,'glazing');}
for(let flight=0;flight<2;flight++){const x=flight?midB:start,top=flight?high/2:high;for(let i=0;i<21;i++){const a=x+i*.32,b=x+(i+1)*.32;slab('stair-'+flight+'-'+i,[[a,center(a)-1.6],[b,center(b)-1.6],[b,center(b)+1.6],[a,center(a)+1.6]],top-(i+1)*high/42,.3,1,'stair-tread');}for(const side of[-1,1])rail('stair-'+flight+'-'+side,[x,top,center(x)+side*1.5],[x+run,top-high/2,center(x+run)+side*1.5]);}
slab('middle-landing',[[midA,center(midA)-1.6],[midB,center(midB)-1.6],[midB,center(midB)+1.6],[midA,center(midA)+1.6]],high/2,.3,1,'stair-landing');for(const side of[-1,1])rail('middle-'+side,[midA,high/2,center(midA)+side*1.5],[midB,high/2,center(midB)+side*1.5]);
c.slab('platform-zero-stair-roof',[P(start,11.8,center(start)-1.8),P(end,4.3,center(end)-1.8),P(end,4.3,center(end)+1.8),P(start,11.8,center(start)+1.8)],[],.15,6,'roof');
for(const side of[-1,1]){beam('hood-edge-'+side,[start,11.6,center(start)+side*1.75],[end,4.1,center(end)+side*1.75],.1,.18);box('hood-foot-'+side,end-.09,end+.09,center(end)+side*1.75-.09,center(end)+side*1.75+.09,4.1,0,2,'column');}
// Platform canopy continues beside the stair hood without cutting its headroom.
for(const[a,b,id]of[[-230,start,'west'],[end,185,'east']])strip('canopy-'+id,a,b,-.35,9.7,5.7,.2,3,'roof');
for(const[offset,width,id]of[[-.35,2.05,'south'],[5.3,4.05,'north']])strip('canopy-stair-'+id,start,end,offset,width,5.7,.2,3,'roof');
slab('central-gate-ceiling-join',[[-8,edge(-8)+9.35],[25,edge(25)+9.35],[25,-29.5],[-8,-29.5]],5.7,.2,6,'roof');
for(let x=-224,i=0;x<185;x+=13,i++){
 if(x>start-2&&x<end+2)continue;
 const z=edge(x)+1.25;box('canopy-column-'+i,x-.13,x+.13,z-.13,z+.13,5.5,0,2,'column');beam('canopy-beam-'+i,[x,5.42,edge(x)-.3],[x,5.42,edge(x)+9.3],.14,.24);
}
for(const x of[-37,-29])for(const z of[-35.2])box('upper-support-'+x+'-'+z,x-.2,x+.2,z-.2,z+.2,high-.38,0,2,'column');
for(const x of[-200,-120,22,95,165])sign('platform-sign-'+x,x,4.35,center(x),5.5);sign('stair-sign',-29,10.05,center(start),11.8);
for(const p of c.panels)p.material=p.browserMaterial===2?'steel':p.browserMaterial===7?'glass':'stone';
const walk=[{x:-33,y:high,z:-48},{x:-33,y:high,z:center(start)},{x:start,y:high,z:center(start)},{x:midA,y:high/2,z:center(midA)},{x:midB,y:high/2,z:center(midB)},{x:end,y:0,z:center(end)},{x:-7,y:0,z:center(-7)},{x:8.5,y:0,z:-35.5},{x:27,y:0,z:center(27)}],routes=[];
function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Paid concourse through platform 0 and Central Gate room',walk);for(const[a,b,id]of[[-90,-80,'west floor join'],[120,130,'east floor join'],[-227,-218,'western platform'],[174,182,'eastern platform']])pair(id,[{x:a,y:0,z:center(a)},{x:b,y:0,z:center(b)}]);pair('Northern ground extension',[{x:212,y:-1.4,z:-36.5},{x:218,y:-1.4,z:-36.5}]);
const report=await c.save(out,'platform-zero.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,scope:'Open the Central Gate rear, complete platform 0 and connect it to the paid bridge.',geometry:{high,start,midA,midB,end,rise:high/42,going:.32,platformEdge:{intercept:-41,slope},extent:[-230,185],routes},references:['research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/maps/guide-station.pdf','research/kyoto-station/geodata/plateau-2024/registered-footprints.json'],limits:['Floor elevations and stair dimensions are fitted to the current station, not surveyed measurements.','Platform 0 northern furnishings, western bay platforms and the eastern transfer connection remain unfinished.']});console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
