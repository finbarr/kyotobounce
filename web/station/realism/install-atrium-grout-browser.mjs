// Replace the selected object's visible fragments; preserve other encoded data.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,candidatePath]=process.argv.slice(2),out=candidatePath.replace(/\/assets.json$/,'');assert(out.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),candidate=await read(candidatePath),old=readGLB(await readFile(out+'/old-browser/atrium.glb')),next=readGLB(await readFile(out+'/browser/atrium.glb'));
const sourceProof=await read(out+'/source-proof.json'),exportProof=await read(out+'/browser/atrium-export.json');assert.equal(sourceProof.sourceSha256,exportProof.sourceSha256);assert.equal(exportProof.layoutSha256,candidate.layoutSha256);assert.equal(exportProof.sourceObjects,1);
const input=await readFile(base.geometry);assert.equal(sha(input),base.geometrySha256);const {json:j,bin}=readGLB(input);await MeshoptDecoder.ready;
function values(g,ai){const a=g.json.accessors[ai],v=g.json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let b=g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,g.bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>{const off=(a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const key=ps=>ps.map(p=>p.map(n=>Math.round(n*1e5)).join(',')).sort().join('|'),targets=new Map(),labels=new Set();
for(const n of old.json.nodes)assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
for(const m of old.json.meshes)for(const p of m.primitives){const label=old.json.materials[p.material].name;labels.add(label);const ps=values(old,p.attributes.POSITION),ix=values(old,p.indices).flat();for(let i=0;i<ix.length;i+=3){const vs=ix.slice(i,i+3).map(i=>ps[i]);targets.set(label+'|'+key(vs),{vs,center:[0,1,2].map(k=>vs.reduce((n,v)=>n+v[k],0)/3)});}}
const expected=targets.size,parts=[bin],changes=[],unmatched=[],kept=new Map();let offset=bin.length,removed=0;
function append(array,width,integer=false){const typed=integer?new Uint32Array(array):new Float32Array(array),b=Buffer.from(typed.buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:integer?34963:34962});parts.push(b);offset+=b.length;const a={bufferView:view,componentType:integer?5125:5126,count:array.length/width,type:{1:'SCALAR',2:'VEC2',3:'VEC3'}[width]};if(width===3&&!integer){a.min=[0,1,2].map(k=>Math.min(...array.filter((_,i)=>i%3===k)));a.max=[0,1,2].map(k=>Math.max(...array.filter((_,i)=>i%3===k)));}j.accessors.push(a);return j.accessors.length-1;}
for(const [mi,m]of j.meshes.entries())for(const p of m.primitives){const label=j.materials[p.material].name;if(!labels.has(label))continue;for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);const vs=values({json:j,bin},p.attributes.POSITION),ix=values({json:j,bin},p.indices).flat(),keep=[];let count=0;
 for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3),ps=ids.map(i=>vs[i]);let k=label+'|'+key(ps);if(!targets.has(k)){const center=[0,1,2].map(k=>ps.reduce((n,p)=>n+p[k],0)/3);for(const [candidate,t]of targets)if(candidate.startsWith(label+'|')&&t.center.every((v,i)=>Math.abs(v-center[i])<2e-5)&&t.vs.every(p=>ps.some(q=>p.every((v,i)=>Math.abs(v-q[i])<2e-5)))){k=candidate;break;}}if(!targets.has(k)){unmatched.push({mesh:mi,at:i,ids,ps});keep.push(...ids);continue;}targets.delete(k);count++;removed++;}
 if(count){changes.push({mesh:mi,removedTriangles:count});kept.set(p,keep);}
}
let fragmentProof=null;
if(targets.size){
 const raw=JSON.stringify({missing:[...targets],unmatched});await writeFile(out+'/unmatched-visible.json',raw);
 fragmentProof=await read(out+'/fragment-proof.json');assert.equal(fragmentProof.inputSha256,sha(raw),'Validate the changed triangulation with verify-atrium-floor-fragments.py');
 const selected=new Set(fragmentProof.selected.map(r=>r.mesh+'|'+key(r.ps)));let matched=0;
 for(const [mi,m]of j.meshes.entries())for(const p of m.primitives){if(!labels.has(j.materials[p.material].name))continue;const ps=values({json:j,bin},p.attributes.POSITION),ix=kept.get(p)||values({json:j,bin},p.indices).flat(),keep=[];for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3);if(selected.has(mi+'|'+key(ids.map(i=>ps[i]))))matched++;else keep.push(...ids);}if(keep.length!==ix.length)kept.set(p,keep);}
 assert.equal(matched,selected.size);removed+=matched;
}else assert.equal(removed,expected);
for(const [p,keep]of kept){if(keep.length)p.indices=append(keep,1,true);else p.removedFloor=true;}
const meshMap=new Map();j.meshes=j.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!p.removedFloor);if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
for(const n of j.nodes)if(n.mesh!==undefined){if(meshMap.has(n.mesh))n.mesh=meshMap.get(n.mesh);else delete n.mesh;}
for(const n of next.json.nodes)assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
for(const m of next.json.meshes){const primitives=[];for(const p of m.primitives){const material=next.json.materials[p.material];let materialIndex=j.materials.findIndex(m=>m.name===material.name);if(materialIndex<0){assert.equal(material.name,'Atrium flush stone grout | Browser');assert(!material.normalTexture&&!material.pbrMetallicRoughness?.baseColorTexture);materialIndex=j.materials.length;j.materials.push(material);}const attributes={};for(const [name,ai]of Object.entries(p.attributes)){assert(['POSITION','NORMAL','TEXCOORD_0'].includes(name));const vs=values(next,ai);attributes[name]=append(vs.flat(),vs[0].length);}primitives.push({attributes,indices:append(values(next,p.indices).flat(),1,true),material:materialIndex});}
 j.meshes.push({name:m.name,primitives});j.nodes.push({name:m.name+' | floor repair',mesh:j.meshes.length-1});j.scenes[j.scene||0].nodes.push(j.nodes.length-1);
}
j.buffers[0].byteLength=offset;const output=writeGLB(j,Buffer.concat(parts));assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));
candidate.geometry=out+'/atrium.runtime.glb';candidate.geometrySha256=sha(output);await writeFile(candidate.geometry,output);await writeFile(candidatePath,JSON.stringify(candidate,null,2)+'\n');
const proof={fragmentProof:fragmentProof&&{...fragmentProof,selected:undefined},removedTriangles:removed,newTriangles:exportProof.triangles,changes,retainedBufferBytesExact:true,sourceSha256:sourceProof.sourceSha256,layoutSha256:candidate.layoutSha256,geometrySha256:candidate.geometrySha256};await writeFile(out+'/browser-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
