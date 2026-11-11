import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Shot,launchInput,BROWSER_PHYSICS} from '../public/physics/shot.js';
import {Walker} from '../public/physics/walker.js';
import {validateCourse} from '../public/physics/designer.js';
import {v,add} from '../public/physics/math.js';
import {STEP} from '../public/physics/ball.js';
const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),catalog=JSON.parse(await readFile('web/starter-challenges.json')),results=[];
try{
 for(const id of ['atrium-welcome','atrium-clock-in','basement-upward-bound']){
  const source=catalog.find(c=>c.id===id),walker=new Walker(world,add(source.start.center,v(0,.03,0)));for(let i=0;i<12;i++)walker.move({x:0,z:0},source.hint.yaw,false,STEP);
  const input={...source.hint,power:source.hint.holdMs/2800,powerRange:source.hint.powerRange||'precision'},thrower={feet:walker.feet,...input},launch=launchInput(walker.feet,input);launch.position=walker.release(input.yaw,input.pitch,0);
  const design=new Shot(world,{...source,goal:null,waypoints:[]},launch,{design:true,thrower});
  while(!design.done&&design.steps<180*120){design.step();if(design.steps%180===0)design.drain();}
  assert.ok(design.done&&design.ball.sleeping);const capture=design.designer.finish(design);assert.equal(capture.error,'',`${id}: ${capture.error}`);assert.ok(capture.path.length>20&&capture.path.length<=2001);assert.ok(capture.waypoints.length<=8);
  const course={...source,id:'design-'+id,goal:capture.goal,start:capture.start,waypoints:capture.waypoints};validateCourse(world,course);
  for(let i=0;i<capture.waypoints.length;i++)for(let j=0;j<i;j++){
   const a=capture.waypoints[i].center,b=capture.waypoints[j].center;assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=3-1e-5);assert.ok(capture.waypointTimes[i]-capture.waypointTimes[j]>=.45-1e-5);
  }
  const replay=new Shot(world,course,launch,{thrower});while(!replay.done&&replay.steps<180*120)replay.step();
  const result=replay.result();assert.ok(result.success);assert.equal(result.waypointHits.length,course.waypoints.length);assert.equal(result.destinationReached,!!course.goal);assert.equal(replay.ball.budgetExhaustions,0);
  results.push({id,waypoints:course.waypoints.length,goal:!!course.goal,duration:result.duration,score:result.score,pathPoints:capture.path.length,sha256:createHash('sha256').update(JSON.stringify(result)).digest('hex')});
 }
 await writeFile('.local/browser-physics/designer-proof.json',JSON.stringify({physics:BROWSER_PHYSICS,layout:world.layoutSha256,results},null,2)+'\n');console.log(results);
}finally{world.free();}
