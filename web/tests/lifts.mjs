import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
import {createLifts,liftPartCenter,liftButton,replayLiftPoses,liftRiderFeet} from '../public/lifts.js';
import {CameraObstacles} from '../public/camera-obstacles.js';
import {subwayLift} from '../station/realism/subway-lift-spec.mjs';
import {multiStopLift,liftTravel} from '../station/realism/multi-stop-lift-spec.mjs';

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

const multi=multiStopLift({id:'five-floor-test',origin:{x:0,y:-12,z:0},stops:[{id:'b3',label:'B3 · Parking',height:0},{id:'b2',label:'B2 · Porta',height:3.5},{id:'b1',label:'B1 · Shops',height:7.3},{id:'1',label:'1F · Central Gate',height:12},{id:'2',label:'2F · Passage',height:19.35}]});
assert.equal(multi.trips.length,10);
for(const height of [.1,.8,1,3.5,19.35]){
 const path=liftTravel(height);assert.equal(path[0].y,0);assert.equal(path.at(-1).y,height);
 for(let i=1;i<path.length;i++){assert(path[i].y>=path[i-1].y);assert((path[i].y-path[i-1].y)/(path[i].x-path[i-1].x)<=.800001);}
}
const at=i=>({...initial,id:multi.id,height:multi.stops[i].height,lowerDoor:i===0?1:0,upperDoor:i===4?1:0,landingDoors:multi.stops.map((_,j)=>j===i?1:0),busy:false});
const middle=at(2),topFloor=at(4),multiRoot=new Group(),multiRuntime=createLifts(multiRoot,[multi]);multiRuntime.update([middle]);
const middleButton=liftButton(multi,middle,{...multi.origin,y:multi.origin.y+middle.height});
assert.equal(middleButton.text,'E · Choose floor');assert.deepEqual(middleButton.stops.filter(s=>s.current).map(s=>s.id),['b1']);
assert.equal(liftButton(multi,middle,{x:0,y:multi.origin.y+3.5,z:-2}).text,'E · Call lift');
assert.equal(liftButton(multi,{...middle,busy:true},{...multi.origin,y:multi.origin.y+middle.height}).disabled,true);
assert.equal(liftButton(multi,middle,{x:0,y:multi.origin.y+5,z:-2}),null,'No call button between landings');
const seek=replayLiftPoses([{t:0,poses:[middle]},{t:1,poses:[topFloor]}],.5)[0];
assert.deepEqual(seek.landingDoors,[0,0,.5,0,.5]);
for(const {part,mesh}of multiRuntime.parts){const p=liftPartCenter(multi,part,middle);assert(mesh.position.distanceTo(new Vector3(p.x,p.y,-p.z))<1e-9);if(part.motion==='landing'){assert.equal(p.y,multi.origin.y+part.center.y+multi.stops[part.floor].height);assert.equal(p.x,part.center.x+(part.floor===2?part.doorSide*multi.doorTravel:0));}}

const store=new Store(':memory:');
try{
 const requests=[],worker={ready:false,capabilities:['lifts-v1'],request:async m=>{requests.push(m);return{message:'Lift called.'};}};
 const game=new Competition(store,worker,()=>{}),member=await game.add(store.guest(),'lift-session');member.restoring=false;
 assert.deepEqual(await game.command(member,{type:'lift',lift:spec.id}),{type:'notice',message:'Lift called.'});
 assert.deepEqual(requests,[{type:'lift',id:member.id,lift:spec.id}]);
 for(const extra of [{position:spec.origin},{destination:1},{score:100},{id:'another-session'}])await assert.rejects(game.command(member,{type:'lift',lift:spec.id,...extra}),/Choose a lift button/);
 for(const stop of [null,0,'','x'.repeat(65),{},[]])await assert.rejects(game.command(member,{type:'lift',lift:multi.id,stop}),/Choose a lift button/);
 await assert.rejects(game.command(member,{type:'lift',lift:multi.id,stop:'b1'}),/Rebuild and restart/);
 worker.capabilities.push('lift-stops-v1');
 await game.command(member,{type:'lift',lift:multi.id,stop:'b1'});
 assert.deepEqual(requests[1],{type:'lift',id:member.id,lift:multi.id,liftStop:'b1'},'Only destination intent and server session id reach the native authority');
 member.attempt='active-shot';await assert.rejects(game.command(member,{type:'lift',lift:spec.id}),/Finish or recall/);member.attempt=undefined;
 worker.capabilities=[];await assert.rejects(game.command(member,{type:'lift',lift:spec.id}),/Rebuild and restart/);
 assert.equal(requests.length,2,'Rejected requests never reach native physics');
}finally{store.close();}
console.log('PASS lift replay seeks, controls, moving camera collision and authoritative button intent');
