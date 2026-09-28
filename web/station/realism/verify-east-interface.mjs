// Full exported-scene versus native rays at every tested eastern roof pane.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const[parentPath,candidatePath,componentPath,probesPath,browserPath,outArg,envelopeParentPath]=process.argv.slice(2);
assert(parentPath&&candidatePath&&componentPath&&probesPath&&browserPath&&outArg);const out=resolve(outArg);assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),parentBytes=await readFile(parentPath),candidateBytes=await readFile(candidatePath),componentBytes=await readFile(componentPath+'/native-panels.json'),browserBytes=await readFile(browserPath),probeBytes=await readFile(probesPath);
const parent=JSON.parse(parentBytes),candidate=JSON.parse(candidateBytes),component=JSON.parse(componentBytes),probes=JSON.parse(probeBytes),repair=candidate.architecture.eastRoofSourceInterface;
assert(repair);assert.equal(repair.inputLayoutSha256,hash(parentBytes));assert.equal(repair.nativePanelsSha256,hash(componentBytes));assert.equal(repair.componentGlbSha256,probes.glbSha256);assert.equal(probes.baseLayoutSha256,hash(parentBytes));
assert.equal(candidate.panels.length,parent.panels.length+component.panels.length);assert.deepEqual(repair.addedPanels,component.panels.map(p=>p.id));
const expected=structuredClone(parent);expected.architecture.eastRoofSourceInterface=repair;expected.panels=expected.panels.map(p=>p.id===repair.replacedPanel?candidate.panels.find(q=>q.id===p.id):p);
const added=candidate.panels.slice(parent.panels.length);for(let i=0;i<added.length;i++){const {appearance,...geometry}=added[i];assert.deepEqual(geometry,component.panels[i]);assert(appearance);}
expected.panels.push(...added);assert.equal(candidate.authoredMaterials.length,parent.authoredMaterials.length+1);expected.authoredMaterials.push(candidate.authoredMaterials.at(-1));
if(candidate.architecture.eastUpperEnvelopeRepair){
 assert(envelopeParentPath,'An envelope correction requires the unchanged interface parent');const bytes=await readFile(envelopeParentPath),parent=JSON.parse(bytes),change=candidate.architecture.eastUpperEnvelopeRepair;
 assert.equal(hash(bytes),change.inputLayoutSha256);assert.deepEqual(parent,expected,'The interface parent must contain only the declared facade/roof integration');
 assert.deepEqual(change.removedBoxes.map(b=>b.id),['east-north-roof','east-north-upper-backing']);for(const b of change.removedBoxes)assert.deepEqual(parent.boxes.find(p=>p.id===b.id),b);
 expected.boxes=expected.boxes.filter(b=>!change.removedBoxes.some(r=>r.id===b.id));expected.architecture.eastUpperEnvelopeRepair=change;
}else assert(!envelopeParentPath,'Unexpected envelope parent');
assert.deepEqual(candidate,expected,'Only the declared source facade, new roof panels/material, and optional two-box envelope repair may change');
const extraProbeBytes=process.env.KYOTO_ROOF_EXTRA_PROBES?await readFile(process.env.KYOTO_ROOF_EXTRA_PROBES):null;
const extraProbes=extraProbeBytes?JSON.parse(extraProbeBytes):[];assert(Array.isArray(extraProbes));
const allProbes=[...probes.samples,...extraProbes];
const {json:j,bin}=readGLB(browserBytes),root=new T.Group(),material=new T.MeshBasicMaterial({side:T.FrontSide});let selectedTriangles=0,selectedMeshes=0;
for(const n of j.nodes){assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);if(n.mesh===undefined)continue;for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];if(!extraProbes.length&&(a.max[0]<74||a.min[0]>114||a.max[1]<43||a.min[1]>59||a.max[2]<-24||a.min[2]>0))continue;const v=j.bufferViews[a.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView];assert.equal(a.componentType,5126);assert(!v.byteStride||v.byteStride===12);assert([5123,5125].includes(ix.componentType));const ps=new Float32Array(a.count*3),ids=new Uint32Array(ix.count);for(let k=0;k<ps.length;k++)ps[k]=bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+k*4);const width=ix.componentType===5123?2:4;for(let k=0;k<ids.length;k++){const at=(iv.byteOffset||0)+(ix.byteOffset||0)+k*width;ids[k]=width===2?bin.readUInt16LE(at):bin.readUInt32LE(at);}const g=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(ps,3));g.setIndex(new T.BufferAttribute(ids,1));g.boundsTree=new MeshBVH(g);const mesh=new T.Mesh(g,material);mesh.name=n.name;mesh.raycast=acceleratedRaycast;root.add(mesh);selectedMeshes++;selectedTriangles+=ids.length/3;}}
root.updateMatrixWorld(true);const ray=new T.Raycaster(),toRenderer=p=>new T.Vector3(p.x,p.y,-p.z),toNative=p=>({x:p.x,y:p.y,z:-p.z});ray.firstHitOnly=true;
const rows=allProbes.map(p=>{ray.set(toRenderer(p.origin),toRenderer(p.direction));ray.far=p.maxDistanceM||2;const h=ray.intersectObject(root,true)[0];assert(h,'No exported scene surface at '+p.target);return{target:p.target,origin:p.origin,direction:p.direction,expected:{point:toNative(h.point),normal:toNative(h.face.normal),object:h.object.name,distance:h.distance}};});
process.env.KYOTO_LAYOUT=resolve(candidatePath);process.env.KYOTO_WORKER_LOG=out+'/worker.log';const worker=new PhysicsWorker(),id='east-interface-proof',report={parentLayoutSha256:hash(parentBytes),layoutSha256:hash(candidateBytes),browserGlbSha256:hash(browserBytes),componentNativeSha256:hash(componentBytes),probesSha256:hash(probeBytes),extraProbesSha256:extraProbeBytes?hash(extraProbeBytes):null,selectedMeshes,selectedTriangles,meaning:`Full exported scene and native geometry at ${allProbes.length} declared rays; not whole-station or gameplay acceptance`,samples:[],failures:[]};let joined=false;
worker.on('message',m=>{if(m.type==='state'&&m.id===id&&m.players?.length)joined=true;});const until=async(fn)=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25);}};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const row of rows){const request=randomUUID();let timer;const response=new Promise((resolve,reject)=>{timer=setTimeout(()=>{pending.delete(request);reject(Error('Ray request timed out'));},10000);pending.set(request,resolve);});worker.send({type:'place',id,slot:'waypoint',radius:.1,request,origin:row.origin,direction:row.direction});let result;try{result=await response;}finally{clearTimeout(timer);}const hit=result.disk,error=hit?.surface?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-row.expected.point[k])):null,normalDot=hit?.normal?['x','y','z'].reduce((s,k)=>s+hit.normal[k]*row.expected.normal[k],0):null;report.samples.push({...row,native:hit,error,normalDot});if(error===null||error>.001||normalDot<.999)report.failures.push({target:row.target,browser:row.expected.object,native:hit?.surface,error,normalDot});}
 assert.equal(report.failures.length,0,'Exported scene/native roof interface mismatch');console.log(JSON.stringify({samples:report.samples.length,maxErrorM:Math.max(...report.samples.map(r=>r.error)),failures:report.failures}));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
