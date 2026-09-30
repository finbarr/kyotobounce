// Retire the sealed western stair room and Porta boundary using authored faces.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {MeshoptDecoder} from 'meshoptimizer';import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});await MeshoptDecoder.ready;const sha=b=>createHash('sha256').update(b).digest('hex'),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),glb=await readFile(base.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(glb),base.geometrySha256);
const spec=JSON.parse(await readFile(component+'/spec.json')),source=JSON.parse(await readFile(component+'/retired-source.json'));assert.equal(spec.parentLayoutSha256,base.layoutSha256);assert.equal(source.length,spec.retiredIds.length);
const removed={boxes:layout.boxes.filter(p=>spec.retiredIds.includes(p.id)),panels:layout.panels.filter(p=>spec.retiredIds.includes(p.id))};assert.deepEqual(removed.boxes.map(p=>p.id),spec.retiredBoxIds);assert.equal(removed.boxes.length+removed.panels.length,spec.retiredIds.length-spec.retiredSourceOnlyIds.length);
const sourceVertices=source.flatMap(o=>o.vertices),volume=[0,1,2].map(a=>[Math.min(...sourceVertices.map(v=>v[a])),Math.max(...sourceVertices.map(v=>v[a]))]);
const surfaces=[];
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unrendered=spec.retiredUnrenderedIds||[];assert(!unrendered.length||spec.componentPrefix==='isetan-ground-'&&unrendered.every(id=>id.startsWith('north-escalator-')&&source.find(o=>o.name===id)?.dynamic));
function surface(id,label,points){let normal=cross(sub(points[1],points[0]),sub(points[2],points[0])),length=Math.hypot(...normal);assert(length>1e-9);normal=normal.map(v=>v/length);const center=points[0].map((_,a)=>points.reduce((n,v)=>n+v[a],0)/points.length);const edges=points.map((v,i)=>{const n=cross(sub(points[(i+1)%points.length],v),normal),sign=Math.sign(dot(sub(center,v),n));return{v,n,sign};});assert(edges.every(e=>e.sign));return{id,label,points,normal,edges,count:0,area:points.slice(2).reduce((sum,v,i)=>sum+Math.hypot(...cross(sub(points[i+1],points[0]),sub(v,points[0])))/2,0),matchedArea:0};}
for(const o of source)for(const f of o.faces)surfaces.push(surface(o.name,o.materials[f.material].replace(/ \| Browser$/,''),f.vertices.map(i=>o.vertices[i])));
const protectedSurfaces=(spec.preservedBrowserTriangles||[]).map(s=>surface(s.id,s.label,s.points));
assert(!protectedSurfaces.length||['isetan-seventh-','isetan-eighth-'].includes(spec.componentPrefix));

