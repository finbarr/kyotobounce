import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {throwSpeed} from '../public/throw-power.js';
import {PHYSICS_VERSION} from '../types.ts';
const courses=JSON.parse(await readFile(new URL('../starter-challenges.json',import.meta.url)));
const proofs=JSON.parse(await readFile(new URL('../levels/proof-inputs.json',import.meta.url)));
assert.equal(courses.length,30,'The campaign has thirty authored stages');
assert.equal(new Set(courses.map(c=>c.id)).size,30);
assert.equal(new Set(courses.map(c=>c.name)).size,30);
const heights=new Set(),signatures=new Set();
for(const [i,c] of courses.entries()){
 assert.equal(c.order,i);assert.equal(c.creator,'station');assert.equal(c.layout,proofs.layout);
 assert.equal(c.physics,PHYSICS_VERSION,'The campaign uses the current native response');
 assert.equal(c.campaign.chapter,Math.floor(i/5)+1);assert.ok(c.campaign.brief.length>30);
 assert.ok(c.campaign.distance>0);if(i)assert.ok(c.campaign.distance>=courses[i-1].campaign.distance,'Suggested route length ascends');
 const proof=proofs.courses.find(p=>p.id===c.id&&p.revision===c.revision);assert.ok(proof,'Every stage has a reproducible native shot');
 assert.ok(proof.repeat>=2&&proof.neighbors.length>=1,'Every stage has repeated and neighboring inputs');
 assert.ok(Math.abs(throwSpeed(c.hint.holdMs/2800,c.hint.powerRange)-proof.shot.speed)<.0001);
 assert.deepEqual(proof.shot.input,{yaw:c.hint.yaw,pitch:c.hint.pitch,top:c.hint.top,kick:c.hint.kick});
 const targets=[c.start,c.goal,...(c.waypoints||[])].filter(Boolean);
 for(const t of targets){assert.ok(Object.values(t.center).every(Number.isFinite));assert.ok(t.radius>=.1&&t.radius<=3);assert.ok(t.surface);}
 assert.equal(new Set((c.waypoints||[]).map(w=>w.id)).size,c.waypoints?.length||0);
 for(const w of c.waypoints||[])assert.ok(Math.abs(Math.hypot(...Object.values(w.normal))-1)<.001);
 assert.ok(c.goal||c.waypoints?.length);assert.ok(['waypoint-v1','combo-v5'].includes(c.scoring));
 heights.add(Math.round(c.start.center.y));signatures.add(JSON.stringify([c.start.center,proof.shot.input,proof.shot.speed]));
}
assert.equal(signatures.size,30,'No duplicate route and throw');assert.ok(heights.size>=8,'Routes explore the station vertically');
assert.ok(courses.at(-1).campaign.distance>=200,'The finale covers a substantial station route');
assert.ok(courses.filter(c=>c.waypoints?.length).length>=25,'The campaign retains waypoint play');
console.log('PASS campaign progression, unique routes, complete proof coverage, target geometry and hints');
