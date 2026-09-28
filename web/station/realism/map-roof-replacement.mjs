// Map selected municipal roof faces to triangles in the clipped frontage.
// This only writes a diagnostic construction manifest. It never removes geometry.
// Partial projected overlaps are unresolved and deliberately fail the readiness check.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const[sourcePath,layoutPath,registrationPath,out]=process.argv.slice(2);
assert(sourcePath&&layoutPath&&registrationPath&&out);assert(resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sourceBytes=await readFile(sourcePath),layoutBytes=await readFile(layoutPath),registrationBytes=await readFile(registrationPath),hash=b=>createHash('sha256').update(b).digest('hex'),layout=JSON.parse(layoutBytes),registration=JSON.parse(registrationBytes);assert.equal(hash(sourceBytes),registration.source.sha256);
const{json:j,bin}=readGLB(sourceBytes),node=j.nodes.find(n=>n.name===registration.source.object);assert(node&&!node.matrix&&!node.rotation&&!node.translation&&!node.scale);assert.equal(j.meshes[node.mesh].primitives.length,1);const primitive=j.meshes[node.mesh].primitives[0];
function readAccessor(index){const a=j.accessors[index],v=j.bufferViews[a.bufferView],n=a.type==='VEC3'?3:1,size=a.componentType===5123?2:4;assert([5123,5125,5126].includes(a.componentType));return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+k*size;return a.componentType===5126?bin.readFloatLE(at):size===2?bin.readUInt16LE(at):bin.readUInt32LE(at);}));}
const vertices=readAccessor(primitive.attributes.POSITION).map(p=>[p[0],p[1],-p[2]]),indices=readAccessor(primitive.indices).flat();
const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a),area=ps=>length(cross(sub(ps[1],ps[0]),sub(ps[2],ps[0])))/2;
const faces=registration.faceIds.map(id=>{const ps=indices.slice(id*3,id*3+3).map(i=>vertices[i]),ab=sub(ps[1],ps[0]),ac=sub(ps[2],ps[0]),n=cross(ab,ac),len=length(n);assert(len>1e-9);return{id,points:ps,ab,ac,normal:n.map(v=>v/len),aa:dot(ab,ab),bb:dot(ac,ac),cc:dot(ab,ac),bounds:[0,1,2].map(k=>[Math.min(...ps.map(p=>p[k])),Math.max(...ps.map(p=>p[k]))])};});
// The source n-gons are non-planar by several mm; clipping changes diagonals.
// This bound is below the 24 mm glazing thickness and keeps other layers distinct.
const planeToleranceM=.006;let maxAcceptedSeparationM=0;
function overlap(nativePoints,face){
 if(face.bounds.some(([lo,hi],k)=>Math.max(...nativePoints.map(p=>p[k]))<lo-1e-4||Math.min(...nativePoints.map(p=>p[k]))>hi+1e-4))return 0;
 const raw=cross(sub(nativePoints[1],nativePoints[0]),sub(nativePoints[2],nativePoints[0])),len=length(raw);if(len<1e-10)return 0;const normal=raw.map(v=>v/len);
 const drop=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),axes=[0,1,2].filter(k=>k!==drop),project=p=>axes.map(k=>p[k]),cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
 let poly=nativePoints.map(project);const clip=face.points.map(project),orientation=Math.sign(cross2(sub(clip[1],clip[0]),sub(clip[2],clip[0])));
 for(let k=0;k<3&&poly.length;k++){
  const a=clip[k],b=clip[(k+1)%3],edge=sub(b,a),side=p=>cross2(edge,sub(p,a))*orientation,next=[];
  for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length],sc=side(c),sd=side(d),inside=sc>=-1e-9;if(inside)next.push(c);if(inside!==(sd>=-1e-9)){const t=sc/(sc-sd);next.push(c.map((v,j)=>v+(d[j]-v)*t));}}
  poly=next;
 }
 // Test only the overlapping polygon. A long native triangle can cross several
 // slightly non-planar source facets after clipping changes its diagonal.
 if(Math.abs(face.normal[drop])<.1)return 0;
 let separation=0;for(const p of poly){const lift=(n,origin)=>(dot(n,origin)-n[axes[0]]*p[0]-n[axes[1]]*p[1])/n[drop];separation=Math.max(separation,Math.abs(lift(normal,nativePoints[0])-lift(face.normal,face.points[0])));if(separation>planeToleranceM)return 0;}maxAcceptedSeparationM=Math.max(maxAcceptedSeparationM,separation);
 let signed=0;for(let i=1;i+1<poly.length;i++)signed+=cross2(sub(poly[i],poly[0]),sub(poly[i+1],poly[0]));return Math.abs(signed)/2/Math.abs(normal[drop]);
}
const target='municipal-station-frontage-east-'+registration.source.object,panel=layout.panels.find(p=>p.id===target);assert(panel);const removal=[],partial=[];
for(let i=0;i<panel.triangles.length;i+=3){
 const ps=panel.triangles.slice(i,i+3).map(k=>panel.vertices[k]).map(p=>[p.x,p.y,p.z]),triangleArea=area(ps);if(triangleArea<1e-10)continue;
 const matches=faces.map(f=>({sourceFace:f.id,intersectionAreaM2:overlap(ps,f)})).filter(x=>x.intersectionAreaM2>1e-9),covered=matches.reduce((s,r)=>s+r.intersectionAreaM2,0);
 if(covered<=1e-8)continue;const fraction=covered/triangleArea;
 const record={triangleIndex:i/3,sourceFaces:matches,areaM2:triangleArea,coveredAreaM2:covered,coverageFraction:fraction,vertices:ps};
 if(Math.abs(fraction-1)<.0001)removal.push(record);else partial.push(record);
}
const clipNorth=layout.architecture.municipalStationFrontage.clipZones.northYMin;assert.equal(clipNorth,18);
function clip(points){const ps=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],inside=a[2]>=clipNorth;if(inside)ps.push(a);if(inside!==(b[2]>=clipNorth)){const t=(clipNorth-a[2])/(b[2]-a[2]);ps.push(a.map((v,k)=>v+(b[k]-v)*t));}}return ps;}
const sourceAreas=faces.map(f=>{const ps=clip(f.points);let total=0;for(let i=1;i+1<ps.length;i++)total+=area([ps[0],ps[i],ps[i+1]]);return{sourceFace:f.id,clippedAreaM2:total};}),expectedAreaM2=sourceAreas.reduce((s,r)=>s+r.clippedAreaM2,0),removedAreaM2=removal.reduce((s,r)=>s+r.areaM2,0),areaDifferenceM2=removedAreaM2-expectedAreaM2;
const report={sourceSha256:hash(sourceBytes),inputLayoutSha256:hash(layoutBytes),registrationSha256:hash(registrationBytes),panel:target,northClipM:clipNorth,sourceAreas,removal,planeToleranceM,maxAcceptedSeparationM,partial,summary:{triangles:removal.length,partialTriangles:partial.length,expectedAreaM2,removedAreaM2,areaDifferenceM2},readyForApplication:partial.length===0,status:'Diagnostic mask only. Source quads are retriangulated during clipping, with measured surface differences up to 5 mm. Partial triangles require splitting or reconstruction from pre-triangulated source faces. Do not apply this mask directly; retain adjacent source attachments.'};await writeFile(out+'/replacement-map.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));assert(Math.abs(areaDifferenceM2)<.005,'Roof mask must account for the complete clipped source area without broad removal');

assert.equal(partial.length,0,'Replacement mask is incomplete: partial triangles need splitting or source-first reconstruction');
