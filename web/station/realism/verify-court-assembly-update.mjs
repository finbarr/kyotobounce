// Scope and serialization proof for a component update inside the complete station.
import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const[beforeDir,afterDir,oldDir,newDir,out]=process.argv.slice(2);assert(out);
const[bb,ab,ob,nb]=await Promise.all([beforeDir+'/station-layout.json',afterDir+'/station-layout.json',oldDir+'/native-panels.json',newDir+'/native-panels.json'].map(p=>readFile(p)));
const hash=b=>createHash('sha256').update(b).digest('hex'),before=JSON.parse(bb),after=JSON.parse(ab),old=JSON.parse(ob),next=JSON.parse(nb),r=after.architecture.courtAssemblyUpdates.at(-1);
assert.equal(r.inputLayoutSha256,hash(bb));assert.equal(r.previousAssemblyNativeSha256,hash(ob));assert.equal(r.assemblyNativeSha256,hash(nb));
assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
for(const k of Object.keys(before))if(!['panels','authoredMaterials','architecture'].includes(k))assert.deepEqual(after[k],before[k],k);
for(const k of Object.keys(before.architecture))assert.deepEqual(after.architecture[k],before.architecture[k],k);
assert.deepEqual(Object.keys(after.architecture).sort(),[...Object.keys(before.architecture),'courtAssemblyUpdates'].sort());assert.equal(after.architecture.courtAssemblyUpdates.length,1);
const ids=new Set(old.panels.map(p=>p.id)),retained=before.panels.filter(p=>!ids.has(p.id));assert.equal(before.panels.length-retained.length,old.panels.length);assert.deepEqual(r.removedPanels,[...ids].sort());assert.deepEqual(after.panels.slice(0,retained.length),retained);assert.equal(after.panels.length,retained.length+next.panels.length);
assert.deepEqual(after.authoredMaterials.slice(0,before.authoredMaterials.length),before.authoredMaterials);assert.equal(after.authoredMaterials.length-before.authoredMaterials.length,2);
let maxError=0;
for(let i=0;i<next.panels.length;i++){
 const p=next.panels[i],q=after.panels[retained.length+i];assert.equal(p.id,q.id);assert.deepEqual(q.triangles,p.triangles);for(const k of ['material','role','collision'])assert.deepEqual(q[k],p[k],k);assert.equal(q.vertices.length,p.vertices.length);
 for(let n=0;n<p.vertices.length;n++){const error=Math.hypot(...['x','y','z'].map(k=>q.vertices[n][k]-p.vertices[n][k]));maxError=Math.max(maxError,error);}
}
assert(maxError<1e-5);assert.deepEqual(next.escalators,old.escalators);assert.deepEqual(next.combSupports,old.combSupports);
const report={inputLayoutSha256:hash(bb),layoutSha256:hash(ab),assemblyNativeSha256:hash(nb),retainedNativePanels:retained.length,replacedPanels:old.panels.length,newPanels:next.panels.length,newMaterials:2,maximumComponentPositionErrorM:maxError,allOtherNativeRecordsAndMaterialsUnchanged:true,pass:true,meaning:'Component replacement scope and serialization; wider course, appearance and performance acceptance remain open.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
