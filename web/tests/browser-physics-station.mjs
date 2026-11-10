// Full-station proof uses exactly the compact asset and solver shipped to the
// worker. Keep only a small result receipt, never duplicate station geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Shot,launchInput} from '../public/physics/shot.js';
import {v,add} from '../public/physics/math.js';
import {scoreAttempt} from '../scoring.ts';
const started=performance.now(),world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),buildMs=performance.now()-started;
const courses=JSON.parse(await readFile('web/starter-challenges.json','utf8')),results=[];
for(const id of ['atrium-welcome','atrium-clock-in']){
 const challenge=courses.find(c=>c.id===id),hint=challenge.hint;
 const launch=launchInput(add(challenge.start.center,v(0,.025,0)),{...hint,power:hint.holdMs/2800});
 let reference;
 for(let run=0;run<2;run++){
  const shot=new Shot(world,challenge,launch),began=performance.now();
  // A test guard fails; it must never finish a still-moving game shot.
  while(!shot.done&&shot.steps<180*120)shot.step();
  assert.ok(shot.done,`${id} did not settle`);assert.ok(shot.ball.sleeping);assert.equal(shot.ball.budgetExhaustions,0);
  const result=shot.result();assert.ok(result.success,`${id}: missing waypoint`);assert.deepEqual(scoreAttempt(result),result.breakdown);
  assert.equal(result.waypointHits.length,challenge.waypoints.length);assert.deepEqual(shot.ball.velocity,v());assert.deepEqual(shot.ball.spin,v());
  if(id==='atrium-clock-in'){
   // Current native Clock In proof: first three impacts. Float32 query noise
   // need not be byte-identical to PhysX; geometry must remain within 0.1 mm.
   const expected=[[1.423333883,5.510680676,-13.257608414],[1.423333883,0,-8.125632286],[1.423333883,0,-3.61147618]];
   for(let i=0;i<3;i++)assert.ok(Math.hypot(...Object.values(result.contacts[i].point).map((x,k)=>x-expected[i][k]))<.0001,'Native contact position changed');
  }
  const hash=createHash('sha256').update(JSON.stringify(result)).digest('hex');
  if(reference)assert.equal(hash,reference,'All poses, contacts and score must repeat exactly');reference=hash;
  if(run===0)results.push({id,computeMs:performance.now()-began,duration:result.duration,score:result.score,waypoints:result.waypointHits.length,poses:result.poses.length,sha256:hash});
 }
}
const receipt={layout:world.layoutSha256,buildMs,stats:world.stats,results};
await writeFile('.local/browser-physics/station-proof.json',JSON.stringify(receipt,null,2)+'\n');world.free();console.log(JSON.stringify(receipt,null,2));
