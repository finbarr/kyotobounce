// Independent scope and geometry preservation check for a full-station court candidate.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {execFileSync} from 'node:child_process';
const [beforeDir,afterDir,assemblyDir,out]=process.argv.slice(2);assert(beforeDir&&afterDir&&assemblyDir&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const [bb,ab,nb]=await Promise.all([beforeDir+'/station-layout.json',afterDir+'/station-layout.json',assemblyDir+'/native-panels.json'].map(p=>readFile(p)));
const before=JSON.parse(bb),after=JSON.parse(ab),assembly=JSON.parse(nb),r=after.architecture.eastCourtContext;
assert.equal(hash(bb),r.inputLayoutSha256);assert.equal(hash(nb),r.assemblyNativeSha256);
const permitted=new Set(['panels','boxes','beams','flights','escalators','authoredLights','authoredMaterials','architecture']);
assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
for(const k of Object.keys(before))if(!permitted.has(k))assert.deepEqual(after[k],before[k],k);
for(const k of Object.keys(before.architecture))assert.deepEqual(after.architecture[k],before.architecture[k],k);
assert.deepEqual(Object.keys(after.architecture).sort(),[...Object.keys(before.architecture),'eastCourtContext'].sort());
const alteredSource=new Set(r.sourceChanges.map(s=>s.id));let untouched=0;
// The authoring receipt uses Python JSON number spelling (including 1.0).
// Reproduce that serialization on the independently read immutable input.
const recordHashes=JSON.parse(execFileSync('python3',['-c',`import sys,json,hashlib
b=json.load(open(sys.argv[1]));a=json.load(open(sys.argv[2]));r=a['architecture']['eastCourtContext']['retiredDraftRecords']
print(json.dumps({k:{str(q['index']):hashlib.sha256(json.dumps(b[k][q['index']],separators=(',',':')).encode()).hexdigest() for q in v} for k,v in r.items()}))`,beforeDir+'/station-layout.json',afterDir+'/station-layout.json'],{encoding:'utf8',maxBuffer:1048576}));
for(const kind of ['panels','boxes','beams','flights','escalators','authoredLights']){
 const removed=new Set(r.retiredDraftRecords[kind].map(q=>q.index)),retained=before[kind].filter((_,i)=>!removed.has(i));
 for(const q of r.retiredDraftRecords[kind]){assert.equal(q.id,before[kind][q.index].id);assert.equal(q.recordSha256,recordHashes[kind][q.index]);}
 for(let i=0;i<retained.length;i++){assert.equal(after[kind][i].id,retained[i].id);if(kind==='panels'&&alteredSource.has(retained[i].id))continue;assert.deepEqual(after[kind][i],retained[i]);untouched++;}
 const added=kind==='panels'?assembly.panels.length+1:kind==='escalators'?assembly.escalators.length:0;
 assert.equal(after[kind].length,retained.length+added);
}
assert.deepEqual(after.authoredMaterials.slice(0,before.authoredMaterials.length),before.authoredMaterials);
assert.equal(after.authoredMaterials.length-before.authoredMaterials.length,16);
let maximumComponentPositionErrorM=0;
for(const p of assembly.panels){const q=after.panels.find(q=>q.id===p.id);assert(q);assert.deepEqual(q.triangles,p.triangles);assert.equal(q.vertices.length,p.vertices.length);assert.equal(q.material,p.material);assert.equal(q.role,p.role);assert.equal(q.collision,p.collision);
 for(let i=0;i<p.vertices.length;i++){const e=Math.hypot(...['x','y','z'].map(k=>q.vertices[i][k]-p.vertices[i][k]));maximumComponentPositionErrorM=Math.max(maximumComponentPositionErrorM,e);}
}
assert(maximumComponentPositionErrorM<1e-5);
const vec=v=>new T.Vector3(v.x,v.y,-v.z),key=vs=>vs.map(v=>v.toArray().map(x=>x.toFixed(6)).join(',')).sort().join('|');
function triangles(p){return Array.from({length:p.triangles.length/3},(_,i)=>p.triangles.slice(i*3,i*3+3).map(k=>vec(p.vertices[k])));}
const componentCourt=assembly.panels.find(p=>p.id==='east-court-source-floor');const floorY=Math.max(...componentCourt.vertices.map(p=>p.y));const O=new T.Vector3(77.83226013183594,29.97290802001953,-24.59440040588379),D=new T.Vector3(.9998636516882471,0,-.016512965592029322),A=new T.Vector3(.016512965592029322,0,.9998636516882471);
const local=v=>{const p=v.clone().sub(O);return new T.Vector3(p.dot(D),v.y,p.dot(A));};
const mask=new T.Box3(new T.Vector3(46.12,31.6,11.5),new T.Vector3(50.3,34.22,32.6));
const source=[];
for(const s of r.sourceChanges.filter(s=>s.oldPolygonAreaM2!==null)){
 const old=before.panels.find(p=>p.id===s.id),now=after.panels.find(p=>p.id===s.id),remaining=new Set(triangles(now).map(key));let unchanged=0,changed=0;
 for(const tri of triangles(old)){
  if(remaining.has(key(tri))){unchanged++;continue;}
  // Native winding is reversed by the renderer's Z reflection.
  const n=new T.Triangle(...tri.slice().reverse()).getNormal(new T.Vector3());
  const paving=tri.every(v=>Math.abs(v.y-floorY)<.003)&&n.y>.999;
  const storefront=Math.abs(n.y)<.01&&n.x<-.99&&mask.intersectsTriangle(new T.Triangle(...tri.map(local)));
  assert(paving||storefront,'Unrelated installed source triangle changed: '+s.id+' '+key(tri));changed++;
 }
 assert(unchanged>=s.retainedInstalledTriangles);source.push({id:s.id,unchangedInstalledTriangles:unchanged,changedInsideDeclaredFloorOrFacade:changed,newTriangles:now.triangles.length/3});
}
const evidence={inputLayoutSha256:hash(bb),layoutSha256:hash(ab),assemblyNativeSha256:hash(nb),untouchedNativeRecords:untouched,componentPanels:assembly.panels.length,maximumComponentPositionErrorM,source,routeAndCourseMetadataUnchanged:true,meaning:'Scope and geometry proof; does not establish new source facade accuracy, complete routes, gameplay or final visuals.'};await writeFile(out,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
