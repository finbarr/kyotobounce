// Independently verify a rectangular cut of selected obsolete axis-aligned boxes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [beforeFile,afterFile,out]=process.argv.slice(2);assert(beforeFile&&afterFile&&out);
const [bb,ab]=await Promise.all([readFile(beforeFile),readFile(afterFile)]),before=JSON.parse(bb),after=JSON.parse(ab),r=after.architecture.eastCourtDraftClip;
assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(bb),r.inputLayoutSha256);
for(const k of Object.keys(before))if(!['boxes','architecture'].includes(k))assert.deepEqual(after[k],before[k],k);
for(const k of Object.keys(before.architecture))assert.deepEqual(after.architecture[k],before.architecture[k],k);
assert.deepEqual(Object.keys(after.architecture).sort(),[...Object.keys(before.architecture),'eastCourtDraftClip'].sort());
assert.deepEqual(r.cutBoundsNative,[[74.8,29.3733771488756,-18.4],[125,67.1,25.5]]);
const changes=new Map(r.changes.map(c=>[c.id,c])),byId=new Map(after.boxes.map(q=>[q.id,q]));assert.equal(byId.size,after.boxes.length);
const bound=q=>{const c=['x','y','z'].map(k=>q.center[k]),size=['x','y','z'].map(k=>q.size[k]);return[c.map((v,i)=>v-size[i]/2),c.map((v,i)=>v+size[i]/2)];};
const volume=b=>b[1].reduce((n,v,i)=>n*Math.max(0,v-b[0][i]),1);
const intersect=(a,b)=>[a[0].map((v,i)=>Math.max(v,b[0][i])),a[1].map((v,i)=>Math.min(v,b[1][i]))];
const close=(a,b)=>assert(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);
let unchanged=0,fragments=0,removedVolumeM3=0;
for(const [index,q]of before.boxes.entries()){
 const c=changes.get(q.id);if(!c){assert.deepEqual(byId.get(q.id),q);unchanged++;continue;}
 assert(q.id.startsWith('east-north-')||q.id.startsWith('east-south-'));assert.equal(q.yaw||0,0);assert.equal(c.oldIndex,index);assert.deepEqual(c.oldBoundsNative,bound(q));assert(!byId.has(q.id));
 const old=bound(q),inside=intersect(old,r.cutBoundsNative);assert(volume(inside)>0);const boxes=[];let retainedVolume=0;
 for(const [i,p]of c.fragments.entries()){
  const n=byId.get(p.id);assert(n);assert.equal(p.id,q.id+'-court-clip-'+i);for(const k of Object.keys(q))if(!['id','center','size'].includes(k))assert.deepEqual(n[k],q[k],k);
  const b=bound(n);for(let side=0;side<2;side++)for(let axis=0;axis<3;axis++)close(b[side][axis],p.boundsNative[side][axis]);
  assert(volume(b)>0);close(volume(intersect(b,old)),volume(b));close(volume(intersect(b,r.cutBoundsNative)),0);
  for(const other of boxes)close(volume(intersect(b,other)),0);boxes.push(b);retainedVolume+=volume(b);fragments++;
 }
 close(retainedVolume+volume(inside),volume(old));removedVolumeM3+=volume(inside);
}
assert.equal(after.boxes.length,unchanged+fragments);
const report={inputLayoutSha256:sha(bb),layoutSha256:sha(ab),unchangedBoxes:unchanged,changedBoxes:changes.size,fragments,removedVolumeM3,allOtherRecordsUnchanged:true,pass:true,meaning:'Exact native box volume partition with no outside-volume loss. Browser serialization, walking and visual acceptance remain separate.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
