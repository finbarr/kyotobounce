// Locate the remaining full-station roof interferences in the untouched source.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [sourcePath,layoutPath,proofPath,out]=process.argv.slice(2);assert(sourcePath&&layoutPath&&proofPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const bytes=await Promise.all([sourcePath,layoutPath,proofPath].map(p=>readFile(p))),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes[0]),'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');
const layout=JSON.parse(bytes[1]),proof=JSON.parse(bytes[2]);assert.equal(sha(bytes[1]),proof.layoutSha256);assert.equal(proof.failures.length,0);
const {json:j,bin}=readGLB(bytes[0]);
function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],width={SCALAR:1,VEC3:3}[a.type],size=a.componentType===5123?2:4;assert(width&&!a.sparse);return Array.from({length:a.count},(_,n)=>Array.from({length:width},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||width*size)+k*size;return a.componentType===5126?bin.readFloatLE(at):size===2?bin.readUInt16LE(at):bin.readUInt32LE(at);}));}
const root=new T.Group(),objects=new Map();
for(const n of j.nodes){if(n.mesh===undefined)continue;assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);const ps=j.meshes[n.mesh].primitives;assert.equal(ps.length,1);const p=ps[0],vs=acc(p.attributes.POSITION),indices=acc(p.indices).flat(),g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vs.flat(),3));g.setIndex(indices);const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=n.name;root.add(mesh);objects.set(n.name,{vs,indices,mesh,material:j.materials[p.material]});}
root.updateMatrixWorld(true);const ray=new T.Raycaster(),renderer=p=>new T.Vector3(p.x,p.y,-p.z);
const interferences=proof.samples.filter(s=>s.expectedComponentSurface&&s.native?.surface!==s.expectedComponentSurface&&!s.native?.surface.startsWith('central-roof'));
assert.equal(interferences.length,4);const rows=[];
for(const s of interferences){ray.set(renderer(s.origin),renderer(s.direction));ray.far=2;const point=renderer(s.native.center),hits=ray.intersectObject(root,true).slice(0,12).map(h=>({object:h.object.name,face:h.faceIndex,distance:h.distance,point:h.point.toArray(),normal:h.face.normal.toArray(),distanceFromInstalledHitM:h.point.distanceTo(point)}));const nearest=hits.reduce((a,b)=>!a||b.distanceFromInstalledHitM<a.distanceFromInstalledHitM?b:a,null);rows.push({target:s.target,installedSurface:s.native.surface,origin:s.origin,direction:s.direction,installedHit:s.native.center,nearestSource:nearest,hits});}
const shell=objects.get('Untitled.200'),faces=[],edges=new Map();
for(let i=0;i<shell.indices.length;i+=3){const points=shell.indices.slice(i,i+3).map(k=>shell.vs[k]),cross=new T.Vector3(...points[1]).sub(new T.Vector3(...points[0])).cross(new T.Vector3(...points[2]).sub(new T.Vector3(...points[0]))),area=cross.length()/2,normal=cross.normalize().toArray(),center=[0,1,2].map(k=>points.reduce((n,v)=>n+v[k],0)/3);faces.push({id:i/3,points,normal,center,areaM2:area});for(let k=0;k<3;k++){const key=[points[k],points[(k+1)%3]].map(p=>p.map(v=>v.toFixed(4)).join(',')).sort().join('|');const ids=edges.get(key)||[];ids.push(i/3);edges.set(key,ids);}}
const adjacent=faces.map(()=>new Set());for(const ids of edges.values())for(const a of ids)for(const b of ids)if(a!==b)adjacent[a].add(b);
const seeds=[...new Set(rows.filter(r=>r.installedSurface.includes('Untitled.200')).map(r=>{assert(r.nearestSource.object==='Untitled.200'&&r.nearestSource.distanceFromInstalledHitM<.001);return r.nearestSource.face;}))];
const trials=[];for(const degrees of [15,20,25,30,40]){const selected=new Set(seeds),queue=[...seeds],threshold=Math.cos(degrees*Math.PI/180);while(queue.length){const id=queue.pop(),a=faces[id];for(const k of adjacent[id]){const b=faces[k];if(selected.has(k)||b.normal[1]>=-.01||b.center[0]<-110||b.center[0]>90||b.center[1]<20||b.center[1]>60||b.center[2]<-35||b.center[2]>10||a.normal.reduce((n,v,k)=>n+v*b.normal[k],0)<threshold)continue;selected.add(k);queue.push(k);}}
 const selectedFaces=[...selected].sort((a,b)=>a-b).map(i=>faces[i]),points=selectedFaces.flatMap(f=>f.points),boundary=[];
 for(const [key,ids]of edges){const inside=ids.filter(i=>selected.has(i));if(inside.length===1)boundary.push({points:key.split('|').map(s=>s.split(',').map(Number)),inside:inside[0],outside:ids.filter(i=>!selected.has(i))});}
 trials.push({degrees,faces:selectedFaces.map(f=>f.id),areaM2:selectedFaces.reduce((n,f)=>n+f.areaM2,0),bounds:[0,1,2].map(k=>[Math.min(...points.map(v=>v[k])),Math.max(...points.map(v=>v[k]))]),boundary});}
const selectedDetails=[...new Set(trials.flatMap(t=>t.faces))].map(i=>({...faces[i],adjacent:[...adjacent[i]].map(k=>({id:k,normal:faces[k].normal,center:faces[k].center,points:faces[k].points}))}));
const cladding=layout.boxes.find(p=>p.id==='east-north-cladding-4-5')||layout.panels.find(p=>p.id==='east-north-cladding-4-5');assert(cladding);
const report={source:{path:sourcePath,sha256:sha(bytes[0]),object:'Untitled.200',material:shell.material},layoutSha256:sha(bytes[1]),proofSha256:sha(bytes[2]),coordinates:'Renderer X east,Y up,Z south',status:'Diagnostic selection only; no source or installed geometry removed.',rows,seeds,trials,cladding};
await writeFile(out+'/audit.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/faces.json',JSON.stringify(selectedDetails,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(({hits,...r})=>r),seeds,trials:trials.map(({faces,boundary,...r})=>({...r,faces:faces.length,boundary:boundary.length})),cladding:{id:cladding.id,center:cladding.center,size:cladding.size}}));
