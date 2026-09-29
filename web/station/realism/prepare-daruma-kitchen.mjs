// Replace the provisional counter fittings and maple palette using the Kyoto opening photograph.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await readFile(p)),base=await read(manifest),raw=await readFile(base.layout),layout=JSON.parse(raw),bytes=await readFile(base.geometry),{json:j,bin}=readGLB(bytes),station=await read(base.station);
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(bytes),base.geometrySha256);
const removed=layout.panels.filter(p=>/^daruma-(utensil-holder|chopstick|condiment)-/.test(p.id));assert.equal(removed.length,30);
const labels=new Map(layout.authoredMaterials.map(m=>[m.id,m.label]));
const key=vs=>vs.map(v=>v.map(n=>Math.round(n*1e5)).join(',')).sort().join('|'),wanted=new Set();
for(const p of removed)for(let t=0;t<p.triangles.length;t+=3)wanted.add(labels.get(p.appearance)+'|'+key(p.triangles.slice(t,t+3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];})));
const count=wanted.size;assert.equal(count,removed.reduce((n,p)=>n+p.triangles.length/3,0));
const parts=[bin];let offset=bin.length,hits=0;
for(const mesh of j.meshes)for(const p of mesh.primitives){
 const label=j.materials[p.material].name;if(!removed.some(p=>labels.get(p.appearance)===label))continue;
 const pos=j.accessors[p.attributes.POSITION],pv=j.bufferViews[pos.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView];assert(!pv.extensions&&!iv.extensions&&pos.componentType===5126&&ix.componentType===5125);
 const keep=[];for(let t=0;t<ix.count;t+=3){const indices=[0,1,2].map(k=>bin.readUInt32LE((iv.byteOffset||0)+(ix.byteOffset||0)+(t+k)*4)),id=label+'|'+key(indices.map(i=>[0,1,2].map(k=>bin.readFloatLE((pv.byteOffset||0)+(pos.byteOffset||0)+i*12+k*4))));if(wanted.delete(id))hits++;else keep.push(...indices);}
 if(keep.length===ix.count)continue;assert(keep.length);const data=Buffer.from(new Uint32Array(keep).buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34963});parts.push(data);offset+=data.length;p.indices=j.accessors.length;j.accessors.push({bufferView:view,componentType:5125,count:keep.length,type:'SCALAR'});
}
assert.equal(wanted.size,0);assert.equal(hits,count);layout.panels=layout.panels.filter(p=>!removed.includes(p));
const mi=j.materials.findIndex(m=>m.name==='Daruma | counter maple');assert(mi>=0);const material=j.materials[mi];material.name='Daruma | cream counter';material.pbrMetallicRoughness={baseColorFactor:[.72,.65,.47,1],roughnessFactor:.5,metallicFactor:0};delete material.normalTexture;
const native=layout.authoredMaterials.find(m=>m.label==='Daruma | counter maple');native.label=material.name;native.linearColor={r:.72,g:.65,b:.47,a:1};native.roughness=.5;for(const k of ['albedo','normal','mask'])delete native[k];
j.buffers[0].byteLength=offset;const result=writeGLB(j,Buffer.concat(parts)),text=JSON.stringify(layout)+'\n';station.layoutSha256=sha(text);station.authoredMaterials=layout.authoredMaterials;
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',result);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(text),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(result),station:out+'/station.json'};await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
const report={parent:base,removedIds:removed.map(p=>p.id),removedTriangles:hits,updatedAppearance:native.id,updatedMaterial:mi,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,inheritedBinaryBytesUnchanged:readGLB(result).bin.subarray(0,bin.length).equals(bin)};assert(report.inheritedBinaryBytesUnchanged);await writeFile(out+'/removal.json',JSON.stringify(report,null,2)+'\n');console.log(report.removedTriangles+' provisional fitting triangles removed; cream counter finish installed');
