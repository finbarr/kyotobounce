// Retire lift machinery, keep closed public frontages, and restore cut floor slabs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {appendJunction} from './append-canopy-junction.mjs';
import {compactStaticGLB,readAccessor,indices as readIndices} from '../../../tools/compact-static-glb.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=await read(out+'/plan.json'),patches=await read(out+'/floor-patches.json'),m=plan.parent,raw=await readFile(m.layout),l=JSON.parse(raw),geometry=await readFile(m.geometry);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(geometry),m.geometrySha256);
const materials=[],appearances=[],materialIndex=new Map();
function material(id){
 if(materialIndex.has(id))return materialIndex.get(id);
 const a=l.authoredMaterials.find(a=>a.id===id||a.label===id);assert(a,id);
 const i=materials.length,key=a.id,label=a.label,color=a.linearColor;
 materials.push({name:label,pbrMetallicRoughness:{baseColorFactor:[color.r,color.g,color.b,1],roughnessFactor:a.roughness??.7,metallicFactor:a.metallic??0}});
 appearances.push(a);materialIndex.set(id,i);return i;
}
for(const s of plan.shafts)material(s.lift.parts.find(p=>p.motion!=='car').appearance);
for(const p of patches)material(p.appearance);
const c=construction(materials,{flatNormals:true}),doors=[],retired=new Set(plan.retired),P=(x,y,z)=>[x,y,-z];
for(const s of plan.shafts){
 const l=s.lift,a=(l.yaw||0)*Math.PI/180;
 for(const p of l.parts.filter(p=>p.motion!=='car')){
  const floor=p.motion==='upper'?(l.stops?.length??2)-1:p.motion==='landing'?p.floor:0;
  const height=l.stops?.[floor]?.height??(floor?l.height:0),y=l.origin.y+height;
  // Garage and off-station south-street destinations are outside public scope.
  const publicDoor=y>-12&&l.id!=='subway-hachijo-south-lift';
  const point=(x,y,z)=>P(l.origin.x+Math.cos(a)*x+Math.sin(a)*z,l.origin.y+y,l.origin.z-Math.sin(a)*x+Math.cos(a)*z);
  const g=new T.BoxGeometry(p.size.x,p.size.y,p.size.z),ps=g.attributes.position;
  const vs=Array.from({length:ps.count},(_,i)=>point(ps.getX(i)+p.center.x,ps.getY(i)+p.center.y+height,ps.getZ(i)+p.center.z));
  c.add('public-frontage-'+p.id,vs,Array.from(g.index.array).flatMap((_,i,a)=>i%3?[]:[a[i+2],a[i+1],a[i]]),material(p.appearance),publicDoor?'closed-door':'closed-boundary');
  c.panels.at(-1).material='steel';g.dispose();
  doors.push({id:c.panels.at(-1).id,lift:l.id,floor,height:y,publicDoor,center:point(p.center.x,p.center.y+height,p.center.z).map((n,i)=>i===2?-n:n),yaw:l.yaw||0,size:p.size});
 }
}
for(const p of patches){
 const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),[bottom,top]=p.boundsY;
 const points=p.slopedRings?p.slopedRings.map(r=>r.map(v=>P(...v))):rings.map(r=>r.map(([x,z])=>P(x,top,z)));
 c.slab('public-frontage-'+p.id,points[0],points.slice(1),top-bottom,material(p.appearance),p.role||'floor');c.panels.at(-1).material=p.material;
 const panel=c.panels.at(-1),sources=p.sourceSlabs.map(id=>l.panels.find(p=>p.id===id)).filter(p=>p?.uv),triangles=[];
 for(const source of sources)for(let i=0;i<source.triangles.length;i+=3){const ix=source.triangles.slice(i,i+3),v=ix.map(i=>source.vertices[i]);if(Math.max(...v.map(v=>v.y))-Math.min(...v.map(v=>v.y))>.5)continue;const [a,b,c]=v,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)>1e-7)triangles.push({v,uv:ix.map(i=>source.uv[i]),den});}
 if(triangles.length)panel.uv=panel.vertices.map(q=>{
  const {v:[a,b,c],uv,den}=triangles.reduce((best,t)=>{const distance=t=>Math.min(...t.v.map(v=>Math.hypot(v.x-q.x,v.z-q.z,v.y-top)));return !best||distance(t)<distance(best)?t:best;},null);
  const u=((b.z-c.z)*(q.x-c.x)+(c.x-b.x)*(q.z-c.z))/den,v=((c.z-a.z)*(q.x-c.x)+(a.x-c.x)*(q.z-c.z))/den;
  return {x:Math.fround(u*uv[0].x+v*uv[1].x+(1-u-v)*uv[2].x),y:Math.fround(u*uv[0].y+v*uv[1].y+(1-u-v)*uv[2].y)};
 });
}

