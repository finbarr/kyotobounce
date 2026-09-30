// Cut only the declared room and stair voids, retaining upper façade attributes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,component]=process.argv.slice(2);assert(manifest.startsWith('.local/'));await MeshoptDecoder.ready;
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(component+'/spec.json'),raw=await readFile(m.layout),layout=JSON.parse(raw),original=await readFile(m.geometry),{json:j,bin}=readGLB(original);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(original),m.geometrySha256);
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
const panels=Object.keys(spec.cuts).filter(id=>id!=='concourse').map(id=>layout.panels.find(p=>p.id===id));assert(panels.every(Boolean));
const targets=new Map(),outputs=new Map(panels.map(p=>[p.id,[]])),coverage=Object.fromEntries(panels.map(p=>[p.id,0]));
for(const p of panels)for(let i=0;i<p.triangles.length;i+=3){const label=layout.authoredMaterials.find(m=>m.id===p.appearance).label,k=label+'|'+key(p.triangles.slice(i,i+3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];}));assert(!targets.has(k));targets.set(k,p.id);}
const matchedHorizontalArea=Object.fromEntries(panels.map(p=>[p.id,0])),matchedArea=Object.fromEntries(panels.map(p=>[p.id,0])),sourceFaces=panels.map(p=>({id:p.id,label:layout.authoredMaterials.find(m=>m.id===p.appearance).label,triangles:Array.from({length:p.triangles.length/3},(_,i)=>new T.Triangle(...p.triangles.slice(i*3,i*3+3).toReversed().map(i=>{const v=p.vertices[i];return new T.Vector3(v.x,v.y,-v.z);}))) }));
const triangleArea=vs=>new T.Triangle(...vs.map(v=>new T.Vector3(...v))).getArea();
function fragmentOwner(label,positions){const vs=positions.map(v=>new T.Vector3(...v)),normal=new T.Triangle(...vs).getNormal(new T.Vector3()),center=vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3);return sourceFaces.find(p=>p.label===label&&[...vs,center].every(v=>p.triangles.some(t=>t.getNormal(new T.Vector3()).dot(normal)>.999&&t.closestPointToPoint(v,new T.Vector3()).distanceTo(v)<.00015)))?.id;}
const cache=new Map();function values(ai){if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const result=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,result);return result;}
function clip(poly,axis,value,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.POSITION[axis]-value)*sign,db=(b.POSITION[axis]-value)*sign;if(da>=0)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db),v=Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((n,i)=>n+(b[k][i]-n)*t)]));v.POSITION[axis]=value;out.push(v);}}return out;}
function retain(tri,volume){
 const bounds=[volume[0],volume[1],[-volume[2][1],-volume[2][0]]];
 if(bounds.some(([a,b],k)=>tri.every(v=>v.POSITION[k]<=a)||tri.every(v=>v.POSITION[k]>=b)))return[tri];
 const outside=[];let inside=tri;
 for(let k=0;k<3;k++)for(const [value,sign]of [[bounds[k][0],1],[bounds[k][1],-1]]){outside.push(clip(inside,k,value,-sign));inside=clip(inside,k,value,sign);}
 return outside.flatMap(p=>Array.from({length:Math.max(0,p.length-2)},(_,i)=>[p[0],p[i+1],p[i+2]]));
}
const parts=[bin];let offset=bin.length;
function data(array,type,count,target){const b=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target});parts.push(b);offset+=b.length;const ai=j.accessors.length;j.accessors.push({bufferView:view,componentType:array instanceof Float32Array?5126:5125,count,type});return ai;}
let changed=0,unchanged=0;
for(const [mi,mesh]of j.meshes.entries()){
 for(const p of mesh.primitives){const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!panels.some(p=>layout.authoredMaterials.find(m=>m.id===p.appearance).label===label))continue;
  for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
  const attributes=Object.fromEntries(Object.entries(p.attributes).map(([k,a])=>[k,values(a)]));assert(attributes.NORMAL&&Object.keys(attributes).every(k=>['POSITION','NORMAL','TEXCOORD_0'].includes(k)));
  const ix=values(p.indices).flat(),keep=[];let hits=0;
  for(let i=0;i<ix.length;i+=3){const indices=ix.slice(i,i+3),k=label+'|'+key(indices.map(i=>attributes.POSITION[i])),id=targets.get(k)||fragmentOwner(label,indices.map(i=>attributes.POSITION[i]));if(!id){keep.push(...indices);continue;}targets.delete(k);coverage[id]++;const positions=indices.map(i=>attributes.POSITION[i]),area=triangleArea(positions);matchedArea[id]+=area;if(positions.every(v=>Math.abs(v[1]-positions[0][1])<1e-5))matchedHorizontalArea[id]+=area;hits++;
  }
  if(!hits)continue;changed++;p.indices=data(new Uint32Array(keep),'SCALAR',keep.length,34963);
 }
}
const areaCoverage=sourceFaces.map(p=>{const wanted=p.triangles.reduce((n,t)=>n+t.getArea(),0),horizontal=p.triangles.filter(t=>[t.a,t.b,t.c].every(v=>Math.abs(v.y-t.a.y)<1e-5)).reduce((n,t)=>n+t.getArea(),0);return{id:p.id,matched:matchedArea[p.id],wanted,horizontal,matchedHorizontal:matchedHorizontalArea[p.id],verticalError:matchedArea[p.id]-matchedHorizontalArea[p.id]-wanted+horizontal};});
// The old exporter omitted portions of buried horizontal closure faces. Reconstruct those
// closures from the native authored surfaces; all exposed faces must match.
// The old hotel recess export also omits 0.0072 m² of its thin buried rim.
// Restore that closure from the canonical panel together with the shaft cut.
assert(areaCoverage.every(r=>Math.abs(r.verticalError)<Math.max(spec.componentPrefix==='granvia-parking-'&&r.id==='east-frontage-recess-floor'?.008:.005,r.wanted*1e-6)&&r.matchedHorizontal<=r.horizontal+.005),'Exposed browser coverage differences '+JSON.stringify(areaCoverage.filter(r=>Math.abs(r.verticalError)>.005)));
const groups=new Map();
for(const p of panels){
 const label=layout.authoredMaterials.find(m=>m.id===p.appearance).label;assert(!p.uv||spec.componentPrefix==='granvia-parking-','Only the declared hotel cuts edit textured surfaces');
 assert(p.normals||spec.componentPrefix==='isetan-north-core-'&&p.id.startsWith('isetan-')||['isetan-second-','isetan-third-','isetan-fourth-','isetan-fifth-','isetan-sixth-'].includes(spec.componentPrefix)&&p.id.startsWith('isetan-ground-')&&p.role==='foundation'||['isetan-fourth-','isetan-fifth-','isetan-sixth-'].includes(spec.componentPrefix)&&p.id.startsWith('north-side-')&&p.role==='parapet','Preserve authored facade normals: '+p.id);
 const fragments=[];
 for(let i=0;i<p.triangles.length;i+=3){const ids=p.triangles.slice(i,i+3).toReversed(),positions=ids.map(i=>[p.vertices[i].x,p.vertices[i].y,-p.vertices[i].z]),normal=new T.Triangle(...positions.map(v=>new T.Vector3(...v))).getNormal(new T.Vector3()).toArray(),tri=ids.map((i,k)=>({POSITION:positions[k],NORMAL:p.normals?[p.normals[i].x,p.normals[i].y,-p.normals[i].z]:normal,...(p.uv?{TEXCOORD_0:[p.uv[i].x,1-p.uv[i].y]}:{})})),kept=(['isetan-fourth-','isetan-fifth-','isetan-sixth-','isetan-sixth-north-','isetan-north-core-'].includes(spec.componentPrefix)?spec.cuts[p.id]:[spec.cuts[p.id]]).reduce((rows,bounds)=>rows.flatMap(row=>retain(row,bounds)),[tri]);if(kept.length===1&&kept[0]===tri)unchanged++;
  // Discard slivers that collapse when positions are encoded as float32.
  // Otherwise Blender receives a zero-area face with no valid corner normal.
  for(const t of kept)if(triangleArea(t.map(v=>v.POSITION.map(Math.fround)))>1e-8)fragments.push(...t.map(v=>({...v,NORMAL:v.NORMAL.map(n=>n/Math.hypot(...v.NORMAL))})));
 }
 outputs.set(p.id,fragments);if(!groups.has(label))groups.set(label,[]);groups.get(label).push(...fragments);
}
for(const [label,vs]of groups){const material=j.materials.findIndex(m=>m.name.replace(/ \| Browser$/,'')===label);assert(material>=0);const attrs={POSITION:data(new Float32Array(vs.flatMap(v=>v.POSITION)),'VEC3',vs.length,34962),NORMAL:data(new Float32Array(vs.flatMap(v=>v.NORMAL)),'VEC3',vs.length,34962)};if(vs[0].TEXCOORD_0){assert(vs.every(v=>v.TEXCOORD_0));attrs.TEXCOORD_0=data(new Float32Array(vs.flatMap(v=>v.TEXCOORD_0)),'VEC2',vs.length,34962);}j.meshes.push({primitives:[{attributes:attrs,indices:data(new Uint32Array(vs.map((_,i)=>i)),'SCALAR',vs.length,34963),material,mode:4}]});j.nodes.push({name:spec.componentPrefix+'opening | '+label,mesh:j.meshes.length-1});j.scenes[j.scene||0].nodes.push(j.nodes.length-1);}

