import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {createAvatar,poseAvatar} from '../public/avatar.js';
import assert from 'node:assert/strict';
const bytes=await readFile('web/public/assets/ori.glb'),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const a=createAvatar(asset),p={id:'walker',feet:{x:0,y:0,z:0},release:{x:.22,y:1.5,z:.42},yaw:0,pitch:15,top:0,kick:0,power:0,grounded:true,walked:0,movement:{x:0,y:0,z:0}},state={owner:''};
const feet=()=>['L','R'].map(side=>a.bones[`foot.${side}`].getWorldPosition(new THREE.Vector3()));
poseAvatar(a,p,'Aim',state,0);const resting=Math.min(...feet().map(p=>p.y)),base=feet();let minimumSwing=Infinity,maximumSwing=-Infinity,maxPlantError=0;
for(let i=1;i<=180;i++){
 p.walked=i/60*1.4;p.movement.z=1.4;p.feet.z=p.walked;a.group.position.z=-p.walked;poseAvatar(a,p,'Aim',state,i/60);
 const positions=feet();maxPlantError=Math.max(maxPlantError,Math.abs(Math.min(...positions.map(p=>p.y))-resting));
 const separation=positions[0].z-positions[1].z;minimumSwing=Math.min(minimumSwing,separation);maximumSwing=Math.max(maximumSwing,separation);
}
assert.ok(maxPlantError<.001,'One foot stays planted through the gait');assert.ok(maximumSwing-minimumSwing>.3,'Legs alternate forward/backward');
p.movement.z=0;for(let i=181;i<=300;i++)poseAvatar(a,p,'Aim',state,i/60);
assert.ok(a.walkBlend<.00001);feet().forEach((p,i)=>assert.ok(p.clone().sub(a.group.position).distanceTo(base[i])<.001,'Rest pose returns without accumulating offsets'));
await mkdir('artifacts/phase3/async-play',{recursive:true});await writeFile('artifacts/phase3/async-play/walk-rig.json',JSON.stringify({status:'pass',maxPlantError,swingRange:maximumSwing-minimumSwing,stoppedBlend:a.walkBlend},null,2));console.log('PASS actual robot rig: alternating planted steps and stable stop pose');
