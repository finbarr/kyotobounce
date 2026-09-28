// Measure source-anchored construction clearance, preserving obstruction evidence.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const [basePath,assembly,skyway,out]=process.argv.slice(2);assert(basePath&&assembly&&skyway&&out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [baseBytes,glbBytes,nativeBytes,assemblyBytes,skywayBytes]=await Promise.all([readFile(basePath),readFile(assembly+'/assembly.glb'),readFile(assembly+'/native-panels.json'),readFile(assembly+'/report.json'),readFile(skyway+'/report.json')]);
const layout=JSON.parse(baseBytes),build=JSON.parse(assemblyBytes),route=JSON.parse(skywayBytes),panels=JSON.parse(nativeBytes).panels;
assert.equal(sha(glbBytes),build.outputs.glbSha256);assert.equal(sha(nativeBytes),build.outputs.nativePanelsSha256);assert(build.inputs.some(i=>i.glbSha256===route.outputs.glbSha256));
layout.panels=[...layout.panels.filter(p=>p.id==='concourse'),...panels];for(const k of ['boxes','beams','flights','escalators'])layout[k]=[];layout.status='Isolated roof/Skyway construction assembly; not a playable station';
const layoutBytes=Buffer.from(JSON.stringify(layout)+'\n');await writeFile(out+'/probe-layout.json',layoutBytes);
const {json:j,bin}=readGLB(glbBytes),root=new T.Group();
for(let m=0;m<j.meshes.length;m++){const p=j.meshes[m].primitives[0],a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView],pos=new Float32Array(a.count*3),ids=new Uint32Array(ix.count);for(let k=0;k<pos.length;k++)pos[k]=bin.readFloatLE(v.byteOffset+k*4);for(let k=0;k<ids.length;k++)ids[k]=bin.readUInt32LE(iv.byteOffset+k*4);const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(pos,3)).setIndex(new T.BufferAttribute(ids,1));geometry.boundsTree=new MeshBVH(geometry,{indirect:true});const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.FrontSide}));mesh.raycast=acceleratedRaycast;mesh.userData.faces=panels.filter(p=>p.browserMaterial===m).flatMap(p=>Array(p.triangles.length/3).fill(p.id));assert.equal(mesh.userData.faces.length,ids.length/3);root.add(mesh);}root.updateMatrixWorld(true);
const ray=new T.Raycaster(),native=p=>({x:p[0],y:p[1],z:-p[2]});
const g=route.geometry,[a,b]=g.floorEndpointsRenderer||g.sourceEndpointsRenderer,L=g.lengthM,F=b.map((v,k)=>(v-a[k])/L),S=[-F[2],0,F[0]],point=(s,w)=>a.map((v,k)=>v+F[k]*s+S[k]*w);
const samples=[];for(let s=1;s<L-1;s+=2)for(const w of [-.75,0,.75])samples.push({region:'corridor',s,w,point:point(s,w)});
const approach=g.floorBridgeEndRenderer||g.sourceBridgeEndRenderer,delta=a.map((v,k)=>v-approach[k]),approachLength=Math.hypot(...delta),A=delta.map(v=>v/approachLength),AS=[-A[2],0,A[0]];
for(let s=.3;s<approachLength;s+=.5)for(const w of [-.75,0,.75])samples.push({region:'approach',s,w,point:approach.map((v,k)=>v+A[k]*s+AS[k]*w)});
for(const bay of g.viewingBays)for(const s of [bay.s0+.5,(bay.s0+bay.s1)/2,bay.s1-.5])for(let w=-.75;w>bay.outerW+.25;w-=.4)samples.push({region:'bay-'+bay.id,s,w,point:point(s,w)});
const report={meaning:'Isolated roof/bridge/corridor assembly. Clearances and obstructions, not integrated-station acceptance.',assemblyGlbSha256:sha(glbBytes),probeLayoutSha256:sha(layoutBytes),routeGlbSha256:route.outputs.glbSha256,samples:[],mismatches:[],obstructions:[],walks:[]};
process.env.KYOTO_LAYOUT=resolve(out+'/probe-layout.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='skyway-assembly-audit';let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m});const until=async fn=>{const deadline=performance.now()+90000;while(!fn()){assert(performance.now()<deadline,'Native observation timed out');await delay(30);}};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
async function cast(origin,direction){ray.set(new T.Vector3().fromArray(origin),new T.Vector3().fromArray(direction));ray.far=250;const hit=ray.intersectObject(root,true)[0],expected=hit?{surface:hit.object.userData.faces[hit.faceIndex],point:native(hit.point.toArray())}:null;const request=randomUUID();let timer;const response=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Native ray timed out'));},10000);});worker.send({type:'place',id,slot:'waypoint',radius:.1,origin:native(origin),direction:native(direction),request});let result;try{result=await response;}finally{clearTimeout(timer);}const actual=result.disk?.surface?result.disk:null;
const error=expected&&actual?Math.hypot(...['x','y','z'].map(k=>expected.point[k]-actual.center[k])):null;
if((!!expected)!=(!!actual)||expected&&(expected.surface!==actual.surface||error>.001))report.mismatches.push({origin,direction,expected,actual,error});return {expected,actual,error};}
for(const sample of samples){const p=sample.point,floor=await cast([p[0],p[1]+.35,p[2]],[0,-1,0]),head=await cast([p[0],p[1]+.05,p[2]],[0,1,0]),clearance=head.actual?head.actual.center.y-p[1]:null;const pass=floor.actual?.surface==='central-skyway-deck'&&Math.abs(floor.actual.center.y-p[1])<.001&&clearance!==null&&clearance>=2.1;const row={...sample,floor,head,clearanceM:clearance,pass};report.samples.push(row);if(!pass)report.obstructions.push({region:sample.region,s:sample.s,w:sample.w,point:p,floor:floor.actual?.surface,head:head.actual?.surface,clearanceM:clearance});}
assert.equal(report.mismatches.length,0,'Browser/native assembly mismatch');
// Walk the main corridor only when its complete sampled envelope clears.
// Bay and approach failures remain separately visible; never reclassify them as passes.
if(report.samples.filter(s=>s.region==='corridor').every(s=>s.pass))for(const w of [-.75,0,.75]){
 const start=point(1,w),placement=await worker.request({type:'place',id,slot:'start',radius:.3,origin:native([start[0],start[1]+.4,start[2]]),direction:{x:0,y:-1,z:0}});assert(placement.ok);await worker.request({type:'design-start',id,start:placement.disk});await delay(150);
 for(const target of [point(L-1,w),start]){const walk={region:'corridor',laneW:w,target:native(target),samples:[],pass:false},deadline=performance.now()+Math.max(20000,L/4*1000+15000);try{while(true){const feet=state.players.find(p=>p.id===id).feet,goal=native(target),dx=goal.x-feet.x,dz=goal.z-feet.z,distance=Math.hypot(dx,dz);walk.samples.push(feet);assert(Math.abs(feet.y-start[1])<.1,'Capsule fell');if(distance<.18)break;assert(performance.now()<deadline,'Walk deadline elapsed before reaching target');worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:distance>1});await delay(70);}walk.pass=true;}catch(e){walk.error=String(e);}finally{worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push(walk);console.log(JSON.stringify({walk:report.walks.length,region:walk.region,pass:walk.pass,error:walk.error}));}if(!walk.pass)break;}
}
// Traverse the bridge-to-corridor turn in both directions on three lanes.
if(report.samples.filter(s=>s.region==='approach').every(s=>s.pass))for(const w of [-.75,0,.75]){
 const ap=(s,w)=>approach.map((v,k)=>v+A[k]*s+AS[k]*w),start=ap(-1,w),path=[ap(approachLength-.5,w),point(1,w),point(3,w)];
 const placement=await worker.request({type:'place',id,slot:'start',radius:.3,origin:native([start[0],start[1]+.4,start[2]]),direction:{x:0,y:-1,z:0}});assert(placement.ok);await worker.request({type:'design-start',id,start:placement.disk});await delay(150);
 for(const targets of [path,[point(1,w),ap(approachLength-.5,w),start]]){const walk={region:'approach',laneW:w,targets:targets.map(native),samples:[],pass:false};try{for(const target of targets){const deadline=performance.now()+20000;while(true){const feet=state.players.find(p=>p.id===id).feet,goal=native(target),dx=goal.x-feet.x,dz=goal.z-feet.z,distance=Math.hypot(dx,dz);walk.samples.push(feet);assert(Math.abs(feet.y-start[1])<.1,'Capsule fell at connection');if(distance<.18)break;assert(performance.now()<deadline,'Approach walk deadline elapsed');worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:distance>1});await delay(70);}}walk.pass=true;}catch(e){walk.error=String(e);}finally{worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push(walk);console.log(JSON.stringify({walk:report.walks.length,region:walk.region,pass:walk.pass,error:walk.error}));}if(!walk.pass)break;}
}
// Enter every bay on three lanes, then traverse its outer viewing edge.
for(const bay of g.viewingBays){const region='bay-'+bay.id;if(!report.samples.filter(s=>s.region===region).every(s=>s.pass))continue;
 const paths=[];
 for(const s of [bay.s0+.55,(bay.s0+bay.s1)/2,bay.s1-.55])paths.push({lane:s,start:point(s,0),end:point(s,bay.outerW+.5)});
 paths.push({lane:'outer-edge',start:point(bay.s0+.55,bay.outerW+.5),end:point(bay.s1-.55,bay.outerW+.5)});
 for(const path of paths){const start=path.start,placement=await worker.request({type:'place',id,slot:'start',radius:.3,origin:native([start[0],start[1]+.4,start[2]]),direction:{x:0,y:-1,z:0}});assert(placement.ok);assert.equal(placement.disk.surface,'central-skyway-deck');await worker.request({type:'design-start',id,start:placement.disk});await delay(150);
  for(const target of [path.end,start]){const walk={region,lane:path.lane,target:native(target),samples:[],pass:false},deadline=performance.now()+20000;try{while(true){const feet=state.players.find(p=>p.id===id).feet,goal=native(target),dx=goal.x-feet.x,dz=goal.z-feet.z,distance=Math.hypot(dx,dz);walk.samples.push(feet);assert(Math.abs(feet.y-start[1])<.1,'Capsule fell in viewing bay');if(distance<.18)break;assert(performance.now()<deadline,'Viewing-bay walk deadline elapsed');worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:distance>1});await delay(70);}walk.pass=true;}catch(e){walk.error=String(e);}finally{worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push(walk);console.log(JSON.stringify({walk:report.walks.length,region:walk.region,pass:walk.pass,error:walk.error}));}if(!walk.pass)break;}
 }
}
report.summary={expectedWalks:36,completeComponentWalks:report.walks.length===36&&report.walks.every(w=>w.pass),points:report.samples.length,rays:report.samples.length*2,mismatches:report.mismatches.length,obstructions:report.obstructions.length,regions:Object.fromEntries([...new Set(samples.map(s=>s.region))].map(region=>{const rows=report.samples.filter(s=>s.region===region);return [region,{points:rows.length,passes:rows.filter(s=>s.pass).length,minimumClearanceM:Math.min(...rows.map(s=>s.clearanceM??Infinity))}];})),walks:report.walks.length,passingWalks:report.walks.filter(w=>w.pass).length};console.log(JSON.stringify(report.summary,null,2));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}

assert(report.summary?.completeComponentWalks&&report.summary.mismatches===0&&report.summary.obstructions===0,"Assembly route audit incomplete or failed; see saved report");
