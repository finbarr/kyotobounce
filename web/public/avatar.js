import * as THREE from 'three';
import {celebrationProfile} from './celebration.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
export const ROBOT_CHARACTERS=Object.freeze([
  {id:'ori',name:'ORI',kana:'オリ',title:'Arcade Ace',description:'Enamel mecha · victory salute'},
  {id:'koma',name:'KOMA',kana:'コマ',title:'Lucky Circuit',description:'Lucky-cat robot · beckoning wave'},
  {id:'don',name:'DON',kana:'ドン',title:'Festival Beat',description:'Taiko robot · drum fanfare'},
]);
export function createAvatar(asset,{character='ori'}={}){
  const model=clone(asset.scene),group=new THREE.Group();group.add(model);
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const clip of asset.animations){const action=mixer.clipAction(clip);action.play();action.paused=true;actions[clip.name]=action;}
  const bones={},baseRotations=new Map(),basePositions=new Map();model.traverse(o=>{if(o.isBone){bones[o.name]=o;if(o.userData.name)bones[o.userData.name]=o;baseRotations.set(o,o.quaternion.clone());basePositions.set(o,o.position.clone());}});
  for(const name of ['upper_arm.R','forearm.R','hand.R'])if(!bones[name])throw new Error(`Robot rig missing ${name}`);
  const avatar={group,model,mixer,actions,bones,baseRotations,basePositions,walkBlend:0,lastPoseTime:null,head:bones.head,upper:bones['upper_arm.R'],forearm:bones['forearm.R'],hand:bones['hand.R'],held:new THREE.Vector3(),releaseError:0};
  avatar.originalMaterials=new Map();model.traverse(o=>{if(o.isMesh)avatar.originalMaterials.set(o,o.material);});
  group.updateWorldMatrix(true,true);avatar.bindFrames=new Map();
  for(const bone of new Set(Object.values(bones)))avatar.bindFrames.set(bone,{inverse:bone.matrixWorld.clone().invert(),rotation:bone.getWorldQuaternion(new THREE.Quaternion()).invert()});
  setAvatarCharacter(avatar,character);return avatar;
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
  animateFace(a,mode,stationTime);
  applyCelebration(a,player,mode,state,stationTime);
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
    // Settle the most displaced shoe first. Always choosing L can starve R
    // after a turn: L's separation constraint keeps it outside the misplaced
    // R shoe, so it never reaches neutral and R never gets a settling step.
    if(!moving)side=['L','R'].sort((l,r)=>gait.feet[r].plant.distanceTo(neutral[r])-gait.feet[l].plant.distanceTo(neutral[l])).find(s=>gait.feet[s].plant.distanceTo(neutral[s])>.018);
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

