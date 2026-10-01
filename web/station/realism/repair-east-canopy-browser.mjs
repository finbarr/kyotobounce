// Delete only the source-identified opaque shell and detached tie faces.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,component]=process.argv.slice(2);assert(component?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),spec=await read(component+'/spec.json'),source=await read(component+'/retired-surfaces.json'),installed=await read(component+'/source-installation.json');
assert.equal(spec.parentGeometrySha256,base.geometrySha256);assert(installed.pass);
const oldRaw=await readFile(base.layout),newRaw=await readFile(component+'/source/station-layout.json');assert.equal(sha(oldRaw),spec.parentLayoutSha256);assert.equal(sha(newRaw),installed.layoutSha256);
const old=JSON.parse(oldRaw),layout=JSON.parse(newRaw),glb=await readFile(base.geometry);assert.equal(sha(glb),base.geometrySha256);const {json:j,bin}=readGLB(glb);await MeshoptDecoder.ready;
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],area=vs=>Math.hypot(...cross(sub(vs[1],vs[0]),sub(vs[2],vs[0])))/2;
const surfaces=source.map(s=>{const n=cross(sub(s.points[1],s.points[0]),sub(s.points[2],s.points[0])),len=Math.hypot(...n),normal=n.map(x=>x/len),center=s.points[0].map((_,a)=>s.points.reduce((n,v)=>n+v[a],0)/s.points.length);assert(len>1e-9);return{...s,label:s.label.replace(/ \| Browser$/,''),normal,area:s.points.slice(2).reduce((n,v,i)=>n+area([s.points[0],s.points[i+1],v]),0),matched:0,edges:s.points.map((v,i)=>{const n=cross(sub(s.points[(i+1)%s.points.length],v),normal);return{v,n,sign:Math.sign(dot(sub(center,v),n))};})};});
const bounds=[0,1,2].map(k=>[Math.min(...source.flatMap(s=>s.points.map(p=>p[k])))-.00015,Math.max(...source.flatMap(s=>s.points.map(p=>p[k])))+.00015]);
const byLabel=new Map();for(const s of surfaces){const rows=byLabel.get(s.label)||[];rows.push(s);byLabel.set(s.label,rows);}
const cache=new Map();function values(ai){if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const rows=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,rows);return rows;}
const inside=(s,vs)=>{const n=cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]));return dot(n,s.normal)>.999*Math.hypot(...n)&&vs.every(v=>Math.abs(dot(sub(v,s.points[0]),s.normal))<.00015&&s.edges.every(e=>e.sign*dot(sub(v,e.v),e.n)>-.00015));};
const parts=[bin],changes=[],empty=new Set();let offset=bin.length;
for(const [mi,mesh]of j.meshes.entries())for(const [pi,p]of mesh.primitives.entries()){
 const label=j.materials[p.material].name.replace(/ \| Browser$/,''),targets=byLabel.get(label);if(!targets)continue;
 for(const node of j.nodes.filter(n=>n.mesh===mi))assert(!node.matrix&&!node.rotation&&!node.scale&&!node.translation);
 const ps=values(p.attributes.POSITION),ix=values(p.indices).flat(),keep=[],removed=[];
 for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3),vs=ids.map(k=>ps[k]);if(!vs.every(v=>v.every((n,k)=>n>=bounds[k][0]&&n<=bounds[k][1]))){keep.push(...ids);continue;}const a=area(vs),s=targets.find(s=>inside(s,vs)&&s.matched+a<=s.area+Math.max(.00003,s.area*2e-6));
  if(!s){keep.push(...ids);continue;}s.matched+=a;removed.push({face:i/3,id:s.id,areaM2:a,points:vs});
 }
 if(!removed.length)continue;
 if(!keep.length){empty.add(p);changes.push({mesh:mi,primitive:pi,oldIndices:p.indices,newIndices:null,removed});continue;}
 const bytes=Buffer.from(new Uint32Array(keep).buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target:34963});parts.push(bytes);offset+=bytes.length;
 const oldIndices=p.indices;p.indices=j.accessors.length;j.accessors.push({bufferView:view,componentType:5125,count:keep.length,type:'SCALAR'});changes.push({mesh:mi,primitive:pi,oldIndices,newIndices:p.indices,removed});
}
const meshMap=new Map();j.meshes=j.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!empty.has(p));if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
const nodeMap=new Map();j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children?.length);return false;}nodeMap.set(i,nodeMap.size);return true;});
for(const n of j.nodes){if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));}for(const scene of j.scenes)scene.nodes=scene.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
const coverage=[...new Set(source.map(s=>s.id))].map(id=>{const ss=surfaces.filter(s=>s.id===id),sourceArea=ss.reduce((n,s)=>n+s.area,0),browserArea=ss.reduce((n,s)=>n+s.matched,0);return{id,sourceArea,browserArea,error:Math.abs(sourceArea-browserArea)};});
await writeFile(component+'/removal-audit.json',JSON.stringify({changes,coverage,unmatched:surfaces.filter(s=>s.area-s.matched>.00003).map(({id,points,area,matched})=>({id,points,area,matched}))})+'\n');
for(const c of coverage)assert(c.error<Math.max(.01,c.sourceArea*2e-6),'Incomplete retirement '+JSON.stringify(c));
j.buffers[0].byteLength=offset;const output=writeGLB(j,Buffer.concat(parts));assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));
const out=component+'/station';await mkdir(out,{recursive:true});
const station=await read(base.station);station.layoutSha256=sha(newRaw);const detail=await read(base.detail);detail.candidateMotionIntegration.layoutSha256=sha(newRaw);
const next={...base,layout:component+'/source/station-layout.json',layoutSha256:sha(newRaw),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json',detail:out+'/atrium-detail.json',motionLayout:component+'/source/station-layout.json',sourceScene:component+'/source/KyotoAtrium.blend',sourceComponents:[]};
await writeFile(next.geometry,output);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(next.detail,JSON.stringify(detail)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
const proof={pass:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,removedTriangles:changes.reduce((s,c)=>s+c.removed.length,0),coverage,retainedBuffersExact:true};await writeFile(component+'/browser-removal.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({removedTriangles:proof.removedTriangles,maximumAreaErrorM2:Math.max(...coverage.map(c=>c.error)),layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256}));
