// Open two doorways while retaining the granite texture coordinates and normals.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(manifest.startsWith('.local/'));await MeshoptDecoder.ready;
const m=await read(manifest),spec=await read(component+'/spec.json'),layout=await read(m.layout),input=await readFile(m.geometry);assert.equal(sha(input),m.geometrySha256);
const {json:j,bin}=readGLB(input),targets=new Map(),coverage={},nativeArea={},browserArea={};
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
const area=t=>{const a=t[1].p.map((v,i)=>v-t[0].p[i]),b=t[2].p.map((v,i)=>v-t[0].p[i]);return Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2;};
function clip(poly,axis,bound,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.p[axis]-bound),db=sign*(b.p[axis]-bound);if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((n,i)=>n+(b[k][i]-n)*t)])));}}return out;}
function cut(tri,id){const v=spec.wallCuts[id],bounds=[v[0],v[1],[-v[2][1],-v[2][0]]];if(bounds.some(([lo,hi],k)=>tri.every(v=>v.p[k]<=lo)||tri.every(v=>v.p[k]>=hi)))return[tri];let inside=tri;const outside=[];for(let axis=0;axis<3;axis++)for(const[b,s]of[[bounds[axis][0],1],[bounds[axis][1],-1]]){outside.push(clip(inside,axis,b,-s));inside=clip(inside,axis,b,s);}return outside.flatMap(p=>Array.from({length:Math.max(0,p.length-2)},(_,i)=>[p[0],p[i+1],p[i+2]])).filter(t=>area(t)>1e-9);}
const originals={};
for(const id of Object.keys(spec.wallCuts)){
 const p=layout.panels.find(p=>p.id===id);assert(p?.uv&&p.normals);originals[id]=structuredClone(p);coverage[id]=0;nativeArea[id]=0;browserArea[id]=0;
 const label=layout.authoredMaterials.find(m=>m.id===p.appearance).label,kept=[];
 for(let i=0;i<p.triangles.length;i+=3){const t=p.triangles.slice(i,i+3).toReversed().map(k=>({p:[p.vertices[k].x,p.vertices[k].y,-p.vertices[k].z],n:[p.normals[k].x,p.normals[k].y,-p.normals[k].z],uv:[p.uv[k].x,1-p.uv[k].y]})),k=label+'|'+key(t.map(v=>v.p));assert(!targets.has(k));targets.set(k,id);const rows=cut(t,id);nativeArea[id]+=area(t)-rows.reduce((n,t)=>n+area(t),0);kept.push(...rows);}
 const vs=kept.flat();p.vertices=vs.map(v=>({x:Math.fround(v.p[0]),y:Math.fround(v.p[1]),z:Math.fround(-v.p[2])}));p.normals=vs.map(v=>({x:v.n[0],y:v.n[1],z:-v.n[2]}));p.uv=vs.map(v=>({x:Math.fround(v.uv[0]),y:Math.fround(1-v.uv[1])}));p.triangles=vs.flatMap((_,i)=>i%3?[]:[i+2,i+1,i]);
}
const cache=new Map();function values(ai){if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const result=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,result);return result;}
const parts=[bin];let offset=bin.length;
function append(v,w,int=false){const a=int?new Uint32Array(v):new Float32Array(v),b=Buffer.from(a.buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:int?34963:34962});parts.push(b);offset+=b.length;const i=j.accessors.length;j.accessors.push({bufferView:view,componentType:int?5125:5126,count:v.length/w,type:{1:'SCALAR',2:'VEC2',3:'VEC3'}[w]});return i;}
const meshes=[];
for(const [mi,mesh]of j.meshes.entries())for(const p of mesh.primitives){const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!Object.values(originals).some(p=>layout.authoredMaterials.find(m=>m.id===p.appearance).label===label))continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const pos=values(p.attributes.POSITION),normal=values(p.attributes.NORMAL),uv=values(p.attributes.TEXCOORD_0),ix=values(p.indices).flat(),keep=[],added=[];
 for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3),id=targets.get(label+'|'+key(ids.map(i=>pos[i])));if(!id){keep.push(...ids);continue;}coverage[id]++;const t=ids.map(i=>({p:pos[i],n:normal[i],uv:uv[i]})),rows=cut(t,id);browserArea[id]+=area(t)-rows.reduce((n,t)=>n+area(t),0);added.push(...rows.flat());}
 if(!added.length)continue;p.indices=append(keep,1,true);meshes.push({primitives:[{material:p.material,mode:4,attributes:{POSITION:append(added.flatMap(v=>v.p),3),NORMAL:append(added.flatMap(v=>v.n),3),TEXCOORD_0:append(added.flatMap(v=>v.uv),2)},indices:append(added.map((_,i)=>i),1,true)}]});
}
for(const id of Object.keys(originals)){assert.equal(coverage[id],originals[id].triangles.length/3,id+' browser coverage');assert(Math.abs(nativeArea[id]-browserArea[id])<.0001);assert(nativeArea[id]>15);}
for(const mesh of meshes){j.nodes.push({name:'Granvia entrance | retained granite doorway',mesh:j.meshes.length});j.meshes.push(mesh);j.scenes[j.scene||0].nodes.push(j.nodes.length-1);}
j.buffers[0].byteLength=offset;const output=writeGLB(j,Buffer.concat(parts)),raw=JSON.stringify(layout)+'\n',station=await read(m.station);m.layoutSha256=sha(raw);m.geometrySha256=sha(output);station.layoutSha256=m.layoutSha256;
await writeFile(m.layout,raw);await writeFile(m.geometry,output);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');
await writeFile(component+'/wall-openings.json',JSON.stringify({pass:true,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,coverage,nativeArea,browserArea,retainedEncodedBytesExact:readGLB(output).bin.subarray(0,bin.length).equals(bin),originals},null,2)+'\n');console.log('Granvia passage doors opened',coverage);
