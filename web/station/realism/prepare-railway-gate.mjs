// Retire the JR West gate obstructions using its authored face polygons.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {MeshoptDecoder} from 'meshoptimizer';import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,sourcePath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});await MeshoptDecoder.ready;const sha=b=>createHash('sha256').update(b).digest('hex'),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),glb=await readFile(base.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(glb),base.geometrySha256);
const source=JSON.parse(await readFile(sourcePath));assert(source.length===2);
const removed={boxes:layout.boxes.filter(p=>['add-west-gate-back','add-west-gate-closed-flap-2'].includes(p.id)),panels:layout.panels.filter(p=>['add-west-gate-back','add-west-gate-closed-flap-2'].includes(p.id))};assert.equal(removed.boxes.length,2);assert.equal(removed.panels.length,0);
const sourceVertices=source.flatMap(o=>o.vertices),volume=[0,1,2].map(a=>[Math.min(...sourceVertices.map(v=>v[a])),Math.max(...sourceVertices.map(v=>v[a]))]);
const surfaces=[];
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const o of source)for(const f of o.faces){const points=f.vertices.map(i=>o.vertices[i]);let normal=cross(sub(points[1],points[0]),sub(points[2],points[0])),length=Math.hypot(...normal);assert(length>1e-9);normal=normal.map(v=>v/length);const center=points[0].map((_,a)=>points.reduce((n,v)=>n+v[a],0)/points.length);const edges=points.map((v,i)=>{const n=cross(sub(points[(i+1)%points.length],v),normal),sign=Math.sign(dot(sub(center,v),n));return{v,n,sign};});assert(edges.every(e=>e.sign));surfaces.push({id:o.name,label:o.materials[f.material]+' | Browser',points,normal,edges,count:0});}
function faceOf(s,vs){return vs.every(v=>Math.abs(dot(sub(v,s.points[0]),s.normal))<.00015&&s.edges.every(e=>e.sign*dot(sub(v,e.v),e.n)>-.00015));}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,width=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const stride=v.byteStride||width*bytes;return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>{const off=(a.byteOffset||0)+i*stride+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const pieces=[bin];let offset=bin.length;const hits=[],retiredPrimitives=new Set();
for(const [mi,m]of j.meshes.entries())for(const p of m.primitives){const label=j.materials[p.material]?.name;const targets=surfaces.filter(s=>s.label===label);if(!targets.length)continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const pos=values(p.attributes.POSITION),indices=values(p.indices).flat(),keep=[];let count=0;
 for(let k=0;k<indices.length;k+=3){const tri=indices.slice(k,k+3),vs=tri.map(i=>pos[i]);
  // Select only fragments on the two exact authored gate solids.
  const inVolume=vs.every(v=>v.every((n,a)=>n>=volume[a][0]-.00015&&n<=volume[a][1]+.00015));
  if(!inVolume){keep.push(...tri);continue;}
  const target=targets.find(s=>faceOf(s,vs));if(!target){keep.push(...tri);continue;}hits.push(target.id);target.count++;count++;
 }
 if(!count)continue;if(!keep.length){retiredPrimitives.add(p);continue;}const array=new Uint32Array(keep),b=Buffer.from(array.buffer),vi=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34963});pieces.push(b);offset+=b.length;p.indices=j.accessors.length;j.accessors.push({bufferView:vi,componentType:5125,count:keep.length,type:'SCALAR'});
}
// Drop empty batches and remap their nodes; keep all retained buffer bytes.
assert(!j.skins&&!j.animations);
const meshMap=new Map();j.meshes=j.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!retiredPrimitives.has(p));if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
const nodeMap=new Map();j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children?.length);return false;}nodeMap.set(i,nodeMap.size);if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);return true;});
for(const n of j.nodes)if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));for(const s of j.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
const coverage={};for(const o of source){const count=surfaces.filter(s=>s.id===o.name).reduce((n,s)=>n+s.count,0);assert(count>0,'Missing retired mesh '+o.name);coverage[o.name]=count;}
j.buffers[0].byteLength=offset;
for(const key of ['boxes','panels'])layout[key]=layout[key].filter(p=>!['add-west-gate-back','add-west-gate-closed-flap-2'].includes(p.id));const text=JSON.stringify(layout)+'\n',output=writeGLB(j,Buffer.concat(pieces));assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));const station=JSON.parse(await readFile(base.station));station.layoutSha256=sha(text);
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',output);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(text),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/removal.json',JSON.stringify({parent:base,removedIds:Object.values(removed).flat().map(p=>p.id),removedSourceObjects:source.map(o=>o.name),removedTriangles:hits.length,sourceFaceToleranceM:.00015,authoredBounds:volume,coverage,inheritedBufferBytesUnchanged:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256},null,2)+'\n');console.log(JSON.stringify({retired:Object.values(removed).flat().length,triangles:hits.length}));
