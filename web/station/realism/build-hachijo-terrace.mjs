// Rebuild Miyako Yume Terrace from the city's dimensioned 2026 reference plan.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),old=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(out.startsWith('.local/'));
const prefix='hachijo-terrace-',H=3.675,N=-196.5,S=-208.5;
const retiredIds=old.panels.filter(p=>['public-passage-south-deck','public-passage-south-canopy','public-passage-south-pavement','public-passage-fixture-13','public-passage-fixture-14','public-passage-tactile-deck','public-passage-tactile-deck-cross','hachijo-entrance-forecourt-front'].includes(p.id)||['public-passage-exit-','public-passage-deck-','public-passage-canopy-post-'].some(s=>p.id.startsWith(s))).map(p=>p.id);
assert(retiredIds.includes('public-passage-south-pavement')&&retiredIds.filter(id=>id.includes('-step-')).length===44);
const retiredLights=['public-passage-light-13','public-passage-light-14'];
const mat=(name,color,roughness=.6,metallic=0)=>({name:'Miyako Yume Terrace | '+name,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('dark paving',[.16,.17,.16,1]),mat('pale paving',[.47,.48,.45,1]),mat('silver structure',[.48,.52,.53,1],.3,.7),mat('roof',[.7,.72,.71,1]),{...mat('glazing',[.38,.53,.56,.2],.18),alphaMode:'BLEND',doubleSided:true},mat('tactile',[.78,.56,.08,1]),mat('shadow',[.065,.075,.075,1]),{...mat('fixture',[.86,.88,.78,1]),emissiveFactor:[.8,.82,.7]}];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],point=(x,y,z)=>({x,y,z});
const slab=(id,poly,y,depth,mi=0,role='public-floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=2,role='structure')=>{assert(top>bottom);slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);};
const beam=(id,a,b,w=.07,h=.07,mi=2,role='structure')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b,glass=true){
 beam(id+'-cap',[a[0],a[1]+1.1,a[2]],[b[0],b[1]+1.1,b[2]],.06,.06);
 beam(id+'-base',[a[0],a[1]+.16,a[2]],[b[0],b[1]+.16,b[2]],.055,.1);
 const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.6);
 for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.1,p[2]],.06,.06);}
 if(glass){
  // Vertical infill follows the same slope as the handrail.
  const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),nx=-dz/len*.018,nz=dx/len*.018;
  const poly=[[a[0]+nx,a[2]+nz],[b[0]+nx,b[2]+nz],[b[0]-nx,b[2]-nz],[a[0]-nx,a[2]-nz]];
  c.slab(prefix+id+'-glass',poly.map(([x,z],i)=>P(x,(i===1||i===2?b[1]:a[1])+.99,z)),[],.78,4,'guard');
 }
}
const lights=[];
function light(id,x,z,y){box('fixture-'+id,x-.45,x+.45,z-.3,z+.3,y,y-.035,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:{x,y:y-.07,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.97,b:.88},intensity:14,range:10,spotAngle:120,innerSpotAngle:80,source:'Fitted fixtures following municipal terrace photographs',note:'Existing capped light pool'});}
function tactile(id,poly,y=H){slab('tactile-'+id,poly,y+.006,.006,5,'tactile');c.panels.at(-1).collision=false;}
// The plan's 39 m column grid and 45 m outer deck width are retained. Its
// registration is fitted to the existing public hall; no surveyed origin exists.
const deck=[[-82.5,N],[-43.5,N],[-43.5,-203.8],[-40.5,-203.8],[-40.5,S],[-82.5,S],[-82.5,-203.95],[-85.5,-203.95],[-85.5,-199.75],[-82.5,-199.75]];
slab('deck',deck,H,.38);
slab('hall-extension',rect(-69,-57,N,-185),H,.38,1);
slab('hall-roof',rect(-69.15,-56.85,N,-185),7.325,.15,3,'roof');
// Two original station stairs now branch before the new terrace, as in the plan.
for(const side of[-1,1]){
 const x=side<0?-69:-57;
 for(const[z0,z1,label]of[[N,-192.5,'south'],[-188.5,-185,'north']])box('hall-wall-'+side+'-'+label,x-.08,x+.08,z0,z1,7.175,H,1,'wall');
 box('hall-stair-header-'+side,x-.08,x+.08,-192.5,-188.5,7.175,H+2.8,1,'wall');
}
const stairs=[];
function stair(id,x0,z,side,width=3.8){
 const half=H/2,run=11*.32,midA=x0+side*run,midB=midA+side*1.8,end=midB+side*run;
 for(let flight=0;flight<2;flight++){
  const x=flight===0?x0:midB,top=flight===0?H:half;
  for(let i=0;i<11;i++){const a=x+side*i*.32,b=x+side*(i+1)*.32;slab(id+'-flight-'+flight+'-step-'+i,rect(Math.min(a,b),Math.max(a,b),z-width/2,z+width/2),top-(i+1)*half/11,.29,1,'stair-tread');}
  for(const zz of[z-width/2+.12,z+width/2-.12])rail(id+'-flight-'+flight+'-'+zz,[x,top,zz],[x+side*run,top-half,zz]);
 }
 slab(id+'-middle',rect(Math.min(midA,midB),Math.max(midA,midB),z-width/2,z+width/2),half,.3,1);
 for(const zz of[z-width/2+.12,z+width/2-.12])rail(id+'-middle-'+zz,[midA,half,zz],[midB,half,zz]);
 tactile(id+'-head',rect(Math.min(x0-side*.65,x0-side*.25),Math.max(x0-side*.65,x0-side*.25),z-width/2+.2,z+width/2-.2));
 const row={id,x0,z,side,width,midA,midB,end};stairs.push(row);return row;
}
stair('station-west',-69,-190.5,-1,4);stair('station-east',-57,-190.5,1,4);
// New stairs discharge westward to the bus-side pavement. The two landings and
// the east pickup walkway are distinct public approaches, not a common shaft.
slab('west-stair-head',rect(-84,-82.5,-208.5,-204.5),H,.38);
stair('terrace-west',-84,-206.5,-1,4);
slab('south-stair-head',rect(-52,-48.2,-213.35,S),H,.38);
stair('terrace-south',-52,-211.35,-1,4);
// Eastern walkway and three lift receiving landings.
slab('east-walkway',rect(-43.5,-26,-199.7,N),H,.38);
slab('west-lift-landing',rect(-87,-81,-209.95,S),H,.38);
slab('south-lift-landing',rect(-48.2,-44.65,-209.95,S),H,.38);
const lifts=[
 subwayLift({id:'hachijo-terrace-west-lift',origin:point(-85.25,0,-211.35),height:H}),
 subwayLift({id:'hachijo-terrace-south-lift',origin:point(-46.4,0,-211.35),height:H}),
 subwayLift({id:'hachijo-terrace-east-lift',origin:point(-24.5,0,-198.1),height:H})
];lifts[0].yaw=180;lifts[1].yaw=180;lifts[2].yaw=90;
const liftRect=(l,a,b,d,e)=>rect(a,b,d,e).map(([x,z])=>{const r=l.yaw*Math.PI/180;return[l.origin.x+Math.cos(r)*x+Math.sin(r)*z,l.origin.z-Math.sin(r)*x+Math.cos(r)*z].map(v=>Math.round(v*1e6)/1e6);});
const holes=lifts.map(l=>liftRect(l,-1.6,1.6,-1.4,1.35));
// Replace two old pavement plates exactly, and extend only the missing southern
// and western strips. The three car pits are open in every static floor export.
slab('station-pavement',rect(-90,-36,-203,-181),0,.3,1);
slab('east-pavement',rect(-36,78,-203,-184),0,.3,1,'public-floor',[holes[2]]);
slab('south-pavement-west',rect(-90,-65,-216,-203),0,.3,1,'public-floor',[holes[0]]);
slab('south-pavement-east',rect(-65,-20,-216,-203),0,.3,1,'public-floor',[holes[1]]);
slab('west-pavement',rect(-104,-90,-216,-201.72000122070312),0,.3,1);
for(const [index,l]of lifts.entries()){
 const local=(id,a,b,d,e,top,bottom,mi=2,role='shaft')=>slab('lift-'+index+'-'+id,liftRect(l,a,b,d,e),top,top-bottom,mi,role);
 for(const[a,b,s]of[[-1.75,-1.6,'left'],[1.6,1.75,'right']])local(s,a,b,-1.6,1.5,H+2.9,-.5,2);
 local('back',-1.6,1.6,1.35,1.5,H+2.9,-.5,4);
 local('roof',-1.75,1.75,-1.6,1.5,H+3.05,H+2.9,3);
 local('pit',-1.6,1.6,-1.6,1.35,-.35,-.5,6,'pit-floor');
 for(const[a,b,s]of[[-1.75,-.7,'left'],[.7,1.75,'right']])local('front-'+s,a,b,-1.55,-1.4,H+2.9,-.5);
 for(const[lo,hi,s]of[[-.5,0,'bottom'],[2.2,H,'between'],[H+2.2,H+2.9,'top']])local('front-'+s,-.7,.7,-1.55,-1.4,hi,lo);
 for(const[y,label]of[[0,'ground'],[H,'deck']]){
  local(label+'-sill',-1.6,1.6,-1.6,-1.185,y,y-.12,2,'lift-sill');
  for(const x of[-.74,.74])local(label+'-jamb-'+x,x-.035,x+.035,-1.6,-1.38,y+2.25,y,2,'lift-frame');
  local(label+'-head',-.775,.775,-1.6,-1.38,y+2.28,y+2.18,2,'lift-frame');
  local(label+'-button',1,1.2,-1.63,-1.6,y+1.3,y+1,6,'call-plate');
  local(label+'-indicator',-.22,.22,-1.64,-1.61,y+2.65,y+2.4,6,'lift-indicator');
 }
}
// Guard every open deck edge; openings lead to an actual stair or lift landing.
const guards=[
 ['north-west',[-82.5,H,N],[-69,H,N]],['north-east',[-57,H,N],[-26,H,N]],
 ['east-walk-south',[-43.5,H,-199.7],[-26,H,-199.7]],
 ['east-edge',[-43.5,H,-199.7],[-43.5,H,-203.8]],['east-jog',[-43.5,H,-203.8],[-40.5,H,-203.8]],
 ['east-end',[-40.5,H,-203.8],[-40.5,H,S]],['south-east',[-40.5,H,S],[-44.65,H,S]],
 ['south-long',[-52,H,S],[-81,H,S]],
 ['west-north',[-82.5,H,N],[-82.5,H,-199.75]],['west-jog-north',[-82.5,H,-199.75],[-85.5,H,-199.75]],
 ['west-escalator-reserve',[-85.5,H,-199.75],[-85.5,H,-203.95]],['west-jog-south',[-85.5,H,-203.95],[-82.5,H,-203.95]],
 ['west-short',[-82.5,H,-203.95],[-82.5,H,-204.5]],['west-stair-head-north',[-84,H,-204.5],[-82.5,H,-204.5]],
 ['west-lift-back',[-87,H,S],[-84,H,S]],['west-lift-edge',[-87,H,S],[-87,H,-209.95]],['west-lift-south',[-83.5,H,-209.95],[-81,H,-209.95]],['west-lift-east',[-81,H,S],[-81,H,-209.95]],
 ['south-stair-head-east',[-44.65,H,S],[-44.65,H,-209.95]],['south-stair-head-side',[-48.2,H,-209.95],[-48.2,H,-213.35]],
 ['south-stair-head-bottom',[-48.2,H,-213.35],[-52,H,-213.35]]
];for(const [id,a,b]of guards)rail(id,a,b);
// High open steel canopy, using the plan's 13 m column bays. The translucent
// center band and diagonal bracing follow the municipal interior photographs.
for(const[a,b,id]of[[-209.2,-205.1,'south'],[-201.9,-195.8,'north']])slab('roof-'+id,rect(-86,-39.8,a,b),9.15,.16,3,'roof');
slab('roof-light-band',rect(-86,-39.8,-205.1,-201.9),9.15,.08,4,'roof');
for(const x of[-82.5,-69.5,-56.5,-43.5]){
 for(const z of[-199.75,-204.0,-208.2]){
  if(x===-43.5&&z===-208.2)continue;
  box('column-'+x+'-'+z,x-.14,x+.14,z-.14,z+.14,8.99,0,2,'column');
 }
 beam('roof-chord-top-'+x,[x,8.95,-209.2],[x,8.95,-195.8],.14,.14);
 beam('roof-chord-bottom-'+x,[x,8.15,-209.2],[x,8.15,-195.8],.12,.12);
 for(let i=0;i<7;i++){const z=-209.2+i*13.4/7;beam('roof-diagonal-'+x+'-'+i,[x,i%2?8.95:8.15,z],[x,i%2?8.15:8.95,z+13.4/7],.08,.08);}
}
for(const z of[-208.2,-204,-199.75])beam('roof-cross-'+z,[-86,8.7,z],[-39.8,8.7,z],.14,.18);
for(const x of[-81,-72,-63,-54,-45])for(const z of[-207,-200.5])light(x+'-'+z,x,z,8.1);
for(const x of[-66,-60])light('hall-'+x,x,-189,7.15);
// Original sheltered stairs have opaque side walls below their tall glazing.
for(const s of stairs.slice(0,2)){
 const a=Math.min(s.x0,s.end)-.3,b=Math.max(s.x0,s.end)+.3;
 for(const z of[s.z-2.12,s.z+2.12]){box(s.id+'-enclosure-'+z,a,b,z-.06,z+.06,4.4,0,1,'wall');box(s.id+'-glazing-'+z,a,b,z-.06,z+.06,7.175,4.4,4,'wall');}
 slab(s.id+'-roof',rect(a,b,s.z-2.18,s.z+2.18),7.325,.15,3,'roof');
}
// Simple paving bands and tactile routes clarify the actual destinations.
for(let x=-81;x<-42;x+=3.25){slab('paving-band-'+x,rect(x,x+.2,-207.9,-196.7),H+.003,.003,1,'floor-inlay');c.panels.at(-1).collision=false;}
tactile('hall',rect(-65.22,-64.78,-202,-185));tactile('deck-cross',rect(-81,-44,-202.22,-201.78));
for(const p of c.panels)p.material=p.browserMaterial===2?'steel':p.browserMaterial===4?'glass':'stone';
// Routes use ordinary walking speed, including both directions on all four
// stairs and each lift's receiving walk. Long approaches are subdivided.
const routes=[];function pair(label,ps){const points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14);for(let k=1;k<=n;k++)points.push(point(a.x+(b.x-a.x)*k/n,a.y+(b.y-a.y)*k/n,a.z+(b.z-a.z)*k/n));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
for(const s of stairs){const approach=s.id.startsWith('station')?point(-63,H,-190.5):s.id==='terrace-west'?point(-78,H,-206.5):point(-50,H,-211.35);pair(s.id,[approach,point(s.x0,H,s.z),point(s.midA,H/2,s.z),point(s.midB,H/2,s.z),point(s.end,0,s.z),point(s.end+s.side*1.5,0,s.z)]);}
pair('Hall to terrace',[point(-63,H,-180),point(-63,H,-194),point(-63,H,-202)]);
pair('Terrace to west lift',[point(-63,H,-202),point(-79,H,-202),point(-80,H,-207),point(-81.75,H,-207),point(-81.75,H,-209.1),point(-85.25,H,-209.1),point(-85.25,H,-209.4)]);
pair('Terrace to south lift',[point(-63,H,-202),point(-47.5,H,-202),point(-47.5,H,-207),point(-46.4,H,-209.4)]);
pair('Terrace to east lift',[point(-63,H,-202),point(-45.5,H,-202),point(-45.5,H,-198.1),point(-26.45,H,-198.1)]);
pair('West lift street approach',[point(-85.25,0,-209.4),point(-85.25,0,-198),point(-91,0,-195)]);
pair('South lift street approach',[point(-46.4,0,-209.4),point(-46.4,0,-205.5),point(-37,0,-205.5),point(-37,0,-193)]);
pair('East lift street approach',[point(-26.45,0,-198.1),point(-34,0,-198.1),point(-34,0,-190)]);
pair('Miyako Michi to ASTY forecourt',[point(-95,0,-197),point(-85,0,-197),point(-65,0,-197),point(-45,0,-197),point(-37,0,-193)]);
const blocked=[{label:'Terrace south edge',start:point(-72,H,-207),yaw:180,axis:'z',limit:S+.15,sign:1},{label:'West lift landing edge',start:point(-85.5,H,-209.1),yaw:270,axis:'x',limit:-86.85,sign:1}];
const report=await c.save(out,'hachijo-terrace.glb',{componentPrefix:prefix,sourceCollection:'Miyako Yume Terrace public connections',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Dimensioned Hachijo terrace, four usable stairs, three public lifts and eastern pickup walkway.',geometry:{deck,H,N,S,stairs,liftIds:lifts.map(l=>l.id),routes,blocked,spawn:point(-63,H,-194),retiredIds,retiredLights},references:['https://www.city.kyoto.lg.jp/gyozai/page/0000294495.html','research/kyoto-station/plans/hachijo-terrace-advertising-plan-2026.pdf','research/kyoto-station/plans/hachijo-municipal-brochure.pdf'],limits:['The city reference gives a 39 m column grid and 45 m outer deck; registration, floor elevation, stair/car dimensions and roof height are fitted to the current station.','Four terrace escalators and the existing station-side escalators remain unfinished. Their upper approaches remain guarded.','Street traffic lanes, bus shelters, seating and detailed finishes remain unfinished.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/motion.json',JSON.stringify({lifts},null,2)+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights},null,2)+'\n');
console.log({panels:c.panels.length,triangles:report.geometry.triangles,retired:retiredIds.length,routes:routes.length,lifts:lifts.length});