assert.equal(materials.length,appearances.length);
for(const p of c.panels)p.appearance=appearances[p.browserMaterial].id;
await c.save(out,'public-frontages.glb',{scope:'Closed landing doors and restored slabs; no cars, shafts, machinery or controls',geometry:{doors,patches}});
const targets=new Map(),labels=new Set(),hits={};const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
for(const p of l.panels.filter(p=>retired.has(p.id))){
 const label=l.authoredMaterials.find(a=>a.id===p.appearance)?.label||p.appearance;labels.add(label);hits[p.id]=0;
 for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];})),rows=targets.get(k)||[];rows.push(p.id);targets.set(k,rows);}
}
const compact=compactStaticGLB(geometry,(p,ix,j,bin)=>{
 const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!labels.has(label))return ix;
 const pos=readAccessor(j,bin,p.attributes.POSITION),keep=[];assert.equal(pos.size,12);
 for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3),k=label+'|'+key(tri.map(i=>[0,4,8].map(o=>pos.data.readFloatLE(i*12+o)))),rows=targets.get(k),id=rows?.pop();if(id){hits[id]++;if(!rows.length)targets.delete(k);}else keep.push(...tri);}return keep;
});
assert.equal(targets.size,0,'Every removed source triangle must have a rendered counterpart');
assert.equal(Object.keys(hits).length,retired.size);
const {json:j,bin}=readGLB(compact.buffer),part=readGLB(await readFile(out+'/public-frontages.glb'));
// Carry the original material and interpolated UVs into the added batch.
const uvParts=[part.bin];let uvOffset=part.bin.length;
for(let i=0;i<materials.length;i++){
 const panels=c.panels.filter(p=>p.browserMaterial===i);if(!panels.some(p=>p.uv))continue;
 const uv=new Float32Array(panels.flatMap(p=>p.vertices.flatMap((_,k)=>[p.uv?.[k].x||0,p.uv?1-p.uv[k].y:0]))),bytes=Buffer.from(uv.buffer),view=part.json.bufferViews.length;
 const primitive=part.json.meshes[i].primitives[0];assert.equal(uv.length/2,part.json.accessors[primitive.attributes.POSITION].count);
 part.json.bufferViews.push({buffer:0,byteOffset:uvOffset,byteLength:bytes.length,target:34962});primitive.attributes.TEXCOORD_0=part.json.accessors.length;part.json.accessors.push({bufferView:view,componentType:5126,count:uv.length/2,type:'VEC2'});uvParts.push(bytes);uvOffset+=bytes.length;
}
part.bin=Buffer.concat(uvParts);part.json.buffers[0].byteLength=uvOffset;
const baseMaterials=j.materials.length,baseMeshes=j.meshes.length;
const materialMap=appearances.map(a=>{const i=j.materials.findIndex(m=>m.name.replace(/ \| Browser$/,'')===a.label);assert(i>=0,a.label);return i;});
const baseLength=j.nodes.length,addition=appendJunction(j,part,bin.length);
for(const mesh of j.meshes.slice(baseMeshes))for(const p of mesh.primitives)p.material=materialMap[p.material-baseMaterials];j.materials.length=baseMaterials;
for(const n of j.nodes.slice(baseLength))n.name=n.name.replace('east-canopy-junction | ','Station public frontage | ');
j.buffers[0].byteLength=bin.length+addition.length;const output=writeGLB(j,Buffer.concat([bin,addition]));
// Reopen the final export and compare every added position, index and UV
// against its native panel. The compactor independently checks retained data.
const checked=readGLB(output);let verifiedVertices=0,verifiedTriangles=0;
for(let batch=0;batch<materials.length;batch++){
 const p=checked.json.meshes[baseMeshes+batch].primitives[0],positions=readAccessor(checked.json,checked.bin,p.attributes.POSITION),ix=readIndices(checked.json,checked.bin,p),uv=p.attributes.TEXCOORD_0===undefined?null:readAccessor(checked.json,checked.bin,p.attributes.TEXCOORD_0);let offset=0,expected=[];
 assert.equal(checked.json.materials[p.material].name.replace(/ \| Browser$/,''),appearances[batch].label);
 for(const panel of c.panels.filter(p=>p.browserMaterial===batch)){
  for(const [i,v]of panel.vertices.entries())for(const [k,n]of [v.x,v.y,-v.z].entries())assert.equal(positions.data.readFloatLE((offset+i)*12+k*4),Math.fround(n));
  if(panel.uv){assert(uv);for(const [i,v]of panel.uv.entries()){assert.equal(uv.data.readFloatLE((offset+i)*8),Math.fround(v.x));assert.equal(uv.data.readFloatLE((offset+i)*8+4),Math.fround(1-v.y));}}
  for(let i=0;i<panel.triangles.length;i+=3)expected.push(...panel.triangles.slice(i,i+3).reverse().map(k=>k+offset));offset+=panel.vertices.length;
 }
 assert.equal(offset,positions.definition.count);assert.deepEqual(ix,expected);verifiedVertices+=offset;verifiedTriangles+=ix.length/3;
}
await writeFile(out+'/geometry-proof.json',JSON.stringify({pass:true,geometrySha256:sha(output),addedPanels:c.panels.length,verifiedVertices,verifiedTriangles,positionsIndicesUVsMaterialsMatch:true,retainedAttributesExact:true},null,2)+'\n');
l.panels=l.panels.filter(p=>!retired.has(p.id)).concat(c.panels.map(({browserMaterial,...p})=>p));delete l.lifts;
// All added surfaces reuse their neighboring authored materials.
l.architecture.elevatorRemoval={scope:'Public landing doors only. Cars, side/back shaft walls, pits, roof caps, controls and lift simulation removed. Openings repaired with adjacent slab geometry.',removedElevators:plan.shafts.map(s=>s.id),removedStaticPanels:retired.size,removedDynamicParts:plan.shafts.reduce((n,s)=>n+s.lift.parts.length,0),addedPanels:c.panels.length};
const nextRaw=JSON.stringify(l)+'\n',station=await read(m.station);delete station.lifts;station.layoutSha256=sha(nextRaw);station.authoredMaterials=l.authoredMaterials;
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(nextRaw),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};
await writeFile(next.layout,nextRaw);await writeFile(next.geometry,output);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
await writeFile(out+'/removal.json',JSON.stringify({parent:m,retired:[...retired],added:c.panels.map(p=>p.id),removedLifts:plan.shafts.map(s=>s.id),doors,patches,stats:compact.stats,hits,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256},null,2)+'\n');
console.log({removed:retired.size,doors:doors.length/2,patches:patches.length,geometryBytes:output.length,...compact.stats});
