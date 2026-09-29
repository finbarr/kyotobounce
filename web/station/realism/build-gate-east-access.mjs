// Complete the eastern M3F bridge route and open its 2F receiving interior.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),l=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),base.layoutSha256);assert(!l.panels.some(p=>p.id==='east-frontage-upper-rear'));
const bridge=l.panels.find(p=>p.id==='gate-passage-bridge-walking-floor'),bx=Math.max(...bridge.vertices.map(v=>v.x)),high=Math.max(...bridge.vertices.map(v=>v.y)),low=5.5;
const slope=(bridge.vertices[2].z-bridge.vertices[1].z)/(bridge.vertices[2].x-bridge.vertices[1].x),bz=(-14.134058952331543-11.83405876159668)/2,z=x=>bz+slope*(x-bx),P=(x,y,n)=>[x,y,-n];
const mats=[
 {name:'Gate east access | dark tile',pbrMetallicRoughness:{baseColorFactor:[.075,.065,.054,1],roughnessFactor:.32,metallicFactor:0}},
 {name:'Gate east access | warm wall',pbrMetallicRoughness:{baseColorFactor:[.48,.33,.20,1],roughnessFactor:.82,metallicFactor:0}},
 {name:'Gate east access | pale ceiling',pbrMetallicRoughness:{baseColorFactor:[.67,.63,.54,1],roughnessFactor:.85,metallicFactor:0}},
 {name:'Gate east access | dark metal',pbrMetallicRoughness:{baseColorFactor:[.17,.17,.16,1],roughnessFactor:.35,metallicFactor:.65}},
 {name:'Gate east access | diffuser',pbrMetallicRoughness:{baseColorFactor:[.82,.69,.48,1],roughnessFactor:.7,metallicFactor:0},emissiveFactor:[1,.72,.4]}
];
const c=construction(mats,{flatNormals:true}),join=51.5,stairX=52.65,upper=-11,lower=-3.8,count=24,rise=(high-low)/count;
const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const ribbon=(a,b,half=1.15)=>[[a,z(a)-half],[b,z(b)-half],[b,z(b)+half],[a,z(a)+half]];
const slab=(id,poly,y,depth,m=0,role='circulation-floor')=>c.slab('gate-east-access-'+id,poly.map(([x,n])=>P(x,y,n)),[],depth,m,role);
slab('corridor-floor',ribbon(bx,join),high,.3);
slab('corridor-ceiling',ribbon(bx,join,1.3),high+2.71,.12,2,'ceiling');
for(const side of [-1,1]){
 slab('corridor-wall-'+side,[[bx,z(bx)+side*1.15],[join,z(join)+side*1.15],[join,z(join)+side*1.3],[bx,z(bx)+side*1.3]],high+2.59,2.89,1,'corridor-wall');
 slab('corridor-kick-'+side,[[bx,z(bx)+side*1.13],[join,z(join)+side*1.13],[join,z(join)+side*1.15],[bx,z(bx)+side*1.15]],high+.14,.14,0,'skirting');
}
// A right-angle landing faces the northward descent shown by both operator maps.
const south=z(join)-1.15;
slab('upper-landing',rect(join,53.8,south,upper),high,.3);
slab('upper-ceiling',rect(join,53.95,south-.15,upper),high+2.71,.12,2,'ceiling');
slab('upper-south-wall',rect(join,53.95,south-.15,south),high+2.59,2.89,1,'landing-wall');
slab('upper-east-wall',rect(53.8,53.95,south,upper),high+2.59,2.89,1,'landing-wall');
slab('upper-west-return',rect(join-.15,join,z(join)+1.15,upper),high+2.59,2.89,1,'landing-wall');
for(let i=0;i<count;i++)slab('step-'+i,rect(51.5,53.8,upper+i*.3,upper+(i+1)*.3),high-(i+1)*rise,.32);
const height=n=>high-(high-low)*(n-upper)/(lower-upper);
c.slab('gate-east-access-stair-ceiling',[P(51.35,high+2.71,upper),P(53.95,high+2.71,upper),P(53.95,low+2.71,lower),P(51.35,low+2.71,lower)],[],.12,2,'ceiling');
for(const side of [-1,1]){
 const x=stairX+side*1.15;
 c.slab('gate-east-access-stair-wall-'+side,[P(x,high+2.59,upper),P(x,low+2.59,lower),P(x+side*.15,low+2.59,lower),P(x+side*.15,high+2.59,upper)],[],2.89,1,'stair-wall');
 c.beam('gate-east-access-rail-'+side,P(stairX+side*1.03,high+.98,upper),P(stairX+side*1.03,low+.98,lower),.045,.045,3,'handrail');
 for(let i=0;i<=6;i++){const n=upper+(lower-upper)*i/6,y=height(n);c.beam(`gate-east-access-rail-post-${side}-${i}`,P(stairX+side*1.03,y,n),P(stairX+side*1.03,y+.98,n),.04,.04,3,'handrail');}
}
// Fit the lower landing into the retained frontage-link and theatre approach floors.
slab('lower-landing',rect(51.5,55.5,lower,-1.5),low,.3);
slab('approach-return',rect(53.8,55.5,-4.5,lower),low,.3);
slab('lower-ceiling',rect(51.5,55.65,lower,-1.35),low+2.71,.12,2,'ceiling');
slab('lower-north-wall',rect(51.5,55.65,-1.5,-1.35),low+2.59,2.89,1,'entry-wall');
slab('lower-east-wall',rect(55.5,55.65,-3.8,-1.35),low+2.59,2.89,1,'entry-wall');
// Replace the 6.8 x 19.55 m solid placeholder with room walls and a clear doorway.
// The existing lower slab and roof provide the room floor and ceiling.
slab('lobby-north-wall',rect(44.2,51,-2.1,-1.9),8.7,3.2,2,'lobby-wall');
slab('lobby-south-wall',rect(44.2,51,-21.45,-21.25),8.7,3.2,2,'lobby-wall');
slab('lobby-east-wall',rect(50.8,51,-21.25,-5.8),8.7,3.2,2,'lobby-wall');
slab('lobby-door-lintel',rect(50.8,51,-5.8,-2.1),8.7,.4,2,'lobby-wall');
// Replace one sealed north-facing glass bay with an open, level entrance.
slab('public-entry-left-jamb',rect(32.055,32.165,-1.98,-1.82),8.7,3.2,3,'door-frame');
slab('public-entry-right-jamb',rect(34.275,34.385,-1.98,-1.82),8.7,3.2,3,'door-frame');
slab('public-entry-header',rect(32.165,34.275,-1.98,-1.82),8.7,.2,3,'door-frame');
slab('public-entry-base-left',rect(32,32.165,-2.04,-1.76),5.62,.12,0,'skirting');
slab('public-entry-base-right',rect(34.275,44.2,-2.04,-1.76),5.62,.12,0,'skirting');
const lights=[];
function light(x,n,floor,ceiling=floor+2.59){const i=lights.length;slab('fixture-'+i,rect(x-.16,x+.16,n-.50,n+.50),ceiling-.005,.025,4,'ceiling-fixture');c.panels.at(-1).collision=false;lights.push({id:'gate-east-access-light-'+i,position:{x,y:ceiling-.06,z:n},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.78,b:.52},intensity:9,range:7,spotAngle:120,innerSpotAngle:70,source:'Provisional fitted circulation lighting',note:'The existing light pool remains capped at two fixtures.'});}
for(const x of [14,20,26,32,38,44,49])light(x,z(x),high);
light(stairX,-12.1,high);
for(const n of [-9.6,-6.3])light(stairX,n,height(n));
light(53,-2.7,low);
for(const n of [-4,-10,-17])light(47.2,n,low,8.7);
const route=[...[5,10,16,22,28,34,40,46,50].map(x=>({x,y:high,z:z(x)})),{x:stairX,y:high,z:-12.1},{x:stairX,y:high,z:upper},{x:stairX,y:low,z:lower},{x:stairX,y:low,z:-2.75},{x:49.5,y:low,z:-3.5},{x:46,y:low,z:-3.5},{x:40,y:low,z:-3.5},{x:34,y:low,z:-3.5},{x:33,y:low,z:-1},{x:33,y:low,z:2},{x:31.4,y:low,z:3.35}];
const roomRoute=[{x:40,y:low,z:-3.5},{x:46,y:low,z:-3.5},{x:47,y:low,z:-10},{x:47,y:low,z:-19},{x:40,y:low,z:-19},{x:40,y:low,z:-3.5}];
for(const p of c.panels)p.material=/handrail|door-frame/.test(p.role)?'steel':'stone';
const report=await c.save(out,'gate-east-access.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,scope:'Connect the eastern M3F bridge to the 2F receiving interior and public stair landing, replacing the solid interior placeholder.',geometry:{route,roomRoute,high,low,stairs:{count,rise,going:.3,upperZ:upper,lowerZ:lower,width:2.3}},references:['research/kyoto-station/maps/granvia-floor-2026-pdf.pdf, pages 2-3','research/kyoto-station/maps/floor-2f.svg','research/kyoto-station/photos/granvia-bridge-entry.jpg'],limits:['The maps establish circulation topology; corridor alignment, lobby boundaries and construction dimensions are provisional fits to the existing model.','Hotel shops, counters, lifts and detailed lobby finishes are not built in this connection pass.']});
const path=out+'/native-panels.json',native=JSON.parse(await readFile(path));native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(path,bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length,rise}));
