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

// Visual-only foot placement. Progress comes from rendered authoritative travel,
// so an input velocity at a wall cannot run the gait in place. One foot stays
// planted while the other swings; stopping completes only the settling steps.
function applyWalk(a,player,mode,time){
  const elapsed=a.lastPoseTime===null?0:time-a.lastPoseTime;a.lastPoseTime=time;
  const dt=THREE.MathUtils.clamp(elapsed,0,.1);
  a.group.updateWorldMatrix(true,true);
  const root=worldPosition(a.group),rotation=a.group.getWorldQuaternion(new THREE.Quaternion());
  let gait=a.gait;
  const delta=gait?root.clone().sub(gait.root):new THREE.Vector3(),distance=Math.hypot(delta.x,delta.z);
  const allowed=player.grounded&&!['Charging','Release'].includes(mode);
  if(!gait||elapsed<0||elapsed>.5||distance>.8||!allowed){
    a.gait={root,feet:{},next:'L',swing:null,direction:new THREE.Vector3(0,0,1),started:false};gait=a.gait;
    for(const side of ['L','R']){
      const foot=a.bones[`foot.${side}`];if(!foot)return;
      const position=worldPosition(foot);
      gait.feet[side]={plant:position.clone(),target:position.clone(),local:a.group.worldToLocal(position.clone()),rotation:rotation.clone().invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion()))};
    }
    a.walkBlend=0;return;
  }
  gait.root.copy(root);
  const travelled=distance>.00001&&dt>0;
  if(travelled)gait.lastTravelTime=time;
  const moving=travelled||time-(gait.lastTravelTime??-Infinity)<.08;
  if(travelled)gait.direction.set(delta.x,0,delta.z).normalize();
  const localDirection=gait.direction.clone().applyQuaternion(rotation.clone().invert());
  const lateral=Math.abs(localDirection.x),stride=THREE.MathUtils.lerp(THREE.MathUtils.clamp(.50+(distance/Math.max(dt,.001)-1.4)*.06,.44,.68),THREE.MathUtils.clamp(.36-(distance/Math.max(dt,.001)-1.4)*.05,.24,.36),lateral);
  const neutral={};
  for(const side of ['L','R']){
    const foot=gait.feet[side];neutral[side]=a.group.localToWorld(foot.local.clone());
    // The service supplies the ground height (including stairs), not a browser
    // raycast or an independently simulated character root.
    foot.plant.y+=delta.y;foot.target.y+=delta.y;
  }
  if(gait.swing){gait.swing.start.y+=delta.y;if(gait.swing.landing)gait.swing.landing.y+=delta.y;}
  if(!gait.swing){
    let side=gait.started?gait.next:(localDirection.x<0?'R':'L');
    if(!moving)side=['L','R'].find(s=>gait.feet[s].plant.distanceTo(neutral[s])>.018);
    if(side){
      const foot=gait.feet[side];
      gait.swing={side,start:foot.plant.clone(),progress:0,settling:!moving,travel:gait.started?stride:.20,lead:stride*.5,direction:gait.direction.clone()};gait.started=true;
      gait.next=side==='L'?'R':'L';
    }
  }
  if(gait.swing){
    const step=gait.swing,foot=gait.feet[step.side];
    if((!moving&&!step.settling)||(moving&&step.direction.dot(gait.direction)<.5)){
      step.start.copy(foot.target);step.progress=0;step.settling=!moving;step.travel=.20;step.direction.copy(gait.direction);step.landing=null;
    }
    // Stride grows with speed; side steps and the first step stay shorter.
    step.progress=Math.min(1,step.progress+(moving&&!step.settling?distance/step.travel:dt/.20));
    const t=step.progress,smooth=t*t*(3-2*t),target=step.landing?.clone()||neutral[step.side].clone();
    if(!step.landing&&moving&&!step.settling)target.addScaledVector(gait.direction,step.travel+step.lead-distance);
    // Side steps keep the shoes on their own side of the supporting shoe.
    const other=gait.feet[step.side==='L'?'R':'L'],localTarget=a.group.worldToLocal(target.clone()),localOther=a.group.worldToLocal(other.plant.clone());
    localTarget.x=step.side==='L'?Math.max(localTarget.x,localOther.x+.17):Math.min(localTarget.x,localOther.x-.17);
    target.copy(a.group.localToWorld(localTarget));
    step.landing=target.clone();
    foot.target.copy(step.start).lerp(target,smooth);
    foot.target.y+=Math.sin(Math.PI*t)**2*(step.settling?.035:.065);
    if(t===1){foot.plant.copy(foot.target);gait.swing=null;}
  }
  for(const side of ['L','R'])if(gait.swing?.side!==side)gait.feet[side].target.copy(gait.feet[side].plant);
  a.walkBlend=THREE.MathUtils.damp(a.walkBlend,moving||gait.swing?1:0,14,dt);
  if(a.walkBlend<.00001){a.walkBlend=0;if(!moving&&!gait.swing)gait.started=false;}
  // Lower the visual pelvis just enough to reach both ankles; planted shoes
  // stay flat. The resting crouch fades after the feet settle under the body.
  let crouch=.045*a.walkBlend;
  for(const side of ['L','R']){
    const hip=worldPosition(a.bones[`thigh.${side}`]),target=gait.feet[side].target;
    const horizontal=(hip.x-target.x)**2+(hip.z-target.z)**2;
    crouch=Math.max(crouch,hip.y-target.y-Math.sqrt(Math.max(.01,.779**2-horizontal)));
  }
  a.bones.hips.position.y-=crouch;
  a.group.updateWorldMatrix(true,true);
  const pole=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
  for(const side of ['L','R']){
    const foot=gait.feet[side];
    plantLeg(a,side,foot.target,pole,rotation.clone().multiply(foot.rotation));
  }
  const swing=gait.swing,arm=swing?Math.sin(Math.PI*swing.progress)*(swing.side==='L'?1:-1)*a.walkBlend:0;
  a.bones['upper_arm.L']?.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,-.12*arm));
  a.bones['upper_arm.R']?.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,.035*arm));
}

function plantLeg(a,side,target,pole,footRotation){
  const thigh=a.bones[`thigh.${side}`],shin=a.bones[`shin.${side}`],foot=a.bones[`foot.${side}`];
  const hip=worldPosition(thigh),knee=worldPosition(shin),ankle=worldPosition(foot);
  const l1=hip.distanceTo(knee),l2=knee.distanceTo(ankle),direction=target.clone().sub(hip);
  const distance=THREE.MathUtils.clamp(direction.length(),.05,l1+l2-.0001);direction.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
  const kneeTarget=hip.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  pointBone(thigh,shin,kneeTarget);pointBone(shin,foot,hip.clone().addScaledVector(direction,distance));setWorldRotation(foot,footRotation);
}
