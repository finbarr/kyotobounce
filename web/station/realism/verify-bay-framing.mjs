// Independent scope, connection and exterior-envelope checks on the saved meshes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [parent,child,skyway,out]=process.argv.slice(2);assert(parent&&child&&skyway&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const [pb,cb,rb,routeBytes,pg,cg]=await Promise.all([readFile(parent+'/native-panels.json'),readFile(child+'/native-panels.json'),readFile(child+'/report.json'),readFile(skyway+'/report.json'),readFile(parent+'/central-roof.glb'),readFile(child+'/central-roof.glb')]);
const old=JSON.parse(pb).panels,panels=JSON.parse(cb).panels,r=JSON.parse(rb),route=JSON.parse(routeBytes),byId=new Map(panels.map(p=>[p.id,p])),original=new Map(old.map(p=>[p.id,p]));assert.equal(sha(pb),r.parentNativeSha256);assert.equal(sha(cb),r.outputs.nativePanelsSha256);assert.equal(sha(cg),r.outputs.glbSha256);assert.equal(sha(routeBytes),r.skywayReportSha256);assert.deepEqual(readGLB(pg).json.materials,readGLB(cg).json.materials);
const changed=new Map(r.changedMembers.map(c=>[c.id,c]));let unchanged=0,protectedCount=0;
for(const p of old){if(changed.has(p.id)){assert(!byId.has(p.id));assert(['canopy-inner-chord','canopy-diagonal-web','canopy-depth-strut'].includes(p.role));}else{assert.deepEqual(byId.get(p.id),p);unchanged++;if(['canopy-frame','canopy-glazing'].includes(p.role))protectedCount++;}}
const allowedIds=new Set([...old.filter(p=>!changed.has(p.id)).map(p=>p.id),...r.changedMembers.flatMap(c=>c.fragments.map(f=>f.id)),...r.newMembers.map(m=>m.id)]);assert.equal(allowedIds.size,panels.length);assert(panels.every(p=>allowedIds.has(p.id)));
const vector=v=>new T.Vector3(v.x,v.y,-v.z),center=(p,from)=>p.vertices.slice(from,from+4).map(vector).reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(.25),line=p=>[center(p,20),center(p,16)];
let maximumFragmentErrorM=0;
for(const c of r.changedMembers){const [a,b]=line(original.get(c.id));for(const f of c.fragments){const [x,y]=line(byId.get(f.id));maximumFragmentErrorM=Math.max(maximumFragmentErrorM,x.distanceTo(a.clone().lerp(b,f.range[0])),y.distanceTo(a.clone().lerp(b,f.range[1])));}}assert(maximumFragmentErrorM<1e-5);
const g=route.geometry,[start,end]=g.floorEndpointsRenderer||g.sourceEndpointsRenderer,O=new T.Vector3(...start),F=new T.Vector3(...end).sub(O);F.y=0;F.normalize();const S=new T.Vector3(-F.z,0,F.x),rise=(end[1]-start[1])/g.lengthM,world=p=>O.clone().addScaledVector(F,p[0]).addScaledVector(S,p[1]).add(new T.Vector3(0,p[2]+rise*p[0],0));
function inside(point,p){const ps=p.vertices.map(vector),centroid=ps.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/ps.length);for(let i=0;i<24;i+=4){const face=center(p,i),axis=face.clone().sub(centroid),half=axis.length();assert(half>1e-6);axis.multiplyScalar(1/half);if(point.clone().sub(centroid).dot(axis)>half+1e-5)return false;}return true;}
let maximumAttachmentErrorM=0;
for(const a of r.attachments){const point=world(a.point),target=world(a.target),fragments=changed.get(a.parent).fragments.map(f=>byId.get(f.id));const error=Math.min(...fragments.flatMap(p=>line(p).map(v=>v.distanceTo(point))));maximumAttachmentErrorM=Math.max(maximumAttachmentErrorM,error);assert(error<1e-5);assert(inside(target,byId.get(a.frame)));if(a.tie){const tie=byId.get(a.tie);assert(inside(point,tie)&&inside(target,tie));}else assert(inside(point,byId.get(a.frame)));}
const glass=byId.get('central-roof-glazing'),vs=glass.vertices.map(vector);
const meshGeometry=p=>new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,-v.z]),3)).setIndex(p.triangles);
const glassGeometry=meshGeometry(glass),glassBvh=new MeshBVH(glassGeometry),surfaceIntersections=[];
for(const m of r.newMembers){const geometry=meshGeometry(byId.get(m.id));if(glassBvh.intersectsGeometry(geometry,new T.Matrix4()))surfaceIntersections.push(m.id);geometry.dispose();}
const ray=new T.Ray(),up=new T.Vector3(0,1,0);let minGlassGapM=Infinity;const glassIntersections=[];
for(const m of r.newMembers){const p=byId.get(m.id);let gap=Infinity;for(const v of p.vertices){const point=vector(v);ray.set(new T.Vector3(point.x,0,point.z),up);let ceiling=Infinity;for(let i=0;i<glass.triangles.length;i+=3){const hit=ray.intersectTriangle(...glass.triangles.slice(i,i+3).reverse().map(k=>vs[k]),false,new T.Vector3());if(hit)ceiling=Math.min(ceiling,hit.y);}assert(Number.isFinite(ceiling),'New frame vertex outside the registered roof footprint');gap=Math.min(gap,ceiling-point.y);}minGlassGapM=Math.min(minGlassGapM,gap);if(gap<-.00001)glassIntersections.push({id:m.id,minimumGapM:gap});}
const result={parentNativeSha256:sha(pb),nativePanelsSha256:sha(cb),glbSha256:sha(cg),unchangedPanels:unchanged,protectedOuterPanels:protectedCount,changedInnerMembers:changed.size,fragments:r.changedMembers.reduce((n,c)=>n+c.fragments.length,0),newMembers:r.newMembers.length,attachments:r.attachments.length,maximumFragmentErrorM,maximumAttachmentErrorM,minimumNewFrameToGlassGapM:minGlassGapM,glassIntersections,newMemberGlassSurfaceIntersections:surfaceIntersections,pass:glassIntersections.length===0&&surfaceIntersections.length===0};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,glassIntersections:glassIntersections.slice(0,6)},null,2));assert(result.pass,'New bay framing intersects the registered exterior glass; see saved report');
