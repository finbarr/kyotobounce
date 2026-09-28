// Prove exact roof replacement scope and compare full exported/native ray hits.
// Component surface interferences remain explicit failures of route integration.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const [parentPath,candidatePath,browserPath,outArg,...probePaths]=process.argv.slice(2);
assert(parentPath&&candidatePath&&browserPath&&outArg&&probePaths.length);
const out=resolve(outArg);assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const [parentBytes,candidateBytes,browserBytes,...probeBytes]=await Promise.all([parentPath,candidatePath,browserPath,...probePaths].map(p=>readFile(p)));
const parent=JSON.parse(parentBytes),candidate=JSON.parse(candidateBytes),repair=candidate.architecture.registeredRoofReplacement;
assert.equal(repair.inputLayoutSha256,hash(parentBytes));
for(const key of Object.keys(parent))if(!['architecture','panels','beams'].includes(key))assert.deepEqual(candidate[key],parent[key],`Unrelated field ${key}`);
assert.deepEqual(Object.keys(candidate).sort(),Object.keys(parent).sort());
assert.deepEqual(Object.keys(candidate.architecture).sort(),[...Object.keys(parent.architecture),'registeredRoofReplacement'].sort());
for(const key of Object.keys(parent.architecture))assert.deepEqual(candidate.architecture[key],parent.architecture[key]);
const appended=[];
for(const c of repair.components){const bytes=await readFile(c.directory+'/native-panels.json');assert.equal(hash(bytes),c.nativePanelsSha256);appended.push(...JSON.parse(bytes).panels);}
assert.deepEqual(appended.map(p=>p.id),repair.addedPanels);
for(const kind of ['panels','beams']){
 const indices=new Set(repair.removedRecordIndices[kind]);assert.equal(indices.size,kind==='panels'?9021:33293);
 const retained=parent[kind].filter((_,i)=>!indices.has(i));
 assert.deepEqual(candidate[kind].slice(0,retained.length),retained,`Retained ${kind} changed`);
 assert.equal(candidate[kind].length,retained.length+(kind==='panels'?appended.length:0));
 if(kind==='panels')for(let i=0;i<appended.length;i++){const {appearance,...geometry}=candidate.panels[retained.length+i];assert.deepEqual(geometry,appended[i]);assert(parent.authoredMaterials.some(m=>m.id===appearance));}
}
const reports=probeBytes.map(b=>JSON.parse(b));
const allProbes=reports.flatMap(r=>r.samples.map(p=>({...p,expected:{...p.expected,surface:p.expected?.surface??p.expectedComponentSurface}})));
assert(allProbes.every(p=>p.origin&&p.direction&&p.expected));
const {json:j,bin}=readGLB(browserBytes),root=new T.Group(),material=new T.MeshBasicMaterial({side:T.FrontSide});let selectedTriangles=0,selectedMeshes=0;
for(const n of j.nodes){assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);if(n.mesh===undefined)continue;for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];const v=j.bufferViews[a.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView];assert.equal(a.componentType,5126);assert(!v.byteStride||v.byteStride===12);assert([5123,5125].includes(ix.componentType));const ps=new Float32Array(a.count*3),ids=new Uint32Array(ix.count);for(let k=0;k<ps.length;k++)ps[k]=bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+k*4);const width=ix.componentType===5123?2:4;for(let k=0;k<ids.length;k++){const at=(iv.byteOffset||0)+(ix.byteOffset||0)+k*width;ids[k]=width===2?bin.readUInt16LE(at):bin.readUInt32LE(at);}const g=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(ps,3));g.setIndex(new T.BufferAttribute(ids,1));g.boundsTree=new MeshBVH(g);const mesh=new T.Mesh(g,material);mesh.name=n.name;mesh.raycast=acceleratedRaycast;root.add(mesh);selectedMeshes++;selectedTriangles+=ids.length/3;}}
root.updateMatrixWorld(true);const ray=new T.Raycaster(),toRenderer=p=>new T.Vector3(p.x,p.y,-p.z),toNative=p=>({x:p.x,y:p.y,z:-p.z});ray.firstHitOnly=true;
// Match BrowserCompetition.cs's actual 250 m placement ray. Removing an old
// roof can reveal a farther wall or open sky; require native agreement in both cases.
const rows=allProbes.map(p=>{
 ray.set(toRenderer(p.origin),toRenderer(p.direction));ray.far=250;
 const h=ray.intersectObject(root,true)[0];
 return {target:p.target,expectedComponentSurface:p.expected?.surface||null,origin:p.origin,direction:p.direction,
 expected:h?{point:toNative(h.point),normal:toNative(h.face.normal),object:h.object.name,distance:h.distance}:null};
});
process.env.KYOTO_LAYOUT=resolve(candidatePath);process.env.KYOTO_WORKER_LOG=out+'/worker.log';const worker=new PhysicsWorker(),id='registered-roof-proof',report={parentLayoutSha256:hash(parentBytes),layoutSha256:hash(candidateBytes),browserGlbSha256:hash(browserBytes),probes:probePaths.map((path,i)=>({path,sha256:hash(probeBytes[i]),samples:reports[i].samples.length})),selectedMeshes,selectedTriangles,rayDistanceM:250,meaning:`Full exported scene and native geometry at ${allProbes.length} declared rays; not whole-station or gameplay acceptance`,samples:[],failures:[],componentInterferences:[]};let joined=false;
worker.on('message',m=>{if(m.type==='state'&&m.id===id&&m.players?.length)joined=true;});const until=async(fn)=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25);}};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const row of rows){const request=randomUUID();let timer;const response=new Promise((resolve,reject)=>{timer=setTimeout(()=>{pending.delete(request);reject(Error('Ray request timed out'));},10000);pending.set(request,resolve);});worker.send({type:'place',id,slot:'waypoint',radius:.1,request,origin:row.origin,direction:row.direction});let result;try{result=await response;}finally{clearTimeout(timer);}const hit=result.disk,matchedNoHit=!row.expected&&!hit?.surface;
 const error=matchedNoHit?0:(hit?.surface&&row.expected?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-row.expected.point[k])):null);
 const normalDot=hit?.normal&&row.expected?['x','y','z'].reduce((s,k)=>s+hit.normal[k]*row.expected.normal[k],0):null;
 report.samples.push({...row,native:hit||null,error,normalDot,matchedNoHit});
 if(row.expectedComponentSurface&&hit?.surface!==row.expectedComponentSurface)report.componentInterferences.push({target:row.target,expected:row.expectedComponentSurface,actual:hit?.surface||null,errorFromComponentM:hit?.center?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-allProbes[report.samples.length-1].expected.point[k])):null});
 if(!matchedNoHit&&(error===null||error>.001||normalDot<.999))report.failures.push({target:row.target,browser:row.expected?.object||null,native:hit?.surface||null,error,normalDot});
 }

 assert.equal(report.failures.length,0,'Exported scene/native roof replacement mismatch');console.log(JSON.stringify({samples:report.samples.length,maxErrorM:Math.max(...report.samples.map(r=>r.error)),failures:report.failures,componentInterferences:report.componentInterferences.length}));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
