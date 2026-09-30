// Independent area, boundary and export checks for the fitted room/stair cuts.
import assert from 'node:assert/strict';
import {MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
const pos=v=>[v.x,v.y,-v.z];
const area=vs=>new T.Triangle(...vs.map(v=>new T.Vector3(...v))).getArea();
function insidePolygon(triangle,bounds){
 let polygon=triangle.map(p=>p.slice());
 for(let axis=0;axis<3;axis++)for(const [edge,sign]of [[bounds[axis][0],1],[bounds[axis][1],-1]]){
  const next=[];
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],q=polygon[(i+1)%polygon.length],d=(p[axis]-edge)*sign,e=(q[axis]-edge)*sign;
   if(d>=0)next.push(p);
   if(d*e<0){const t=d/(d-e);next.push(p.map((v,k)=>k===axis?edge:v+(q[k]-v)*t));}
  }
  polygon=next;
 }
 return polygon;
}
function reader({json:j,bin}){const cache=new Map();return ai=>{if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const result=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,result);return result;};}
export async function verifyIsetanOpenings(parent,candidate,old,next,report,spec){
 await MeshoptDecoder.ready;assert(['isetan-ground-','isetan-second-','granvia-entrance-'].includes(report.componentPrefix));
 const cuts=report.componentPrefix==='granvia-entrance-'?{concourse:report.geometry.pits.map(p=>[[p.minX,p.maxX],[-.7,.1],[p.minZ,p.maxZ]]),...Object.fromEntries(Object.entries(spec.wallCuts).map(([id,bounds])=>[id,[bounds]]))}:Object.fromEntries(Object.entries(spec.cuts).map(([id,bounds])=>[id,[bounds]]));
 assert.deepEqual(report.geometry.modifiedPanelIds,Object.keys(cuts));
 const expected=new Map(),areaChecks=[];let nativeTriangles=0,wholeFaces=0;
 for(const id of report.geometry.modifiedPanelIds){
  const a=old.panels.find(p=>p.id===id),b=next.panels.find(p=>p.id===id),bounds=cuts[id][0],label=old.authoredMaterials.find(m=>m.id===a.appearance)?.label||a.appearance;assert(a&&b);
  if(id==='concourse'){
   const total=p=>Array.from({length:p.triangles.length/3},(_,i)=>area(p.triangles.slice(i*3,i*3+3).map(i=>p.vertices[i]).map(v=>[v.x,v.y,v.z]))).reduce((a,b)=>a+b,0);
   const removed=cuts[id].reduce((sum,b)=>sum+2*(b[0][1]-b[0][0])*(b[2][1]-b[2][0]),0),rim=cuts[id].reduce((sum,b)=>sum+2*((b[0][1]-b[0][0])+(b[2][1]-b[2][0]))*.6000000238418579,0);
   assert(Math.abs(total(a)-total(b)-removed+rim)<.01,'Concourse hole and reveal area');
   for(const bounds of cuts[id])for(let i=0;i<b.triangles.length;i+=3){const vs=b.triangles.slice(i,i+3).map(i=>b.vertices[i]).map(v=>[v.x,v.y,v.z]);assert(bounds.some(([lo,hi],k)=>vs.every(v=>v[k]<=lo+2e-5)||vs.every(v=>v[k]>=hi-2e-5)),'Concourse still closes opening');}
   areaChecks.push({id,removedArea:removed,rimArea:rim});continue;
  }
  assert(b.normals);
  assert.deepEqual({...b,vertices:a.vertices,triangles:a.triangles,normals:a.normals,uv:a.uv},{...a,normals:a.normals,uv:a.uv});
  const original=[];let oldArea=0,cutArea=0,newArea=0;
  for(let i=0;i<a.triangles.length;i+=3){const triangle=a.triangles.slice(i,i+3).map(i=>a.vertices[i]),vs=triangle.map(v=>[v.x,v.y,v.z]),poly=insidePolygon(vs,bounds);oldArea+=area(vs);for(let n=1;n+1<poly.length;n++)cutArea+=area([poly[0],poly[n],poly[n+1]]);original.push(vs);}
  const retainedKeys=new Set();
  for(let i=0;i<b.triangles.length;i+=3){const ix=b.triangles.slice(i,i+3),vs=ix.map(i=>b.vertices[i]).map(v=>[v.x,v.y,v.z]);newArea+=area(vs);
   assert(bounds.some(([lo,hi],k)=>vs.every(v=>v[k]<=lo+2e-5)||vs.every(v=>v[k]>=hi-2e-5)),id+' still crosses the intended void');
   assert(original.some(tri=>{const t=new T.Triangle(...tri.map(v=>new T.Vector3(...v)));return vs.every(v=>t.closestPointToPoint(new T.Vector3(...v),new T.Vector3()).distanceTo(new T.Vector3(...v))<5e-5);}),id+' moved outside the original surface');
   const vertices=ix.toReversed().map(i=>({POSITION:pos(b.vertices[i]),NORMAL:pos(b.normals[i]),...(b.uv?{TEXCOORD_0:[b.uv[i].x,1-b.uv[i].y]}:{})})),k=label+'|'+key(vertices.map(v=>v.POSITION));assert(!expected.has(k));expected.set(k,vertices);retainedKeys.add(key(vs));nativeTriangles++;
  }
  for(const tri of original)if(bounds.some(([lo,hi],k)=>tri.every(v=>v[k]<=lo)||tri.every(v=>v[k]>=hi))){assert(retainedKeys.has(key(tri)),id+' lost a whole face outside the opening');wholeFaces++;}
  const error=Math.abs(oldArea-cutArea-newArea);assert(error<Math.max(.004,oldArea*2e-6),id+' surface area mismatch '+error);areaChecks.push({id,oldArea,cutArea,newArea,error});
 }
 const after=reader(candidate),before=reader(parent),seen=new Set(),oldBufferSize=parent.bin.length;
 function floorArea(g,get,check){let sum=0;for(const mesh of g.json.meshes)for(const p of mesh.primitives){if(g.json.materials[p.material].name!=='Atrium | honed granite floor | Browser')continue;const vs=get(p.attributes.POSITION),ix=get(p.indices).flat();for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3).map(i=>vs[i]);sum+=area(tri);if(check)for(const bounds of cuts.concourse){const poly=insidePolygon(tri.map(v=>[v[0],v[1],-v[2]]),bounds.map(([lo,hi],k)=>k===1?[lo,hi]:[lo+.0001,hi-.0001]));let cut=0;for(let k=1;k+1<poly.length;k++)cut+=area([poly[0],poly[k],poly[k+1]]);assert(cut<.0003,'Browser floor still closes stair');}}}return sum;}
 const floorCheck=areaChecks.find(r=>r.id==='concourse');if(floorCheck)assert(Math.abs(floorArea(parent,before,false)-floorArea(candidate,after,true)-floorCheck.removedArea+floorCheck.rimArea)<.01,'Browser concourse opening area');
 for(const mesh of candidate.json.meshes)for(const p of mesh.primitives){const a=candidate.json.accessors[p.attributes.POSITION],view=candidate.json.bufferViews[a.bufferView];if((view.byteOffset||0)<oldBufferSize)continue;
  const label=candidate.json.materials[p.material].name.replace(/ \| Browser$/,''),ps=after(p.attributes.POSITION),ns=after(p.attributes.NORMAL),uv=p.attributes.TEXCOORD_0===undefined?null:after(p.attributes.TEXCOORD_0),ix=after(p.indices).flat();
  for(let i=0;i<ix.length;i+=3){const indices=ix.slice(i,i+3),vs=indices.map(i=>ps[i]),k=label+'|'+key(vs),want=expected.get(k);if(!want)continue;assert(!seen.has(k),'Duplicate browser face');seen.add(k);
   const start=want.findIndex(v=>key([v.POSITION])===key([vs[0]]));assert(start>=0);for(let n=0;n<3;n++){const v=want[(start+n)%3],at=indices[n];assert.deepEqual(vs[n],v.POSITION);assert(ns[at].every((x,k)=>Math.abs(x-v.NORMAL[k])<1e-6));if(v.TEXCOORD_0)assert(uv[at].every((x,k)=>Math.abs(x-v.TEXCOORD_0[k])<1e-6));}
  }
 }
 assert.equal(seen.size,nativeTriangles,'Each modified native triangle has one browser face');
 return{modifiedPanels:report.geometry.modifiedPanelIds,modifiedTriangles:nativeTriangles,retainedWholeFaces:wholeFaces,openingAreaChecks:areaChecks,openingsGeometryUVsNormalsMatch:true};
}
