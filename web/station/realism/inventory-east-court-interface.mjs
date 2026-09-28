// Inventory the actual installed geometry around the registered eastern court.
// This is a replacement dependency map, not a blanket deletion instruction.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [layoutPath,assemblyDir,courtDir,out]=process.argv.slice(2);
assert(layoutPath&&assemblyDir&&courtDir&&out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [lb,nb,cb,rb]=await Promise.all([readFile(layoutPath),readFile(assemblyDir+'/native-panels.json'),readFile(courtDir+'/report.json'),readFile(assemblyDir+'/routes.json')]);
const layout=JSON.parse(lb),native=JSON.parse(nb),court=JSON.parse(cb),routes=JSON.parse(rb);
const assembly=JSON.parse(await readFile(assemblyDir+'/report.json'));
assert.equal(sha(nb),assembly.outputs.nativePanelsSha256);
assert.equal(routes.assemblyGlbSha256,assembly.outputs.glbSha256);
const O=new T.Vector3(...court.geometry.originRenderer),D=new T.Vector3(...court.geometry.forwardRenderer),A=new T.Vector3(...court.geometry.southRenderer);
const point=v=>new T.Vector3(v.x,v.y,-v.z),local=p=>{const q=p.clone().sub(O);return[q.dot(D),p.y,q.dot(A)];};
const courtBounds=new T.Box3().setFromPoints(court.geometry.sourceOuterRenderer.map(p=>new T.Vector3(...p)));
courtBounds.min.y=court.geometry.arrivalY-.6;courtBounds.max.y=60.1;
function vertices(kind,q){
 if(kind==='panels')return q.vertices.map(point);
 if(kind==='boxes'){
  const C=point(q.center),R=new T.Matrix4().makeRotationY(-(q.yaw||0)*Math.PI/180),vs=[];
  for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])vs.push(new T.Vector3(x*q.size.x,y*q.size.y,z*q.size.z).applyMatrix4(R).add(C));return vs;
 }
 if(kind==='beams'){const radius=Math.max(q.radius||0,(q.width||0)/2,(q.depth||q.height||0)/2,.025);return [point(q.a).addScalar(-radius),point(q.a).addScalar(radius),point(q.b).addScalar(-radius),point(q.b).addScalar(radius)];}
 if(kind==='flights')return q.contours.flatMap((c,i)=>c.points.flatMap(p=>[new T.Vector3(p.x,q.baseElevation+i*q.rise,-p.y),new T.Vector3(p.x,q.baseElevation-(q.foundationDepth||0),-p.y)]));
 return [];
}
const directIds=new Set(['east-square','east-court-garden-floor','east-court-garden-ramp','east-court-restaurant-platform','east-court-north-stair',...Array.from({length:5},(_,i)=>'east-court-restaurant-stair-'+(i+1))]);
const currentCourt=layout.architecture.courtAssemblyUpdates?.at(-1)||layout.architecture.eastCourtContext;
const installedIds=new Set(currentCourt?.assemblyNativeSha256===sha(nb)?native.panels.map(p=>p.id):[]);
const classify=id=>installedIds.has(id)?'registered-replacement':id.startsWith('municipal-')?'source-interface':directIds.has(id)?'floor-and-stairs':/^(east-restaurant-|east-court-flared-column)/.test(id)?'old-cafe':/^(k027-|k029-|add-eastsquare-)/.test(id)?'landmark-needs-registration':/^east-court-end-/.test(id)?'old-hotel-court-facade':/^east-skyway-/.test(id)?'old-upper-escalators':/^east-court-lower-|^east-lower-stair-/.test(id)?'lower-access-needs-replacement':/^east-court-/.test(id)?'court-detail-needs-review':'adjacent-retain-until-evidenced';
const records=[];
for(const kind of ['panels','boxes','beams','flights'])for(const [index,q]of layout[kind].entries()){
 const vs=vertices(kind,q);if(!vs.length)continue;const bounds=new T.Box3().setFromPoints(vs);if(!courtBounds.intersectsBox(bounds))continue;
 const uv=vs.map(local),row={kind,index,id:q.id,category:classify(q.id),recordSha256:sha(JSON.stringify(q)),role:q.role||null,collision:q.collision!==false,boundsRenderer:[bounds.min.toArray(),bounds.max.toArray()],boundsCourt:[0,1,2].map(k=>[Math.min(...uv.map(p=>p[k])),Math.max(...uv.map(p=>p[k]))])};
 if(kind==='panels')row.triangles=q.triangles.length/3;
 records.push(row);
}
// Actual installed municipal triangles, not the unclipped original source shell.
const samplePaths=[...routes.routes,...routes.additionalRoutes],samples=[];
for(const path of samplePaths)for(let i=1;i<path.points.length;i++){
 const a=new T.Vector3(...path.points[i-1]),b=new T.Vector3(...path.points[i]),n=Math.ceil(a.distanceTo(b));
 for(let k=0;k<=n;k++){const p=a.clone().lerp(b,k/n);samples.push({route:path.id,point:p.toArray(),box:new T.Box3(p.clone().add(new T.Vector3(-.27,.2,-.27)),p.clone().add(new T.Vector3(.27,2.1,.27))),hits:[]});}
}
const sourceTriangles=[];
for(const r of records.filter(r=>r.kind==='panels'&&r.category==='source-interface')){
 const q=layout.panels[r.index],vs=q.vertices.map(point),bounds=new T.Box3().setFromPoints(vs),near=samples.filter(s=>s.box.intersectsBox(bounds));
 for(let i=0;i<q.triangles.length;i+=3){const tri=new T.Triangle(...q.triangles.slice(i,i+3).map(j=>vs[j]));let used=false;
  for(const s of near)if(s.box.intersectsTriangle(tri)){s.hits.push({id:q.id,face:i/3});used=true;}
  if(used)sourceTriangles.push({id:q.id,face:i/3,points:[tri.a.toArray(),tri.b.toArray(),tri.c.toArray()]});
 }
}
const counts=key=>Object.fromEntries([...new Set(records.map(r=>r[key]))].map(k=>[k,records.filter(r=>r[key]===k).length]));
const report={meaning:'Spatial dependency inventory. Broad-phase record bounds are not proof of overlap or authorization to remove. Sampled municipal triangle/capsule-volume intersections are actual geometric evidence; dynamic/other authored collisions require full runtime checks.',layoutPath,layoutSha256:sha(lb),assemblyNativeSha256:sha(nb),courtReportSha256:sha(cb),routesSha256:sha(rb),regionRenderer:[courtBounds.min.toArray(),courtBounds.max.toArray()],counts:{byKind:counts('kind'),byCategory:counts('category')},records,sourceClearance:{radiusM:.27,bodyAboveFeetM:[.2,2.1],sampleCount:samples.length,obstructedSamples:samples.filter(s=>s.hits.length).length,triangles:sourceTriangles,samples:samples.filter(s=>s.hits.length).map(({box,...s})=>s)},limits:['Old fixtures are at an incompatible floor level. Register or replace each landmark rather than treating all name matches as disposable.','The lower escalator bank, eastern service corridor and southern connection have no complete registered replacements yet.','The source shell is a coarse exterior reference. A photographed facade may require new architectural geometry even if route samples are clear.']};
await writeFile(out+'/inventory.json',JSON.stringify(report,null,2)+'\n');
const colors={'registered-replacement':'#147747','source-interface':'#74858d','floor-and-stairs':'#d65235','old-cafe':'#d99432','landmark-needs-registration':'#816ca5','old-hotel-court-facade':'#be4875','old-upper-escalators':'#166ca0','lower-access-needs-replacement':'#258d64','court-detail-needs-review':'#88764b','adjacent-retain-until-evidenced':'#b8b8b8'};
const S=9,X=70,Y=70,xy=p=>`${X+p[0]*S},${Y+p[2]*S}`;
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 850"><rect width="1050" height="850" fill="#f5f3ed"/><g font-family="sans-serif" fill="#20372e"><text x="30" y="30" font-size="22">East Square: installed objects and registered replacement</text><text x="30" y="53" font-size="13">Top view in court coordinates. Boxes show bounds, not exact footprints. Pale grey: adjacent records.</text></g>';
for(const r of records.filter(r=>r.category!=='source-interface')){const b=r.boundsCourt;svg+=`<rect x="${X+b[0][0]*S}" y="${Y+b[2][0]*S}" width="${Math.max(.5,(b[0][1]-b[0][0])*S)}" height="${Math.max(.5,(b[2][1]-b[2][0])*S)}" fill="${colors[r.category]}" fill-opacity=".11" stroke="${colors[r.category]}" stroke-width=".5"><title>${r.kind}: ${r.id}</title></rect>`;}
for(const loop of [court.geometry.sourceOuterRenderer,...court.geometry.sourceHolesRenderer])svg+=`<polygon points="${loop.map(p=>xy(local(new T.Vector3(...p)))).join(' ')}" fill="none" stroke="#17392e" stroke-width="3"/>`;
for(const path of samplePaths)svg+=`<polyline points="${path.points.map(p=>xy(local(new T.Vector3(...p)))).join(' ')}" fill="none" stroke="#0a885e" stroke-width="1.3"/>`;
for(const [i,[category,color]]of Object.entries(colors).entries())svg+=`<rect x="660" y="${95+i*25}" width="14" height="14" fill="${color}"/><text x="682" y="${107+i*25}" font-family="sans-serif" font-size="12">${category}</text>`;
svg+='</svg>';await writeFile(out+'/inventory.svg',svg);
console.log(JSON.stringify({records:records.length,...report.counts,municipalSampleCount:samples.length,municipalObstructedSamples:report.sourceClearance.obstructedSamples,municipalIntersectingTriangles:sourceTriangles.length}));
