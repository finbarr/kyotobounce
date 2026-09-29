// Complete the public passage through the railway footprint to the south entrance.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),base.layoutSha256);assert(!layout.boxes.some(b=>b.id.startsWith('add-south-exit')));
const retained=layout.boxes.find(b=>b.id==='add-passage2f-floor'),high=retained.center.y+retained.size.y/2,start=retained.center.z-retained.size.z/2;
assert.equal(start,-81);const low=3.675,stairStart=-112,steps=22,going=.32,stairEnd=stairStart-steps*going;
const materials=[
 {name:'Public passage south | dark stone',pbrMetallicRoughness:{baseColorFactor:[.105,.102,.087,1],roughnessFactor:.48,metallicFactor:0}},
 {name:'Public passage south | warm pale stone',pbrMetallicRoughness:{baseColorFactor:[.52,.48,.40,1],roughnessFactor:.62,metallicFactor:0}},
 {name:'Public passage south | pale ceiling',pbrMetallicRoughness:{baseColorFactor:[.65,.66,.63,1],roughnessFactor:.8,metallicFactor:0}},
 {name:'Public passage south | steel',pbrMetallicRoughness:{baseColorFactor:[.23,.24,.23,1],roughnessFactor:.28,metallicFactor:.75}},
 {name:'Public passage south | diffuser',pbrMetallicRoughness:{baseColorFactor:[.9,.87,.75,1],roughnessFactor:.8,metallicFactor:0},emissiveFactor:[.9,.86,.7]},
 {name:'Public passage south | glass',pbrMetallicRoughness:{baseColorFactor:[.44,.57,.6,.20],roughnessFactor:.16,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},
 {name:'Public passage south | tactile yellow',pbrMetallicRoughness:{baseColorFactor:[.7,.47,.045,1],roughnessFactor:.72,metallicFactor:0}}
];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=0,role='circulation-floor')=>c.slab('public-passage-'+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const beam=(id,a,b,w,h,mi=3,role='handrail')=>c.beam('public-passage-'+id,P(...a),P(...b),w,h,mi,role);
const wall=(id,x0,x1,z0,z1,top,bottom,mi=1)=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,'wall');
function cylinder(id,x,y,z,r,h,mi){const g=new T.CylinderGeometry(r,r,h,20);g.translate(x,y+h/2,-z);const p=g.attributes.position;c.add('public-passage-'+id,Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),Array.from(g.index.array),mi,'column');g.dispose();}
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.7);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.05,p[2]],.045,.045);}beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);}
const lights=[];
function light(x,z,floor,ceiling){const i=lights.length;slab('fixture-'+i,rect(x-.35,x+.35,z-.7,z+.7),ceiling-.01,.03,4,'fixture');c.panels.at(-1).collision=false;lights.push({id:'public-passage-light-'+i,position:{x,y:ceiling-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.9,b:.72},intensity:13,range:9,spotAngle:120,innerSpotAngle:72,source:'Provisional circulation fixtures based on operator route photographs',note:'Uses the existing pool of at most two active lights.'});}
function tactile(id,x0,x1,z0,z1,y){slab('tactile-'+id,rect(x0,x1,z0,z1),y+.006,.006,6,'tactile');c.panels.at(-1).collision=false;}

