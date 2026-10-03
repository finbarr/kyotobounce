// Close the exposed floor gaps beneath three closed public-passage doors.
// Existing meshes, materials, hardware and encoded browser buffers stay exact.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {appendJunction} from './append-canopy-junction.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
await access(out+'/assets.json').then(()=>{throw Error('Use a fresh candidate directory; preserve the existing candidate');},e=>{if(e.code!=='ENOENT')throw e;});
const base=await read(basePath),raw=await readFile(base.layout),layout=JSON.parse(raw);assert.equal(sha(raw),base.layoutSha256);
const bytes=await readFile(base.geometry);assert.equal(sha(bytes),base.geometrySha256);
await mkdir(out,{recursive:true});await writeFile(out+'/parent-assets.json',JSON.stringify(base,null,2)+'\n');
const kicks=[0,1,2].map(i=>layout.panels.find(p=>p.id===`east-square-hall-clinic-kick-${i}`));assert(kicks.every(Boolean));
const appearance=kicks[0].appearance,material=layout.authoredMaterials.find(m=>m.id===appearance);assert(material&&!material.albedo&&!material.normal);
assert(kicks.every(p=>p.appearance===appearance));
const c=construction([{name:material.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>material.linearColor[k]),metallicFactor:material.metallic,roughnessFactor:material.roughness}}],{flatNormals:true}),patches=[];
for(const [i,kick]of kicks.entries()){
 const xs=kick.vertices.map(p=>p.x),ys=kick.vertices.map(p=>p.y),zs=kick.vertices.map(p=>p.z),x0=Math.min(...xs)-.01,x1=Math.max(...xs)+.01,y=Math.min(...ys),south=Math.min(...zs),north=-21.7;
 assert(Math.max(...zs)<north-.049&&south>north-.1,'Expected a five-centimetre door recess');
 const floor=layout.panels.find(p=>p.id===`east-square-hall-passage-floor-${i===0?0:2}`);
 assert(Math.abs(Math.max(...floor.vertices.map(v=>v.y))-y)<1e-5);assert(Math.abs(Math.min(...floor.vertices.map(v=>v.z))-north)<1e-5);
 const id=`east-square-hall-clinic-threshold-${i}`;assert(!layout.panels.some(p=>p.id===id));
 c.slab(id,[[x0,y,-south],[x1,y,-south],[x1,y,-north],[x0,y,-north]],[],.28,0,'door-threshold');
 Object.assign(c.panels.at(-1),{appearance,material:'stone'});patches.push({id,x:[x0,x1],y,z:[south,north],support:floor.id});
}
const report=await c.save(out,'thresholds.glb',{geometry:{patches},scope:'Close only the floor gaps under existing closed doors; no rooms or door machinery'});
layout.panels.push(...c.panels);const nextRaw=JSON.stringify(layout)+'\n';
const scene=readGLB(bytes),part=readGLB(await readFile(out+'/thresholds.glb')),oldNodes=scene.json.nodes.length;
const appended=appendJunction(scene.json,part,scene.bin.length);scene.json.nodes.slice(oldNodes).forEach(n=>{n.name='Public passage door thresholds';});
scene.json.buffers[0].byteLength=scene.bin.length+appended.length;const browser=writeGLB(scene.json,Buffer.concat([scene.bin,appended]));
assert(readGLB(browser).bin.subarray(0,scene.bin.length).equals(scene.bin));
const station=await read(base.station);station.layoutSha256=sha(nextRaw);
const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(nextRaw),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(browser),station:out+'/station.json'};
await writeFile(next.layout,nextRaw);await writeFile(next.geometry,browser);await writeFile(next.station,JSON.stringify(station)+'\n');
await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
await writeFile(out+'/repair.json',JSON.stringify({retired:[],added:c.panels.map(p=>p.id)},null,2)+'\n');
const positions=part.json.accessors[part.json.meshes[0].primitives[0].attributes.POSITION],view=part.json.bufferViews[positions.bufferView],native=c.panels.flatMap(p=>p.vertices);
assert.equal(native.length,positions.count);
for(const [i,p]of native.entries())for(const [k,v]of [p.x,p.y,-p.z].entries())assert(Math.abs(part.bin.readFloatLE(view.byteOffset+i*12+k*4)-v)<1e-5);
const geometryProof={pass:true,parentLayoutSha256:base.layoutSha256,parentGeometrySha256:base.geometrySha256,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,addedPanels:3,addedTriangles:report.geometry.triangles,patches,retainedNativeRecordsExact:true,retainedBrowserBuffersExact:true,addedBrowserVerticesMatchNative:true};
await writeFile(out+'/geometry-proof.json',JSON.stringify(geometryProof,null,2)+'\n');console.log(geometryProof);
