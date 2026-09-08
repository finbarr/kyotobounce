// Same throw inputs on flat and raised layouts; use native contacts, velocities
// and final rest. Low-speed contacts are diagnostics, not scoring impacts.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const [beforeFile,afterFile,out]=process.argv.slice(2);if(!out)throw Error('Usage: node tools/check_tactile_evidence.mjs BEFORE AFTER OUT');
const before=JSON.parse(await readFile(beforeFile)),after=JSON.parse(await readFile(afterFile)),checks=[];
assert.notEqual(before.layoutSha256,after.layoutSha256);
for(const id of ['bars-bounce','dots-bounce','dots-fast-impact','bars-rolling','dots-rolling']){
 const a=before.results.find(r=>r.id===id),b=after.results.find(r=>r.id===id);assert(a&&b&&!a.error&&!b.error&&!a.failure&&!b.failure,id);
 assert.deepEqual(a.start,b.start);assert.equal(a.final.power,b.final.power);assert.deepEqual(a.final.launchPosition,b.final.launchPosition);
 assert(!a.surfaces.some(s=>s.startsWith('tactile-')));
 const impacts=b.trace.events.filter(e=>e.type==='impact'&&e.surface.startsWith('tactile-'));
 const contacts=b.trace.states.filter(s=>s.diagnostics.lastSurface.startsWith('tactile-')&&s.diagnostics.contactAge<.04);
 if(id.includes('rolling')){
  assert(contacts.length,id+' observed native low-speed contact');
  const c=contacts.find(s=>s.ball.y<.03&&Math.abs(s.velocity.y)<.08&&s.diagnostics.contactNormal.x<-.3);assert(c,id+' actual profile slope engages rolling ball');
  const previous=b.trace.states.filter(s=>s.phase==='Flight'&&s.flightTime<c.flightTime).at(-1);
  assert(previous.ball.y<.04&&previous.velocity.x>0&&previous.velocity.x<.3,id+' rolling approach');
  assert.equal(b.final.phase,'Result');assert(b.final.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(b.final.velocity)),0);assert.equal(Math.hypot(...Object.values(b.final.spin)),0);
  assert(a.final.ball.x-b.final.ball.x>.08,id+' raised profile stops low-speed roll sooner');
  checks.push({id,contactTime:c.flightTime,contactNormal:c.diagnostics.contactNormal,approachSpeed:Math.hypot(...Object.values(previous.velocity)),stoppingDifference:a.final.ball.x-b.final.ball.x,physicallyRested:true});
 }else{
  assert(impacts.length,id+' native raised impact');assert(impacts.some(e=>e.speed>(id.includes('fast')?6:2)),id+' meaningful incoming speed');
  const first=impacts[0];assert(first.point.y>0&&first.point.y<.0051);
  checks.push({id,surface:first.surface,impactSpeed:first.speed,contactHeight:first.point.y,contactTime:first.time});
 }
}
const result={status:'pass',baseline:before.layoutSha256,candidate:after.layoutSha256,checks};await writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
