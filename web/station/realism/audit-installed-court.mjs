// Check preserved courtyard routes against the full installed browser/native scene.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const [basePath,browserPath,assembly,skyway,out,routeOverridePath]=process.argv.slice(2);
assert(basePath&&browserPath&&assembly&&skyway&&out&&routeOverridePath&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [layoutBytes,glbBytes,assemblyBytes,skywayBytes]=await Promise.all([basePath,browserPath,assembly+'/report.json',skyway+'/report.json'].map(p=>readFile(p)));
const layout=JSON.parse(layoutBytes),build=JSON.parse(assemblyBytes),route=JSON.parse(skywayBytes);
const currentCourt=layout.architecture.courtAssemblyUpdates?.at(-1)||layout.architecture.eastCourtContext;
assert.equal(currentCourt.assemblyGlbSha256,build.outputs.glbSha256);
const exportReceipt=JSON.parse(await readFile(dirname(browserPath)+'/atrium-export.json'));assert.equal(exportReceipt.layoutSha256,sha(layoutBytes));
assert(build.inputs.some(i=>i.glbSha256===route.outputs.glbSha256));
const {json:j,bin}=readGLB(glbBytes),root=new T.Group();
function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],w={SCALAR:1,VEC3:3}[a.type],s=a.componentType===5123?2:4;assert(w&&!a.sparse);return Array.from({length:a.count*w},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+Math.floor(k/w)*(v.byteStride||w*s)+(k%w)*s;return a.componentType===5126?bin.readFloatLE(at):s===2?bin.readUInt16LE(at):bin.readUInt32LE(at);});}
for(const node of j.nodes){if(node.mesh===undefined)continue;assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);for(const p of j.meshes[node.mesh].primitives){const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(acc(p.attributes.POSITION),3));geometry.setIndex(acc(p.indices));geometry.boundsTree=new MeshBVH(geometry);const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.FrontSide}));mesh.name=node.name;mesh.raycast=acceleratedRaycast;root.add(mesh);}}
root.updateMatrixWorld(true);const ray=new T.Raycaster();ray.firstHitOnly=true;const native=p=>({x:p[0],y:p[1],z:-p[2]});
const overrideBytes=await readFile(routeOverridePath),override=overrideBytes?JSON.parse(overrideBytes):null;
if(override){assert.equal(override.baseCourtGlbSha256,route.outputs.glbSha256);assert.equal(override.assemblyGlbSha256,build.outputs.glbSha256);assert.deepEqual(override.routes.map(p=>p.id),route.geometry.routes.map(p=>p.id));for(let i=0;i<override.routes.length;i++){assert.deepEqual(override.routes[i].points[0],route.geometry.routes[i].points[0]);assert.deepEqual(override.routes[i].points.at(-1),route.geometry.routes[i].points.at(-1));}}
const allPaths=[...(override?.routes||route.geometry.routes),...(override?.additionalRoutes||[])].map(p=>({...p,w:p.id}));
assert(new Set(allPaths.map(p=>p.id)).size===allPaths.length,'Duplicate route IDs');
const selectedIds=process.env.KYOTO_COURT_ROUTE_IDS?.split(',').filter(Boolean);
if(selectedIds)assert(new Set(selectedIds).size===selectedIds.length&&selectedIds.every(id=>allPaths.some(p=>p.id===id)),'Unknown or duplicate selected route');
const paths=selectedIds?allPaths.filter(p=>selectedIds.includes(p.id)):allPaths;
assert(paths.every(p=>typeof p.id==='string'&&p.points.length>=2&&p.points.every(v=>v.length===3&&v.every(Number.isFinite))),'Invalid explicit route');
const samples=[];
for(const path of paths)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(...b.map((v,k)=>v-a[k])));for(let j=0;j<=n;j++)samples.push({lane:path.w,segment:i,t:j/n,point:a.map((v,k)=>v+(b[k]-v)*j/n)});}
const report={verifierSha256:sha(await readFile(new URL(import.meta.url))),walkingSpeed:'normal',selectedRouteIds:selectedIds||null,verifiedPaths:paths.map(({id,points})=>({id,points})),routeOverride:override?{sha256:sha(overrideBytes),reason:override.reason}:null,meaning:'Declared courtyard and NIWA routes against the complete installed station and exported browser asset. Full architecture, authored courses and performance acceptance remain separate.',assemblyGlbSha256:build.outputs.glbSha256,browserGlbSha256:sha(glbBytes),probeLayoutSha256:sha(layoutBytes),routeGlbSha256:route.outputs.glbSha256,samples:[],mismatches:[],sharedEdgeTies:[],obstructions:[],startFailures:[],walks:[]};
process.env.KYOTO_LAYOUT=resolve(basePath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='installed-court-audit';let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m});const until=async fn=>{const deadline=performance.now()+90000;while(!fn()){assert(performance.now()<deadline,'Native observation timed out');await delay(30);}};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
// Placement validation can reject a waypoint disk while still returning the ray hit.
// Preserve both fields so a placement rule is not mistaken for missing collision.
let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
async function cast(origin,direction){
 origin=origin.map(Math.fround);direction=direction.map(Math.fround);ray.set(new T.Vector3(...origin),new T.Vector3(...direction));ray.far=250;
 const hit=ray.intersectObject(root,true)[0],expected=hit?{object:hit.object.name,point:native(hit.point.toArray()),normal:native(hit.face.normal.toArray())}:null;
 const request=randomUUID();let timer;const response=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Native ray timed out'));},10000);});
 worker.send({type:'place',id,slot:'waypoint',radius:.1,origin:native(origin),direction:native(direction),request});
 let result;try{result=await response;}finally{clearTimeout(timer);}
 const actual=result.disk?.surface?result.disk:null;
 const error=expected&&actual?Math.hypot(...['x','y','z'].map(k=>expected.point[k]-actual.center[k])):null;
 const normalDot=expected&&actual?.normal?['x','y','z'].reduce((n,k)=>n+expected.normal[k]*actual.normal[k],0):null;
 let sharedEdge=null;
 if(expected&&actual&&error<1e-5&&normalDot<.999){
  const point=new T.Vector3(actual.center.x,actual.center.y,-actual.center.z),normal=new T.Vector3(actual.normal.x,actual.normal.y,-actual.normal.z),nearby=[];
  for(const mesh of root.children)mesh.geometry.boundsTree.shapecast({intersectsBounds:box=>box.distanceToPoint(point)<1e-5,intersectsTriangle:(triangle,index)=>{const distance=triangle.closestPointToPoint(point,new T.Vector3()).distanceTo(point),dot=triangle.getNormal(new T.Vector3()).dot(normal);if(distance<1e-5&&dot>.999999)nearby.push({object:mesh.name,triangle:index,distanceM:distance,normalDot:dot});return false;}});
  if(nearby.length){sharedEdge={origin,direction,expected,actual,error,normalDot,matchingExportedFaces:nearby};report.sharedEdgeTies.push(sharedEdge);}
 }
 if((!!expected)!=(!!actual)||expected&&(error>.001||normalDot<.999&&!sharedEdge))report.mismatches.push({origin,direction,expected,actual,error,normalDot});
 return {expected,actual,error,normalDot,placement:{ok:result.ok,message:result.message??null}};
}
for(const sample of samples){const p=sample.point,floor=await cast([p[0],p[1]+.35,p[2]],[0,-1,0]),head=await cast([p[0],p[1]+.05,p[2]],[0,1,0]),clearance=head.actual?head.actual.center.y-p[1]:null;const pass=!!floor.actual&&Math.abs(floor.actual.center.y-p[1])<.19&&(clearance===null||clearance>=2.1);const row={...sample,floor,head,clearanceM:clearance,pass};report.samples.push(row);if(!pass)report.obstructions.push({lane:sample.lane,segment:sample.segment,t:sample.t,point:p,floor:floor.actual?.surface,head:head.actual?.surface,clearanceM:clearance});}
assert.equal(report.mismatches.length,0,'Browser/native assembly mismatch');
for(const path of paths){
 if(report.samples.some(s=>s.lane===path.w&&!s.pass))continue;
 const start=path.points[0];try{const placement=await worker.request({type:'place',id,slot:'start',radius:.3,origin:native([start[0],start[1]+.4,start[2]]),direction:{x:0,y:-1,z:0}});assert(placement.ok);await worker.request({type:'design-start',id,start:placement.disk});await delay(150);}catch(e){report.startFailures.push({lane:path.id,point:start,error:String(e)});console.log(JSON.stringify(report.startFailures.at(-1)));continue;}
 for(const targets of [path.points.slice(1),path.points.slice(0,-1).reverse()]){const walk={lane:path.w,targets:targets.map(native),samples:[],pass:false};try{for(const target of targets){const feet0={...state.players.find(p=>p.id===id).feet},goal=native(target),deadline=performance.now()+Math.max(20000,Math.hypot(goal.x-feet0.x,goal.z-feet0.z)/4*1000+15000);while(true){const feet=state.players.find(p=>p.id===id).feet,dx=goal.x-feet.x,dz=goal.z-feet.z,distance=Math.hypot(dx,dz);walk.samples.push(feet);const vx=goal.x-feet0.x,vz=goal.z-feet0.z,len2=vx*vx+vz*vz,t=len2?Math.max(0,Math.min(1,((feet.x-feet0.x)*vx+(feet.z-feet0.z)*vz)/len2)):1,expectedY=feet0.y+t*(goal.y-feet0.y);assert(feet.y>=Math.min(feet0.y,goal.y)-.1&&feet.y<=Math.max(feet0.y,goal.y)+.12,'Capsule left the stair/ramp level envelope');if(distance<.18){assert(Math.abs(feet.y-goal.y)<.08,'Walk endpoint is on the wrong level');break;}assert(performance.now()<deadline,'Walk deadline elapsed before reaching target');worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:false});await delay(70);}}walk.pass=true;}catch(e){walk.error=String(e);}finally{worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push(walk);}console.log(JSON.stringify({route:path.id,direction:report.walks.length,pass:walk.pass,error:walk.error}));if(!walk.pass)break;}
}
report.summary={expectedWalks:paths.length*2,points:report.samples.length,rays:report.samples.length*2,mismatches:report.mismatches.length,sharedEdgeTies:report.sharedEdgeTies.length,obstructions:report.obstructions.length,startFailures:report.startFailures.length,minimumCoveredClearanceM:Math.min(...report.samples.map(s=>s.clearanceM??Infinity)),walks:report.walks.length,passingWalks:report.walks.filter(w=>w.pass).length,pass:report.obstructions.length===0&&report.walks.length===paths.length*2&&report.walks.every(w=>w.pass)};console.log(JSON.stringify(report.summary,null,2));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
assert(report.summary?.pass,'Courtyard clearance or walking failed; inspect report');