// Original arcade mascot trim, attached in the authored bind frame. The imported
// rig, hands and collision scale remain the authority for every moving part.
export function setAvatarCharacter(a,character){
  if(!ROBOT_CHARACTERS.some(c=>c.id===character))throw new RangeError('Unknown robot character');
  if(a.character===character)return;
  for(const mesh of a.trim||[]){mesh.removeFromParent();mesh.geometry.dispose();}
  for(const material of a.trimMaterials||[])material.dispose();
  for(const [mesh,material]of a.originalMaterials)mesh.material=material;
  a.trim=[];a.character=character;a.celebration=null;a.resultView??=false;a.face=null;a.drumSticks=[];
  styleRobot(a);
}
function styleRobot(a){
  const enamel=(color)=>new THREE.MeshPhysicalMaterial({color,metalness:.25,roughness:.3,clearcoat:.45,clearcoatRoughness:.25});
  const cream=enamel(0xefe4cd),red=enamel(0xd94930),indigo=enamel(0x1b2b4c),gold=new THREE.MeshStandardMaterial({color:0xd6b574,metalness:.65,roughness:.32});
  const face=new THREE.MeshStandardMaterial({color:0x061722,roughness:.3}),glow=new THREE.MeshStandardMaterial({color:0xa4f4df,emissive:0x78ddc7,emissiveIntensity:1.1,roughness:.3});
  if(a.character==='koma'){cream.color.setHex(0xffefd2);red.color.setHex(0xd6503b);indigo.color.setHex(0x234749);}
  if(a.character==='don'){cream.color.setHex(0xe8d7b6);red.color.setHex(0xd4412f);indigo.color.setHex(0x193657);glow.color.setHex(0xffd475);glow.emissive.setHex(0xf0ab45);}
  a.trimMaterials=[cream,red,indigo,gold,face,glow];
  const palette={'Warm porcelain':cream,'Vermilion enamel':red,'Graphite joints':indigo,'Soft cyan display':glow};
  a.model.traverse(o=>{if(o.isMesh&&palette[o.material.name])o.material=palette[o.material.name];});
  a.group.updateWorldMatrix(true,true);
  function attach(bone,geometry,material,position,rotation=new THREE.Quaternion()){
    const mesh=new THREE.Mesh(geometry,material);mesh.name='ORI arcade trim';
    mesh.position.copy(new THREE.Vector3(...position).applyMatrix4(a.bindFrames.get(a.bones[bone]).inverse));
    mesh.quaternion.copy(a.bindFrames.get(a.bones[bone]).rotation.clone().multiply(rotation));
    a.bones[bone].add(mesh);a.trim.push(mesh);return mesh;
  }
  const box=(bone,size,material,position,rotation)=>attach(bone,new RoundedBoxGeometry(...size,2,.008),material,position,rotation);
  const turnX=new THREE.Quaternion().setFromAxisAngle(unitZ,Math.PI/2);
  if(a.character==='ori'){
  // Broad enamel brow and concentric ear receivers give a toy-mecha silhouette.
  box('head',[.275,.036,.048],red,[0,1.702,.083]);
  box('head',[.065,.025,.16],cream,[0,1.729,.005]);
  box('head',[.022,.016,.026],glow,[0,1.747,.064]);
  for(const sign of [-1,1]){
    attach('head',new THREE.CylinderGeometry(.071,.071,.038,20),indigo,[sign*.142,1.605,-.002],turnX);
    attach('head',new THREE.CylinderGeometry(.052,.052,.043,20),red,[sign*.155,1.605,-.002],turnX);
    attach('head',new THREE.CylinderGeometry(.024,.024,.046,16),gold,[sign*.163,1.605,-.002],turnX);
    box('head',[.034,.012,.01],gold,[sign*.092,1.565,.135]);
    const side=sign>0?'L':'R',tilt=new THREE.Quaternion().setFromAxisAngle(unitZ,-sign*.14);
    box(`shoulder.${side}`,[.14,.095,.19],red,[sign*.264,1.419,0],tilt);
    box(`shoulder.${side}`,[.099,.018,.17],cream,[sign*.266,1.468,0],tilt);
    box(`foot.${side}`,[.12,.024,.065],red,[sign*.115,.16,.119]);
    box(`foot.${side}`,[.105,.012,.014],gold,[sign*.115,.067,.184]);
  }
  // A compact instrument bib and rear vent repeat the receiver's indigo/brass.
  box('chest',[.12,.079,.012],indigo,[0,1.279,.146]);
  box('chest',[.068,.02,.014],glow,[0,1.295,.156]);
  for(const sign of [-1,1])box('chest',[.02,.066,.012],cream,[sign*.088,1.276,.147],new THREE.Quaternion().setFromAxisAngle(unitZ,sign*.2));
  box('chest',[.04,.009,.015],gold,[0,1.248,.156]);
  box('chest',[.21,.18,.025],indigo,[0,1.287,-.126]);
  for(const y of [1.25,1.28,1.31])box('chest',[.12,.012,.011],red,[0,y,-.143]);
  }else if(a.character==='koma'){
    styleLuckyCat(a,{attach,box,cream,red,indigo,gold,glow});
  }else{
    styleFestival(a,{attach,box,cream,red,indigo,gold,glow});
  }
  // A larger dark display covers the original two pixels. Eyes and smile are
  // geometry, so the face remains crisp without fonts, textures or asset packs.
  box('head',[.223,.108,.014],face,[0,1.606,.152]);
  const eyes=[];
  for(const sign of [-1,1]){
    const eye=box('head',a.character==='koma'?[.036,.014,.006]:[.033,.026,.006],glow,[sign*.048,1.617,.163]);eye.userData.tilt=a.character==='koma'?-sign*.25:0;eyes.push(eye);
    box('head',[.012,.009,.006],glow,[sign*.083,1.594,.163]);
  }
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.022,1.588,.163),new THREE.Vector3(0,1.581,.164),new THREE.Vector3(.022,1.588,.163)]);
  attach('head',new THREE.TubeGeometry(smile,10,.0028,5,false),glow,[0,0,0]);
  a.face={eyes};
}

