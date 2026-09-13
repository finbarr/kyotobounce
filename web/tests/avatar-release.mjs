import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatar,poseAvatar} from '../public/avatar.js';
const bytes=await readFile(new URL('../public/assets/ori.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const point=bone=>bone.getWorldPosition(new THREE.Vector3());
let count=0,maxError=0;
for(const character of ['ori','koma','don'])for(const powerRange of ['precision','full'])for(const power of [0,.2,.5,.9,1])for(const yaw of [-150,0,45,90])for(const [top,kick]of [[0,0],[200,0],[-200,0],[0,200],[0,-200],[140,140],[-140,-140]]){
 const a=createAvatar(asset,{character}),feet={x:2,y:.025,z:20},q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-yaw*Math.PI/180);
 const offset=new THREE.Vector3(.22,1.5,-.42).applyQuaternion(q),release={x:feet.x+offset.x,y:feet.y+offset.y,z:feet.z-offset.z};
 a.group.position.set(feet.x,feet.y,-feet.z);a.group.rotation.y=Math.PI-yaw*Math.PI/180;
 const p={id:'p',feet,release,yaw,pitch:15,top,kick,power,powerRange,grounded:true},state={owner:'p',releaseTime:10,ball:release};
 poseAvatar(a,p,'Release',state,10);
 const error=a.held.distanceTo(new THREE.Vector3(release.x,release.y,-release.z));maxError=Math.max(maxError,error);
 assert.ok(error<.001,`${character}/${powerRange}/${power}/${yaw}/${top}/${kick}: release error ${error}`);
 assert.ok(Math.abs(point(a.upper).distanceTo(point(a.forearm))-.3)<.001&&Math.abs(point(a.forearm).distanceTo(point(a.hand))-.26)<.001,'Rigid arm lengths');count++;
}
const poses={};
for(const powerRange of ['precision','full']){
 const a=createAvatar(asset),p={id:'p',powerRange,feet:{x:0,y:0,z:0},release:{x:-.22,y:1.5,z:-.42},grounded:true,power:0,top:0,kick:0,pitch:15,yaw:0},state={owner:'p',releaseTime:3,ball:p.release};
 poseAvatar(a,p,'Aim',state,0);const hold=a.held.clone(),footHeight=point(a.bones['foot.L']).y;
 poseAvatar(a,p,'Charging',state,1/240);assert.ok(a.held.distanceTo(hold)<.001,'Charge starts without moving the held ball');
 let last=a.held.clone(),maxStep=0;
 for(let i=1;i<=672;i++){
  p.power=i/672;poseAvatar(a,p,'Charging',state,i/240);
  maxStep=Math.max(maxStep,last.distanceTo(a.held));last.copy(a.held);
  for(const side of ['L','R'])assert.ok(Math.abs(point(a.bones[`foot.${side}`]).y-footHeight)<.001,'Windup keeps both shoes planted');
 }
 poses[powerRange]={windup:hold.distanceTo(a.held),spread:point(a.bones['foot.L']).distanceTo(point(a.bones['foot.R']))};
 for(let i=0;i<=29;i++){
  poseAvatar(a,p,'Release',state,2.88+i*.12/29);maxStep=Math.max(maxStep,last.distanceTo(a.held));last.copy(a.held);
 }
 for(let i=0;i<=300;i++){
  poseAvatar(a,p,'Flight',state,3+i/240);maxStep=Math.max(maxStep,last.distanceTo(a.held));last.copy(a.held);
 }
 assert.ok(maxStep<.06,`${powerRange}: no pose discontinuities at charge, release or recovery (${maxStep})`);
 assert.ok(a.held.distanceTo(hold)<.002,`${powerRange}: returns to authored idle grip ${a.held.toArray()} vs ${hold.toArray()}`);
 poseAvatar(a,p,'Flight',state,3.35);const seek=a.held.clone();
 for(let i=0;i<120;i++)poseAvatar(a,p,'Flight',state,3.35);
 assert.ok(a.held.distanceTo(seek)<.001,'Repeated paused replay samples do not drift');
 poseAvatar(a,p,'Flight',state,4.2);poseAvatar(a,p,'Flight',state,3.35);
 assert.ok(a.held.distanceTo(seek)<.001,'Seeking backwards reproduces the throw');
}
assert.ok(poses.full.windup>poses.precision.windup*2.5,'Power winds up substantially farther');
assert.ok(poses.full.spread>poses.precision.spread*1.7,'Power has a visibly wider, staggered stance');
for(const powerRange of ['precision','full']){
 const a=createAvatar(asset),p={id:'p',feet:{x:0,y:0,z:0},release:{x:-.22,y:1.5,z:-.42},grounded:true,powerRange,power:0,top:200,kick:-140,pitch:20,yaw:0},state={owner:'p'};
 for(let i=0;i<60;i++)poseAvatar(a,p,'Aim',state,i/60);
 const hand=a.hand.getWorldQuaternion(new THREE.Quaternion()),head=a.head.quaternion.clone();
 for(let i=60;i<300;i++)poseAvatar(a,p,'Aim',state,i/60);
 assert.ok(hand.angleTo(a.hand.getWorldQuaternion(new THREE.Quaternion()))<.00001&&head.angleTo(a.head.quaternion)<.00001,'Stationary aim does not accumulate procedural rotation');
}
console.log(`PASS ${count} actual rig release endpoints (max ${maxError.toFixed(8)} m), rigid limbs, planted shoes, distinct poses, continuous charge/release/recovery and replay seeks`);
