// Keep the inferred staff opening connected to the kitchen working aisle.
import assert from 'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:false});const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),base=await read(manifest),raw=await readFile(base.layout),layout=JSON.parse(raw),bytes=await readFile(base.geometry),{json:j,bin}=readGLB(bytes),station=await read(base.station),frame=(await read('.local/v2/current/components/daruma-frontage/report.json')).geometry,{origin:C,across:A,inward:N}=frame;
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(bytes),base.geometrySha256);
const local=v=>{const x=v.x-C[0],z=-v.z-C[2];return[x*A[0]+z*A[2],v.y-C[1],x*N[0]+z*N[2]];},world=([w,h,t])=>({x:Math.fround(C[0]+A[0]*w+N[0]*t),y:Math.fround(C[1]+h),z:Math.fround(-(C[2]+A[2]*w+N[2]*t))}),key=v=>[v.x,v.y,-v.z].map(Math.fround).join(','),changes=new Map(),moved=[];
for(const p of layout.panels){
 let transform=null;const q=p.vertices.map(local);
 if(['daruma-kitchen-worktop','daruma-kitchen-shelf'].includes(p.id)){
  const low=Math.min(...q.map(v=>v[0])),high=Math.max(...q.map(v=>v[0]));
  transform=([w,h,t])=>[-3.24+(w-low)*(high+3.24)/(high-low),h,t];
 }else if(/^daruma-detail-(upright-appliance|appliance-)/.test(p.id))transform=([w,h,t])=>[w+.43,h,t];
 if(!transform)continue;
 const old=p.vertices;p.vertices=q.map(v=>world(transform(v)));
 for(let i=0;i<old.length;i++){const k=key(old[i]),next=p.vertices[i];if(changes.has(k))assert.deepEqual(changes.get(k),next,'Conflicting shared vertex move');changes.set(k,next);}
 moved.push(p.id);
 // The oblique rear boundary follows the schematic footprint. Keep every moved solid inside it.
 for(const v of p.vertices){const [w,,t]=local(v),right=t<=frame.sideDepthM?frame.frontWidthM/2:frame.frontWidthM/2-(t-frame.sideDepthM)*58/60;assert(w>-frame.frontWidthM/2+.01&&w<right-.01,p.id+' outside footprint');}
}
const editedAccessors=[],seen=new Set(),hits=new Set(),resultBin=Buffer.from(bin);
for(const mesh of j.meshes)for(const p of mesh.primitives){const id=p.attributes.POSITION;if(seen.has(id)||!j.materials[p.material].name.startsWith('Daruma'))continue;seen.add(id);const a=j.accessors[id],v=j.bufferViews[a.bufferView];assert(!v.extensions&&a.componentType===5126);let changed=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.count;i++){const off=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12),old=[0,1,2].map(k=>bin.readFloatLE(off+k*4)),k=old.join(','),next=changes.get(k);if(next){for(const [axis,n]of[next.x,next.y,-next.z].entries())resultBin.writeFloatLE(n,off+axis*4);hits.add(k);changed++;}for(let axis=0;axis<3;axis++){const n=resultBin.readFloatLE(off+axis*4);min[axis]=Math.min(min[axis],n);max[axis]=Math.max(max[axis],n);}}if(changed){a.min=min;a.max=max;editedAccessors.push({accessor:id,changedVertices:changed});}}
assert.equal(hits.size,changes.size,'Every moved native vertex must have a renderer counterpart');
const movedLights=[];assert.equal(moved.length,6);const text=JSON.stringify(layout)+'\n',glb=writeGLB(j,resultBin);station.layoutSha256=sha(text);station.authoredLights=layout.authoredLights;
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',glb);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(text),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(glb),station:out+'/station.json'};await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');const report={parent:base,frame,movedIds:moved,movedLights,editedAccessors,uniqueMovedVertices:hits.size,worktopLeftWM:-3.24,cupboardAcrossShiftM:.43,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256};await writeFile(out+'/relocation.json',JSON.stringify(report,null,2)+'\n');console.log({movedPanels:moved.length,uniqueMovedVertices:hits.size,accessors:editedAccessors.length});