function faceOf(s,vs){const n=cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]));return dot(n,s.normal)>.999*Math.hypot(...n)&&vs.every(v=>Math.abs(dot(sub(v,s.points[0]),s.normal))<.00015&&s.edges.every(e=>e.sign*dot(sub(v,e.v),e.n)>-.00015));}
const triangleArea=vs=>Math.hypot(...cross(sub(vs[1],vs[0]),sub(vs[2],vs[0])))/2;
// Source and browser exports can use different diagonals on the same slab.
// Accept a browser triangle only when one object's coplanar source faces
// cover its entire area. Never combine faces from unrelated objects.
const residualOverlaps=[];
function coveredByObject(targets,vs,recordResidual=true){
 const n=cross(sub(vs[1],vs[0]),sub(vs[2],vs[0])),groups=new Map();
 for(const s of targets){
  if(dot(n,s.normal)<=.999*Math.hypot(...n)||!vs.every(v=>Math.abs(dot(sub(v,s.points[0]),s.normal))<.00015))continue;
  let poly=vs;
  for(const e of s.edges){
   const kept=[];
   for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=e.sign*dot(sub(a,e.v),e.n),db=e.sign*dot(sub(b,e.v),e.n);
    if(da>=0)kept.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);kept.push(a.map((x,k)=>x+(b[k]-x)*t));}
   }
   poly=kept;
  }
  const area=poly.slice(2).reduce((sum,v,i)=>sum+triangleArea([poly[0],poly[i+1],v]),0);
  if(area>1e-10){const rows=groups.get(s.id)||[];rows.push({s,area});groups.set(s.id,rows);}
 }
 const area=triangleArea(vs);
 const match=[...groups.values()].find(rows=>Math.abs(rows.reduce((n,r)=>n+r.area,0)-area)<Math.max(.00003,area*2e-6)&&(!recordResidual||rows.every(r=>r.s.matchedArea+r.area<=r.s.area+Math.max(.00003,r.s.area*2e-6))));
 if(!match&&recordResidual)for(const [id,rows]of groups){const covered=rows.reduce((n,r)=>n+r.area,0);if(covered>.00003)residualOverlaps.push({id,covered,area,vertices:vs});}
 return match;
}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,width=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const stride=v.byteStride||width*bytes;return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>{const off=(a.byteOffset||0)+i*stride+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const pieces=[bin];let offset=bin.length;const hits=[],retiredFaces=[],retiredPrimitives=new Set();let triangulationFallbacks=0,preservedCoplanarTriangles=0;
for(const [mi,m]of j.meshes.entries())for(const p of m.primitives){const label=j.materials[p.material]?.name.replace(/ \| Browser$/,'');const targets=surfaces.filter(s=>s.label===label);if(!targets.length)continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const pos=values(p.attributes.POSITION),indices=values(p.indices).flat(),keep=[];let count=0;
 for(let k=0;k<indices.length;k+=3){const tri=indices.slice(k,k+3),vs=tri.map(i=>pos[i]);
  // Match exact authored faces inside the retirement volume; keep other meshes.
  const inVolume=vs.every(v=>v.every((n,a)=>n>=volume[a][0]-.00015&&n<=volume[a][1]+.00015));
  if(!inVolume){keep.push(...tri);continue;}
  const protectedTargets=protectedSurfaces.filter(s=>s.label===label);
  if(protectedTargets.some(s=>faceOf(s,vs))||coveredByObject(protectedTargets,vs,false)){keep.push(...tri);preservedCoplanarTriangles++;continue;}
  const target=targets.find(s=>faceOf(s,vs)&&s.matchedArea+triangleArea(vs)<=s.area+Math.max(.00003,s.area*2e-6)),matches=target?[{s:target,area:triangleArea(vs)}]:coveredByObject(targets,vs);
  if(!matches){keep.push(...tri);continue;}if(!target)triangulationFallbacks++;
  hits.push(matches[0].s.id);retiredFaces.push({id:matches[0].s.id,label,vertices:vs});for(const {s,area}of matches){s.count++;s.matchedArea+=area;}count++;
 }
 if(!count)continue;if(!keep.length){retiredPrimitives.add(p);continue;}const array=new Uint32Array(keep),b=Buffer.from(array.buffer),vi=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34963});pieces.push(b);offset+=b.length;p.indices=j.accessors.length;j.accessors.push({bufferView:vi,componentType:5125,count:keep.length,type:'SCALAR'});
}
// Drop empty batches and remap their nodes; keep all retained buffer bytes.
assert(!j.skins&&!j.animations);
const meshMap=new Map();j.meshes=j.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!retiredPrimitives.has(p));if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
const nodeMap=new Map();j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children?.length);return false;}nodeMap.set(i,nodeMap.size);if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);return true;});
for(const n of j.nodes)if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));for(const s of j.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
const coverage={};for(const o of source){const count=surfaces.filter(s=>s.id===o.name).reduce((n,s)=>n+s.count,0);assert(unrendered.includes(o.name)?count===0:count>0,'Missing retired mesh '+o.name);coverage[o.name]=count;}
const areaCoverage=source.map(o=>{const faces=surfaces.filter(s=>s.id===o.name),sourceArea=faces.reduce((n,s)=>n+s.area,0),browserArea=faces.reduce((n,s)=>n+s.matchedArea,0);const preservedOverlapArea=spec.preservedOverlapArea?.[o.name]||0;return{id:o.name,sourceArea,preservedOverlapArea,browserArea,error:Math.abs(sourceArea-preservedOverlapArea-browserArea)};});
if(process.argv.includes('--audit'))await writeFile(component+'/retirement-audit.json',JSON.stringify({areaCoverage,retiredFaces,triangulationFallbacks,preservedCoplanarTriangles,residualOverlaps,sourceFaces:surfaces.map(({id,points,area,matchedArea,count})=>({id,points,area,matchedArea,count}))})+'\n');
// Broad floor faces need complete area coverage; a count alone misses triangles
// spanning several source faces. Shared trim/frame faces can be coincident.
for(const row of areaCoverage)if(Object.hasOwn(spec.preservedOverlapArea||{},row.id))assert(row.error<Math.max(.01,row.sourceArea*2e-6),'Incomplete browser retirement '+row.id+': '+row.error+' m²');
if(process.argv.includes('--audit')){console.log(JSON.stringify({pass:true,sourceObjects:source.length,retiredTriangles:hits.length,triangulationFallbacks,preservedCoplanarTriangles,unrendered:Object.fromEntries(unrendered.map(id=>[id,coverage[id]]))}));process.exit(0);}
j.buffers[0].byteLength=offset;
for(const key of ['boxes','panels'])layout[key]=layout[key].filter(p=>!spec.retiredIds.includes(p.id));layout.routes=layout.routes.filter(r=>!spec.retiredRouteIds.includes(r.id));layout.concourseDetails.labels=layout.concourseDetails.labels.filter(r=>!spec.retiredLabelIds.includes(r.id));layout.authoredLights=layout.authoredLights.filter(l=>!(spec.retiredLights||[]).includes(l.id));const text=JSON.stringify(layout)+'\n',output=writeGLB(j,Buffer.concat(pieces));assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));const station=JSON.parse(await readFile(base.station));station.layoutSha256=sha(text);station.concourseDetails=layout.concourseDetails;station.authoredLights=layout.authoredLights;
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',output);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(text),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/removal.json',JSON.stringify({parent:base,removedIds:Object.values(removed).flat().map(p=>p.id),removedSourceObjects:source.map(o=>o.name),removedTriangles:hits.length,sourceFaceToleranceM:.00015,authoredBounds:volume,coverage,areaCoverage,triangulationFallbacks,preservedCoplanarTriangles,inheritedBufferBytesUnchanged:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256},null,2)+'\n');console.log(JSON.stringify({retired:Object.values(removed).flat().length,triangles:hits.length}));