function animateFace(a,mode,time){
  if(!a.face)return;
  const blink=((time%4.8)+4.8)%4.8;
  const opening=blink<.14?.12+.88*Math.abs(blink-.07)/.07:1;
  for(const [i,eye]of a.face.eyes.entries()){
    eye.scale.x=1;eye.scale.y=opening*(mode==='Charging'?.65:mode==='Result'?.65:1);
    eye.rotation.z=(eye.userData.tilt||0)+(i===0?1:-1)*(mode==='Result'?.18:mode==='Charging'?-.12:0);
  }
}

function styleLuckyCat(a,{attach,box,cream,red,indigo,gold,glow}){
  const triangle=(width,height,depth)=>{
    const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(0,height);shape.lineTo(width/2,0);shape.closePath();
    return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});
  };
  for(const sign of [-1,1]){
    attach('head',triangle(.108,.07,.075),cream,[sign*.084,1.678,-.04]);
    attach('head',triangle(.057,.038,.005),red,[sign*.084,1.695,.04]);
    attach('head',new THREE.SphereGeometry(.039,16,10),cream,[sign*.108,1.565,.08]);
    for(const y of [1.586,1.597])box('head',[.035,.004,.006],gold,[sign*.094,y,.165],new THREE.Quaternion().setFromAxisAngle(unitZ,sign*.15));
    const side=sign>0?'L':'R';
    attach(`shoulder.${side}`,new THREE.SphereGeometry(.083,16,12),red,[sign*.254,1.386,0]);
    box(`foot.${side}`,[.13,.021,.085],cream,[sign*.115,.162,.105]);
    for(const offset of [-.036,0,.036])box(`foot.${side}`,[.008,.014,.009],gold,[sign*.115+offset,.10,.185]);
  }
  box('neck',[.235,.043,.17],red,[0,1.459,.005]);
  attach('chest',new THREE.SphereGeometry(.037,16,12),gold,[0,1.415,.144]);
  box('chest',[.007,.035,.009],indigo,[0,1.405,.18]);
  box('chest',[.14,.13,.012],cream,[0,1.278,.149]);
  const coin=attach('chest',new THREE.SphereGeometry(.052,20,12),gold,[0,1.271,.16]);coin.scale.set(.8,1.12,.23);
  box('chest',[.043,.008,.014],red,[0,1.29,.178]);box('chest',[.043,.008,.014],red,[0,1.254,.178]);
  const tail=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.90,-.10),new THREE.Vector3(0,.84,-.22),new THREE.Vector3(.12,.91,-.29),new THREE.Vector3(.15,1.06,-.27),new THREE.Vector3(.06,1.08,-.24)]);
  attach('hips',new THREE.TubeGeometry(tail,24,.027,8,false),cream,[0,0,0]);
  attach('hips',new THREE.SphereGeometry(.029,12,8),red,[.06,1.08,-.24]);
  box('head',[.017,.009,.008],red,[0,1.602,.168]);
}

