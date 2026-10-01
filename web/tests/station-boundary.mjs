import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {StationBoundary,STATION_BOUNDARY} from '../public/station-boundary.js';
import {FlyCamera} from '../public/fly-camera.js';
const boundary=new StationBoundary(),point=(x,y,z)=>new Vector3(x,y,-z);
for(const p of [point(0,2,0),point(-157,55,-24),point(35,130,175),point(-399,5,-40),point(250,3,-170)]){
 assert(boundary.contains(p),'Retained public space and tower remain inside');
 assert.deepEqual(boundary.constrain(p.clone()),p,'Inside positions are unchanged');
 assert.equal(boundary.fogAmount(p),0,'No boundary fog over these station and tower points');
}
for(let x=-600;x<=500;x+=27)for(let z=-450;z<=450;z+=31){
 const p=point(x,220,z);boundary.constrain(p);assert(boundary.contains(p),'Closest point projection stays inside every edge');
 assert.deepEqual(boundary.constrain(p.clone()),p,'Repeated constraint is stable');
}
assert.equal(boundary.fogAmount(point(20,5,220)),1,'Hidden city stays fogged even when the camera approaches');
const source=new PerspectiveCamera();source.position.copy(point(30,80,180));source.lookAt(point(30,80,300));
const fly=new FlyCamera(source);fly.setBoundary(boundary);fly.enter(source);
for(let i=0;i<100;i++)fly.move(new Set(['KeyW','ShiftLeft']),.1);
assert(boundary.contains(fly.camera.position));assert.equal(-fly.camera.position.z,212,'Boost stops behind the tower block');
fly.focus({center:{x:1000,y:200,z:1000},radius:20});assert(boundary.contains(fly.camera.position),'Designer focus cannot escape');
source.position.copy(point(-1000,-200,-1000));fly.enter(source);assert(boundary.contains(fly.camera.position),'Entering an outside replay camera is constrained immediately');
console.log('PASS station and tower remain clear; every edge, boosted flight, focus and camera entry stay bounded');
