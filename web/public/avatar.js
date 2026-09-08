import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const unitX=new THREE.Vector3(1,0,0),unitY=new THREE.Vector3(0,1,0),unitZ=new THREE.Vector3(0,0,1);
const grip=new THREE.Vector3(0,.082,-.029);
function worldPosition(bone){return bone.getWorldPosition(new THREE.Vector3());}
function setWorldRotation(bone,rotation){
  const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.copy(parent.multiply(rotation));bone.updateWorldMatrix(false,true);
}
function pointBone(bone,child,target){
  const origin=worldPosition(bone),from=worldPosition(child).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
  const delta=new THREE.Quaternion().setFromUnitVectors(from,to);setWorldRotation(bone,delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
}
// Two rigid limb lengths, an outward elbow pole and preserved wrist orientation.
// The solver only adjusts the visible release pose; it never moves the physics ball.
function alignGrip(a,target){
  a.group.updateWorldMatrix(true,true);
  const shoulder=worldPosition(a.upper),elbow=worldPosition(a.forearm),wrist=worldPosition(a.hand);
  const rotation=a.hand.getWorldQuaternion(new THREE.Quaternion());
  const wristTarget=target.clone().sub(grip.clone().applyQuaternion(rotation));
  const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),direction=wristTarget.clone().sub(shoulder);
  const distance=THREE.MathUtils.clamp(direction.length(),.05,l1+l2-.002);direction.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  const pole=new THREE.Vector3(-1,0,0).applyQuaternion(a.group.quaternion);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbowTarget=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
  pointBone(a.upper,a.forearm,elbowTarget);pointBone(a.forearm,a.hand,shoulder.clone().addScaledVector(direction,distance));setWorldRotation(a.hand,rotation);
}
export function createAvatar(asset){
  const model=clone(asset.scene),group=new THREE.Group();group.add(model);
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const clip of asset.animations){const action=mixer.clipAction(clip);action.play();action.paused=true;actions[clip.name]=action;}
  const bones={},baseRotations=new Map(),basePositions=new Map();model.traverse(o=>{if(o.isBone){bones[o.name]=o;if(o.userData.name)bones[o.userData.name]=o;baseRotations.set(o,o.quaternion.clone());basePositions.set(o,o.position.clone());}});
  for(const name of ['upper_arm.R','forearm.R','hand.R'])if(!bones[name])throw new Error(`Robot rig missing ${name}`);
  return {group,model,mixer,actions,bones,baseRotations,basePositions,walkBlend:0,lastPoseTime:null,head:bones.head,upper:bones['upper_arm.R'],forearm:bones['forearm.R'],hand:bones['hand.R'],held:new THREE.Vector3(),releaseError:0};
}
export function poseAvatar(a,player,phase,state,stationTime){
  const owner=player.id===state.owner,mode=owner?phase:'Aim';
  let idle=0,wind=0,throwWeight=0,throwTime=0,releaseProgress=0;
  if(mode==='Charging')wind=1;
  else if(mode==='Release'){
    releaseProgress=THREE.MathUtils.clamp(1-(state.releaseTime-stationTime)/.12,0,1);
    wind=1-releaseProgress;throwWeight=releaseProgress;throwTime=releaseProgress*(7/60);
  }else if(mode==='Flight'){
    throwWeight=1;throwTime=7/60+Math.max(0,stationTime-state.releaseTime);
  }else idle=1;
  for(const [name,action]of Object.entries(a.actions)){
    action.setEffectiveWeight(name==='Idle'?idle:name==='Windup'?wind:throwWeight);
    action.time=name==='Windup'?Math.min(1,player.power)*action.getClip().duration:name==='Throw'?Math.min(throwTime,action.getClip().duration):0;
  }
  // PropertyMixer skips identical keyframe values. Restore the last unmodified
  // animation pose before sampling so procedural aim/grip never accumulates.
  for(const [bone,rotation]of a.baseRotations)bone.quaternion.copy(rotation);
  for(const [bone,position]of a.basePositions)bone.position.copy(position);
  a.mixer.update(0);
  for(const [bone,rotation]of a.baseRotations)rotation.copy(bone.quaternion);
  for(const [bone,position]of a.basePositions)position.copy(bone.position);
  applyWalk(a,player,mode,stationTime);
  const top=player.top/200,kick=player.kick/200,pronation=THREE.MathUtils.clamp(top*Math.PI*.52+kick*Math.PI*.30,-1.55,1.55);
  a.forearm.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitY,pronation*.65));
  a.hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitY,pronation*.35));
  a.hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,top*.23));
  const opened=mode==='Flight'?Math.min(1,Math.max(0,stationTime-state.releaseTime)*12):0;
  for(const digit of ['index','middle','ring','little']){
    for(let i=1;i<=3;i++){
      const angle=[0,-1.00,-1.28,-.67][i]*(1-opened);
      a.bones[`${digit}${i}.R`].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,angle));
    }
  }
  for(let i=1;i<=3;i++)a.bones[`thumb${i}.R`].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,-.6*(1-opened)));
  applyGaze(a,player,mode,state,stationTime);
  a.group.updateWorldMatrix(true,true);
  a.held.copy(grip);a.hand.localToWorld(a.held);
  if(mode==='Release'){
    const target=new THREE.Vector3(player.release.x,player.release.y,-player.release.z);
    const blend=a.held.clone().lerp(target,releaseProgress*releaseProgress);
    alignGrip(a,blend);a.held.copy(grip);a.hand.localToWorld(a.held);a.releaseError=a.held.distanceTo(target);
  }
  // Fade a robot that would otherwise fill the follow camera and hide the bounce.
  return a.held;
}

