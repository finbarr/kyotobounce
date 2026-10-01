// Keep the station and first forecourt block; remove whole distant city objects.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compactStaticGLB,readAccessor,indices as readIndices} from '../../../tools/compact-static-glb.mjs';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
await mkdir(out,{recursive:true});const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),bytes=await readFile(m.layout),l=JSON.parse(bytes),geometry=await readFile(m.geometry);assert.equal(sha(bytes),m.layoutSha256);assert.equal(sha(geometry),m.geometrySha256);
const region={minX:-350,maxX:210,minZ:-48,maxZ:212},retired=[];
for(const p of l.panels){
 if(!/^municipal-(building|plaza|road|fixture)-/.test(p.id))continue;
 const xs=p.vertices.map(v=>v.x),zs=p.vertices.map(v=>v.z);
 const bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
 if(bounds.maxX<region.minX||bounds.minX>region.maxX||bounds.maxZ<region.minZ||bounds.minZ>region.maxZ)retired.push({id:p.id,bounds,triangles:p.triangles.length/3});
}
assert(retired.length>0);const ids=new Set(retired.map(p=>p.id)),targets=new Map(),labels=new Set(),hits={};
const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
for(const p of l.panels.filter(p=>ids.has(p.id))){
 const label=l.authoredMaterials.find(m=>m.id===p.appearance).label;labels.add(label);hits[p.id]=0;
 for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(k=>{const v=p.vertices[k];return[v.x,v.y,-v.z];}));const rows=targets.get(k)||[];rows.push(p.id);targets.set(k,rows);}
}
// The source exporter splits overlapping coplanar faces. Find native triangles
// without an exact rendered counterpart, then match their surviving fragments
// by plane and barycentric containment instead of discarding the parity check.
const {json:original,bin:originalBin}=readGLB(geometry),pending=new Map([...targets].map(([k,v])=>[k,[...v]]));
function visit(p,j,bin,fn){
 const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!labels.has(label))return;
 const pos=readAccessor(j,bin,p.attributes.POSITION),ix=readIndices(j,bin,p);assert.equal(pos.size,12);
 for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3),points=tri.map(k=>[0,4,8].map(o=>pos.data.readFloatLE(k*12+o)));fn(label,tri,points);}
}
for(const mesh of original.meshes)for(const p of mesh.primitives)visit(p,original,originalBin,(label,tri,points)=>{const k=label+'|'+key(points),rows=pending.get(k);if(rows){rows.pop();if(!rows.length)pending.delete(k);}});
const fragments=[];
for(const [k,ids]of pending){const parts=k.split('|'),triangle=parts.splice(-3).map(p=>p.split(',').map(Number));for(const id of ids)fragments.push({label:parts.join('|'),id,triangle});}
function inside(p,t){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),u=sub(t[1],t[0]),v=sub(t[2],t[0]),w=sub(p,t[0]);
 const uu=dot(u,u),vv=dot(v,v),uv=dot(u,v),wu=dot(w,u),wv=dot(w,v),d=uu*vv-uv*uv;
 if(Math.abs(d)<1e-16)return false;
 const a=(wu*vv-wv*uv)/d,b=(wv*uu-wu*uv)/d;
 if(Math.hypot(...w.map((n,i)=>n-a*u[i]-b*v[i]))>.0001)return false;
 if(a>=0&&b>=0&&a+b<=1)return true;
 // Source-space clipping is rounded to float32 on export (about 30 microns
 // at the far city edge). Bound the tolerance in metres, not barycentric units.
 return t.some((q,i)=>{const edge=sub(t[(i+1)%3],q),w=sub(p,q),s=Math.max(0,Math.min(1,dot(w,edge)/dot(edge,edge)));return Math.hypot(...w.map((v,k)=>v-s*edge[k]))<=.0001;});
}
let fragmentCount=0;
console.log('Selected',retired.length,'city objects;',targets.size,'triangle keys;',fragments.length,'source faces split or culled in the existing export');
const {buffer,stats}=compactStaticGLB(geometry,(p,indices,j,bin)=>{
 const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!labels.has(label))return indices;
 const keep=[],candidates=fragments.filter(r=>r.label===label);
 visit(p,j,bin,(label,tri,points)=>{
  const k=label+'|'+key(points),rows=targets.get(k),id=rows?.pop();
  if(id){hits[id]++;if(!rows.length)targets.delete(k);return;}
  const center=[0,1,2].map(a=>points.reduce((s,v)=>s+v[a]/3,0)),matches=candidates.filter(r=>inside(center,r.triangle));
  if(matches.length){
   assert(points.every(pt=>candidates.some(r=>inside(pt,r.triangle))),'A rendered fragment crosses the removal surface '+JSON.stringify({label,points,matches}));
   assert(center[0]<region.minX||center[0]>region.maxX||-center[2]<region.minZ||-center[2]>region.maxZ,'No retained forecourt surface can be removed as a fragment');
   fragmentCount++;return;
  }
  keep.push(...tri);
 });return keep;
});
assert.deepEqual([...targets],[...pending],'Only independently identified split or culled source faces may lack exact counterparts');
stats.splitOrCulledSourceFaces=fragments.length;stats.removedBrowserFragments=fragmentCount;
assert.equal(stats.trianglesRemoved-fragmentCount,retired.reduce((sum,p)=>sum+p.triangles,0)-fragments.length);
l.panels=l.panels.filter(p=>!ids.has(p.id));
for(const id of ['municipal-building-3207444640','municipal-building-3207476640'])assert(l.panels.some(p=>p.id===id&&p.collision!==false),'Tower bounce surface must remain');
l.architecture.cityContext.status='Station and first forecourt building line retained; distant whole city objects removed.';
l.architecture.cityContext.forecourtBoundary={region,removedObjects:retired.length,removedTriangles:stats.trianglesRemoved,limits:['Intersecting source objects are retained intact. The spatial fog conceals their distal edges.','Station interiors and off-station underground branches are a separate simplification task.']};
const raw=JSON.stringify(l)+'\n',station=await read(m.station);station.layoutSha256=sha(raw);
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(raw),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(buffer),station:out+'/station.json'};
await writeFile(next.layout,raw);await writeFile(next.geometry,buffer);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
await writeFile(out+'/removal.json',JSON.stringify({parent:m,region,retired,hits,stats,layoutBeforeBytes:bytes.length,layoutAfterBytes:Buffer.byteLength(raw),retainedNativeRecordsExact:true},null,2)+'\n');console.log(JSON.stringify(stats));
