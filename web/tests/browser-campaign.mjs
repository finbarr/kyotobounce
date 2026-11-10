// Verify the complete authored campaign against the browser collision/solver.
// Save only input/hash receipts, never another copy of the station or replays.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Shot,launchInput,BROWSER_PHYSICS} from '../public/physics/shot.js';
import {Walker} from '../public/physics/walker.js';
import {STEP} from '../public/physics/ball.js';
import {v,add} from '../public/physics/math.js';
import {scoreAttempt} from '../scoring.ts';
import {objectiveDistance} from '../levels/objective-distance.mjs';
const catalogBytes=await readFile('web/starter-challenges.json'),proofBytes=await readFile('web/levels/proof-inputs.json'),courses=JSON.parse(catalogBytes),proof=JSON.parse(proofBytes);
assert.equal(courses.length,30);assert.deepEqual(courses.map(c=>c.id),proof.courses.map(p=>p.id));
const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),receipts=[];
assert.equal(world.layoutSha256,proof.layout);
function features(result,required){
 const objective=objectiveDistance(result),nonFloor=result.waypointHits.filter(h=>h.normal.y<.5);let sharpTurns=0,ceilingRebounds=0;
 for(const hit of nonFloor){
  const i=result.poses.findIndex(p=>p.t>=hit.time),poses=result.poses;if(i<5||i+5>=poses.length)continue;
  const delta=(a,b)=>[b.x-a.x,b.y-a.y,b.z-a.z],before=delta(poses[i-5].p,poses[i-2].p),after=delta(poses[i+2].p,poses[i+5].p),length=Math.hypot(...before)*Math.hypot(...after);
  const angle=length?Math.acos(Math.max(-1,Math.min(1,before.reduce((n,x,k)=>n+x*after[k],0)/length)))*180/Math.PI:0;
  if(angle>=45)sharpTurns++;if(hit.normal.y<-.995&&before[1]>.0001&&after[1]<-.0001)ceilingRebounds++;
 }
 const observed={objectiveDistance:objective?.distance,nonFloor:nonFloor.length,sharpTurns,ceilingRebounds,heightDrop:result.launchPosition.y-Math.min(...result.poses.map(p=>p.p.y)),finishRise:result.poses.at(-1).p.y-result.challenge.start.center.y};
 if(required.objectiveDistance)assert.ok(observed.objectiveDistance>=required.objectiveDistance[0]&&observed.objectiveDistance<=required.objectiveDistance[1],`Route distance ${observed.objectiveDistance} outside ${required.objectiveDistance}`);
 for(const [key,min] of [['nonFloor',required.minNonFloorTargets],['sharpTurns',required.minSharpTurns],['ceilingRebounds',required.minCeilingRebounds],['heightDrop',required.minHeightDrop],['finishRise',required.minFinishRise]])if(min!==undefined)assert.ok(observed[key]>=min,`${key}: ${observed[key]} < ${min}`);
 return observed;
}
for(const [index,challenge] of courses.entries()){
 const source=proof.courses[index],jobs=[{kind:'hint',input:source.shot},...source.neighbors.map(input=>({kind:'neighbor',input}))];let hintHash;
 assert.equal(source.revision,challenge.revision);assert.equal(source.shot.holdMs,challenge.hint.holdMs);assert.equal(source.shot.range,challenge.hint.powerRange);
 for(const key of ['yaw','pitch','top','kick'])assert.equal(source.shot.input[key],challenge.hint[key],`${challenge.id}: proof must use the visible hint`);
 for(const [sample,job] of jobs.entries()){
  const receipt={id:challenge.id,sample,kind:job.kind,input:job.input};
  try{
   for(let repeat=0;repeat<(job.kind==='hint'?2:1);repeat++){
    const input=job.input,releaseTime=input.phase||0,walker=new Walker(world,add(challenge.start.center,v(0,.03,0)));
    for(let i=0;i<12;i++)walker.move({x:0,z:0},input.input.yaw,false,STEP);
    const position=walker.release(input.input.yaw,input.input.pitch,releaseTime);assert.ok(position,'Hand must have an unobstructed release');assert.ok(walker.grounded,'Start must support the robot');
    const launch={...launchInput(walker.feet,{...input.input,power:input.holdMs/2800,powerRange:input.range}),position};
    const shot=new Shot(world,challenge,launch,{releaseTime}),began=performance.now();
    // A failed observation never becomes a game timeout or fabricated rest.
    while(!shot.done&&shot.steps<180*150)shot.step();
    assert.ok(shot.done&&shot.ball.sleeping,'Shot must reach physical rest');assert.deepEqual(shot.ball.velocity,v());assert.deepEqual(shot.ball.spin,v());assert.equal(shot.ball.budgetExhaustions,0,'Collision budget must not clip movement');
    const result=shot.result();assert.deepEqual(scoreAttempt(result),result.breakdown);
    const allWaypoints=challenge.waypoints.every(w=>result.waypointHits.some(h=>h.waypointId===w.id)),fullClear=allWaypoints&&(!challenge.goal||result.destinationReached)&&(!challenge.requiredSurface||result.contacts.some(c=>c.qualifying&&c.surface===challenge.requiredSurface));
    const hash=createHash('sha256').update(JSON.stringify(result)).digest('hex');
    if(repeat)assert.equal(hash,hintHash,'Every replay pose/contact/score must repeat');
    else{Object.assign(receipt,{rest:true,fullClear,score:result.score,duration:result.duration,computeMs:performance.now()-began,sha256:hash,launch,releaseTime});if(job.kind==='hint')hintHash=hash;}
    if(job.kind==='hint'){assert.ok(fullClear,'Suggested shot must collect every target and destination');receipt.features=features(result,source.features||{});}
   }
   receipt.pass=true;
  }catch(error){receipt.pass=false;receipt.error=error.message;}
  receipts.push(receipt);
 }
 const runs=receipts.filter(r=>r.id===challenge.id),neighbors=runs.slice(1),clears=neighbors.filter(r=>r.fullClear).length;
 console.log(JSON.stringify({id:challenge.id,hint:runs[0].pass,neighbors:`${clears}/${neighbors.length}`,minimum:source.minimumNeighborClears,errors:runs.filter(r=>!r.pass).map(r=>({sample:r.sample,error:r.error})),tolerance:clears>=source.minimumNeighborClears}));
}
// A real UI throw exposed a one-bit Chrome/Node difference in a moving-tread
// contact timestamp. Keep the exact launch and nonzero station phase: authored
// hints alone did not exercise this case.
const regressions=[
 {id:'basement-upward-bound',label:'moving-contact-timestamp',releaseTime:40.87834413442761,launch:{position:v(2.2200000286102295,-3.3885726928710938,5.64272928237915),velocity:v(1.0162678956985474,0,6.222846661011925e-17),spin:v()}},
 // Inject an invalid penetrated state to exercise recovery in the real worker.
 // It must escape the casing and settle, without claiming the distant target.
 {id:'atrium-welcome',label:'solid-casing-recovery',recoverFrom:'east-concourse-lower-escalator-1-skirt--1 36796',expectSuccess:false,expectedWaypoints:0,releaseTime:0,launch:{position:v(28.900002479553223,5.379999876022339,5.914999723434448),velocity:v(),spin:v()}}
];
for(const fixture of regressions){
 const shot=new Shot(world,courses.find(c=>c.id===fixture.id),fixture.launch,{releaseTime:fixture.releaseTime});
 if(fixture.recoverFrom){assert.equal(world.overlap(shot.ball.position,shot.ball.profile.radius)?.surface.id,fixture.recoverFrom);shot.step();assert.equal(world.overlap(shot.ball.position,shot.ball.profile.radius),null,'First physics step escapes the solid');}
 while(!shot.done&&shot.steps<180*150)shot.step();
 assert.ok(shot.done&&shot.ball.sleeping);assert.equal(shot.ball.budgetExhaustions,0);
 const result=shot.result();assert.equal(result.success,fixture.expectSuccess??true);assert.deepEqual(scoreAttempt(result),result.breakdown);
 fixture.sha256=createHash('sha256').update(JSON.stringify(result)).digest('hex');
}
world.free();await writeFile('.local/browser-physics/campaign-proof.json',JSON.stringify({layout:proof.layout,physics:BROWSER_PHYSICS,catalogSha256:createHash('sha256').update(catalogBytes).digest('hex'),inputsSha256:createHash('sha256').update(proofBytes).digest('hex'),receipts,regressions},null,2)+'\n');
assert.ok(receipts.every(r=>r.pass),'Campaign physics, geometry or authored-route assertion failed');
for(const p of proof.courses)assert.ok(receipts.filter(r=>r.id===p.id&&r.kind==='neighbor'&&r.fullClear).length>=p.minimumNeighborClears,`${p.id}: nearby input tolerance failed`);
console.log(`PASS all 30 browser courses: repeated exact hints, ${receipts.filter(r=>r.kind==='neighbor').length} nearby inputs, authored route features, full rest and independent scoring`);
