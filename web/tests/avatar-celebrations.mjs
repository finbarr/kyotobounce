import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import assert from 'node:assert/strict';
import {createAvatar,poseAvatar,celebrateAvatar,cancelAvatarCelebration,isAvatarCelebrating} from '../public/avatar.js';
const bytes=await readFile(new URL('../public/assets/ori.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
// Cosmetic rig fixtures only: no service, score submission or generated records.
const zero={x:0,y:0,z:0},state={owner:'p',attempt:'hands',releaseTime:-5,ball:{x:2,y:.023,z:1},velocity:zero,spin:zero,diagnostics:{sleeping:true}};
const player={id:'p',feet:zero,release:{x:-.22,y:1.5,z:-.42},yaw:0,pitch:0,top:0,kick:0,power:1,powerRange:'full',grounded:true};
const digits=['index','middle','ring','little','thumb'];
const close=(a,b,label)=>assert.ok(a.clone().normalize().angleTo(b.clone().normalize())<1e-5,label);
const position=(a,name)=>a.bones[name].getWorldPosition(new T.Vector3());
const make=(character,yaw=0)=>{const a=createAvatar(asset,{character});a.group.position.set(4,2,-5);a.group.rotation.y=yaw;return a;};
let cases=0;
for(const character of ['ori','koma','don'])for(const score of [100,100000,1000000,5000000,20000000])for(const yaw of [0,1.7])for(const reducedMotion of [false,true]){
 const result={type:'result',saved:true,score,attempt:state.attempt},plain=make(character,yaw),spun=make(character,yaw);
 const spunPlayer={...player,top:200,kick:-200};
 for(const a of [plain,spun]){
  assert.equal(celebrateAvatar(a,result,{reducedMotion}),true);
  poseAvatar(a,player,'Result',state,0);
 }
 const duration=reducedMotion?1.8:plain.celebration.duration;
 for(const t of [.08,.35,.6,duration*.45,duration*.65,duration-.1]){
  poseAvatar(plain,player,'Result',state,t);poseAvatar(spun,spunPlayer,'Result',state,t);
  for(const side of ['L','R']){
   const hand=`hand.${side}`,forearm=`forearm.${side}`;
   close(plain.bones[hand].quaternion,spun.bones[hand].quaternion,'The shot spin cannot twist a celebrating wrist');
   assert.ok(position(plain,hand).distanceTo(position(spun,hand))<1e-5,'Shot spin cannot change the dance hand position');
   assert.ok(Math.abs(position(spun,forearm).distanceTo(position(spun,hand))-.26)<.001,'Wrist pose preserves the rigid forearm');
   for(const digit of digits)for(let i=1;i<=3;i++){
    const name=`${digit}${i}.${side}`;close(plain.bones[name].quaternion,spun.bones[name].quaternion,'No residual ball curl in either hand');
   }
   if(t>=.35&&t<=duration-.4){
    assert.ok(spun.bones[hand].quaternion.angleTo(spun.restWrists[side])<.46,'Hands follow the forearms rather than the world-space carry angle');
    for(const digit of digits)for(let i=1;i<=3;i++){
     const bone=spun.bones[`${digit}${i}.${side}`],curl=bone.quaternion.clone().normalize().angleTo(spun.baseRotations.get(bone).clone().normalize());
     assert.ok(character==='don'?curl>.45:curl<1e-5,'Open celebration palms; both taiko hands grip their sticks');
    }
   }
  }
  for(const digit of digits)for(let i=1;i<=3;i++){
   const left=spun.bones[`${digit}${i}.L`],right=spun.bones[`${digit}${i}.R`];
   const leftCurl=spun.baseRotations.get(left).clone().invert().multiply(left.quaternion);
   const rightCurl=spun.baseRotations.get(right).clone().invert().multiply(right.quaternion);
   close(leftCurl,rightCurl,'Both hands use the same gesture, including the thumbs');
  }
 }
 for(const a of [plain,spun])poseAvatar(a,player,'Result',state,duration+.1);
 assert.equal(isAvatarCelebrating(spun),false);
 assert.equal(celebrateAvatar(spun,result),false,'Duplicate result cannot restart the celebration');
 for(const digit of digits)for(let i=1;i<=3;i++){
  const bone=spun.bones[`${digit}${i}.R`];close(bone.quaternion,spun.baseRotations.get(bone),'The hand stays empty after the dance');
 }
 const reference=make(character,yaw);
 for(const mode of ['Aim','Charging','Release']){
  const next={...state,releaseTime:10};poseAvatar(spun,spunPlayer,mode,next,10);poseAvatar(reference,spunPlayer,mode,next,10);
  close(spun.hand.quaternion,reference.hand.quaternion,'Retry restores the normal throwing wrist');
  assert.ok(spun.held.distanceTo(reference.held)<1e-5,'Retry restores the exact ball grip');
 }
 cases++;
}
const wave=make('koma'),result={type:'result',saved:true,score:100000,attempt:state.attempt};
celebrateAvatar(wave,result);poseAvatar(wave,player,'Result',state,0);poseAvatar(wave,player,'Result',state,.5);
assert.ok(wave.group.worldToLocal(position(wave,'hand.R')).y<.85,'The non-waving hand drops from the ball-carrying position');
assert.equal(cancelAvatarCelebration(wave),180);poseAvatar(wave,player,'Result',state,.7);assert.equal(isAvatarCelebrating(wave),false);
const gated=make('ori');celebrateAvatar(gated,result);
for(const blocked of [{...state,diagnostics:{sleeping:false}},{...state,velocity:{x:.1,y:0,z:0}},{...state,spin:{x:0,y:.1,z:0}}]){poseAvatar(gated,player,'Result',blocked,0);assert.equal(isAvatarCelebrating(gated),false,'Native rest still gates the dance');}
assert.equal(celebrateAvatar(make('ori'),{...result,saved:false}),false);
assert.equal(celebrateAvatar(make('ori'),{...result,breakdown:{outcome:'forfeit'}}),false);
console.log(`PASS ${cases} actual-rig celebrations: all characters/tiers/headings/reduced-motion, empty hands, wrist alignment, spin isolation, matching stick grips, rest gates, cancel and retry`);