// Retain the old northern passage. The roof profile follows the operator's
// elevated-corridor photograph; exact dimensions remain a fitted reconstruction.
slab('upper-floor',rect(-69,-57,stairStart,start),high,.38);
for(const side of [-1,1]){
 const x=-63+side*6;
 wall('upper-parapet-'+side,x-side*.08,x+side*.15,stairStart,start,high+1.08,high-.38,0);
 if(side===-1)wall('upper-glazing',-69.05,-69,stairStart,start,high+4.1,high+1.08,5);
 else wall('upper-east-wall',-57,-56.85,stairStart,start,high+4.1,high+1.08,1);
}
const profile=Array.from({length:9},(_,i)=>{const x=-69+i*1.5;return{x,y:high+4.1+1.35*Math.sin(Math.PI*i/8)};});
for(let i=0;i<8;i++){const a=profile[i],b=profile[i+1];c.slab('public-passage-vault-'+i,[P(a.x,a.y+.15,stairStart),P(b.x,b.y+.15,stairStart),P(b.x,b.y+.15,start),P(a.x,a.y+.15,start)],[],.15,2,'roof');}
slab('retained-ceiling-join',rect(-69,-57,start,-77),high+4.28,.18,2,'roof');
for(const [a,b,id]of [[-69,-68.25,'west'],[-57.75,-57,'east']])slab('retained-ceiling-edge-'+id,rect(a,b,-77,-23),high+4.28,.18,2,'roof');
for(const z of [start,stairStart])for(let i=0;i<8;i++){
 const a=profile[i],b=profile[i+1],topA=a.y+.15,topB=b.y+.15,bottom=high+3.95;
 const v=[[a.x,bottom,-z],[b.x,bottom,-z],[b.x,topB,-z],[a.x,topA,-z],[a.x,bottom,-z+.12],[b.x,bottom,-z+.12],[b.x,topB,-z+.12],[a.x,topA,-z+.12]];
 c.add('public-passage-vault-end-'+z+'-'+i,v,[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5],2,'roof-end');
}
for(let z=-83,index=0;z>=stairStart;z-=6,index++){
 for(let i=0;i<8;i++)beam('roof-rib-'+index+'-'+i,[profile[i].x,profile[i].y-.04,z],[profile[i+1].x,profile[i+1].y-.04,z],.07,.09,3,'roof-rib');
 for(const x of [-68.85,-57.15])wall('upper-column-'+index+'-'+x,x-.15,x+.15,z-.18,z+.18,high+4.1,high,3);
}
for(const z of [-85,-94,-103,-110])light(-63,z,high,high+5.38);
tactile('upper',-65.22,-64.78,stairStart+1,start,high);

// The southern transfer hall sits below the railway crossing. Both stairs and
// their landings are actual closed meshes; no invisible ramp or finish timer.
for(let i=0;i<steps;i++)slab('transfer-step-'+i,rect(-69,-57,stairStart-(i+1)*going,stairStart-i*going),high-(i+1)*(high-low)/steps,.3);
c.slab('public-passage-transfer-ceiling',[P(-69,high+4.1,stairStart),P(-57,high+4.1,stairStart),P(-57,low+3.65,stairEnd),P(-69,low+3.65,stairEnd)],[],.15,2,'roof');
for(const side of [-1,1]){const x=-63+side*6;c.slab('public-passage-transfer-wall-'+side,[P(x,high+3.95,stairStart),P(x,low+3.5,stairEnd),P(x+side*.15,low+3.5,stairEnd),P(x+side*.15,high+3.95,stairStart)],[],4.33,1,'wall');}
for(const x of [-68.55,-63,-57.45])rail('transfer-'+x,[x,high,stairStart],[x,low,stairEnd]);
light(-65,stairStart-3.5,high-(high-low)/2,low+5.5);
tactile('transfer-top',-68.7,-57.3,stairStart+.4,stairStart+.95,high);

// Continuous lower public hall; ticket halls and platforms attach in later tasks.
slab('lower-floor',rect(-69,-57,-185,stairEnd),low,.38,1);
slab('lower-ceiling',rect(-69.15,-56.85,-185,stairEnd),low+3.65,.15,2,'roof');
for(const side of [-1,1]){const x=-63+side*6;wall('lower-wall-'+side,Math.min(x,x+side*.15),Math.max(x,x+side*.15),-185,stairEnd,low+3.5,low,1);wall('lower-base-'+side,Math.min(x-side*.035,x),Math.max(x-side*.035,x),-185,stairEnd,low+.17,low,0);}
for(let z=-124,i=0;z>-185;z-=8,i++){
 for(const x of [-68.45,-57.55])cylinder('lower-column-'+i+'-'+x,x,low,z,.32,3.5,1);
 light(-63,z,low,low+3.5);
 slab('lower-floor-band-'+i,rect(-68.8,-57.2,z-.14,z+.14),low+.002,.002,0,'floor-band');c.panels.at(-1).collision=false;
}
tactile('lower',-65.22,-64.78,-185,stairEnd-.4,low);
tactile('transfer-bottom',-68.7,-57.3,stairEnd-.95,stairEnd-.4,low);

