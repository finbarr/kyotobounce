import assert from 'node:assert/strict';
import {StaticWorld} from '../public/physics/static-world.js';
import {validateDisk,validateWaypoint,validateCourse,DesignRecorder,placeDisk} from '../public/physics/designer.js';
import {capsuleOverlap} from '../public/physics/capsule.js';
import {v,identity} from '../public/physics/math.js';
import {Vector3,Triangle} from 'three';
import {triangleSweep,boxSweep} from '../public/physics/sweeps.js';
// Placement needs true point rays. A zero-radius sphere contact cannot infer
// its normal by subtracting the coincident center and surface point.
const tri=new Triangle(new Vector3(-2,0,-2),new Vector3(2,0,-2),new Vector3(0,0,2));
for(const sign of [-1,1]){
 const hit=triangleSweep(new Vector3(0,sign,0),new Vector3(0,-sign*2,0),0,tri);assert.equal(hit.fraction,.5);assert.equal(hit.normal.y,sign);
}
assert.equal(triangleSweep(new Vector3(0,1,0),new Vector3(1,0,0),0,tri),null);
assert.equal(triangleSweep(new Vector3(0,1,0),new Vector3(0,-.5,0),0,tri),null);
const ray=boxSweep(new Vector3(0,2,0),new Vector3(0,-3,0),v(1,1,1),0);assert.equal(ray.fraction,1/3);assert.equal(ray.normal.y,1);
assert.equal(boxSweep(new Vector3(),new Vector3(0,2,0),v(1,1,1),0),null,'A ray starting inside a solid cannot place a surface behind the origin');
const box=(id,position,half)=>({id,position,half,rotation:identity(),kind:'box',material:'stone',mask:3});
const floor=box('floor',v(0,-.1,0),v(10,.1,10)),disk={center:v(),normal:v(0,1,0),surface:'floor',radius:.5};
const make=shapes=>new StaticWorld({shapes,escalators:[],fallLimitY:-10});
const world=make([floor,box('wall',v(0,2,-5),v(10,2,.1))]);
try{
 assert.deepEqual(validateDisk(world,disk,true),disk);assert.equal(capsuleOverlap(world,v(0,.03,0),.24,1.76),null);
 const target={id:'bank',center:v(0,2,-4.9),normal:v(0,0,1),surface:'wall',radius:.5};validateWaypoint(world,target);
 validateCourse(world,{scoring:'waypoint-v4',start:disk,goal:null,waypoints:[target]});
 assert.throws(()=>validateCourse(world,{scoring:'waypoint-v4',start:disk,goal:null,waypoints:[target,target]}),/unique/);
 assert.throws(()=>validateCourse(world,{scoring:'waypoint-v4',start:disk,goal:null,waypoints:[]}),/at least one/);
 for(const bad of [{...disk,center:v(9.8,0,0)},{...disk,surface:'fake'},{...disk,radius:Infinity}])assert.throws(()=>validateDisk(world,bad,true));
 for(const bad of [{...target,normal:v(0,0,-1)},{...target,normal:v(0,0,2)},{...target,center:v(0,3.95,-4.9)},{...target,surface:'moving-tread'}])assert.throws(()=>validateWaypoint(world,bad));
 assert.equal(placeDisk(world,{slot:'start',origin:v(0,3,0),direction:v(0,-1,0),radius:.5}).surface,'floor');
 assert.throws(()=>placeDisk(world,{slot:'goal',origin:v(0,2,0),direction:v(0,0,-1),radius:.5}),/floor/);
 const recorder=new DesignRecorder(world,{feet:v(0,.025,0)});for(let i=0;i<100000;i++)recorder.pose(v(i,2,0));
 assert.ok(recorder.path.length<=2000);assert.ok(recorder.routeLength>=99999);assert.ok(recorder.stride>1);
 for(let i=0;i<600;i++)recorder.contact({surface:'wall',point:v(i*3,2,-4.9),normal:v(0,0,1),incoming:v(0,0,-2),outgoing:v(0,0,2),time:i});
 assert.equal(recorder.contacts.length,512,'Long design throws retain a bounded candidate set');
 const failed=recorder.finish({ball:{clock:20,position:v(),sleeping:false},reason:'Recalled'});assert.match(failed.error,/come to rest/);
}finally{world.free();}
for(const obstacle of [box('low ceiling',v(0,1.6,0),v(2,.03,2)),box('thin rail',v(0,1,0),v(.02,.02,2)),box('enclosure',v(0,3,0),v(3,3,3))]){
 const blocked=make([floor,obstacle]);try{assert.ok(capsuleOverlap(blocked,v(0,.03,0),.24,1.76),'Full capsule detects '+obstacle.id);assert.throws(()=>validateDisk(blocked,disk,true));}finally{blocked.free();}
}
const headroom=make([floor,box('headroom',v(0,1.82,0),v(2,.01,2))]);try{assert.throws(()=>validateDisk(headroom,disk,true),/room for the thrower/,'Start validation includes the actual walking body and skin');}finally{headroom.free();}
console.log('PASS browser creator geometry: full-capsule clearance, radial support, fixed faces, bounds, unique targets, placement, bounded path/contact memory and recall rejection');
