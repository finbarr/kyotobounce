// Connect the Central Gate M3F bridge to the retained north–south public passage.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),l=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),base.layoutSha256);assert(l.boxes.some(b=>b.id==='add-passage2f-wall-1-0'));
const bridge=l.panels.find(p=>p.id==='gate-passage-bridge-walking-floor'),bx=Math.min(...bridge.vertices.map(v=>v.x)),high=Math.max(...bridge.vertices.map(v=>v.y)),low=7.35;
const slope=(bridge.vertices[2].z-bridge.vertices[1].z)/(bridge.vertices[2].x-bridge.vertices[1].x),z0=(bridge.vertices[0].z+bridge.vertices[1].z)/2,z=x=>z0+slope*(x-bx),P=(x,y,n)=>[x,y,-n];
const mats=[
 {name:'Gate west access | dark tile',pbrMetallicRoughness:{baseColorFactor:[.075,.065,.054,1],roughnessFactor:.32,metallicFactor:0}},
 {name:'Gate west access | warm wall',pbrMetallicRoughness:{baseColorFactor:[.48,.33,.20,1],roughnessFactor:.82,metallicFactor:0}},
 {name:'Gate west access | pale ceiling',pbrMetallicRoughness:{baseColorFactor:[.67,.63,.54,1],roughnessFactor:.85,metallicFactor:0}},
 {name:'Gate west access | dark metal',pbrMetallicRoughness:{baseColorFactor:[.17,.17,.16,1],roughnessFactor:.35,metallicFactor:.65}},
 {name:'Gate west access | diffuser',pbrMetallicRoughness:{baseColorFactor:[.82,.69,.48,1],roughnessFactor:.7,metallicFactor:0},emissiveFactor:[1,.72,.4]}
];
const c=construction(mats,{flatNormals:true}),width=2.3,upper=-46,lower=-49.9,join=-43.4,stairZ=-12.05,entryNorth=-10.9,count=13,rise=(high-low)/count;
const slab=(id,poly,y,depth,m=0,role='circulation-floor')=>c.slab('gate-west-access-'+id,poly.map(([x,n])=>P(x,y,n)),[],depth,m,role);
const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const ribbon=(a,b,half=width/2)=>[[a,z(a)-half],[b,z(b)-half],[b,z(b)+half],[a,z(a)+half]];
slab('corridor-floor',ribbon(join,bx),high,.30);
slab('corridor-ceiling',ribbon(join,bx,1.3),high+2.71,.12,2,'ceiling');
// The solid wing corridor meets the existing glazed crossing without end caps.
for(const side of [-1,1]){
 const poly=[[join,z(join)+side*1.15],[bx,z(bx)+side*1.15],[bx,z(bx)+side*1.3],[join,z(join)+side*1.3]];
 slab('corridor-wall-'+side,poly,high+2.59,2.89,1,'corridor-wall');
 slab('corridor-kick-'+side,[[join,z(join)+side*1.13],[bx,z(bx)+side*1.13],[bx,z(bx)+side*1.15],[join,z(join)+side*1.15]],high+.14,.14,0,'skirting');
}
// Enter through the existing north end of the passage, beside the retained shop.
// The gallery supplies its own floor; the jog avoids even a coplanar overlap.
const galleryNorth=Math.max(...l.panels.find(p=>p.id==='k019-west-2f-gallery').vertices.map(v=>v.z));
const entryPoly=[[-69,-13.5],[-56.6,-13.5],[-56.6,galleryNorth],[-54,galleryNorth],[-54,-13.5],[lower,-13.5],[lower,entryNorth],[-69,entryNorth]];
slab('entry-floor',entryPoly,low,.3);
slab('entry-ceiling',rect(-69,lower,-13.5,entryNorth),low+2.71,.12,2,'ceiling');
for(let i=0;i<count;i++){
 const a=lower+i*.3,b=a+.3,y=low+(i+1)*rise;slab('step-'+i,rect(a,b,stairZ-1.15,stairZ+1.15),y,.32);
}
const roof=[[lower,low+2.71,-stairZ+1.3],[upper,high+2.71,-stairZ+1.3],[upper,high+2.71,-stairZ-1.3],[lower,low+2.71,-stairZ-1.3]];
c.slab('gate-west-access-stair-ceiling',roof,[],.12,2,'ceiling');
for(const side of [-1,1]){
 const a=P(lower,low+.98,stairZ+side*1.03),b=P(upper,high+.98,stairZ+side*1.03);c.beam('gate-west-access-stair-rail-'+side,a,b,.045,.045,3,'handrail');
 for(let i=0;i<=4;i++){const t=i/4,x=lower+(upper-lower)*t,y=low+(high-low)*t;c.beam(`gate-west-access-stair-post-${side}-${i}`,P(x,y,stairZ+side*1.03),P(x,y+.98,stairZ+side*1.03),.04,.04,3,'handrail');}
 // Enclose the stair sides with constant-depth sloped wall strips.
 const lo=stairZ+side*1.15,hi=stairZ+side*1.15,th=.15*side;
 c.slab('gate-west-access-stair-wall-'+side,[P(lower,low+2.59,lo),P(upper,high+2.59,hi),P(upper,high+2.59,hi+th),P(lower,low+2.59,lo+th)],[],2.89,1,'stair-wall');
}
// The public passage and shop gallery remain open along the south edge.
slab('entry-north-wall',rect(-69,lower,entryNorth,entryNorth+.15),low+2.59,2.89,1,'entry-wall');
slab('entry-west-wall',rect(-69.15,-69,-13.5,entryNorth+.15),low+2.59,2.89,1,'entry-wall');
slab('entry-south-wall',rect(-54,lower,-13.65,-13.5),low+2.59,2.89,1,'entry-wall');
slab('entry-east-return',rect(lower-.15,lower,-13.5,stairZ-1.15),low+2.59,2.89,1,'entry-wall');
// A full landing turns from the stair to the oblique bridge corridor.
const south=z(join)-1.15,north=stairZ+1.15;
slab('upper-landing',rect(upper,join,south,north),high,.3);
slab('upper-ceiling',rect(upper,join,south-.15,north+.15),high+2.71,.12,2,'ceiling');
slab('upper-north-wall',rect(upper,join,north,north+.15),high+2.59,2.89,1,'landing-wall');
slab('upper-south-wall',rect(upper,join,south-.15,south),high+2.59,2.89,1,'landing-wall');
slab('upper-west-return',rect(upper-.15,upper,south,stairZ-1.15),high+2.59,2.89,1,'landing-wall');
slab('upper-east-return',rect(join,join+.15,z(join)+1.15,north),high+2.59,2.89,1,'landing-wall');
const lights=[];
for(const [i,x]of [-63,-57,-52,-47.8,-44.7,-40,-34,-28,-22,-16,-10].entries()){
 const y=x<lower?low:x<upper?low+(high-low)*(x-lower)/(upper-lower):high,n=x<=upper?stairZ:x<join?(stairZ+z(join))/2:z(x);
 slab('fixture-'+i,rect(x-.15,x+.15,n-.68,n+.68),y+2.585,.025,4,'ceiling-fixture');c.panels.at(-1).collision=false;
 lights.push({id:'gate-west-access-light-'+i,position:{x,y:y+2.53,z:n},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.78,b:.52},intensity:9,range:7,spotAngle:120,innerSpotAngle:70,source:'Fitted corridor ceiling fixture',note:'Provisional fixture positions; uses the existing two-light pool.'});
}
for(const p of c.panels)p.material=/handrail/.test(p.role)?'steel':'stone';
const route=[{x:-63,y:low,z:-17},{x:-63,y:low,z:stairZ},{x:-57,y:low,z:stairZ},{x:lower-.5,y:low,z:stairZ},{x:lower,y:low,z:stairZ},{x:upper,y:high,z:stairZ},{x:-44.7,y:high,z:stairZ},{x:-44.7,y:high,z:z(join)},{x:join,y:high,z:z(join)},...[-40,-34,-28,-22,-16,-10,-5,0,5].map(x=>({x,y:high,z:z(x)}))];
const report=await c.save(out,'gate-west-access.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,scope:'Connect the western Central Gate bridge end to the north–south passage through a vestibule beside the retained shop, a stair and a level-changing corridor.',geometry:{route,low,high,bridgeWestX:bx,stairs:{lowerX:lower,upperX:upper,count,rise,going:.3},corridorWidth:width,galleryRoute:[{x:-63,y:low,z:-17},{x:-63,y:low,z:stairZ},{x:-55.3,y:low,z:stairZ},{x:-55.3,y:low,z:-18},{x:-53,y:low,z:-18}]},references:['research/kyoto-station/maps/granvia-m3f-map.jpg','research/kyoto-station/photos/granvia-bridge-entry.jpg'],limits:['The operator map establishes connectivity. Corridor length, wall positions, finishes and stair dimensions are fitted to current station geometry and remain provisional.','The eastern bridge connection and railway scene remain unfinished.']});
const path=out+'/native-panels.json',native=JSON.parse(await readFile(path));native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(path,bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length,bridgeWestX:bx,high,rise}));
