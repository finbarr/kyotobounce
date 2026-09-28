// Verify the central canopy interface against the complete browser export and native worker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const[parentPath,candidatePath,componentPath,probesPath,controlsPath,browserPath,outArg]=process.argv.slice(2);
assert(parentPath&&candidatePath&&componentPath&&probesPath&&controlsPath&&browserPath&&outArg);
const out=resolve(outArg);assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const[parentBytes,candidateBytes,componentBytes,browserBytes,probeBytes,controlBytes]=await Promise.all([
 readFile(parentPath),readFile(candidatePath),readFile(componentPath+'/native-panels.json'),readFile(browserPath),readFile(probesPath),readFile(controlsPath)
]);
const parent=JSON.parse(parentBytes),candidate=JSON.parse(candidateBytes),component=JSON.parse(componentBytes),probes=JSON.parse(probeBytes),controls=JSON.parse(controlBytes);
const repair=candidate.architecture.centralRoofSourceInterface;
assert(repair);assert.equal(repair.inputLayoutSha256,hash(parentBytes));assert.equal(repair.nativePanelsSha256,hash(componentBytes));
assert.equal(repair.componentGlbSha256,probes.glbSha256);assert.equal(probes.baseLayoutSha256,hash(parentBytes));
assert.equal(controls.layoutSha256,hash(parentBytes));assert.equal(controls.failures.length,0);
assert.deepEqual(repair.replacedPanels.map(p=>p.id),['municipal-station-frontage-west-Untitled.203','municipal-station-frontage-east-Untitled.203']);
assert.deepEqual(repair.retainedEasternRoofFacesExcluded,parent.architecture.eastRoofSourceInterface.excludedSourceFaces);
assert.equal(repair.centralSourceFaces.length,113);assert.equal(repair.preservedVerticalSourceFaces.length,12);
assert(repair.preservedVerticalSourceFaces.every(id=>!repair.centralSourceFaces.includes(id)));
assert.deepEqual(Object.keys(candidate).sort(),Object.keys(parent).sort());
for(const key of Object.keys(parent))if(!['architecture','panels'].includes(key))assert.deepEqual(candidate[key],parent[key],`Unrelated layout field changed: ${key}`);
assert.deepEqual(Object.keys(candidate.architecture).sort(),[...Object.keys(parent.architecture),'centralRoofSourceInterface'].sort());
for(const key of Object.keys(parent.architecture))assert.deepEqual(candidate.architecture[key],parent.architecture[key]);
assert.equal(candidate.panels.length,parent.panels.length+component.panels.length);
const changed=new Set(repair.replacedPanels.map(p=>p.id));
for(let i=0;i<parent.panels.length;i++){
 const before=parent.panels[i],after=candidate.panels[i];assert.equal(before.id,after.id);
 if(!changed.has(before.id)){assert.deepEqual(after,before);continue;}
 assert.deepEqual(Object.keys(before).sort(),Object.keys(after).sort());
 for(const key of Object.keys(before))if(!['vertices','triangles','finishes'].includes(key))assert.deepEqual(after[key],before[key]);
 assert.deepEqual(after.finishes,[{appearance:before.appearance,triangles:after.triangles}]);
}
const added=candidate.panels.slice(parent.panels.length);
assert.deepEqual(repair.addedPanels,component.panels.map(p=>p.id));
for(let i=0;i<added.length;i++){const{appearance,...geometry}=added[i];assert.deepEqual(geometry,component.panels[i]);assert(parent.authoredMaterials.some(m=>m.id===appearance));}
const allProbes=[...probes.samples,...controls.samples];
const {json:j,bin}=readGLB(browserBytes),root=new T.Group(),material=new T.MeshBasicMaterial({side:T.FrontSide});let selectedTriangles=0,selectedMeshes=0;
for(const n of j.nodes){assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);if(n.mesh===undefined)continue;for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];const v=j.bufferViews[a.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView];assert.equal(a.componentType,5126);assert(!v.byteStride||v.byteStride===12);assert([5123,5125].includes(ix.componentType));const ps=new Float32Array(a.count*3),ids=new Uint32Array(ix.count);for(let k=0;k<ps.length;k++)ps[k]=bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+k*4);const width=ix.componentType===5123?2:4;for(let k=0;k<ids.length;k++){const at=(iv.byteOffset||0)+(ix.byteOffset||0)+k*width;ids[k]=width===2?bin.readUInt16LE(at):bin.readUInt32LE(at);}const g=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(ps,3));g.setIndex(new T.BufferAttribute(ids,1));g.boundsTree=new MeshBVH(g);const mesh=new T.Mesh(g,material);mesh.name=n.name;mesh.raycast=acceleratedRaycast;root.add(mesh);selectedMeshes++;selectedTriangles+=ids.length/3;}}
root.updateMatrixWorld(true);const ray=new T.Raycaster(),toRenderer=p=>new T.Vector3(p.x,p.y,-p.z),toNative=p=>({x:p.x,y:p.y,z:-p.z});ray.firstHitOnly=true;
const rows=allProbes.map(p=>{ray.set(toRenderer(p.origin),toRenderer(p.direction));ray.far=Math.max(2,p.maxDistanceM||0,(p.expected?.distance||0)+.5);const h=ray.intersectObject(root,true)[0];assert(h,'No exported scene surface at '+p.target);return{target:p.target,expectedComponentSurface:p.expected?.surface||null,origin:p.origin,direction:p.direction,expected:{point:toNative(h.point),normal:toNative(h.face.normal),object:h.object.name,distance:h.distance}};});
process.env.KYOTO_LAYOUT=resolve(candidatePath);process.env.KYOTO_WORKER_LOG=out+'/worker.log';const worker=new PhysicsWorker(),id='central-interface-proof',report={parentLayoutSha256:hash(parentBytes),layoutSha256:hash(candidateBytes),browserGlbSha256:hash(browserBytes),componentNativeSha256:hash(componentBytes),probesSha256:hash(probeBytes),controlProbesSha256:hash(controlBytes),selectedMeshes,selectedTriangles,meaning:`Full exported scene and native geometry at ${allProbes.length} declared rays; not whole-station or gameplay acceptance`,samples:[],failures:[],componentInterferences:[]};let joined=false;
worker.on('message',m=>{if(m.type==='state'&&m.id===id&&m.players?.length)joined=true;});const until=async(fn)=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25);}};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const row of rows){const request=randomUUID();let timer;const response=new Promise((resolve,reject)=>{timer=setTimeout(()=>{pending.delete(request);reject(Error('Ray request timed out'));},10000);pending.set(request,resolve);});worker.send({type:'place',id,slot:'waypoint',radius:.1,request,origin:row.origin,direction:row.direction});let result;try{result=await response;}finally{clearTimeout(timer);}const hit=result.disk,error=hit?.surface?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-row.expected.point[k])):null,normalDot=hit?.normal?['x','y','z'].reduce((s,k)=>s+hit.normal[k]*row.expected.normal[k],0):null;report.samples.push({...row,native:hit,error,normalDot});if(row.expectedComponentSurface&&hit?.surface!==row.expectedComponentSurface)report.componentInterferences.push({target:row.target,expected:row.expectedComponentSurface,actual:hit?.surface,errorFromComponentM:hit?.center?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-probes.samples[report.samples.length-1].expected.point[k])):null});if(error===null||error>.001||normalDot<.999)report.failures.push({target:row.target,browser:row.expected.object,native:hit?.surface,error,normalDot});}
 assert.equal(report.failures.length,0,'Exported scene/native central roof interface mismatch');console.log(JSON.stringify({samples:report.samples.length,maxErrorM:Math.max(...report.samples.map(r=>r.error)),failures:report.failures,componentInterferences:report.componentInterferences}));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
