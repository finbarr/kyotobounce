// Complete the Shinkansen route from the lower central entrance to both islands.
import assert from 'node:assert/strict';
import {readFile,writeFile}from'node:fs/promises';
import {createHash}from'node:crypto';
import * as T from 'three';
import{construction}from'./component-mesh.mjs';
import{FontLoader}from'three/addons/loaders/FontLoader.js';
import{TextGeometry}from'three/addons/geometries/TextGeometry.js';
const [manifest,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex'),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!layout.panels.some(p=>p.id==='southern-gates-shinkansen-rear-wall'));
const sourcePath='research/kyoto-station/geodata/plateau-2024/registered-footprints.json',sourceBytes=await readFile(sourcePath),source=JSON.parse(sourceBytes),font=new FontLoader().parse(JSON.parse(await readFile('research/kyoto-station/fonts/helvetiker_regular.typeface.json')));
const mat=(name,rgb,roughness=.7,metallic=0)=>({name:'Shinkansen | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('platform',[.29,.30,.29]),mat('concrete',[.48,.47,.43]),mat('track bed',[.14,.14,.13]),mat('steel',[.37,.41,.42],.3,.8),mat('canopy',[.59,.60,.57]),mat('tactile',[.72,.48,.035]),mat('concourse stone',[.45,.43,.38],.45),mat('white signage',[.86,.86,.80]),{...mat('glazing',[.26,.36,.39]),pbrMetallicRoughness:{baseColorFactor:[.26,.36,.39,.25],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},mat('barrier panels',[.54,.63,.61],.5),{...mat('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]}];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],floor=3.675,high=9.975,deckTop=8.325,deckBottom=7.675,railHead=8.725;
const shift=x=>.018*x+.00018*Math.max(0,x-100)**2,zAt=(z,x)=>z+shift(x),gradient=x=>.018+.00036*Math.max(0,x-100),knots=[-235,-210,-190,-170,-145,-120,-95,-70,-45,-20,0,25,50,75,100,120,140,160,180,200,220,240,260];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab('shinkansen-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('shinkansen-'+id,P(...a),P(...b),w,h,mi,role);
const stripPoly=(a,b,z,width)=>{const xs=[a,...knots.filter(x=>x>a&&x<b),b];return[...xs.map(x=>[x,zAt(z-width/2,x)]),...xs.toReversed().map(x=>[x,zAt(z+width/2,x)])];};
const strip=(id,a,b,z,width,top,depth,mi,role)=>slab(id,stripPoly(a,b,z,width),top,depth,mi,role);
function rail(id,a,b,height=1.08){beam(id+'-cap',[a[0],a[1]+height,a[2]],[b[0],b[1]+height,b[2]],.055,.055);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+height,p[2]],.045,.045);}}
function sign(id,label,x,y,z,roof){box(id+'-board',x-.03,x+.06,z-1.8,z+1.8,y+.83,y,3,'sign');const g=new TextGeometry(label,{font,size:.50,depth:.018,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const w=g.boundingBox.max.x;g.rotateY(-Math.PI/2);g.translate(x-.04,y+.15,-z-w/2);const p=g.attributes.position;c.add('shinkansen-'+id+'-digits',Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),7,'sign-letters');c.panels.at(-1).collision=false;g.dispose();for(const side of[-1,1])beam(id+'-hanger-'+side,[x,y+.83,z+side*1.3],[x,roof,z+side*1.3],.035,.035);}
const lowCeiling=7.5,start=-32,run=18*.32,midA=start+run,midB=midA+1.8,end=midB+run;
const platforms=[{id:'11-12',label:'11 / 12',z:-138,width:10.2,roof:'466069',roofY:16.5},{id:'13-14',label:'13 / 14',z:-158.8,width:10.2,roof:'466062',roofY:16.8}];
const holes=platforms.map(p=>[[start-.5,zAt(p.z,start-.5)-2.3],[end,zAt(p.z,end)-2.3],[end,zAt(p.z,end)+2.3],[start-.5,zAt(p.z,start-.5)+2.3]]);
// Continuous elevated structure; the openings match the actual ascending stairs.
slab('viaduct',stripPoly(-235,260,-148.4,40.8),deckTop,deckTop-deckBottom,1,'viaduct-floor',holes);
// Paid floor meets the retained entrance room at X−45, without overlapping it.
box('paid-floor',-45,145,-174,-128,floor,floor-.45,6,'concourse-floor');
slab('paid-ceiling',rect(-45,145,-174,-128),lowCeiling+.15,.15,4,'ceiling',holes);
box('entrance-ceiling-step',-45.06,-44.94,-170,-138,lowCeiling+.15,7.175,4,'ceiling-return');
for(const [a,b,id]of[[-174,-170,'south-return'],[-138,-128,'north-return']])box(id,-45.15,-45,a,b,lowCeiling,floor);
box('paid-north-wall',-45,145,-128.15,-128,lowCeiling,floor);
box('paid-east-wall',145,145.18,-174,-128,lowCeiling,floor);
box('paid-south-base',-45,145,-174.15,-174,floor+1.1,floor,1,'wall');
box('paid-south-glass',-45,145,-174.06,-174,lowCeiling,floor+1.1,8,'glazing');
for(let x=-43,i=0;x<145;x+=8,i++)box('south-mullion-'+i,x-.05,x+.05,-174.13,-173.97,lowCeiling,floor+1.1,3,'window-frame');
// The ground storey gives the elevated hall a supported volume for later Hachijo work.
box('ground-floor',-45,145,-174,-128,0,-.35,1,'ground-floor');
box('ground-south-wall',-45,145,-174.15,-174,floor-.45,0,1,'wall');
for(let x=-38,i=0;x<142;x+=16,i++)for(const z of[-170,-132])box('lower-column-'+i+'-'+z,x-.38,x+.38,z-.38,z+.38,deckBottom,0,1,'column');
// Structural bearings west of the public passage and beyond the eastern ticket hall.
for(const x of[-225,-200,-175,-150,-125,-100,165,190,215,245])for(const z of[-134,-163])box('viaduct-pier-'+x+'-'+z,x-.45,x+.45,zAt(z,x)-.45,zAt(z,x)+.45,deckBottom,0,1,'column');
for(const side of[-1,1])strip('viaduct-edge-'+side,-235,260,-148.4+side*20.35,.1,deckTop+1.1,1.1,1,'parapet');
// Retracted leaves preserve the ticket-bank equipment while opening one exploration lane.
for(const z of[-152.30,-153.70])box('open-gate-leaf-'+z,-57.1,-55.5,z-.035,z+.035,floor+.9,floor+.12,3,'gate-leaf');
const lights=[];function light(id,x,z){box(id+'-fixture',x-.5,x+.5,z-.6,z+.6,lowCeiling-.01,lowCeiling-.04,10,'fixture');c.panels.at(-1).collision=false;lights.push({id:'shinkansen-light-'+id,position:{x,y:lowCeiling-.09,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.95,b:.84},intensity:12,range:10,spotAngle:120,innerSpotAngle:75,source:'Fitted concourse panel lights',note:'Shares the existing two-light pool.'});}
for(let x=-40,i=0;x<145;x+=20,i++)for(const z of[-150,-167])light('hall-'+i+'-'+z,x,z);
const routes=[];const point=(x,y,z)=>({x,y,z});function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
for(const [index,p]of platforms.entries()){
 const cz=x=>zAt(p.z,x),half=p.width/2,r=source.buildings.find(b=>b.sourceBuildingId==='26100-bldg-'+p.roof);assert(r);p.sourceRoof={id:r.sourceBuildingId,bounds:r.boundsXY};
 slab(p.id+'-platform',stripPoly(-190,220,p.z,p.width),high,high-deckTop,0,'platform-floor',[holes[index]]);
 for(const side of[-1,1]){strip(p.id+'-coping-'+side,-190,220,p.z+side*(half-.17),.34,high+.006,.12,1,'coping');strip(p.id+'-tactile-'+side,-189.6,219.6,p.z+side*(half-.70),.36,high+.012,.012,5,'tactile');c.panels.at(-1).collision=false;}
 // Municipal polygon supplies the canopy outline; height/profile remain fitted.
 const roof=r.roofEdgesXY[0].slice(0,-1);slab(p.id+'-canopy',roof,p.roofY,.22,4,'canopy');
 for(let x=-181,n=0;x<215;x+=13,n++){
  if(x>start-3&&x<end+3)continue;const z=cz(x)+2.6;
  box(p.id+'-roof-column-'+n,x-.15,x+.15,z-.15,z+.15,p.roofY-.22,high,3,'column');
  beam(p.id+'-roof-rib-'+n,[x,p.roofY-.38,cz(x)-half-.30],[x,p.roofY-.38,cz(x)+half+.30],.14,.28);
  beam(p.id+'-roof-brace-'+n,[x,p.roofY-1.35,z],[x,p.roofY-.50,cz(x)-3.4],.085,.085);
 }
 for(const x of[-185,215])rail(p.id+'-end-'+x,[x,high,cz(x)-half+.25],[x,high,cz(x)+half-.25]);
 // Two actual flights ascend through the deck/ceiling, landing flush on the island.
 for(let flight=0;flight<2;flight++){
  const a=flight?midB:start,base=flight?(floor+high)/2:floor;
  for(let i=0;i<18;i++)slab(p.id+'-step-'+flight+'-'+i,[[a+i*.32,cz(a+i*.32)-2],[a+(i+1)*.32,cz(a+(i+1)*.32)-2],[a+(i+1)*.32,cz(a+(i+1)*.32)+2],[a+i*.32,cz(a+i*.32)+2]],base+(i+1)*.175,.30,1,'stair-tread');
  for(const side of[-1,1])rail(p.id+'-stair-'+flight+'-'+side,[a,base,cz(a)+side*1.9],[a+run,base+3.15,cz(a+run)+side*1.9]);
 }
 strip(p.id+'-midlanding',midA,midB,p.z,4,(floor+high)/2,.30,1,'stair-landing');
 for(const side of[-1,1]){rail(p.id+'-middle-'+side,[midA,(floor+high)/2,cz(midA)+side*1.9],[midB,(floor+high)/2,cz(midB)+side*1.9]);rail(p.id+'-opening-'+side,[start-.5,high,cz(start-.5)+side*2.32],[end,high,cz(end)+side*2.32]);}
 rail(p.id+'-opening-west',[start-.5,high,cz(start-.5)-2.32],[start-.5,high,cz(start-.5)+2.32]);
 sign(p.id+'-lower-sign',p.label,start-1.5,floor+2.5,cz(start),lowCeiling);
 for(const x of[-120,5,130])sign(p.id+'-platform-sign-'+x,p.label,x,p.roofY-1.4,cz(x),p.roofY-.22);
 pair('Central entrance to platform '+p.label,[point(-63,floor,-153),point(-50,floor,-153),point(-39,floor,-153),point(-39,floor,cz(start)),point(start,floor,cz(start)),point(midA,(floor+high)/2,cz(midA)),point(midB,(floor+high)/2,cz(midB)),point(end,high,cz(end)),point(-10,high,cz(-10))]);
 // Short end checks cover the curved platform and its closed end guards.
 for(const[a,b,id]of[[-181,-171,'west'],[202,210,'east']])pair(p.id+' '+id+' platform',[point(a,high,cz(a)),point(b,high,cz(b))]);
}
// Merge repeated track and barrier equipment to keep native object counts bounded.
const groups=new Map();function groupBox(key,x,z,w,d,top,bottom,mi,role){let g=groups.get(key);if(!g){g={v:[],i:[],mi,role};groups.set(key,g);}const shape=new T.BoxGeometry(w,top-bottom,d);shape.rotateY(Math.atan(gradient(x)));shape.translate(x,(top+bottom)/2,-z);const p=shape.attributes.position,offset=g.v.length;for(let i=0;i<p.count;i++)g.v.push([p.getX(i),p.getY(i),p.getZ(i)]);for(const i of shape.index.array)g.i.push(i+offset);shape.dispose();}
// Closed pipe doors and solid pockets follow the operator's documented barrier type.
for(const p of platforms)for(const side of[-1,1]){
 const z=p.z+side*(p.width/2-.25),id=p.id+'-barrier-'+side;
 for(let a=-185,i=0;a<215;a+=12.5,i++){
  const b=Math.min(a+12.5,215),middle=(a+b)/2;
  groupBox(id+'-pocket',a+2.35,zAt(z,a+2.35),4.7,.14,high+1.25,high+.10,9,'barrier-pocket');
  for(const y of[.22,.65,1.10])groupBox(id+'-door',middle+2.35,zAt(z,middle+2.35),b-a-4.7,.055,high+y+.0275,high+y-.0275,3,'closed-platform-door');
  for(const x of[a+4.7,b])groupBox(id+'-door',x,zAt(z,x),.06,.09,high+1.18,high+.10,3,'closed-platform-door');
 }
}
const tracks=[{id:'11',z:-130.4},{id:'12',z:-145.6},{id:'13',z:-151.2},{id:'14',z:-166.4}];
for(const t of tracks){const id='track-'+t.id;strip(id+'-bed',-235,260,t.z,3.25,8.46,.14,2,'track-bed');for(let x=-234.6;x<260;x+=.65)groupBox(id+'-sleepers',x,zAt(t.z,x),.24,2.7,8.55,8.44,1,'sleepers');
 for(const side of[-1,1])for(const[name,w,top,depth]of[['foot',.14,8.595,.045],['web',.017,8.675,.08],['head',.068,railHead,.05]]){
  const offset=side*(1.435/2+.034),edges=[offset-w/2,offset+w/2],a=[];for(const [index,d]of edges.entries())for(const x of index?knots.toReversed():knots){const slope=gradient(x),scale=Math.sqrt(1+slope*slope);a.push([x-slope*d/scale,zAt(t.z,x)+d/scale]);}slab(id+'-'+side+'-'+name,a,top,depth,3,'rail');
 }
 for(let k=0;k<knots.length-1;k++){beam(id+'-wire-'+k,[knots[k],railHead+5,zAt(t.z,knots[k])],[knots[k+1],railHead+5,zAt(t.z,knots[k+1])],.01,.01,3,'overhead-wire');c.panels.at(-1).collision=false;}
}
for(const [id,g]of groups)c.add('shinkansen-'+id,g.v,g.i,g.mi,g.role);
for(const x of[-170,-70,30,130,215]){for(const z of[-128.35,-168.45])box('wire-post-'+x+'-'+z,x-.13,x+.13,zAt(z,x)-.13,zAt(z,x)+.13,railHead+6.4,deckTop,3,'mast');beam('wire-span-'+x,[x,railHead+6.2,zAt(-128.35,x)],[x,railHead+6.2,zAt(-168.45,x)],.12,.12);}
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===8?'glass':'stone';
pair('Lower public hall remains clear',[point(-65,floor,-144),point(-65,floor,-167)]);
pair('Paid concourse eastward',[point(-39,floor,-153),point(-20,floor,-153),point(0,floor,-153),point(20,floor,-153)]);
const report=await c.save(out,'shinkansen.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the central Shinkansen gate into a paid concourse and two elevated platform islands with tracks, viaduct and roofs.',geometry:{floor,high,deckTop,deckBottom,railHead,gauge:1.435,start,midA,midB,end,steps:36,rise:.175,going:.32,platforms,tracks,holes,routes},references:[sourcePath,'research/kyoto-station/maps/jr-central-kyoto-20260420.gif','research/kyoto-station/maps/kintetsu-shinkansen-route-2026.pdf','research/kyoto-station/plans/shinkansen-platform-gates-2014.pdf','https://www.mlit.go.jp/english/2006/h_railway_bureau/Laws_concerning/14.pdf'],sourceRoofSha256:sha(sourceBytes),attribution:'Kyoto City / MLIT Project PLATEAU. Municipal roof outlines transformed into the Kyoto Bounce frame; fitted reconstruction, not an official survey.',limits:['Elevations, track curves, stairs, barriers and the paid-concourse footprint are provisional fits.','Barrier type follows the 2014 Kyoto installation notice, whose example photograph is Shin-Osaka; gate module spacing and motion are not operational reproductions.','Kintetsu platforms, JR transfer gates, east and ground entrances, lifts, moving escalators, shops and complete Hachijo facade remain unfinished.']});
const native=JSON.parse(await readFile(out+'/native-panels.json'));native.authoredLights=lights;const nb=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nb);report.outputs.nativePanelsSha256=sha(nb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length,routes:routes.length});
