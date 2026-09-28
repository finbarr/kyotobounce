// Bounded launch revision: retain Pillar Carom's three target geometries and banks.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
// Unity serializes geometry as Float32; compare its exact conversion, not a widened tolerance.
const nativeShape = value => typeof value==='number'?Math.fround(value):Array.isArray(value)?value.map(nativeShape):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,nativeShape(v)])):value;
const sha = b => createHash('sha256').update(b).digest('hex');
const length = poses => poses.slice(1).reduce((s,p,i)=>s+Math.hypot(...['x','y','z'].map(k=>p.p[k]-poses[i].p[k])),0);
async function evidence(ref) {
  const path=resolve(ref.path); assert(path.startsWith(resolve('.local')+'/'));
  const bytes=await readFile(path); assert.equal(sha(bytes),ref.sha256);return JSON.parse(bytes);
}
export async function applyLaunchRevisions(rebound, original, revisions, layoutHash) {
  const result=structuredClone(rebound);
  assert.equal(new Set(revisions.map(r=>r.id)).size,revisions.length);
  for(const revision of revisions) {
    assert.equal(revision.id,'kyoto-pillar-carom','Only the evidenced Pillar Carom approach is supported');
    const old=original.find(c=>c.id===revision.id), course=result.find(c=>c.id===revision.id);
    assert.equal(revision.fromRevision,old.revision);assert.equal(revision.toRevision,old.revision+1);
    assert.equal(course.revision,revision.toRevision,'Combine with the existing evidenced floor-surface rebinding');
    assert.deepEqual(revision.fromStart,old.start);assert.deepEqual(revision.fromHint,old.hint);
    assert.equal(revision.fromDistance,old.campaign.distance);assert(revision.reason);
    assert.deepEqual({...revision.toStart,center:{...revision.toStart.center,x:old.start.center.x}},old.start,'Only the launch X coordinate changes');
    assert(revision.toStart.center.x>=-12&&revision.toStart.center.x<=0);
    assert.deepEqual({...revision.toHint,yaw:old.hint.yaw,holdMs:old.hint.holdMs,note:old.hint.note},old.hint,'Only yaw, marked charge and its speed label may change');
    const speed=revision.toHint.holdMs/2800*99.5+.5,oldSpeed=old.hint.holdMs/2800*99.5+.5;
    assert(Math.abs(speed-oldSpeed)<=.25,'Keep the original launch speed within 0.25m/s');
    assert.equal(revision.toHint.note,old.hint.note.replace(/^\d+\.\d+ m\/s/,speed.toFixed(2)+' m/s'));
    const study=await evidence(revision.study),trace=await evidence(revision.nativeTrace),before=await evidence(revision.beforeTrace),jobs=await evidence(revision.inputs);
    assert.equal(study.layoutSha256,layoutHash);assert.equal(trace.layout,layoutHash);
    assert.equal(study.configSha256,revision.inputs.sha256);
    const row=study.results.find(r=>r.index===revision.index);assert(row?.rest&&row.fullClear);
    assert.equal(row.traceSha256,revision.nativeTrace.sha256);assert.deepEqual(row.shot,jobs[revision.index]);
    assert.deepEqual(row.start,revision.toStart);assert.equal(row.shot.startX,revision.toStart.center.x);
    for(const key of ['yaw','pitch','top','kick'])assert.equal(row.shot.input[key],revision.toHint[key]);
    assert.equal(row.shot.range,revision.toHint.powerRange);
    const hold=(row.shot.speed-.5)/99.5*2800;assert(Math.abs(hold-revision.toHint.holdMs)<1e-6);
    assert.deepEqual(trace.challenge.start,revision.toStart);
    assert.deepEqual(trace.challenge.waypoints,nativeShape(course.waypoints));
    assert.equal(trace.challenge.id,course.id);assert.equal(before.challenge.id,course.id);
    assert.deepEqual(before.challenge.start,old.start);assert.deepEqual(before.challenge.waypoints,nativeShape(old.waypoints));
    for(const t of [trace,before])for(const target of old.waypoints)assert(t.waypointHits.some(h=>h.waypointId===target.id));
    const pillar=old.waypoints[1];
    const approach=t=>{const hit=t.contacts.find(c=>c.surface===pillar.surface);assert(hit);return length(t.poses.filter(p=>p.t<=hit.time));};
    assert(approach(trace)>=approach(before),'The revised route must retain the long pillar approach');
    assert.equal(revision.toDistance,Number(length(trace.poses).toFixed(1)));
    course.start=revision.toStart;course.hint=revision.toHint;course.campaign.distance=revision.toDistance;
  }
  return result;
}