// Work in the sampled head frame, including the model, avatar heading and neck.
// Always layer onto the restored animation pose, never last frame's correction.
function applyGaze(a,player,mode,state,time){
  if(!a.head)return;
  const elapsed=a.gazeTime===undefined?0:time-a.gazeTime;
  const reset=a.gazeTime===undefined||elapsed<0||elapsed>.5;a.gazeTime=time;
  let yaw=0,pitch=-THREE.MathUtils.clamp(player.pitch*Math.PI/180,-.5,.7)*.6;
  if(['Flight','Result'].includes(mode)&&state.ball&&[state.ball.x,state.ball.y,state.ball.z].every(Number.isFinite)){
    a.group.updateWorldMatrix(true,true);
    const direction=new THREE.Vector3(state.ball.x,state.ball.y,-state.ball.z).sub(worldPosition(a.head));
    if(direction.lengthSq()>.01){
      direction.applyQuaternion(a.head.getWorldQuaternion(new THREE.Quaternion()).invert());
      yaw=THREE.MathUtils.clamp(Math.atan2(direction.x,direction.z),-1.15,1.15);
      pitch=THREE.MathUtils.clamp(-Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),-.65,.65);
    }
  }
  const target=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  if(reset)a.gaze=target;else a.gaze.slerp(target,1-Math.exp(-10*Math.max(0,elapsed)));
  a.head.quaternion.multiply(a.gaze);
}

// Distance-driven steps: walls and start-circle limits stop the feet as well as
// translation. Opposite legs/arms, knee flexion and ankle roll keep a carrying gait.
function applyWalk(a,player,mode,time){
  const dt=a.lastPoseTime===null?0:THREE.MathUtils.clamp(time-a.lastPoseTime,0,.1);a.lastPoseTime=time;
  const movement=player.movement||{x:0,y:0,z:0},speed=Math.hypot(movement.x,movement.z);
  const walking=player.grounded&&speed>.08&&!['Charging','Release'].includes(mode);
  a.walkBlend=THREE.MathUtils.damp(a.walkBlend,walking?Math.min(1,speed/.7):0,16,dt);
  if(a.walkBlend<.00001){a.walkBlend=0;return;}
  a.group.updateWorldMatrix(true,true);
  const stanceHeight=Math.min(worldPosition(a.bones['foot.L']).y,worldPosition(a.bones['foot.R']).y);
  const phase=(player.walked||0)/1.45*Math.PI*2,weight=a.walkBlend;
  const yaw=player.yaw*Math.PI/180,forward=Math.sin(yaw)*movement.x+Math.cos(yaw)*movement.z;
  const direction=forward<-.05?-1:1;
  const rotate=(name,axis,angle)=>a.bones[name]?.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle*weight));
  for(const [side,offset]of [['L',0],['R',Math.PI]]){
    const cycle=phase+offset,swing=Math.sin(cycle),lift=Math.max(0,Math.cos(cycle));
    rotate(`thigh.${side}`,unitX,.48*swing*direction);
    rotate(`shin.${side}`,unitX,-.62*lift);
    rotate(`foot.${side}`,unitX,-.20*swing*direction+.28*lift);
    rotate(`thigh.${side}`,unitZ,(side==='L'?1:-1)*.035*Math.cos(cycle));
  }
  rotate('hips',unitZ,.028*Math.sin(phase));rotate('chest',unitY,-.035*Math.sin(phase));
  if(a.bones.hips)a.bones.hips.position.y+=.025*(1-Math.cos(phase*2))*weight;
  rotate('upper_arm.L',unitX,-.38*Math.sin(phase));rotate('forearm.L',unitX,-.12);
  rotate('upper_arm.R',unitX,.10*Math.sin(phase));
  a.group.updateWorldMatrix(true,true);
  const lowestFoot=Math.min(worldPosition(a.bones['foot.L']).y,worldPosition(a.bones['foot.R']).y);
  if(a.bones.hips)a.bones.hips.position.y+=stanceHeight-lowestFoot;
}
