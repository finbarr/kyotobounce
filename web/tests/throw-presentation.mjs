import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ChargeMeter} from '../public/charge-meter.js';
import {launchDirection,aimOrigin,projectAimReticle} from '../public/aim-reticle.js';
const meter=new ChargeMeter();
for(const hold of [25,750,1400,2800,4000]){
 meter.start(1000,2800);
 const before=meter.sample(1000+hold);
 meter.release(1000+hold);
 for(const [age,phase] of [[16,'Aim'],[50,'Charging'],[150,'Charging'],[220,'Release'],[400,'Release']]){
  assert.equal(meter.sample(1000+hold+age,phase),before,'Delayed server frames cannot rewind or restart a released meter');
 }
 assert.equal(meter.charging,false);assert.equal(meter.released,true);
 assert.equal(meter.sample(6000,'Flight'),0);
 meter.reset();assert.equal(meter.sample(6000),0);assert.equal(meter.sample(6050,'Charging'),0,'Stale charging frames cannot restart a cancelled meter');assert.equal(meter.released,false);
}
meter.start(0,1000);assert.equal(meter.sample(500),.5,'The configured charge duration is honored');meter.reset();meter.release(800);assert.equal(meter.released,false,'Releasing a cancelled windup has no effect');
meter.start(900,1000);assert.equal(meter.sample(1000),.1,'A fresh throw forgets the previous charge');

const player={feet:{x:0,y:0,z:0},release:{x:.22,y:1.5,z:.42},yaw:0};
for(const yaw of [-180,-90,0,90,180,270]){
 const origin=aimOrigin(player,yaw),r=yaw*Math.PI/180;
 assert.ok(origin.distanceTo(new THREE.Vector3(.22*Math.cos(r)+.42*Math.sin(r),1.5,.22*Math.sin(r)-.42*Math.cos(r)))<1e-10,'Hand offset turns immediately with input');
 for(const pitch of [-65,0,12,80]){
  const native=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(-pitch*Math.PI/180,r,0,'YXZ'));native.z=-native.z;
  assert.ok(launchDirection(yaw,pitch).distanceTo(native)<1e-10,'Reticle and native velocity use the same direction');
 }
}
const camera=new THREE.PerspectiveCamera(55,16/9,.035,450),origin=aimOrigin(player,0),direction=launchDirection(0,0);
camera.position.set(-.55,1.1,3.8);camera.lookAt(origin.clone().addScaledVector(direction,30));camera.updateMatrixWorld();
for(const distance of [1,3,12,30,120]){
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.copy(origin).addScaledVector(direction,distance);wall.updateMatrixWorld();
 for(const orbit of [false,true]){
  if(orbit){camera.position.set(-2,2,3);camera.lookAt(origin.clone().addScaledVector(direction,6));camera.updateMatrixWorld();}
  const reticle=projectAimReticle(origin,direction,camera,wall),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(reticle.x*2-1,1-reticle.y*2),camera);
  assert.ok(ray.ray.distanceToPoint(reticle.target)<1e-8,'The displayed reticle points exactly at the outgoing ray on near and far surfaces, including orbit');
  assert.ok(reticle.target.distanceTo(origin.clone().addScaledVector(direction,distance))<1e-8);
  if(distance===3&&!orbit)assert.ok(Math.abs(reticle.x-.5)>.02,'Reproduces visible parallax in the previous fixed-centre reticle');
 }
 wall.geometry.dispose();wall.material.dispose();
}
const empty=new THREE.Group();assert.equal(projectAimReticle(origin,direction,camera,empty).distance,300,'Open space uses a distant direction marker');
camera.lookAt(camera.position.clone().sub(direction));camera.updateMatrixWorld();assert.equal(projectAimReticle(origin,direction,camera,empty).visible,false,'Hide the marker when orbiting away from the throw');
console.log('PASS released meter stability, cancel/retry, native aim convention, hand offset, near/far reticle convergence and manual orbit');