for(const p of panels){const vs=outputs.get(p.id);assert(vs.length,'Fully removed panels belong in the retirement list: '+p.id);p.vertices=vs.map(v=>({x:Math.fround(v.POSITION[0]),y:Math.fround(v.POSITION[1]),z:Math.fround(-v.POSITION[2])}));p.triangles=vs.flatMap((_,i)=>i%3?[]:[i+2,i+1,i]);p.normals=vs.map(v=>({x:Math.fround(v.NORMAL[0]),y:Math.fround(v.NORMAL[1]),z:Math.fround(-v.NORMAL[2])}));if(vs[0].TEXCOORD_0)p.uv=vs.map(v=>({x:Math.fround(v.TEXCOORD_0[0]),y:1-Math.fround(v.TEXCOORD_0[1])}));}
for(const id of spec.modifiedFlightIds){const f=layout.flights.find(f=>f.id===id);assert(f?.foundationDepth>0);f.foundationDepth=0;}
j.buffers[0].byteLength=offset;const output=writeGLB(j,Buffer.concat(parts)),newRaw=JSON.stringify(layout)+'\n',station=await read(m.station);station.layoutSha256=sha(newRaw);
const next={...m,layoutSha256:sha(newRaw),geometrySha256:sha(output)};await writeFile(m.layout,newRaw);await writeFile(m.geometry,output);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(manifest,JSON.stringify(next,null,2)+'\n');
const removal=await read(manifest.replace('assets.json','removal.json'));removal.preparedLayoutSha256=next.layoutSha256;removal.removedIds=spec.retiredIds;removal.modifiedFlightIds=spec.modifiedFlightIds;removal.modifiedPanelIds=Object.keys(spec.cuts);removal.retainedBufferBytesExact=removal.retainedBufferBytesExact??removal.inheritedBufferBytesUnchanged;await writeFile(manifest.replace('assets.json','removal.json'),JSON.stringify(removal,null,2)+'\n');
await writeFile(component+'/opening.json',JSON.stringify({pass:true,parentLayoutSha256:m.layoutSha256,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,modifiedPanelIds:panels.map(p=>p.id),coverage,areaCoverage,retainedWholeTriangles:unchanged,changedPrimitives:changed,cuts:spec.cuts,retainedEncodedBufferBytesExact:readGLB(output).bin.subarray(0,bin.length).equals(bin)},null,2)+'\n');console.log('Opened Isetan room and stair voids',panels.length,'panels');
