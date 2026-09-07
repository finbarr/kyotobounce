import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {createAvatar,poseAvatar} from '../public/avatar.js';
import assert from 'node:assert/strict';
const bytes=await readFile('web/public/assets/ori.glb'),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const player={id:'fixture',feet:{x:0,y:0,z:0},release:{x:.22,y:1.5,z:.42},yaw:0,pitch:15,top:0,kick:0,power:0,grounded:true};
const a=createAvatar(asset),position=b=>b.getWorldPosition(new T.Vector3());
poseAvatar(a,player,'Aim',{owner:''},0);
const shoulder=position(a.upper),elbow=position(a.forearm),hand=a.held.clone();
assert.ok(shoulder.y-elbow.y>.25,'Carrying elbow rests below the shoulder');
assert.ok(Math.abs(elbow.x-shoulder.x)<.1,'Upper arm stays beside the torso');
assert.ok(hand.y>1&&hand.y<1.15,'Ball rests at waist height');
poseAvatar(a,player,'Charging',{owner:player.id},0);assert.ok(a.held.distanceTo(hand)<.001,'Windup starts continuously from the carrying pose');
for(let i=0;i<240;i++)poseAvatar(a,player,'Aim',{owner:''},i/60);
assert.ok(a.held.distanceTo(hand)<.001,'Repeated idle frames do not drift');
let maxReleaseError=0;
for(const yaw of [-150,0,45,90])for(const [top,kick]of [[0,0],[200,0],[-200,0],[0,200],[0,-200],[140,140],[-140,-140]]){
  const rig=createAvatar(asset),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-yaw*Math.PI/180),offset=new T.Vector3(.22,1.5,-.42).applyQuaternion(q);
  rig.group.rotation.y=Math.PI-yaw*Math.PI/180;
  const release={x:offset.x,y:offset.y,z:-offset.z};
  poseAvatar(rig,{...player,yaw,top,kick,power:1,release},'Release',{owner:player.id,releaseTime:10},10);
  maxReleaseError=Math.max(maxReleaseError,rig.releaseError);
  assert.ok(Math.abs(position(rig.upper).distanceTo(position(rig.forearm))-.3007)<.002);
  assert.ok(Math.abs(position(rig.forearm).distanceTo(position(rig.hand))-.2604)<.002);
}
assert.ok(maxReleaseError<.001,'Spin grips still meet the physical launch position');
await mkdir('artifacts/phase3/feel',{recursive:true});await writeFile('artifacts/phase3/feel/rig.json',JSON.stringify({status:'pass',shoulder:shoulder.toArray(),elbow:elbow.toArray(),held:hand.toArray(),releaseCases:28,maxReleaseError},null,2));
console.log('PASS relaxed carry, continuous windup, stable idle and 28 release grips');