function styleFestival(a,{attach,box,cream,red,indigo,gold,glow}){
  const drumRotation=new THREE.Quaternion().setFromAxisAngle(unitX,Math.PI/2);
  box('head',[.272,.035,.228],indigo,[0,1.684,.004]);
  box('head',[.266,.009,.237],cream,[0,1.685,.005]);
  attach('head',new THREE.SphereGeometry(.025,16,10),red,[0,1.729,-.006]);
  box('head',[.038,.019,.012],gold,[0,1.689,.129]);
  for(const sign of [-1,1]){
    const side=sign>0?'L':'R';
    box('head',[.029,.09,.045],red,[sign*.13,1.65,-.088],new THREE.Quaternion().setFromAxisAngle(unitZ,-sign*.35));
    box(`shoulder.${side}`,[.139,.15,.185],indigo,[sign*.257,1.373,0]);
    box(`shoulder.${side}`,[.147,.025,.193],red,[sign*.258,1.308,0]);
    box('chest',[.026,.30,.014],cream,[sign*.077,1.28,.141],new THREE.Quaternion().setFromAxisAngle(unitZ,-sign*.20));
    box(`foot.${side}`,[.145,.019,.10],indigo,[sign*.115,.162,.10]);
    box(`foot.${side}`,[.145,.009,.017],red,[sign*.115,.168,.139]);
    const stick=attach(`hand.${side}`,new THREE.CylinderGeometry(.007,.01,.22,10),gold,[sign*.365,.745,.035]);stick.visible=false;a.drumSticks.push(stick);
  }
  attach('chest',new THREE.CylinderGeometry(.157,.157,.15,32),red,[0,1.135,.188],drumRotation);
  attach('chest',new THREE.CylinderGeometry(.166,.166,.019,32),indigo,[0,1.135,.27],drumRotation);
  attach('chest',new THREE.CylinderGeometry(.143,.143,.022,32),cream,[0,1.135,.28],drumRotation);
  for(let i=0;i<12;i++){
    const angle=i/12*Math.PI*2;
    attach('chest',new THREE.SphereGeometry(.008,8,6),gold,[Math.cos(angle)*.154,1.135+Math.sin(angle)*.154,.284]);
  }
  box('chest',[.17,.15,.021],indigo,[0,1.28,-.131]);
  for(const sign of [-1,1])box('chest',[.025,.25,.028],gold,[sign*.028,1.27,-.151],new THREE.Quaternion().setFromAxisAngle(unitZ,sign*.4));
}

