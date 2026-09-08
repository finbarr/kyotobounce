import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import assert from 'node:assert/strict';
import {createAvatar,poseAvatar,setAvatarCharacter,celebrateAvatar,cancelAvatarCelebration,isAvatarCelebrating} from '../public/avatar.js';
const trigger=JSON.parse(await readFile('artifacts/robot/cast-menu/authoritative-trigger.json','utf8'));
const bytes=await readFile('web/public/assets/ori.glb'),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
// Use an unmodified saved native record for the successful celebration.
// Variants below exercise rejection and alternate record flags.
const recordResult=trigger.result;
assert.ok(recordResult.saved&&(recordResult.records?.personalBest||recordResult.records?.courseBest));
const state=trigger.snapshot,p=state.players.find(p=>p.id===state.owner),results=[];
function make(character){const a=createAvatar(asset,{character});a.group.position.set(p.feet.x,p.feet.y,-p.feet.z);a.group.rotation.y=Math.PI-p.yaw*Math.PI/180;return a;}
const pos=(a,name)=>a.bones[name].getWorldPosition(new T.Vector3());
for(const character of ['ori','koma','don'])for(const reducedMotion of [false,true]){
 const courseOnly=make(character);poseAvatar(courseOnly,p,'Result',state,0);assert.equal(celebrateAvatar(courseOnly,{...recordResult,records:{personalBest:false,courseBest:true}}),true);poseAvatar(courseOnly,p,'Result',state,.1);assert.equal(isAvatarCelebrating(courseOnly),true);
 const a=make(character),unchanged=JSON.stringify(p);poseAvatar(a,p,'Result',state,0);const feet=['L','R'].map(s=>pos(a,`foot.${s}`));
 assert.equal(celebrateAvatar(a,{...recordResult,saved:false}),false);
 assert.equal(celebrateAvatar(a,{...recordResult,records:undefined}),false,'Old results have no record event');
 assert.equal(celebrateAvatar(a,{...recordResult,type:'replay'}),false,'Replay is not a live result');
 assert.equal(celebrateAvatar(a,{...recordResult,records:{personalBest:false,courseBest:false}}),false,'Ties and non-records do not celebrate');
 assert.equal(celebrateAvatar(a,{...recordResult,score:0}),false);
 assert.equal(celebrateAvatar(a,{...recordResult,breakdown:{outcome:'forfeit'}}),false);
 assert.equal(celebrateAvatar(a,recordResult,{reducedMotion}),true);
 poseAvatar(a,p,'Flight',{...state,velocity:{x:1,y:0,z:0}},.01);assert.equal(isAvatarCelebrating(a),false,'Never dance in Flight');
 poseAvatar(a,p,'Result',{...state,diagnostics:{sleeping:false}},.02);assert.equal(isAvatarCelebrating(a),false);
 poseAvatar(a,p,'Result',{...state,velocity:{x:.1,y:0,z:0}},.03);assert.equal(isAvatarCelebrating(a),false,'Translation must stop');
 poseAvatar(a,p,'Result',{...state,spin:{x:0,y:.1,z:0}},.04);assert.equal(isAvatarCelebrating(a),false,'Spin must also stop');
 let maxFootDrift=0,maxLengthError=0;const handRows=[];
 for(let i=0;i<200;i++){
  poseAvatar(a,p,'Result',state,.1+i/60);
  for(const [index,side]of ['L','R'].entries()){
   maxFootDrift=Math.max(maxFootDrift,pos(a,`foot.${side}`).distanceTo(feet[index]));
   const upper=pos(a,`upper_arm.${side}`),elbow=pos(a,`forearm.${side}`),hand=pos(a,`hand.${side}`);
   maxLengthError=Math.max(maxLengthError,Math.abs(upper.distanceTo(elbow)-Math.hypot(.12,.02,.275)),Math.abs(elbow.distanceTo(hand)-Math.hypot(.015,.26)));
  }
  if(i>=24&&i<=54)handRows.push(pos(a,'hand.L'));
 }
 const variation=Math.max(...handRows.map(v=>v.distanceTo(handRows[0]))),reference=make(character);for(let i=0;i<=240;i++)poseAvatar(reference,p,'Result',state,i/60);
 assert.ok(maxFootDrift<.00001&&maxLengthError<.00001,'Feet and rigid limbs preserved through celebration');
 assert.equal(isAvatarCelebrating(a),false);assert.ok(pos(a,'hand.L').distanceTo(pos(reference,'hand.L'))<.00001&&pos(a,'hand.R').distanceTo(pos(reference,'hand.R'))<.00001,'Returns exactly to sampled pose');
 assert.ok(reducedMotion?variation<.00001:variation>.01,'Reduced-motion holds a static pose; normal characters have distinct rhythmic motion');
 assert.equal(celebrateAvatar(a,recordResult),false,'Duplicate record results do not restart');assert.equal(JSON.stringify(p),unchanged);
 const cancel=make(character);poseAvatar(cancel,p,'Result',state,0);celebrateAvatar(cancel,recordResult);for(let i=1;i<=42;i++)poseAvatar(cancel,p,'Result',state,i/60);
 assert.equal(cancelAvatarCelebration(cancel),180);for(let i=43;i<=55;i++)poseAvatar(cancel,p,'Result',state,i/60);assert.equal(isAvatarCelebrating(cancel),false);assert.ok(pos(cancel,'hand.L').distanceTo(pos(reference,'hand.L'))<.00001);
 results.push({character,reducedMotion,maxFootDrift,maxLengthError,variation});
}
const switcher=make('ori');poseAvatar(switcher,p,'Charging',state,10);const before=[...switcher.baseRotations.keys()].map(b=>b.getWorldPosition(new T.Vector3()));let meshCount=0;
for(let round=0;round<4;round++)for(const character of ['koma','don','ori']){
 setAvatarCharacter(switcher,character);poseAvatar(switcher,p,'Charging',state,10);
 [...switcher.baseRotations.keys()].forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(before[i])<.00001,'Switching preserves the recorded pose'));
 if(character==='ori'){let count=0;switcher.group.traverse(o=>{if(o.isMesh)count++;});if(meshCount)assert.equal(count,meshCount,'Old trim is removed on switch');meshCount=count;}
}
await mkdir('artifacts/robot/celebrations',{recursive:true});await writeFile('artifacts/robot/celebrations/result.json',JSON.stringify({status:'pass',results,switchMeshCount:meshCount},null,2));console.log('PASS authoritative rest gates, three celebrations, reduced-motion, neutral/cancel, fixed feet/limbs and repeated transformed character switches');
