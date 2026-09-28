// Accept only evidenced surface-ID changes; target geometry and difficulty stay exact.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export async function applySurfaceRebindings(original,bindings,layoutData,layoutHash,catalogHash){
 assert.equal(new Set(bindings.map(b=>b.id)).size,bindings.length);
 const result=structuredClone(original),panels=new Set(layoutData.panels.map(p=>p.id));
 for(const binding of bindings){
  const course=result.find(c=>c.id===binding.id);assert(course);assert.equal(course.revision,binding.fromRevision);assert.equal(binding.toRevision,binding.fromRevision+1);
  assert(binding.reason&&binding.targets.length);assert.equal(new Set(binding.targets.map(t=>t.id)).size,binding.targets.length);
  const path=resolve(binding.placementEvidence.path);assert(path.startsWith(resolve('.local')+'/'));
  const bytes=await readFile(path);assert.equal(createHash('sha256').update(bytes).digest('hex'),binding.placementEvidence.sha256);
  const evidence=JSON.parse(bytes);assert.equal(evidence.catalogSha256,catalogHash);
  const after=evidence.modes.find(m=>m.mode==='after');assert.equal(after.layoutSha256,layoutHash);
  for(const change of binding.targets){
   const target=course.waypoints.find(w=>w.id===change.id);assert(target);assert.equal(target.surface,change.fromSurface);assert.notEqual(change.fromSurface,change.toSurface);assert(panels.has(change.toSurface));
   const proof=after.results.find(r=>r.course===course.id&&r.feature===target.id);assert(proof?.ok);assert.equal(proof.surface,change.toSurface);assert.equal(proof.radius,target.radius);
   assert(Math.hypot(...['x','y','z'].map(k=>proof.center[k]-target.center[k]))<.001);
   target.surface=change.toSurface;
  }
  course.revision=binding.toRevision;
 }
 return result;
}