// Call only with a live authoritative result or its stored replay.
// Cosmetic eligibility never contributes to the stored score. The pose gate
// independently waits for native rest; Result alone is insufficient.
export function celebrateAvatar(a,result,{reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}){
  if(!a||result?.type!=='result'||!result.saved||!(result.score>0)||!result.attempt||result.breakdown?.outcome==='forfeit'||a.lastCelebratedAttempt===result.attempt)return false;
  a.celebration={...celebrationProfile(result),attempt:result.attempt,reducedMotion,start:null,stoppingAt:null};return true;
}
export function isAvatarCelebrating(a){return !!a?.celebration&&a.celebration.start!==null;}
export function avatarWantsResultView(a){return !!a?.resultView;}
// Delay a retry by the returned milliseconds, then retry normally. No delay is
// requested during a shot or when there is no active celebration.
export function cancelAvatarCelebration(a){
  const c=a?.celebration;if(!c)return 0;
  if(c.start===null){a.celebration=null;return 0;}
  c.stoppingAt??=a.lastPoseTime;
  return Math.max(0,Math.ceil((.18-(a.lastPoseTime-c.stoppingAt))*1000));
}
function applyCelebration(a,player,mode,state,time){
  for(const stick of a.drumSticks||[])stick.visible=false;
  const c=a.celebration;
  if(mode!=='Result'){a.resultView=false;if(!(mode==='Flight'&&c?.start===null&&state.attempt===c.attempt))a.celebration=null;return;}
  if(!c)return;
  const still=v=>v&&[v.x,v.y,v.z].every(Number.isFinite)&&Math.hypot(v.x,v.y,v.z)<.00001;
  if(state.attempt!==c.attempt){a.celebration=null;return;}
  if(!state.diagnostics?.sleeping||!still(state.velocity)||!still(state.spin)){if(c.start!==null)a.celebration=null;return;}
  if(c.start===null){c.start=time;a.lastCelebratedAttempt=c.attempt;a.resultView=true;}
  const t=time-c.start,duration=c.reducedMotion?1.8:c.duration;
  if(t<0||t>=duration||(c.stoppingAt!==null&&time-c.stoppingAt>=.18)){a.celebration=null;return;}
  const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
  const weight=smooth(t/.28)*smooth((duration-t)/.4)*(c.stoppingAt===null?1:1-smooth((time-c.stoppingAt)/.18));
  const beat=c.reducedMotion?0:Math.sin(t*Math.PI*4);
  a.group.updateWorldMatrix(true,true);
  let targets=a.character==='koma'?{L:[.35,1.63,.15+.035*beat]}:a.character==='don'?{L:[.17,1.37+.055*beat,.28],R:[-.17,1.37-.055*beat,.28]}:{R:[-.20,1.66,.12],L:[.35,1.30+.07*beat,.20]};
  const tier=c.tier,energy=c.reducedMotion?0:weight,groove=Math.sin(t*Math.PI*3.2);
  // Plant each foot through the knee bend; only deliberate dance steps lift it.
  const feet=['L','R'].map(side=>({side,point:worldPosition(a.bones[`foot.${side}`]),rotation:a.bones[`foot.${side}`].getWorldQuaternion(new THREE.Quaternion())}));
  a.bones.hips.position.y-=(tier>=3?.055+.035*groove:.02)*energy;
  a.bones.hips.position.x+=(tier>=3?.06:.015)*groove*energy;
  a.bones.chest.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitZ,(tier>=3?.14:.035)*groove*energy));
  a.bones.chest.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitY,(tier>=4?.22:.06)*Math.sin(t*5)*energy));
  a.group.updateWorldMatrix(true,true);
  const pole=new THREE.Vector3(0,0,1).applyQuaternion(a.group.quaternion);
  for(const foot of feet){
   if(tier>=3){const step=Math.max(0,Math.sin(t*Math.PI*3.2+(foot.side==='L'?0:Math.PI)));foot.point.y+=(tier>=5?.16:.07)*step*energy;}
   plantLeg(a,foot.side,foot.point,pole,foot.rotation);
  }
  a.group.updateWorldMatrix(true,true);
  if(tier===1)targets={R:[-.26,1.45,.25]};
  else if(tier===2&&a.character==='ori')targets={R:[-.28,1.70+.09*beat,.1],L:[.26,1.16,.21]};
  else if(tier>=3){
   const pump=(1+beat)/2;
   targets=a.character==='don'?{L:[.22,1.40+.26*pump,.29],R:[-.22,1.40+.26*(1-pump),.29]}:a.character==='koma'?{L:[.32,1.64+.14*pump,.19],R:[-.32,1.64+.14*(1-pump),.19]}:{L:[.33,1.62+.23*pump,.11],R:[-.33,1.62+.23*(1-pump),.11]};
   if(tier>=4&&t>duration*.58)targets={L:[.27,1.93,.03],R:[-.27,1.93,.03]};
   if(tier>=5&&t>duration*.35&&t<duration*.58)targets={L:[.48,1.46,.15],R:[-.48,1.46,.15]};
  }
  if(a.face)for(const [i,eye]of a.face.eyes.entries()){eye.scale.y=1-weight*.7;eye.scale.x=1+weight*.25;eye.rotation.z=(i?1:-1)*weight*.38;}
  for(const [side,position]of Object.entries(targets)){
    const hand=a.bones[`hand.${side}`],target=worldPosition(hand).lerp(a.group.localToWorld(new THREE.Vector3(...position)),weight);
    celebrateArm(a,side,target);
    if(a.character==='don'){
      const rotation=hand.getWorldQuaternion(new THREE.Quaternion()).slerp(a.bindFrames.get(hand).rotation.clone().invert(),weight);setWorldRotation(hand,rotation);
      if(side==='L'){for(const digit of ['index','middle','ring','little'])for(let i=1;i<=3;i++)a.bones[`${digit}${i}.L`].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(unitX,-weight));}
    }
  }
  const nod=(tier>=3?.17:a.character==='koma'?.10:a.character==='don'?.045:.07)*beat;
  const head=a.baseRotations.get(a.head).clone().multiply(new THREE.Quaternion().setFromAxisAngle(a.character==='koma'?unitZ:unitX,nod));
  a.head.quaternion.slerp(head,weight);
  for(const stick of a.drumSticks||[])stick.visible=weight>.15;
}
function celebrateArm(a,side,target){
  const upper=a.bones[`upper_arm.${side}`],forearm=a.bones[`forearm.${side}`],hand=a.bones[`hand.${side}`];
  const shoulder=worldPosition(upper),elbow=worldPosition(forearm),wrist=worldPosition(hand),rotation=hand.getWorldQuaternion(new THREE.Quaternion());
  const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),direction=target.clone().sub(shoulder),distance=THREE.MathUtils.clamp(direction.length(),.02,l1+l2-.001);direction.normalize();
  const pole=new THREE.Vector3(side==='L'?1:-1,0,0).applyQuaternion(a.group.getWorldQuaternion(new THREE.Quaternion()));pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
  pointBone(upper,forearm,shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,bend));pointBone(forearm,hand,shoulder.clone().addScaledVector(direction,distance));setWorldRotation(hand,rotation);
}
