// Validate one static replacement after composition in the same staging folder.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {verifyWesternShell} from './verify-western-platform-shell.mjs';
import {verifyIsetanOpenings} from './verify-isetan-ground-openings.mjs';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,candidatePath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),m=await read(candidatePath),oldRaw=await readFile(base.layout),raw=await readFile(m.layout),old=JSON.parse(oldRaw),next=JSON.parse(raw),r=await read(component+'/report.json'),native=await read(component+'/native-panels.json');
assert.equal(sha(oldRaw),base.layoutSha256);assert.equal(sha(raw),m.layoutSha256);assert.equal(r.sourceLayoutSha256,base.layoutSha256);
const removed=new Set(r.geometry.retiredIds),retained=old.panels.filter(p=>!removed.has(p.id));
const retiredBoxes=r.geometry.retiredBoxIds||[];
assert(!retiredBoxes.length||['isetan-ground-','isetan-second-','granvia-entrance-','isetan-eighth-'].includes(r.componentPrefix));
assert.deepEqual(next.boxes,old.boxes.filter(p=>!retiredBoxes.includes(p.id)));
assert.equal(old.panels.length-retained.length+retiredBoxes.length+(r.geometry.retiredSourceOnlyIds||[]).length,removed.size);const modified=r.geometry.modifiedPanelIds||[];
assert.deepEqual(next.panels.slice(0,retained.length).map(p=>modified.includes(p.id)?old.panels.find(q=>q.id===p.id):p),retained);
const added=next.panels.slice(retained.length);assert.equal(added.length,native.panels.length);
assert.deepEqual(next.authoredMaterials.slice(0,old.authoredMaterials.length),old.authoredMaterials);
assert.deepEqual(next.authoredLights,[...old.authoredLights.filter(l=>!r.geometry.retiredLights.includes(l.id)),...(native.authoredLights||[])]);
// The terrace appends three explicitly declared lifts; all prior motion stays exact.
let addedLifts=0;
if(['hachijo-terrace-','granvia-entrance-','isetan-lift-','isetan-north-core-','isetan-sixth-north-','isetan-seventh-north-','isetan-eighth-north-','granvia-parking-'].includes(r.componentPrefix)){
 const motion=['isetan-lift-','isetan-north-core-','isetan-sixth-north-','isetan-seventh-north-','isetan-eighth-north-'].includes(r.componentPrefix)?{lifts:[await read(component+'/lift-spec.json')]}:await read(component+'/motion.json');assert.equal(motion.lifts.length,r.componentPrefix==='hachijo-terrace-'?3:r.componentPrefix==='granvia-parking-'?2:1);
 const expected=structuredClone(motion.lifts);for(const l of expected)for(const p of l.parts){const a=next.authoredMaterials.find(a=>a.label===p.appearance);assert(a);p.appearance=a.id;}
 const retired=r.geometry.retiredLiftIds||[];assert(!retired.length||['isetan-north-core-','isetan-sixth-north-','isetan-seventh-north-','isetan-eighth-north-'].includes(r.componentPrefix)&&retired.length===1&&retired[0]==='isetan-north-lift');assert.deepEqual(next.lifts,[...old.lifts.filter(l=>!retired.includes(l.id)),...expected]);addedLifts=expected.length;
}else assert.deepEqual(next.lifts,old.lifts);
let addedEscalators=0;
if(['hachijo-escalators-','station-escalators-','granvia-entrance-','isetan-fifth-','isetan-sixth-','isetan-seventh-','isetan-eighth-'].includes(r.componentPrefix)){
 const motion=await read(component+'/motion.json');assert.equal(motion.escalators.length,r.componentPrefix==='hachijo-escalators-'?4:2);
 assert.deepEqual(next.escalators,[...old.escalators,...motion.escalators]);addedEscalators=motion.escalators.length;
}else assert.deepEqual(next.escalators,old.escalators);
const modifiedFlights=r.geometry.modifiedFlightIds||[];assert(!modifiedFlights.length||['isetan-ground-','isetan-fourth-','isetan-eighth-'].includes(r.componentPrefix));assert.deepEqual(next.flights,old.flights.map(f=>modifiedFlights.includes(f.id)?{...f,foundationDepth:0}:f));
const retiredRoutes=r.geometry.retiredRouteIds||[],retiredLabels=r.geometry.retiredLabelIds||[];
if(retiredRoutes.length||retiredLabels.length){
 assert.equal(r.componentPrefix,'isetan-eighth-');assert.deepEqual(retiredRoutes,['add-fukunaga-entry']);assert.deepEqual(retiredLabels,['add-fukunaga-portal-identity']);
}
assert.deepEqual(next.routes,old.routes.filter(p=>!retiredRoutes.includes(p.id)));
assert.deepEqual(next.concourseDetails,{...old.concourseDetails,labels:old.concourseDetails.labels.filter(p=>!retiredLabels.includes(p.id))});
assert.deepEqual({...next,routes:old.routes,concourseDetails:old.concourseDetails,flights:old.flights,boxes:old.boxes,escalators:old.escalators,lifts:old.lifts,panels:old.panels,authoredMaterials:old.authoredMaterials,authoredLights:old.authoredLights,architecture:old.architecture},old);
const removal=await read(candidatePath.replace('assets.json','removal.json')),composition=await read(candidatePath.replace('assets.json','composition.json'));
assert.deepEqual(removal.removedIds,r.geometry.retiredIds);assert(removal.retainedBufferBytesExact&&composition.originalBuffersExact);
assert.equal(removal.parent.geometrySha256,base.geometrySha256);assert.equal(composition.geometrySha256,m.geometrySha256);
assert.equal(await readFile(component+'/native-panels.json').then(sha),r.outputs.nativePanelsSha256);
const glb=await readFile(m.geometry);assert.equal(sha(glb),m.geometrySha256);
const {json:j,bin}=readGLB(glb),part=readGLB(await readFile(component+'/'+r.outputs.glbFile)).json;
const parentGLB=readGLB(await readFile(base.geometry));
assert(bin.subarray(0,parentGLB.bin.length).equals(parentGLB.bin));
assert.deepEqual(j.materials.slice(0,parentGLB.json.materials.length),parentGLB.json.materials);
const shell=modified.length?(['isetan-ground-','isetan-second-','isetan-third-','isetan-fourth-','isetan-fifth-','isetan-sixth-','isetan-seventh-','isetan-eighth-','isetan-stair-','granvia-entrance-','isetan-lift-','isetan-north-core-','isetan-sixth-north-','isetan-seventh-north-','isetan-eighth-north-','granvia-parking-'].includes(r.componentPrefix)?await verifyIsetanOpenings(parentGLB,{json:j,bin},old,next,r,await read(component+'/spec.json')):await verifyWesternShell(parentGLB,{json:j,bin},old,next,r)):{};
const values=ai=>{const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w={SCALAR:1,VEC2:2,VEC3:3}[a.type];assert(!v.extensions&&!v.byteStride&&!a.sparse);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+(i*w+k)*4)));};
let vertices=0,triangles=0;
for(const [batch,mesh]of j.meshes.slice(-part.meshes.length).entries())for(const p of mesh.primitives){
 const ps=values(p.attributes.POSITION),ns=values(p.attributes.NORMAL),ix=values(p.indices).flat(),uv=p.attributes.TEXCOORD_0===undefined?null:values(p.attributes.TEXCOORD_0),expected=[];let offset=0;
 for(const source of native.panels.filter(p=>p.browserMaterial===batch)){
  const panel=added.find(p=>p.id===source.id);assert(panel);
  assert.equal(panel.material,source.material);assert.equal(panel.collision,source.collision);
  const material=next.authoredMaterials.find(a=>a.id===panel.appearance);assert.equal(material.label,j.materials[p.material].name.replace(/ \| Browser$/,''));
  for(const [i,v]of panel.vertices.entries()){
   assert.deepEqual(ps[offset+i],[v.x,v.y,-v.z]);assert.deepEqual(v,Object.fromEntries(Object.entries(source.vertices[i]).map(([k,n])=>[k,Math.fround(n)])));
   if(panel.uv){assert(uv);assert(Math.abs(uv[offset+i][0]-panel.uv[i].x)<1e-6&&Math.abs(uv[offset+i][1]-(1-panel.uv[i].y))<1e-6);}
  }
  assert.deepEqual(panel.triangles,source.triangles);
  for(let i=0;i<panel.triangles.length;i+=3){const ids=panel.triangles.slice(i,i+3).reverse().map(v=>v+offset);expected.push(...ids);const n=new T.Triangle(...ids.map(i=>new T.Vector3(...ps[i]))).getNormal(new T.Vector3());for(const k of ids)assert(n.distanceTo(new T.Vector3(...ns[k]))<1e-5,panel.id+' normal');triangles++;}
  offset+=panel.vertices.length;
 }
 assert.equal(offset,ps.length);assert.deepEqual(expected,ix);vertices+=offset;
}
assert.equal(triangles,r.geometry.triangles);
await writeFile(out,JSON.stringify({pass:true,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,...shell,removedPanels:old.panels.length-retained.length,removedBoxes:retiredBoxes.length,retiredSourceOnlyObjects:(r.geometry.retiredSourceOnlyIds||[]).length,modifiedFlights,removedTriangles:removal.removedTriangles,addedPanels:added.length,vertices,triangles,retainedNativeRecordsExact:true,retainedBrowserBufferBytesExact:true,retainedMovingHardwareUnchanged:true,addedLifts,addedEscalators},null,2)+'\n');
console.log('PASS static replacement',added.length,'panels',vertices,'vertices',triangles,'triangles');
