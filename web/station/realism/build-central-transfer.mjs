// Connect the higher JR bridge to the lower Shinkansen central transfer gate.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {construction} from './component-mesh.mjs';
import {retiredTransferPanels} from './central-transfer-scope.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);
const removal=await read(dirname(manifest)+'/removal.json'),oldRaw=await readFile(removal.parent.layout),old=JSON.parse(oldRaw);assert.equal(sha(oldRaw),removal.parent.layoutSha256);
const retiredIds=retiredTransferPanels(old);assert.deepEqual(retiredIds,removal.removedIds);
const font=new FontLoader().parse(await read('research/kyoto-station/fonts/helvetiker_regular.typeface.json'));
const mat=(name,rgb,roughness=.7,metallic=0)=>({name:'Central transfer | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('floor stone',[.39,.36,.31],.48),mat('pale concrete',[.67,.68,.64]),mat('steel',[.35,.38,.39],.35,.8),mat('tactile',[.72,.48,.035]),mat('gate body',[.35,.41,.43],.4,.65),mat('dark fascia',[.025,.035,.04]),mat('white label',[.88,.88,.80]),mat('orange band',[.77,.24,.025]),mat('blue band',[.03,.22,.47]),{...mat('diffuser',[.9,.9,.82]),emissiveFactor:[.9,.9,.82]},mat('green indicator',[.045,.6,.12])];
const replacements=old.panels.filter(p=>p.id.startsWith('kintetsu-corrected-railway-track-10-')||p.id==='kintetsu-corrected-railway-wire-10');
const materialMap=new Map();for(const p of replacements)if(!materialMap.has(p.appearance)){const r=old.authoredMaterials.find(m=>m.id===p.appearance);assert(r&&!r.albedo);materialMap.set(p.appearance,materials.length);materials.push({name:'Central transfer | retained '+r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}});}
const c=construction(materials,{flatNormals:true}),high=7.35,low=3.675,rise=(high-low)/22,going=.32,x0=-44,x1=-34.5,start=-111,midA=start-11*going,midB=midA-1.8,end=midB-11*going;
const P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab('central-transfer-'+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=2,role='steelwork')=>c.beam('central-transfer-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.08,a[2]],[b[0],b[1]+1.08,b[2]],.055,.055);beam(id+'-lower',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.08,q[2]],.045,.045);}}
// Keep both side aisles, including every existing conventional-platform stair.
box('bridge-north-floor',-51,-27,start,-45,high,high-.38,0,'concourse-floor');
for(const[a,b,id]of[[-51,x0,'west'],[x1,-27,'east']]){
 box('bridge-'+id+'-floor',a,b,-128,start,high,high-.38,0,'concourse-floor');
 box('south-'+id+'-parapet',a,b,-128.08,-127.92,high+1.1,high,0,'guard');
 box('south-'+id+'-wall',a,b,-128.035,-127.965,11.8,high+1.1);
}
// The stairwell is open from above. Supported side walls close its underside.
for(const x of[x0,x1]){
 box('stairwell-side-'+x,x-.08,x+.08,-128,start,high-.02,low-.4);
 rail('upper-opening-'+x,[x,high,start],[x,high,-127.9]);
}
for(let flight=0;flight<2;flight++){
 const a=flight?midB:start,y=flight?(high+low)/2:high;
 for(let i=0;i<11;i++)box('step-'+flight+'-'+i,x0,x1,a-(i+1)*going,a-i*going,y-(i+1)*rise,y-(i+1)*rise-.30,1,'stair-tread');
 for(const x of[x0+.20,(x0+x1)/2,x1-.20])rail('stair-'+flight+'-'+x,[x,y,a],[x,y-11*rise,a-11*going]);
}
box('middle-landing',x0,x1,midB,midA,(high+low)/2,(high+low)/2-.30,1,'stair-landing');
for(const x of[x0+.20,(x0+x1)/2,x1-.20])rail('middle-'+x,[x,(high+low)/2,midA],[x,(high+low)/2,midB]);
box('lower-floor',x0,x1,-128,end,low,low-.38,0,'concourse-floor');
box('lower-ceiling',x0+.08,x1-.08,-128,-121.4,7.5,7.35,1,'ceiling');
// Supports sit on the platform edge, outside the pedestrian lanes below.
for(const x of[x0-.25,x1+.25])box('landing-support-'+x,x-.12,x+.12,-126.70,-126.46,low-.38,0,2,'column');
for(const[a,b,id]of[[-45,x0,'west'],[x1,145,'east']])box('shinkansen-north-'+id,a,b,-128.15,-128,7.5,low);
box('portal-lintel',x0,x1,-128.15,-128,7.5,low+2.85);
// Gate equipment is a visible boundary with one open exploration lane.
const gateZ=-124.6,cabinets=[-43,-41.3,-39.6,-37.9,-36.2],openLane=-40.45;
for(const[i,x]of cabinets.entries()){
 box('gate-'+i,x-.24,x+.24,gateZ-1,gateZ+1,low+.98,low+.06,4,'ticket-gate');
 box('gate-top-'+i,x-.25,x+.25,gateZ-1.01,gateZ+1.01,low+1.07,low+.98,5,'reader');
 for(const s of[-1,1]){box('reader-'+i+'-'+s,x-.17,x+.17,gateZ+s*.65-.18,gateZ+s*.65+.18,low+1.10,low+1.07,5,'reader');box('indicator-'+i+'-'+s,x-.09,x+.09,gateZ+s*.83-.025,gateZ+s*.83+.025,low+1.111,low+1.10,10,'indicator');c.panels.at(-1).collision=false;}
 if(i<cabinets.length-1){const nx=cabinets[i+1];if(i===1){for(const q of[x+.29,nx-.29])box('open-leaf-'+q,q-.035,q+.035,gateZ-.75,gateZ+.75,low+.9,low+.12,4,'open-gate-leaf');}else box('closed-flap-'+i,x+.24,nx-.24,gateZ-.05,gateZ+.05,low+.9,low+.12,5,'closed-gate');}
}
for(const[a,b,id]of[[x0,cabinets[0]-.24,'west'],[cabinets.at(-1)+.24,x1,'east']])box('gate-boundary-'+id,a,b,gateZ-.07,gateZ+.07,low+1.1,low,4,'gate-boundary');
function sign(id,label,z,facing,y,width=8){
 const center=(x0+x1)/2;box(id+'-board',center-width/2,center+width/2,z-.045,z+.045,y+.66,y,5,'sign');
 box(id+'-band',center-width/2,center+width/2,z-.047,z+.047,y+.08,y, facing===1?7:8,'sign-band');
 const g=new TextGeometry(label,{font,size:.36,depth:.012,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const w=g.boundingBox.max.x;
 if(facing===1)g.rotateY(Math.PI);g.translate(center+(facing===1?w/2:-w/2),y+.17,-z-facing*.052);
 const a=g.attributes.position;c.add('central-transfer-'+id+'-letters',Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:a.count},(_,i)=>i),6,'sign-letters');c.panels.at(-1).collision=false;g.dispose();
 for(const x of[center-width/2+.3,center+width/2-.3])beam(id+'-hanger-'+x,[x,y+.66,z],[x,z>-112?11.8:7.35,z],.035,.035);
}
sign('gate-north','Shinkansen  11 - 14',gateZ+.09,1,low+2.38);
sign('gate-south','JR Lines',gateZ-.09,-1,low+2.38);
sign('upper-direction','Shinkansen  /  Transfer',-110.7,1,high+2.35);
for(const z of[start+.60,end-.6]){box('stair-tactile-'+z,x0+.3,x1-.3,z-.22,z+.22,z>start?high+.006:low+.006,z>start?high:low,3,'tactile');c.panels.at(-1).collision=false;}
box('gate-tactile',openLane-.18,openLane+.18,-129,end-.82,low+.009,low+.002,3,'tactile');c.panels.at(-1).collision=false;
const lights=[];for(const[id,z,y]of[['upper',-109.5,11.7],['stairs',-116,11.7],['gate',-123.2,7.3]]){
 box('fixture-'+id,-42,-37,z-.18,z+.18,y+.04,y,9,'fixture');c.panels.at(-1).collision=false;
 lights.push({id:'central-transfer-emitter-'+id,position:{x:-39.5,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.95,b:.84},intensity:12,range:11,spotAngle:120,innerSpotAngle:76,source:'Fitted transfer stair and gate lighting',note:'Uses the existing two-light pool.'});
}
// Both Nara terminal tracks finish east of the crossing; preserve their eastern mesh.
for(const p of replacements){
 const cut=-9,vertices=[],indices=[];
 if(p.id.endsWith('sleepers')){assert.equal(p.triangles.length%36,0);for(let i=0;i<p.triangles.length;i+=36){const ids=p.triangles.slice(i,i+36);if(ids.some(k=>p.vertices[k].x<cut))continue;for(const k of ids){const v=p.vertices[k];indices.push(vertices.length);vertices.push(P(v.x,v.y,v.z));}}for(let i=0;i<indices.length;i+=3)[indices[i],indices[i+2]]=[indices[i+2],indices[i]];}
 else{for(const v of p.vertices){const x=Math.max(cut,v.x);vertices.push(P(x,v.y,v.z+.018*(x-v.x)));}for(let i=0;i<p.triangles.length;i+=3)indices.push(...p.triangles.slice(i,i+3).reverse());}
 c.add('central-transfer-'+p.id.replace('kintetsu-corrected-',''),vertices,indices,materialMap.get(p.appearance),p.role);c.panels.at(-1).collision=p.collision;
}
for(const side of[-1,1])beam('jr10-buffer-leg-'+side,[-8.6,-1.1,-120.25+.018*-8.6+side*.55],[-8,.05,-120.25+.018*-8+side*.55],.12,.14);
beam('jr10-buffer',[-8,.05,-120.25+.018*-8-1],[-8,.05,-120.25+.018*-8+1],.15,.2,7,'buffer-stop');
for(const p of c.panels)p.material=replacements.find(r=>p.id==='central-transfer-'+r.id.replace('kintetsu-corrected-',''))?.material??([2,4].includes(p.browserMaterial)?'steel':'stone');
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
const core=[point(openLane,high,-106),point(openLane,high,start),point(openLane,(high+low)/2,midA),point(openLane,(high+low)/2,midB),point(openLane,low,end),point(openLane,low,-122),point(openLane,low,-126.5),point(openLane,low,-131),point(-39,low,-133)];
pair('Central transfer stairs and gate',core);
const jr=await read('.local/v2/current/components/railway/report.json'),sh=await read('.local/v2/current/components/shinkansen/report.json');
for(const id of['2–3','10']){const p=jr.geometry.routes.find(r=>r.label==='Paid concourse to platform '+id).points;const branch=p.slice(p.findIndex(v=>v.x===-27)-1).map((v,i)=>i===0?{...v,x:-31}:v);pair('JR platform '+id+' stair remains connected',branch);}
for(const label of['11 / 12','13 / 14']){const p=sh.geometry.routes.find(r=>r.label==='Central entrance to platform '+label).points;pair('Transfer to Shinkansen '+label,[...core,...p.slice(3)]);}
pair('JR bridge east aisle',[point(-31,high,-104),point(-31,high,-119),point(-31,high,-125)]);
pair('JR bridge west aisle',[point(-48.8,high,-104),point(-48.8,high,-119),point(-48.8,high,-126)]);
pair('JR10 beneath landing',[point(-52,0,-124+.018*-52),point(-39.5,0,-124+.018*-39.5),point(-29,0,-124+.018*-29)]);
pair('Public south hall remains clear',[point(-65,low,-142),point(-65,low,-166)]);
pair('Shinkansen entrance remains connected',[point(-63,low,-153),point(-50,low,-153),point(-39,low,-153)]);
const report=await c.save(out,'central-transfer.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the JR bridge to the central Shinkansen transfer gate and concourse, retaining platform routes.',geometry:{high,low,start,midA,midB,end,x0,x1,rise,going,retiredIds,routes,jr10TrackWest:-9},references:['research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/maps/jr-central-kyoto-20260420.gif'],limits:['Floor heights, dimensions, stair count and gate equipment are fitted approximations.','Transfer lifts, moving escalators, eastern transfer route and detailed shops remain unfinished.','One gate lane is open for exploration; equipment is static.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
