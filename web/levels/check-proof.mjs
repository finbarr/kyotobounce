// Fail closed: an authoring search or old worker cannot be called final course proof.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve(process.argv[2]);const summary=JSON.parse(await readFile(resolve(dir,'summary.json'),'utf8'));
assert.equal(summary.fixture.preliminary,false,'Classic probes are preliminary, not waypoint acceptance');
assert.ok(summary.capabilities.includes('waypoint-v1'));
assert.equal(summary.results.length,8,'Five repeats and three neighbors required');
const inputs=[];const controls=[];
for(let i=0;i<8;i++){
 const row=JSON.parse(await readFile(resolve(dir,`shot-${i}.json`),'utf8'));
 assert.equal(row.outcome,'rest-result');assert.equal(row.result.success,true);assert.equal(row.result.destinationReached,true);
 assert.equal(row.challenge.scoring,'waypoint-v1');assert.equal(row.result.layout,summary.layout);
 for(const field of ['velocity','spin'])assert.ok(Object.values(row.final[field]).every(x=>x===0),`Non-rest ${field}`);
 assert.equal(row.final.diagnostics.supported,true);
 if(row.challenge.requiredSurface)assert.ok(row.events.some(e=>e.type==='impact'&&e.surface===row.challenge.requiredSurface),'Required architecture contact');
 assert.ok(row.result.poses.length>1,'Retain immutable native replay');
 assert.ok(row.result.waypointHits.length>0,'A route must demonstrate its optional chain');
 assert.equal(new Set(row.result.waypointHits.map(w=>w.waypointId)).size,row.result.waypointHits.length,'Once-only waypoint awards');
 const c={speed:row.shot.speed,range:row.shot.range,yaw:row.shot.input.yaw,pitch:row.shot.input.pitch,top:row.shot.input.top,kick:row.shot.input.kick,phase:row.shot.phase??0};controls.push(c);inputs.push(JSON.stringify(c));
}
assert.ok(inputs.slice(0,5).every(s=>s===inputs[0]),'First five are the identical fixture');
assert.equal(new Set(inputs.slice(5)).size,3,'Three distinct neighboring samples');
assert.ok(inputs.slice(5).every(s=>s!==inputs[0]));
for(const c of controls.slice(5)){assert.equal(c.range,controls[0].range);for(const [key,window] of Object.entries({speed:.1,yaw:.5,pitch:1,top:10,kick:10,phase:.1}))assert.ok(Number.isFinite(c[key])&&Math.abs(c[key]-controls[0][key])<=window+1e-9,`Neighbor ${key} exceeds authored small window`);}
console.log('PASS: native robustness, destination rest, route and waypoint records; browser/retry/replay UI acceptance still separate.');
