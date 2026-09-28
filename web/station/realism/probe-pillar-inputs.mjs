// Isolated native input study. A diagnostic full clear is not an authored revision.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath, catalogPath, configPath, outputPath] = process.argv.slice(2);
for (const p of [layoutPath, catalogPath, configPath, outputPath]) assert(p && resolve(p).startsWith(resolve('.local') + '/'));
assert(process.env.KYOTO_WORKER_EXECUTABLE);
await mkdir(outputPath, {recursive:false});
const sha = b => createHash('sha256').update(b).digest('hex');
const lb = await readFile(layoutPath), cb = await readFile(catalogPath), jb = await readFile(configPath);
const layout = sha(lb), course = JSON.parse(cb).find(c => c.id === 'kyoto-pillar-carom'), jobs = JSON.parse(jb);
assert.equal(course.layout, layout); assert(jobs.length > 0 && jobs.length <= 100);
const original = JSON.parse(await readFile('web/starter-challenges.json')).find(c => c.id === course.id);
assert.deepEqual(course.start, original.start);
assert.equal(course.waypoints.length, 3);
for (let i=0;i<3;i++) for (const key of ['id','center','radius','normal']) assert.deepEqual(course.waypoints[i][key], original.waypoints[i][key]);
process.env.KYOTO_LAYOUT = resolve(layoutPath);
process.env.KYOTO_WORKER_LOG = resolve(outputPath, 'worker.log');
const worker = new PhysicsWorker(), states = new Map(), events = new Map(), accelerated = new Set();
worker.on('message', m => {
  if (['state','shot-frame'].includes(m.type)) states.set(m.id,m);
  if (m.type === 'shot-frame' && !accelerated.has(m.attempt)) {
    accelerated.add(m.attempt); worker.send({type:'playback-rate',id:m.id,request:m.attempt,rate:2});
  }
  if (['result','notice'].includes(m.type)) events.set(m.id,m);
});
const until = async (fn, ms=90000) => {const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Observation timed out before rest');await delay(20);}};
const report={meaning:'Local native input study with all three original targets. Optional start shifts stay on the original wall line and retain at least 90% of the original pillar approach. Full clears here require subsequent authored-input revision and repeat/neighbor proof.',layoutSha256:layout,catalogSha256:sha(cb),configSha256:sha(jb),toolSha256:sha(await readFile(new URL(import.meta.url))),results:[]};
let next=0;
async function run(slot) {
  const id='pillar-input-'+slot;
  worker.send({type:'join',id}); await until(()=>states.get(id)?.players?.length);
  while(next<jobs.length) {
    const index=next++, shot=jobs[index], row={index,shot};
    const candidate=structuredClone(course);
    if(shot.startX!==undefined){
      assert(shot.startX>=-12&&shot.startX<=0);
      candidate.start.center.x=shot.startX;
      const distance=start=>Math.hypot(start.center.x-original.waypoints[1].center.x,start.center.z-original.waypoints[1].center.z);
      assert(distance(candidate.start)>=distance(original.start)*.9,'Retain at least 90% of the original pillar approach');
    }
    row.start=candidate.start;
    assert.equal(shot.range,'full'); assert(shot.speed>=.5&&shot.speed<=100);
    try {
      await worker.request({type:'select',id,challenge:candidate}); await delay(150);
      events.delete(id); worker.send({type:'input',id,x:0,z:0,fast:false,...shot.input}); await delay(100);
      const hold=(shot.speed-.5)/99.5*2800;
      worker.send({type:'charge',id,request:randomUUID(),powerRange:shot.range}); await delay(hold);
      worker.send({type:'release',id,power:hold/2800}); await until(()=>events.has(id),120000);
      const result=events.get(id); await writeFile(resolve(outputPath,`${index}.json`),JSON.stringify(result));
      assert.equal(result.type,'result',result.message); assert.equal(result.layout,layout);
      await until(()=>states.get(id)?.phase==='Result'); const state=states.get(id);
      assert(state.diagnostics.sleeping); assert(Math.hypot(...Object.values(state.velocity))<1e-5); assert(Math.hypot(...Object.values(state.spin))<1e-5);
      row.rest=true; row.duration=result.duration; row.final=result.poses.at(-1).p;
      row.hits=[...new Set(result.waypointHits.map(h=>h.waypointId))];
      row.fullClear=course.waypoints.every(w=>row.hits.includes(w.id));
      row.closest=course.waypoints.map(w=>({id:w.id,distance:Math.min(...result.poses.map(p=>Math.hypot(...['x','y','z'].map(k=>p.p[k]-w.center[k]))))}));
      row.pillarContacts=result.contacts.filter(c=>c.surface===course.waypoints[1].surface).map(({time,point,speed})=>({time,point,speed}));
      row.newHallContacts=result.contacts.filter(c=>/^(hall-bay-well|hall-basement|hall-b1)/.test(c.surface)).map(({surface,time,point,speed})=>({surface,time,point,speed}));
      row.traceSha256=sha(await readFile(resolve(outputPath,`${index}.json`)));
    } catch(error) {row.error=String(error);}
    report.results.push(row); await writeFile(resolve(outputPath,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({index,input:shot.input,speed:shot.speed,rest:row.rest,hits:row.hits,pillarContacts:row.pillarContacts?.length,closest:row.closest?.map(c=>Number(c.distance.toFixed(3))),fullClear:row.fullClear,error:row.error}));
    worker.send({type:'recall',id});await delay(150);
  }
  worker.send({type:'leave',id});
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{worker.stop();process.exit(130)});
try {await worker.start();await until(()=>worker.ready);await Promise.all(Array.from({length:Math.min(4,jobs.length)},(_,i)=>run(i)));}
finally {worker.stop();await writeFile(resolve(outputPath,'report.json'),JSON.stringify(report,null,2)+'\n');}
assert.equal(report.results.length,jobs.length);
