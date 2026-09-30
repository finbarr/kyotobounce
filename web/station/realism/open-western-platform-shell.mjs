// Open the ground railway beneath the coarse western building shell, preserving
// the original upper facade attributes and all unrelated encoded geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,component]=process.argv.slice(2);assert(manifest.startsWith('.local/'));await MeshoptDecoder.ready;
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),report=await read(component+'/report.json'),raw=await readFile(m.layout),layout=JSON.parse(raw),oldGLB=await readFile(m.geometry),{json:j,bin}=readGLB(oldGLB);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(oldGLB),m.geometrySha256);
const ids=report.geometry.modifiedPanelIds,panels=ids.map(id=>layout.panels.find(p=>p.id===id));assert(panels.every(Boolean));
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|'),targets=new Map(),outputs=new Map(ids.map(id=>[id,[]])),coverage=Object.fromEntries(ids.map(id=>[id,0]));
for(const p of panels){const label=layout.authoredMaterials.find(m=>m.id===p.appearance).label;for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(k=>{const v=p.vertices[k];return[v.x,v.y,-v.z];}));assert(!targets.has(k),'Duplicate target triangle');targets.set(k,p.id);}}
// The existing browser exporter subdivided this one buried underside triangle
// around a coplanar installation. Preserve its actual exported fragments.
const underside=[[-229.07763671875,-.47690171003341675,-12.149921417236328],[-231.9481964111328,-.47690171003341675,-11.002257347106934],[-233.05638122558594,-.47690171003341675,-12.085630416870117]],undersideKey='Municipal | Station shell | KYcb0061_a.001|'+key(underside),undersideId=targets.get(undersideKey);assert.equal(undersideId,'municipal-station-wing-west-Untitled.199');targets.delete(undersideKey);let undersideFragments=0,undersideArea=0;
const signedArea=([a,b,c])=>((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))/2;
function inUnderside(v){if(Math.abs(v[1]-underside[0][1])>1e-7)return false;const signs=underside.map((a,i)=>{const b=underside[(i+1)%3];return((b[0]-a[0])*(v[2]-a[2])-(b[2]-a[2])*(v[0]-a[0]))/Math.hypot(b[0]-a[0],b[2]-a[2]);});return Math.min(...signs)>=-3e-5||Math.max(...signs)<=3e-5;}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={VEC2:2,VEC3:3,VEC4:4,SCALAR:1}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>{const off=(a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes;return b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE'](off);}));}
function clip(poly,axis,value,above){const out=[],sign=above?1:-1;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.POSITION[axis]-value)*sign,db=(b.POSITION[axis]-value)*sign;if(da>=0)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db),v=Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((n,i)=>n+(b[k][i]-n)*t)]));v.POSITION[axis]=value;out.push(v);}}return out;}
// Renderer Z is the negative of native Z. Keep everything above Y6.5 or
// north of native Z-4.8. The new ceiling and north wall close these cut edges.
function retain(triangle){const upper=clip(triangle,1,6.5,true),lower=clip(triangle,1,6.5,false),north=clip(lower,2,4.8,false);return[upper,north].flatMap(poly=>Array.from({length:Math.max(0,poly.length-2)},(_,i)=>[poly[0],poly[i+1],poly[i+2]]));}
const parts=[bin];let offset=bin.length;
function data(array,type,count,target){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});parts.push(bytes);offset+=bytes.length;const id=j.accessors.length;j.accessors.push({bufferView:view,componentType:array instanceof Float32Array?5126:5125,count,type});return id;}
let untouchedTriangles=0,changedPrimitives=0;
for(const [mi,mesh]of j.meshes.entries()){
 const additions=[];
 for(const p of mesh.primitives){const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!panels.some(p=>layout.authoredMaterials.find(m=>m.id===p.appearance).label===label))continue;
  for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
  const attributes=Object.fromEntries(Object.entries(p.attributes).map(([name,ai])=>[name,values(ai)]));assert(attributes.NORMAL);assert(Object.keys(attributes).every(k=>['POSITION','NORMAL','TEXCOORD_0'].includes(k)));
  const ix=values(p.indices).flat(),keep=[],fragment=[];let hits=0;
  for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3),positions=tri.map(i=>attributes.POSITION[i]),k=label+'|'+key(positions);let id=targets.get(k);if(!id&&label==='Municipal | Station shell | KYcb0061_a.001'&&positions.every(inUnderside)){id=undersideId;undersideFragments++;undersideArea+=Math.abs(signedArea(positions));}if(!id){keep.push(...tri);continue;}targets.delete(k);coverage[id]++;hits++;
   const original=tri.map(i=>Object.fromEntries(Object.entries(attributes).map(([k,v])=>[k,v[i]]))),kept=original.every(v=>v.POSITION[1]>=6.5||v.POSITION[2]<=4.8)&& (original.every(v=>v.POSITION[1]>=6.5)||original.every(v=>v.POSITION[2]<=4.8))?[original]:retain(original);
   if(kept.length===1&&kept[0]===original)untouchedTriangles++;
   for(const t of kept){const [a,b,c]=t.map(v=>v.POSITION),u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]),area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);if(area<1e-9)continue;fragment.push(...t);outputs.get(id).push(...t);}
  }
  if(!hits)continue;changedPrimitives++;p.indices=data(new Uint32Array(keep),'SCALAR',keep.length,34963);
  if(fragment.length){const attrs={};for(const name of Object.keys(attributes)){const width=fragment[0][name].length;attrs[name]=data(new Float32Array(fragment.flatMap(v=>v[name])),'VEC'+width,fragment.length,34962);}additions.push({attributes:attrs,indices:data(new Uint32Array(fragment.map((_,i)=>i)),'SCALAR',fragment.length,34963),material:p.material,mode:4});}
 }
 mesh.primitives.push(...additions);
}
assert.equal(targets.size,0,'Every selected source triangle must match the browser: '+JSON.stringify([...targets]));
assert(undersideFragments===6&&undersideArea>Math.abs(signedArea(underside))*.999&&undersideArea<=Math.abs(signedArea(underside))+1e-5,JSON.stringify({undersideFragments,undersideArea,originalArea:Math.abs(signedArea(underside))}));
for(const p of panels){assert.equal(coverage[p.id],p.triangles.length/3+(p.id===undersideId?undersideFragments-1:0));const vs=outputs.get(p.id);assert(vs.length>0);p.vertices=vs.map(v=>({x:Math.fround(v.POSITION[0]),y:Math.fround(v.POSITION[1]),z:Math.fround(-v.POSITION[2])}));p.triangles=vs.flatMap((_,i)=>i%3?[]:[i+2,i+1,i]);p.normals=vs.map(v=>{const n=v.NORMAL,length=Math.hypot(...n);return{x:n[0]/length,y:n[1]/length,z:-n[2]/length};});if(vs[0].TEXCOORD_0)p.uv=vs.map(v=>({x:v.TEXCOORD_0[0],y:1-v.TEXCOORD_0[1]}));}
// Normalize interpolated normals in the browser too. GLSL would normalize them
// during shading, but source/native attributes must agree before rendering.
for(const mesh of j.meshes)for(const p of mesh.primitives){const a=j.accessors[p.attributes.NORMAL],view=j.bufferViews[a.bufferView];if(view.byteOffset<bin.length)continue;const b=parts.find((_,i)=>parts.slice(0,i).reduce((n,b)=>n+b.length,0)===view.byteOffset);assert(b);for(let i=0;i<a.count;i++){const o=i*12,n=[0,4,8].map(k=>b.readFloatLE(o+k)),length=Math.hypot(...n);for(let k=0;k<3;k++)b.writeFloatLE(n[k]/length,o+k*4);}}
j.buffers[0].byteLength=offset;const output=writeGLB(j,Buffer.concat(parts)),newRaw=JSON.stringify(layout)+'\n',station=await read(m.station);station.layoutSha256=sha(newRaw);
const next={...m,layoutSha256:sha(newRaw),geometrySha256:sha(output)};await writeFile(m.layout,newRaw);await writeFile(m.geometry,output);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(manifest,JSON.stringify(next,null,2)+'\n');
const removal=await read(manifest.replace('assets.json','removal.json'));removal.preparedLayoutSha256=next.layoutSha256;removal.modifiedPanelIds=ids;await writeFile(manifest.replace('assets.json','removal.json'),JSON.stringify(removal,null,2)+'\n');
await writeFile(component+'/shell-opening.json',JSON.stringify({pass:true,parentLayoutSha256:m.layoutSha256,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,modifiedPanelIds:ids,coverage,retainedWholeTriangles:untouchedTriangles,changedPrimitives,cut:{top:6.5,north:-4.8},existingUnderside:{id:undersideId,vertices:underside,fragments:undersideFragments,originalArea:Math.abs(signedArea(underside)),exportedArea:undersideArea},retainedEncodedBufferBytesExact:readGLB(output).bin.subarray(0,bin.length).equals(bin)},null,2)+'\n');console.log('Opened western shell',coverage);
