// Remove exact floor, wall and junction surfaces for the eastern underground route.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});await MeshoptDecoder.ready;
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),glb=await readFile(m.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(glb),m.geometrySha256);
const spec=await read(specPath);assert.equal(spec.parentLayoutSha256,m.layoutSha256);const ids=spec.retiredIds;
const removed=l.panels.filter(p=>ids.includes(p.id));assert.equal(removed.length,ids.length);
const key=(vs)=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|'),targets=new Map(),hits={};
for(const p of removed){const label=l.authoredMaterials.find(m=>m.id===p.appearance).label;for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(k=>{const v=p.vertices[k];return[v.x,v.y,-v.z];}));const rows=targets.get(k)||[];rows.push(p.id);targets.set(k,rows);}hits[p.id]=0;}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const stride=v.byteStride||w*bytes;return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>{const off=(a.byteOffset||0)+i*stride+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const parts=[bin];let offset=bin.length,count=0;
for(const [mi,mesh]of j.meshes.entries())for(const p of mesh.primitives){const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!removed.some(p=>l.authoredMaterials.find(m=>m.id===p.appearance).label===label))continue;for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const vs=values(p.attributes.POSITION),indices=values(p.indices).flat(),keep=[];let changed=0;for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),k=label+'|'+key(tri.map(i=>vs[i])),rows=targets.get(k),id=rows?.shift();if(id){hits[id]++;count++;changed++;if(!rows.length)targets.delete(k);}else keep.push(...tri);}if(!changed)continue;if(!keep.length){p.removeForTransfer=true;continue;}const b=Buffer.from(new Uint32Array(keep).buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34963});parts.push(b);offset+=b.length;p.indices=j.accessors.length;j.accessors.push({bufferView:view,componentType:5125,count:keep.length,type:'SCALAR'});
}
for(const mesh of j.meshes)mesh.primitives=mesh.primitives.filter(p=>!p.removeForTransfer);
const meshMap=new Map(),nodeMap=new Map();j.meshes=j.meshes.filter((m,i)=>{if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children);return false;}nodeMap.set(i,nodeMap.size);return true;});
for(const n of j.nodes){if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));}
for(const s of j.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
assert.equal(targets.size,0,'Every retired triangle must exist in the browser');assert.equal(count,removed.reduce((n,p)=>n+p.triangles.length/3,0));j.buffers[0].byteLength=offset;l.panels=l.panels.filter(p=>!ids.includes(p.id));l.authoredLights=l.authoredLights.filter(r=>!spec.retiredLights.includes(r.id));
const bytes=JSON.stringify(l)+'\n',output=writeGLB(j,Buffer.concat(parts)),station=await read(m.station);station.layoutSha256=sha(bytes);station.authoredLights=l.authoredLights;assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(bytes),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};
await writeFile(next.layout,bytes);await writeFile(next.geometry,output);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/removal.json',JSON.stringify({parent:m,removedIds:ids,removedLights:spec.retiredLights,removedTriangles:count,coverage:hits,retainedBufferBytesExact:true},null,2)+'\n');console.log({removedPanels:removed.length,removedTriangles:count});
