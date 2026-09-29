import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
import {createLifts,liftPartCenter,liftButton,replayLiftPoses,liftRiderFeet} from '../public/lifts.js';
import {CameraObstacles} from '../public/camera-obstacles.js';
import {subwayLift} from '../station/realism/subway-lift-spec.mjs';

const spec=subwayLift(),initial={id:spec.id,height:0,carDoor:1,lowerDoor:1,upperDoor:0,moving:false,blocked:false};
const upper={...initial,height:5,upperDoor:1,lowerDoor:0};
const frames=[{t:-1,poses:[initial]},{t:9,poses:[upper]}];
assert.equal(replayLiftPoses(frames,-3)[0].height,0);
assert.equal(replayLiftPoses(frames,20)[0].height,5);
assert.equal(replayLiftPoses(frames,4)[0].height,2.5);
assert.equal(replayLiftPoses(frames,1)[0].height,1,'Backward replay seeks discard the previous pose');
const mid={...initial,height:2.5},rider={...spec.origin,y:spec.origin.y+2.525};
assert.equal(liftRiderFeet([spec],[mid],[upper],rider).y,spec.origin.y+5.025,'Replay rider follows the upper car');
assert.equal(liftRiderFeet([spec],[mid],[initial],rider).y,spec.origin.y+.025,'Backward seeks restore the lower rider height');
const landing={...rider,z:spec.origin.z-2};assert.deepEqual(liftRiderFeet([spec],[mid],[upper],landing),landing,'A person on the landing does not follow the car');
assert.equal(liftButton(spec,initial,spec.origin).text,'E · Ride lift');
assert.equal(liftButton(spec,upper,{...spec.origin,z:spec.origin.z-2}).text,'E · Call lift');
assert.equal(liftButton(spec,initial,{...spec.origin,x:spec.origin.x+10}),null);
assert.equal(liftButton(spec,{...initial,blocked:true},spec.origin).text,'Clear the lift doorway');
const root=new Group(),runtime=createLifts(root,[spec]),camera=new CameraObstacles(new Group());
camera.addDynamicMeshes(runtime.parts.map(p=>p.mesh));
const eye=new Vector3(spec.origin.x,spec.origin.y+1.4,-spec.origin.z),behind=eye.clone().add(new Vector3(0,0,-4));
assert(camera.clearance(eye,behind)<1.1,'The lower car back stops the camera');
runtime.update([upper]);
assert(camera.clearance(eye,behind)>3.9,'The camera query follows the car away from the lower floor');
const elevated=eye.clone().add(new Vector3(0,5,0));
assert(camera.clearance(elevated,behind.clone().add(new Vector3(0,5,0)))<1.1,'The upper car still blocks the camera');
for(const {part,mesh}of runtime.parts){const center=liftPartCenter(spec,part,upper);assert(mesh.position.distanceTo(new Vector3(center.x,center.y,-center.z))<1e-9);}

const store=new Store(':memory:');
try{
 const requests=[],worker={ready:false,capabilities:['lifts-v1'],request:async m=>{requests.push(m);return{message:'Lift called.'};}};
 const game=new Competition(store,worker,()=>{}),member=await game.add(store.guest(),'lift-session');member.restoring=false;
 assert.deepEqual(await game.command(member,{type:'lift',lift:spec.id}),{type:'notice',message:'Lift called.'});
 assert.deepEqual(requests,[{type:'lift',id:member.id,lift:spec.id}]);
 for(const extra of [{position:spec.origin},{destination:1},{score:100},{id:'another-session'}])await assert.rejects(game.command(member,{type:'lift',lift:spec.id,...extra}),/Choose a lift button/);
 member.attempt='active-shot';await assert.rejects(game.command(member,{type:'lift',lift:spec.id}),/Finish or recall/);member.attempt=undefined;
 worker.capabilities=[];await assert.rejects(game.command(member,{type:'lift',lift:spec.id}),/Rebuild and restart/);
 assert.equal(requests.length,1,'Rejected requests never reach native physics');
}finally{store.close();}
console.log('PASS lift replay seeks, controls, moving camera collision and authoritative button intent');
