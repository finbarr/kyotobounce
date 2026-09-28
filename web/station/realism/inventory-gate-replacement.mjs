// Read-only whole-station dependencies for the selected gate facade and bridge assembly.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [layoutPath,specPath,componentDir,catalogPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [lb,sb,nb,cb,rb]=await Promise.all([readFile(layoutPath),readFile(specPath),readFile(componentDir+'/native-panels.json'),readFile(catalogPath),readFile(componentDir+'/report.json')]);
const layout=JSON.parse(lb),s=JSON.parse(sb),component=JSON.parse(nb),catalog=JSON.parse(cb),receipt=JSON.parse(rb);
assert.equal(sha(nb),receipt.outputs.nativePanelsSha256);
assert.equal(sha(await readFile(componentDir+'/'+receipt.outputs.glbFile)),receipt.outputs.glbSha256);
const renderer=p=>new T.Vector3(p.x,p.y,-p.z);
const local=p=>new T.Vector3(p.x,p.y,p.z-s.frame.frontZ-s.frame.slope*p.x);
const fromLocal=p=>new T.Vector3(p.x,p.y,p.z+s.frame.frontZ+s.frame.slope*p.x);
const box=(a,b)=>new T.Box3(new T.Vector3(...a),new T.Vector3(...b));
const bounds=vs=>new T.Box3().setFromPoints(vs),serial=b=>[b.min.toArray(),b.max.toArray()];
const componentBounds=bounds(component.panels.flatMap(p=>p.vertices.map(v=>local(renderer(v)))));
const regions=[
 {id:'component',meaning:'Exact bounds of the uninstalled component, excluding ground floor and upper-bay sample.',box:componentBounds},
 {id:'gate-passage',meaning:'Proposed public opening, from its front to the provisional return depth; excludes floor and ceiling by 0.01 m.',box:box([s.gate.westX+.01,s.context.floorY+.01,.01],[s.gate.eastX-.01,s.gate.headY-.01,s.bay.depthM-.01])},
 {id:'hall-transition',meaning:'Planning envelope spanning the new gate, current facade and paid boundary. Not a deletion boundary.',box:box([-18,-.5,-8],[31,35,40])},
 {id:'upper-interface',meaning:'Planning envelope for the upper wall, canopy bearings and higher circulation.',box:box([-18,28,-8],[31,60,25])},
];
const boxCorners=b=>{const out=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])out.push(new T.Vector3(x,y,z));return out;};
const boxIndices=[0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3];
function shape(kind,q){
 if(kind==='panels')return{vs:q.vertices.map(v=>local(renderer(v))),indices:q.triangles,method:'triangle-surface'};
 if(kind==='boxes'){
  const R=new T.Matrix4().makeRotationY(-(q.yaw||0)*Math.PI/180),C=renderer(q.center),vs=boxCorners(box([-.5*q.size.x,-.5*q.size.y,-.5*q.size.z],[.5*q.size.x,.5*q.size.y,.5*q.size.z])).map(p=>local(p.applyMatrix4(R).add(C)));
  const inverse=R.clone().invert();
  return{vs,indices:boxIndices,method:'oriented-box-solid',contains:p=>{const v=fromLocal(p).sub(C).applyMatrix4(inverse);return ['x','y','z'].every(k=>Math.abs(v[k])<=q.size[k]/2+1e-8);}};
 }
 if(kind==='beams'){
  const r=Math.max(q.radius||0,(q.width||0)/2,(q.depth||q.height||0)/2,.025),vs=[];
  for(const p of [renderer(q.a),renderer(q.b)])for(const v of boxCorners(box([-r,-r,-r],[r,r,r])))vs.push(local(v.add(p)));
  return{vs,method:'conservative-beam-envelope'};
 }
 if(kind==='flights')return{vs:q.contours.flatMap((c,i)=>c.points.flatMap(p=>[local(new T.Vector3(p.x,q.baseElevation+i*q.rise,-p.y)),local(new T.Vector3(p.x,q.baseElevation-(q.foundationDepth||0),-p.y))])),method:'conservative-flight-envelope'};
 if(kind==='escalators'){
  const C=renderer(q.lowerCenter),U=renderer(q.uphill).normalize(),V=new T.Vector3(-U.z,0,U.x),vs=[];
  for(const run of [-(q.flatLength||0),q.run+(q.flatLength||0)])for(const w of [-q.width/2,q.width/2])for(const h of [-1,q.height+2])vs.push(local(C.clone().addScaledVector(U,run).addScaledVector(V,w).add(new T.Vector3(0,h,0))));
  return{vs,method:'conservative-escalator-envelope'};
 }
 if(kind==='authoredLights')return{vs:[local(renderer(q.position))],method:'light-position-only'};
 throw Error(kind);
}
function intersection(g,b){
 if(!bounds(g.vs).intersectsBox(b))return null;
 if(!g.indices)return{method:g.method};
 let n=0,first=[];
 for(let i=0;i<g.indices.length;i+=3)if(b.intersectsTriangle(new T.Triangle(...g.indices.slice(i,i+3).map(j=>g.vs[j])))){n++;if(first.length<12)first.push(i/3);}
 if(n)return{method:g.method,triangleCount:n,firstTriangles:first};
 if(g.contains&&boxCorners(b).some(g.contains))return{method:g.method,containment:true};
 return null;
}
const classify=id=>/^central-hall-/.test(id)?'old-central-hall':/^south-concourse-/.test(id)?'old-hall':/^(central-gate-|add-central-gate-|concourse-ticket-)/.test(id)?'gate-equipment':/^municipal-/.test(id)?'municipal-layer':/^(registered-|canopy-|central-roof-)/.test(id)?'roof-or-registered':id==='concourse'?'shared-concourse':'neighbor';
const records=[],geometries=new Map();
for(const kind of ['panels','boxes','beams','flights','escalators','authoredLights'])for(const [index,q]of layout[kind].entries()){
 const g=shape(kind,q);if(!g.vs.length)continue;const b=bounds(g.vs),near=regions.filter(r=>r.box.intersectsBox(b));if(!near.length)continue;
 const intersections=near.map(r=>{const hit=intersection(g,r.box);return hit?{region:r.id,...hit}:null;}).filter(Boolean);if(!intersections.length)continue;
 const row={key:kind+':'+index,kind,index,id:q.id,category:classify(q.id),role:q.role||null,collision:kind==='authoredLights'?false:q.collision!==false,recordSha256:sha(JSON.stringify(q)),boundsLocal:serial(b),intersections};
 records.push(row);geometries.set(row.key,g);
}
// Conservative component bounds identify review candidates, not Boolean solid overlap.
// The bridge and recessed facade are not axis-aligned boxes. Never assert their
// bounds are their exact geometry or treat this list as an automatic deletion set.
const solids=component.panels.filter(p=>p.collision!==false).map(p=>({id:p.id,box:bounds(p.vertices.map(v=>local(renderer(v))))}));
const contacts=[];
for(const r of records.filter(r=>r.collision&&['panels','boxes'].includes(r.kind))){const g=geometries.get(r.key),b=bounds(g.vs);for(const p of solids){if(!b.intersectsBox(p.box))continue;const hit=intersection(g,p.box);if(hit)contacts.push({existingKey:r.key,existingId:r.id,componentId:p.id,componentTest:'conservative-AABB',...hit});}}
// Segment clipping catches crossings whose endpoints both lie outside a region.
function segmentHit(a,b,region){let lo=0,hi=1;for(const k of ['x','y','z']){const d=b[k]-a[k];if(Math.abs(d)<1e-12){if(a[k]<region.min[k]||a[k]>region.max[k])return null;}else{let u=(region.min[k]-a[k])/d,v=(region.max[k]-a[k])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}}return[lo,hi];}
const routes=[];
for(const [index,r]of layout.routes.entries()){
 const points=r.points.map(p=>local(renderer(p))),segments=[];
 for(let i=1;i<points.length;i++){const hits=regions.flatMap(region=>{const t=segmentHit(points[i-1],points[i],region.box);return t?[{region:region.id,t}]:[];});if(hits.length)segments.push({from:i-1,to:i,hits});}
 if(segments.length)routes.push({index,id:r.id,recordSha256:sha(JSON.stringify(r)),pointsLocal:points.map(p=>p.toArray()),segments});
}
const courseDependencies=[];
for(const c of catalog){
 const features=[{...c.start,feature:'start'},...(c.waypoints||[]).map(p=>({...p,feature:p.id})),...(c.goal?[{...c.goal,feature:'goal'}]:[])];
 const near=features.map(p=>{const v=local(renderer(p.center)),radius=p.radius||0,bb=new T.Box3(v.clone().addScalar(-radius),v.clone().addScalar(radius));return{feature:p.feature,pointLocal:v.toArray(),radiusM:radius,surface:p.surface,regions:regions.filter(r=>r.box.intersectsBox(bb)).map(r=>r.id)};}).filter(p=>p.regions.length);
 const surfaceReferences=features.flatMap(p=>records.filter(r=>r.id===p.surface).map(r=>({feature:p.feature,surface:p.surface,recordKey:r.key,sharedSurfaceOnly:!near.some(n=>n.feature===p.feature)})));
 if(near.length||surfaceReferences.length)courseDependencies.push({id:c.id,revision:c.revision,recordSha256:sha(JSON.stringify(c)),features:near,surfaceReferences});
}
const counts=key=>Object.fromEntries([...new Set(records.map(r=>r[key]))].map(v=>[v,records.filter(r=>r[key]===v).length]));
const report={status:'Read-only integration inventory; component remains uninstalled. Intersections are geometry evidence, not an approved deletion set or runtime test.',inputs:{layout:{path:layoutPath,sha256:sha(lb)},spec:{path:specPath,sha256:sha(sb)},component:{path:componentDir,nativeSha256:sha(nb),glbSha256:receipt.outputs.glbSha256},catalog:{path:catalogPath,sha256:sha(cb)}},coordinates:'Local X=east,Y=up,D=rendererZ-frontZ-slope*X. Metres. Invert native Z once.',frame:s.frame,regions:regions.map(({box,...r})=>({...r,boundsLocal:serial(box)})),counts:{records:records.length,byKind:counts('kind'),byCategory:counts('category'),contacts:contacts.length,contactExistingRecords:new Set(contacts.map(c=>c.existingKey)).size,routes:routes.length,nearbyCourses:courseDependencies.filter(c=>c.features.length).length,sharedSurfaceOnlyCourses:courseDependencies.filter(c=>!c.features.length).length},records,contacts,routes,courseDependencies,limits:['Panel results test triangle surfaces, not containment inside arbitrary closed meshes. Boxes also test solid containment.','Beams, flights and escalators use conservative bounds only. Escalator paths and live step poses require native runtime checks.','Route intersections test nominal foot-point segments, not swept player clearance. Course features use a conservative radius box; they do not represent measured ball trajectories.','Shared concourse references do not imply that every referring course changes. Never delete the whole floor to install a local sample.','Component contact pairs use each new solid AABB and can include empty space around curved or sheared geometry. They require review, not blanket deletion.','No independent noncoplanar camera anchors were added. The component remains provisional.'],toolSha256:sha(await readFile(new URL(import.meta.url)))};
await writeFile(out+'/inventory.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.counts,null,2));
