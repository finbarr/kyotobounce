// Restore two retired apertures from retained original GLB triangles, then cut
// the replacement street approaches. Preserve interpolated paving UVs/normals.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
import {subtractOpening,plazaId,northOpening} from './subway-passage-scope.mjs';
const [manifestPath,component,mode]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(!mode||mode==='--preflight');
const sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifestPath),spec=await read(component+'/spec.json');
const raw=await readFile(m.layout),layout=JSON.parse(raw),glb=await readFile(m.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(glb),m.geometrySha256);await MeshoptDecoder.ready;
const componentReport=await read(component+'/report.json');
assert.equal(componentReport.specSha256,sha(await readFile(component+'/spec.json')));
const sourceComponent=m.sourceComponents.find(c=>c.directory===component);assert(sourceComponent);
assert.equal(sourceComponent.glbSha256,componentReport.outputs.glbSha256);assert.equal(sourceComponent.nativeSha256,componentReport.outputs.nativePanelsSha256);
const cache=new Map();
function values(ai){
 if(cache.has(ai))return cache.get(ai);
 const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression;
 const w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);
 let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
 if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
 const result=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>{const off=(a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));cache.set(ai,result);return result;
}
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
const area=t=>new T.Triangle(...t.map(v=>new T.Vector3(...v.p))).getArea();
function triangulate(poly){const rows=[];for(let k=1;k<poly.length-1;k++){const tri=[poly[0],poly[k],poly[k+1]];if(area(tri)>1e-10)rows.push(tri);}return rows;}
function inside(vertices,b){let poly=vertices;for(const[axis,bound,sign]of[[0,b.minX,1],[0,b.maxX,-1],[2,-b.maxZ,1],[2,-b.minZ,-1]]){
 const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],da=sign*(a.p[axis]-bound),dc=sign*(c.p[axis]-bound);if(da>=0)next.push(a);if((da>=0)!==(dc>=0)){const t=da/(da-dc);next.push(Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((v,i)=>v+(c[k][i]-v)*t)])));}}poly=next;
 }return triangulate(poly);
}
const bounds=shape=>{const vs=shape.coordinates[0];return{minX:Math.min(...vs.map(v=>v[0])),maxX:Math.max(...vs.map(v=>v[0])),minZ:Math.min(...vs.map(v=>v[1])),maxZ:Math.max(...vs.map(v=>v[1]))};};
const holes=spec.streetStairs.map(s=>({id:'exit-'+s.id,...bounds(s.surfaceOpening)}));
holes.push({id:'exit-five-lift',...bounds(spec.lifts.find(l=>l.id==='exit-five').opening)});
const oldHoles=[{id:'old-north-stair',...northOpening},{id:'old-exit-five-lift',minX:146,maxX:149.2,minZ:38.2,maxZ:41.15}];
const touches=(vs,b)=>Math.min(...vs.map(v=>v[0]))<b.maxX&&Math.max(...vs.map(v=>v[0]))>b.minX&&Math.min(...vs.map(v=>-v[2]))<b.maxZ&&Math.max(...vs.map(v=>-v[2]))>b.minZ;
const selected=layout.panels.filter(p=>p.id===plazaId||p.id.startsWith('municipal-')&&/^(municipal-plaza-|municipal-road-)/.test(p.id)&&holes.some(b=>touches(p.vertices.map(v=>[v.x,v.y,-v.z]),b))&&p.vertices.every(v=>v.y>-3&&v.y<2));
assert(selected.length>3);
const targets=new Map(),rows=new Map(selected.map(p=>[p.id,[]])),hitCounts=new Map(selected.map(p=>[p.id,0]));
for(const p of selected){const label=layout.authoredMaterials.find(a=>a.id===p.appearance).label;for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(ix=>{const v=p.vertices[ix];return[v.x,v.y,-v.z];}));assert(!targets.has(k),'Overlapping selected paving triangles');targets.set(k,p.id);}}
const chunks=[bin];let offset=bin.length;
function append(array,width,integer=false){const typed=integer?new Uint32Array(array):new Float32Array(array),b=Buffer.from(typed.buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:integer?34963:34962});chunks.push(b);offset+=b.length;const a={bufferView:view,componentType:integer?5125:5126,count:array.length/width,type:width===1?'SCALAR':width===2?'VEC2':'VEC3'};if(width===3&&!integer){a.min=[0,1,2].map(k=>Math.min(...array.filter((_,i)=>i%3===k)));a.max=[0,1,2].map(k=>Math.max(...array.filter((_,i)=>i%3===k)));}j.accessors.push(a);return j.accessors.length-1;}
const materialByPanel=new Map();
for(const [mi,mesh]of j.meshes.entries())for(const p of mesh.primitives){
 const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!selected.some(p=>layout.authoredMaterials.find(a=>a.id===p.appearance).label===label))continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const ps=values(p.attributes.POSITION),ix=values(p.indices).flat(),keep=[];let ns,uv;
 for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3),k=label+'|'+key(ids.map(k=>ps[k])),id=targets.get(k);if(!id){keep.push(...ids);continue;}
  ns??=values(p.attributes.NORMAL);uv??=values(p.attributes.TEXCOORD_0);rows.get(id).push(ids.map(k=>({p:ps[k],n:ns[k],uv:uv[k]})));targets.delete(k);hitCounts.set(id,hitCounts.get(id)+1);materialByPanel.set(id,p.material);
 }
 if(keep.length!==ix.length){if(keep.length)p.indices=append(keep,1,true);else p.removePaving=true;}
}
assert.equal(targets.size,0,'Every selected native triangle must match the browser');
const originalPanel=selected.find(p=>p.id===plazaId),minimum=['x','y','z'].map(k=>Math.min(...originalPanel.vertices.map(v=>k==='z'?-v[k]:v[k]))),maximum=['x','y','z'].map(k=>Math.max(...originalPanel.vertices.map(v=>k==='z'?-v[k]:v[k])));
// The earliest matching accessor precedes both cuts. Bounds, index range,
// attributes and complete aperture area are checked before using its bytes.
const original=j.accessors.findIndex((a,i)=>a.type==='VEC3'&&a.count>0&&a.min?.every((v,k)=>Math.abs(v-minimum[k])<1e-5)&&a.max?.every((v,k)=>Math.abs(v-maximum[k])<1e-5)&&j.accessors[i+1]?.type==='VEC3'&&j.accessors[i+2]?.type==='VEC2'&&j.accessors[i+3]?.type==='SCALAR');assert(original>=0);
const originalPositions=values(original),originalNormals=values(original+1),originalUVs=values(original+2),originalIndices=values(original+3).flat();assert(originalIndices.every(i=>i<originalPositions.length));assert.equal(originalPositions.length,originalNormals.length);assert.equal(originalPositions.length,originalUVs.length);
const restored=[];
for(const hole of oldHoles){
 assert(rows.get(plazaId).reduce((sum,t)=>sum+inside(t,hole).reduce((n,t)=>n+area(t),0),0)<.002,'Retired aperture is already filled');
 const tris=[];for(let i=0;i<originalIndices.length;i+=3){const t=originalIndices.slice(i,i+3).map(k=>({p:originalPositions[k],n:originalNormals[k],uv:originalUVs[k]}));tris.push(...inside(t,hole));}
 const projected=tris.reduce((sum,t)=>sum+area(t.map(v=>({...v,p:[v.p[0],0,v.p[2]]}))),0),expected=(hole.maxX-hole.minX)*(hole.maxZ-hole.minZ);
 assert(Math.abs(projected-expected)<.002,'Original surface must cover the complete old aperture');rows.get(plazaId).push(...tris);restored.push({id:hole.id,areaM2:projected,triangles:tris.length});
}
const changes=[],fullyRemoved=[];
for(const panel of selected){let tris=rows.get(panel.id),originalArea=tris.reduce((n,t)=>n+area(t),0);for(const hole of holes){tris=tris.flatMap(t=>touches(t.map(v=>v.p),hole)?subtractOpening(t,hole).flatMap(triangulate):[t]);}
 const vs=tris.flat(),positions=vs.flatMap(v=>v.p.map(Math.fround)),normals=vs.flatMap(v=>new T.Vector3(...v.n).normalize().toArray().map(Math.fround)),uvs=vs.flatMap(v=>v.uv.map(Math.fround));
 if(!vs.length){assert(originalArea>0);fullyRemoved.push(panel.id);changes.push({id:panel.id,matchedTriangles:hitCounts.get(panel.id),triangles:0,removedAreaM2:originalArea,action:'Retire surface wholly inside a new aperture'});continue;}
 const primitive={mode:4,material:materialByPanel.get(panel.id),attributes:{POSITION:append(positions,3),NORMAL:append(normals,3),TEXCOORD_0:append(uvs,2)},indices:append(vs.map((_,i)=>i),1,true)};
 j.meshes.push({primitives:[primitive]});j.nodes.push({name:'Subway street interfaces | '+panel.id,mesh:j.meshes.length-1});j.scenes[j.scene||0].nodes.push(j.nodes.length-1);
 panel.vertices=vs.map((_,i)=>({x:positions[i*3],y:positions[i*3+1],z:-positions[i*3+2]}));panel.triangles=vs.flatMap((_,i)=>i%3?[]:[i+2,i+1,i]);panel.normals=vs.map((_,i)=>({x:normals[i*3],y:normals[i*3+1],z:-normals[i*3+2]}));panel.uv=vs.map((_,i)=>({x:uvs[i*2],y:1-uvs[i*2+1]}));
 changes.push({id:panel.id,matchedTriangles:hitCounts.get(panel.id),triangles:tris.length,removedAreaM2:originalArea-tris.reduce((n,t)=>n+area(t),0)});
}
for(const mesh of j.meshes)mesh.primitives=mesh.primitives.filter(p=>!p.removePaving);
const meshMap=new Map();j.meshes=j.meshes.filter((mesh,i)=>{if(!mesh.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
for(const node of j.nodes)if(node.mesh!==undefined){if(meshMap.has(node.mesh))node.mesh=meshMap.get(node.mesh);else delete node.mesh;}
layout.panels=layout.panels.filter(p=>!fullyRemoved.includes(p.id));
layout.architecture.subwayReconstruction.specSha256=componentReport.specSha256;
sourceComponent.builderSha256=componentReport.builderSha256;
if(mode==='--preflight'){
 const preflight={pass:true,installed:false,inputLayoutSha256:m.layoutSha256,inputGeometrySha256:m.geometrySha256,originalPavingAccessor:original,restored,holes,changes};
 await writeFile(dirname(manifestPath)+'/paving-preflight.json',JSON.stringify(preflight,null,2)+'\n');console.log({preflight:true,restored,modifiedPanels:changes.length,removedAreaM2:changes.reduce((n,p)=>n+p.removedAreaM2,0)});process.exit(0);
}
j.buffers[0].byteLength=offset;
const output=writeGLB(j,Buffer.concat(chunks)),bytes=JSON.stringify(layout)+'\n',station=await read(m.station),detail=await read(m.detail);
m.layoutSha256=sha(bytes);m.geometrySha256=sha(output);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;
await writeFile(m.geometry,output);await writeFile(m.layout,bytes);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifestPath,JSON.stringify(m,null,2)+'\n');
const report=await read(component+'/report.json');report.geometry.modifiedPanelIds=selected.map(p=>p.id).filter(id=>!fullyRemoved.includes(id));report.geometry.retiredPavingIds=fullyRemoved;await writeFile(component+'/report.json',JSON.stringify(report,null,2)+'\n');
const proof={pass:true,parentGeometrySha256:sha(glb),geometrySha256:m.geometrySha256,layoutSha256:m.layoutSha256,originalPavingAccessor:original,restored,holes,changes,fullyRemoved,retainedBufferBytesExact:readGLB(output).bin.subarray(0,bin.length).equals(bin)};
await writeFile(dirname(manifestPath)+'/paving-rebuild.json',JSON.stringify(proof,null,2)+'\n');console.log({restored,modifiedPanels:changes.length,removedAreaM2:changes.reduce((n,p)=>n+p.removedAreaM2,0)});
