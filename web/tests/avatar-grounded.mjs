import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatar,poseAvatar,disposeAvatar} from '../public/avatar.js';
const bytes=await readFile('web/public/assets/ori.glb'),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const rows=[];
for(const character of ['ori','koma','don'])for(const fps of [15,30,60,120])for(const powerRange of ['precision','full']){
 const a=createAvatar(asset,{character}),p={id:'gait',yaw:95,pitch:15,power:0,powerRange,top:0,kick:0,grounded:true,movement:{x:0,z:0}};
 a.group.rotation.y=(180-p.yaw)*Math.PI/180;const q=a.group.quaternion.clone();let worst=null;let time=0,previous={},maxSlip=0,maxError=0,maxDrop=0,steadyRange=0,maxCadence=0,minFoot=1;
 poseAvatar(a,p,'Aim',{owner:''},time);
 for(const [name,x,z,speed,slope]of [['right',1,0,1.4,0],['left',-1,0,1.4,0],['backward',0,-1,1.4,0],['forward',0,1,1.4,0],['diagonal',.707,.707,1.4,0],['fast-right',1,0,4.2,0],['fast-left',-1,0,4.2,0],['fast-forward',0,1,4.2,0],['slope',0,1,1.4,.2],['stop',0,0,0,0]]){
  let low=1,high=-1,steps=0,lastSide;
  for(let i=0;i<fps*3;i++){
   const delta=new T.Vector3(x*speed/fps,z*speed/fps*slope,z*speed/fps).applyQuaternion(q);a.group.position.add(delta);time+=1/fps;
   poseAvatar(a,p,'Aim',{owner:''},time);
   if(i>=fps){low=Math.min(low,a.bones.hips.position.y);high=Math.max(high,a.bones.hips.position.y);}
   if(a.gait.swing?.side&&a.gait.swing.side!==lastSide){steps++;lastSide=a.gait.swing.side;}
   if(.86-a.bones.hips.position.y>maxDrop){maxDrop=.86-a.bones.hips.position.y;worst={name,i,heading:a.gait.heading,root:a.group.position.toArray(),swing:a.gait.swing?.side,progress:a.gait.swing?.progress,feet:Object.fromEntries(Object.entries(a.gait.feet).map(([s,f])=>[s,{target:f.target.toArray(),plant:f.plant.toArray()}]))};}
   for(const side of ['L','R']){
    const foot=a.bones[`foot.${side}`].getWorldPosition(new T.Vector3()),support=!a.gait.pivot&&a.gait.swing?.side!==side&&a.walkBlend>.01,g=a.gait.feet[side];
    if(support&&previous[side]?.support&&g.plant.clone().sub(new T.Vector3(0,delta.y,0)).distanceTo(previous[side].plant)<1e-5)maxSlip=Math.max(maxSlip,foot.clone().sub(new T.Vector3(0,delta.y,0)).distanceTo(previous[side].foot));
    if(a.walkBlend>.01)maxError=Math.max(maxError,foot.distanceTo(g.target));minFoot=Math.min(minFoot,foot.y-a.group.position.y);previous[side]={foot,support,plant:g.plant.clone()};
    const hip=a.bones[`thigh.${side}`].getWorldPosition(new T.Vector3()),knee=a.bones[`shin.${side}`].getWorldPosition(new T.Vector3());
    assert.ok(Math.abs(hip.distanceTo(knee)-Math.hypot(.39,.012))<1e-5);assert.ok(Math.abs(knee.distanceTo(foot)-Math.hypot(.39,.012))<1e-5);
   }
  }
  if(name!=='stop')steadyRange=Math.max(steadyRange,high-low);maxCadence=Math.max(maxCadence,steps/3);
 }
 rows.push({character,fps,powerRange,maxSlip,maxError,maxDrop,steadyRange,maxCadence,minFoot,worst,settled:a.walkBlend});disposeAvatar(a);
}
await mkdir('.local',{recursive:true});await writeFile('.local/avatar-gait.json',JSON.stringify(rows,null,2));
console.table(rows.filter(r=>r.character==='ori'));
assert.ok(rows.every(r=>r.maxError<.003&&r.maxSlip<.003),'Rigid legs reach targets and support shoes stay planted');
assert.ok(rows.every(r=>r.maxDrop<.25&&r.steadyRange<.005),'No sideways pelvis plunges or repeated gait bobbing');
assert.ok(rows.every(r=>r.maxCadence<7),'Fast movement lengthens strides instead of frantic shuffling');
assert.ok(rows.every(r=>r.minFoot>.117&&r.settled<.0001),'Feet remain above ground and settle after direction changes');
console.log('PASS all characters, precision/power carry, 15–120 Hz, forward/back/side/diagonal travel, reversals, fast movement, slopes and stops');
