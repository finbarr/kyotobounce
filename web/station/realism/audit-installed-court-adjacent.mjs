// Probe recessed openings and opaque fronts in the installed courtyard scene.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import {PhysicsWorker} from '../../worker.ts';
const[basePath,browserPath,componentPath,specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),[layoutBytes,glbBytes,nb]=await Promise.all([readFile(basePath),readFile(browserPath),readFile(componentPath+'/native-panels.json')]),layout=JSON.parse(layoutBytes),component=JSON.parse(nb);
assert.equal(layout.architecture.courtAdjacentWalls.componentNativeSha256,sha(nb));const exportReceipt=JSON.parse(await readFile(dirname(browserPath)+'/atrium-export.json'));assert.equal(exportReceipt.layoutSha256,sha(layoutBytes));
const {json:j,bin}=readGLB(glbBytes),root=new T.Group();
function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],w={SCALAR:1,VEC3:3}[a.type],s=a.componentType===5123?2:4;assert(w&&!a.sparse);return Array.from({length:a.count*w},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+Math.floor(k/w)*(v.byteStride||w*s)+(k%w)*s;return a.componentType===5126?bin.readFloatLE(at):s===2?bin.readUInt16LE(at):bin.readUInt32LE(at);});}
for(const node of j.nodes){if(node.mesh===undefined)continue;assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);for(const p of j.meshes[node.mesh].primitives){const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(acc(p.attributes.POSITION),3));geometry.setIndex(acc(p.indices));geometry.boundsTree=new MeshBVH(geometry);const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.FrontSide}));mesh.name=node.name;mesh.raycast=acceleratedRaycast;root.add(mesh);}}
root.updateMatrixWorld(true);const ray=new T.Raycaster();ray.firstHitOnly=true;const native=p=>({x:p[0],y:p[1],z:-p[2]});
const spec=JSON.parse(await readFile(specPath)),parts=new Map(spec.parts.map(p=>['court-adjacent-'+p.id,p])),counts=new Map(),samples=[];
const selected=component.panels.filter(p=>{
 if(['window-glass','vent-backing'].includes(p.role))return true;
 if(p.role!=='panel')return false;
 const part=parts.get(p.id);assert(part,p.id);const count=counts.get(part.patch)||0;counts.set(part.patch,count+1);return count%12===0;
});
for(const panel of selected){
 const patch=spec.patches.find(p=>panel.id.startsWith('court-adjacent-'+p.id+'-'));assert(patch,panel.id);const normal=new T.Vector3(...patch.normal);
 let point;
 if(panel.role==='vent-backing'){
  // Top of the slot, above the five decorative vanes; retain the recessed collision face.
  const opening=spec.openings.find(o=>panel.id==='court-adjacent-'+o.patch+'-'+o.id+'-recess');assert(opening);
  const u=opening.center[0],y=opening.center[1]+opening.height/2-.03;
  point=new T.Vector3(...patch.origin).addScaledVector(new T.Vector3(...patch.u),u).add(new T.Vector3(0,y,0)).addScaledVector(normal,Math.max(...panel.vertices.map(v=>new T.Vector3(v.x,v.y,-v.z).sub(new T.Vector3(...patch.origin)).dot(normal))));
 }else for(let i=0;i<panel.triangles.length;i+=3){
  const tri=new T.Triangle(...panel.triangles.slice(i,i+3).reverse().map(k=>{const p=panel.vertices[k];return new T.Vector3(p.x,p.y,-p.z)}));
  if(tri.getNormal(new T.Vector3()).dot(normal)>.999){point=tri.a.clone().multiplyScalar(.217).addScaledVector(tri.b,.319).addScaledVector(tri.c,.464);break;}
 }
 assert(point,panel.id);const origin=point.clone().addScaledVector(normal,.25),direction=normal.clone().negate();ray.set(origin,direction);const hit=ray.intersectObject(root,true)[0];assert(hit,panel.id);
 samples.push({surface:panel.id,patch:patch.id,role:panel.role,origin:native(origin.toArray()),direction:native(direction.toArray()),componentPoint:native(point.toArray()),browser:{point:native(hit.point.toArray()),mesh:hit.object.name,errorFromComponentM:hit.point.distanceTo(point)}});
}
assert.equal(samples.filter(p=>p.role==='window-glass').length,4);assert.equal(samples.filter(p=>p.role==='vent-backing').length,8);
assert.equal(new Set(samples.filter(p=>p.role==='panel').map(p=>p.patch)).size,6);
const report={layoutSha256:sha(layoutBytes),browserGlbSha256:sha(glbBytes),componentNativeSha256:sha(nb),specSha256:sha(await readFile(specPath)),meaning:'Four recessed windows, eight vent recesses, and every twelfth opaque panel per patch in the installed full scene. Two glass bands with noncolliding decorative panes are excluded; component collision rays cover their backing. This is not a course or full gameplay check.',samples:[],failures:[]};
process.env.KYOTO_LAYOUT=resolve(basePath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');const worker=new PhysicsWorker(),id='court-adjacent-installed-front-proof';let joined=false;worker.on('message',m=>{if(m.type==='state'&&m.id===id&&m.players?.length)joined=true;});const until=async fn=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(30)}};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
for(const row of samples){const request=randomUUID();let timer;const response=new Promise((res,rej)=>{timer=setTimeout(()=>{pending.delete(request);rej(Error('Native ray timed out'));},10000);pending.set(request,res);});worker.send({type:'place',id,slot:'waypoint',radius:.1,request,origin:row.origin,direction:row.direction});let result;try{result=await response;}finally{clearTimeout(timer);}const hit=result.disk,error=hit?.surface?Math.hypot(...['x','y','z'].map(k=>hit.center[k]-row.browser.point[k])):null;report.samples.push({...row,result,error});if(error===null||error>.001||hit.surface!==row.surface||row.browser.errorFromComponentM>.001)report.failures.push({surface:row.surface,nativeSurface:hit?.surface,error,browserError:row.browser.errorFromComponentM});}
report.pass=!report.failures.length;console.log(JSON.stringify({samples:report.samples.length,failures:report.failures,maximumErrorM:Math.max(...report.samples.map(p=>p.error))}));assert(report.pass,'Installed facade front mismatch');
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
