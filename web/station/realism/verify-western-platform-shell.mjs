// Check the selective shell opening independently against both exported scenes.
import assert from 'node:assert/strict';
import {MeshoptDecoder} from 'meshoptimizer';
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
const pos=v=>[v.x,v.y,-v.z];
export async function verifyWesternShell(parent,candidate,old,next,report){
 await MeshoptDecoder.ready;
 const ids=report.geometry.modifiedPanelIds;
 assert.equal(report.componentPrefix,'western-platforms-');
 assert.deepEqual(ids,['municipal-station-wing-west-Untitled.199','municipal-station-wing-west-Untitled.201','municipal-station-wing-west-Untitled.203','west-south-west-return-0']);
 const label=p=>old.authoredMaterials.find(m=>m.id===p.appearance).label;
 const targets=new Map(),removed=new Set();
 for(const p of old.panels.filter(p=>ids.includes(p.id)||report.geometry.retiredIds.includes(p.id)))for(let i=0;i<p.triangles.length;i+=3){
  const k=label(p)+'|'+key(p.triangles.slice(i,i+3).map(i=>pos(p.vertices[i])));
  if(ids.includes(p.id))targets.set(k,p.id);else removed.add(k);
 }
 const expected=new Map();let nativeTriangles=0;
 for(const p of next.panels.filter(p=>ids.includes(p.id))){
  assert(p.normals&&p.normals.length===p.vertices.length);
  for(let i=0;i<p.triangles.length;i+=3){const vertices=p.triangles.slice(i,i+3).reverse().map(i=>({POSITION:pos(p.vertices[i]),NORMAL:pos(p.normals[i]),...(p.uv?{TEXCOORD_0:[p.uv[i].x,1-p.uv[i].y]}:{})})),k=label(p)+'|'+key(vertices.map(v=>v.POSITION));assert(!expected.has(k));expected.set(k,vertices);nativeTriangles++;}
 }
 function reader({json:j,bin}){const cache=new Map();return ai=>{
  if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);
  let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
  const result=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,result);return result;
 };}
 const before=reader(parent),after=reader(candidate),seen=new Set(),allPrimitives=candidate.json.meshes.flatMap(m=>m.primitives),matched=new Set(),meshMap=new Map();let intactFaces=0,upperFaces=0;
 function vertices(p,ix,get){return ix.map(i=>Object.fromEntries(Object.entries(p.attributes).map(([name,a])=>[name,get(a)[i]])));}
 function sameAttributes(a,b){const start=b.findIndex(v=>key([v.POSITION])===key([a[0].POSITION]));assert(start>=0&&a.every((v,i)=>key([v.POSITION])===key([b[(start+i)%3].POSITION])),'Triangle winding differs');for(const v of a){const match=b.find(w=>key([w.POSITION])===key([v.POSITION]));assert(match);for(const name of Object.keys(v))for(let k=0;k<v[name].length;k++)assert(Math.abs(v[name][k]-match[name][k])<(name==='NORMAL'?1e-6:1e-5),name+' differs');}}
 // Identify the one pre-existing subdivided underside face with its exact
 // elevation and a float32-sized (30 micrometre) edge tolerance.
 const u=[[-229.07763671875,-.47690171003341675,-12.149921417236328],[-231.9481964111328,-.47690171003341675,-11.002257347106934],[-233.05638122558594,-.47690171003341675,-12.085630416870117]];
 function underside(v){if(v[1]!==u[0][1])return false;const d=u.map((a,i)=>{const b=u[(i+1)%3];return((b[0]-a[0])*(v[2]-a[2])-(b[2]-a[2])*(v[0]-a[0]))/Math.hypot(b[0]-a[0],b[2]-a[2]);});return Math.min(...d)>=-3e-5||Math.max(...d)<=3e-5;}
 for(const [mi,mesh]of parent.json.meshes.entries()){
  for(const p of mesh.primitives){
   const q=allPrimitives.find(q=>q.material===p.material&&JSON.stringify(q.attributes)===JSON.stringify(p.attributes));if(q){assert.deepEqual({...q,indices:p.indices},p);matched.add(q);meshMap.set(mi,candidate.json.meshes.findIndex(m=>m.primitives.includes(q)));}
   if(q&&p.indices===q.indices){intactFaces+=before(p.indices).length/3;continue;}
   const name=parent.json.materials[p.material].name.replace(/ \| Browser$/,''),ix=before(p.indices).flat(),kept=q?after(q.indices).flat():[],wanted=[];
   for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3),vs=vertices(p,tri,before),k=name+'|'+key(vs.map(v=>v.POSITION)),modified=targets.has(k)||name==='Municipal | Station shell | KYcb0061_a.001'&&vs.every(v=>underside(v.POSITION));
    if(modified){if(vs.every(v=>v.POSITION[1]>=6.5)||vs.every(v=>v.POSITION[2]<=4.8)){assert(expected.has(k),'Uncut original face missing');sameAttributes(vs,expected.get(k));upperFaces++;}}
    else if(!removed.has(k)){wanted.push(...tri);intactFaces++;}
   }
   assert.deepEqual(kept,wanted,'Only selected triangles can be removed from an original primitive');
  }
 }
 const names=new Set(ids.map(id=>label(old.panels.find(p=>p.id===id))));
 for(const p of allPrimitives.filter(p=>!matched.has(p)&&names.has(candidate.json.materials[p.material].name.replace(/ \| Browser$/,'')))){
   const name=candidate.json.materials[p.material].name.replace(/ \| Browser$/,''),ix=after(p.indices).flat();
   for(let i=0;i<ix.length;i+=3){const vs=vertices(p,ix.slice(i,i+3),after),k=name+'|'+key(vs.map(v=>v.POSITION));assert(expected.has(k),'Unexpected shell fragment '+k);assert(!seen.has(k));seen.add(k);sameAttributes(vs,expected.get(k));assert(vs.every(v=>v.POSITION[1]>=6.5-1e-6)||vs.every(v=>v.POSITION[2]<=4.8+1e-6),'Shell still blocks ground opening');}
 }
 assert.equal(seen.size,nativeTriangles);assert(upperFaces>0);
 const nodeMap=new Map(),nodes=parent.json.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh))return false;nodeMap.set(i,nodeMap.size);return true;}).map(n=>({...n,...(n.mesh===undefined?{}:{mesh:meshMap.get(n.mesh)})}));
 for(const n of nodes)if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
 assert.deepEqual(candidate.json.nodes.slice(0,nodes.length),nodes);
 return{modifiedPanels:ids,modifiedTriangles:nativeTriangles,retainedWholeShellFaces:upperFaces,retainedOtherBrowserFaces:intactFaces,shellGeometryUVsNormalsMatch:true};
}
