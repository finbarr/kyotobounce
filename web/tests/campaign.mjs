import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PHYSICS_VERSION,THROW_MODEL,WAYPOINT_SCORING} from '../types.ts';
const courses=JSON.parse(await readFile(new URL('../starter-challenges.json',import.meta.url)));
const proof=JSON.parse(await readFile(new URL('../levels/proof-inputs.json',import.meta.url)));
const assets=JSON.parse(await readFile(new URL('../v2/assets.json',import.meta.url)));
assert.equal(proof.targetCount,30);
assert(courses.length>0&&courses.length<=30,'Publish completed levels incrementally, up to exactly 30');
assert.equal(proof.sourceLayout,assets.layoutSha256);
assert.equal(new Set(courses.map(c=>c.id)).size,courses.length);
assert.deepEqual(proof.courses.map(c=>c.id),courses.map(c=>c.id));
for(const [i,c] of courses.entries()){
 assert.equal(c.creator,'station');assert.equal(c.order,i);
 assert.equal(c.layout,proof.layout);assert.equal(c.physics,PHYSICS_VERSION);
 assert.equal(c.throwModel,THROW_MODEL);assert.equal(c.scoring,WAYPOINT_SCORING);
 assert(c.name&&c.campaign.brief&&c.campaign.chapterTitle&&c.campaign.difficulty);
 assert(c.campaign.distance>0&&c.waypoints.length>0&&c.waypoints.length<=32);
 assert(c.start.radius>=.25);assert.equal(new Set(c.waypoints.map(w=>w.id)).size,c.waypoints.length);
 for(const w of c.waypoints){assert(w.surface&&w.radius>=.1);assert(Math.abs(Math.hypot(...Object.values(w.normal))-1)<.001);}
 const p=proof.courses[i];assert.equal(p.revision,c.revision);assert(p.repeat>=2);
 assert(p.neighbors.length>=2);assert(p.minimumNeighborClears>=0&&p.minimumNeighborClears<=p.neighbors.length);
 assert.equal(c.hint.holdMs,p.shot.holdMs);assert.equal(c.hint.powerRange,p.shot.range);
 assert(c.hint.holdMs>=0&&c.hint.holdMs<=2800&&c.hint.note);
 for(const key of ['yaw','pitch','top','kick'])assert.equal(c.hint[key],p.shot.input[key]);
}
assert.equal(courses[0].id,'atrium-welcome','The new opening lesson is part of the 30-level campaign');
if(process.env.KYOTO_CAMPAIGN_COMPLETE)assert.equal(courses.length,30,'Final acceptance requires all 30 levels');
console.log(`PASS current campaign catalog, ${courses.length}/30 levels with native proof inputs`);