// Southern landing and opposing stairs establish the terrace's public connection.
// Municipal roof edges establish approximate placement, not surveyed thresholds.
slab('south-deck',rect(-75,-51,-195,-185),low,.38,1);
slab('south-canopy',rect(-76,-50,-196,-184),low+4.1,.18,2,'canopy');
for(const x of [-74.65,-51.35])for(const z of [-194.5,-185.6])wall('canopy-post-'+x+'-'+z,x-.13,x+.13,z-.13,z+.13,low+3.92,low,3);
rail('deck-south',[-74.85,low,-194.85],[-51.15,low,-194.85]);
for(const [x,id]of [[-75,'west'],[-51,'east']]){rail('deck-'+id+'-north',[x,low,-185],[x,low,-188.5]);rail('deck-'+id+'-south',[x,low,-192.5],[x,low,-195]);}
for(const [a,b,id]of [[-75,-69,'west'],[-57,-51,'east']])rail('deck-north-'+id,[a,low,-185],[b,low,-185]);
for(const x of [-69,-57])light(x,-190,low,low+3.92);
const exits=[];
for(const side of [-1,1]){
 const x0=side<0?-75:-51,run=11*going,midA=x0+side*run,midB=midA+side*1.8,end=midB+side*run,half=low/2;
 for(let flight=0;flight<2;flight++){
  const x=flight===0?x0:midB,top=flight===0?low:half;
  for(let i=0;i<11;i++){const a=x+side*i*going,b=x+side*(i+1)*going;slab('exit-'+side+'-'+flight+'-step-'+i,rect(Math.min(a,b),Math.max(a,b),-192.5,-188.5),top-(i+1)*half/11,.29,1);}
  for(const z of [-192.4,-188.6])rail('exit-'+side+'-'+flight+'-'+z,[x,top,z],[x+side*run,top-half,z]);
 }
 slab('exit-'+side+'-midlanding',rect(Math.min(midA,midB),Math.max(midA,midB),-192.5,-188.5),half,.3,1);
 for(const z of [-192.4,-188.6])rail('exit-'+side+'-landing-'+z,[midA,half,z],[midB,half,z]);
 exits.push({side,x0,midA,midB,end,half});
}
// A bounded receiving pavement will join the rest of the Hachijo forecourt.
slab('south-pavement',rect(-90,-36,-203,-181),0,.3,1);
tactile('deck',-65.22,-64.78,-190.7,-185,low);
tactile('deck-cross',-74.5,-51.5,-190.72,-190.28,low);

for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===5?'glass':'stone';
const route=[...[-17,-30,-45,-60,-75,-80].map(z=>({x:-63,y:high,z})),{x:-65,y:high,z:-84},{x:-65,y:high,z:-100},{x:-65,y:high,z:stairStart},{x:-65,y:low,z:stairEnd},...[-123,-140,-160,-180,-190.5].map(z=>({x:-65,y:low,z}))];
const exitPoints=e=>[{x:e.x0,y:low,z:-190.5},{x:e.midA,y:e.half,z:-190.5},{x:e.midB,y:e.half,z:-190.5},{x:e.end,y:0,z:-190.5},{x:e.end+e.side*2,y:0,z:-190.5}];
const west=[...route,...exitPoints(exits[0])],east=[{x:-65,y:low,z:-190.5},...exitPoints(exits[1])];
const routes=[{label:'North passage to Hachijo west ground landing',points:west},{label:'Hachijo west ground landing to north passage',points:west.toReversed()},{label:'South deck to east ground landing',points:east},{label:'East ground landing to south deck',points:east.toReversed()}];
const report=await c.save(out,'public-passage.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,scope:'Replace the premature south exit with a public route through the railway footprint, intermediate transfer level and south arrival deck.',geometry:{high,low,start,stairStart,stairEnd,steps,going,routes,exits},references:['research/kyoto-station/maps/kintetsu-jr-west-route-2026.pdf','research/kyoto-station/maps/kintetsu-shinkansen-route-2026.pdf','research/kyoto-station/maps/guide-station.pdf','research/kyoto-station/plans/hachijo-municipal-brochure.pdf','research/kyoto-station/geodata/plateau-2024/registered-footprints.json'],limits:['Operator plans establish topology; municipal roof edges establish broad southern placement. Floor elevations, widths and stair dimensions are provisional.','Ticket halls, moving escalators, lifts, platform access and the complete Hachijo terrace/forecourt remain unfinished.']});
const path=out+'/native-panels.json',native=JSON.parse(await readFile(path));native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(path,bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length,steps,stairEnd});
