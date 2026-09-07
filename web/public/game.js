import {THROW_MODEL,throwSpeed} from './throw-power.js';
import {BallRotationBuffer,rotationBetween,rotationSpeed,spinMarkOpacity} from './ball-rotation.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAvatar as makeAvatar, poseAvatar } from './avatar.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { createEscalators } from './escalators.js';
import { competitionUI } from './competition.js';
import { arcadeAudio } from './arcade-audio.js';
import { challengeBriefing } from './briefing.js';
import { shotDetails } from './debug.js';
import { dressStation, contactShadow } from './station-look.js';
import { addStationDetails } from './station-details.js';
THREE.BufferGeometry.prototype.computeBoundsTree=computeBoundsTree;
THREE.Mesh.prototype.raycast=acceleratedRaycast;
const $=id=>document.getElementById(id),canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
const pixelRatioLimit=()=>Math.min(devicePixelRatio,1.5,Math.sqrt(1_600_000/(innerWidth*innerHeight)));
renderer.setPixelRatio(pixelRatioLimit());renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc3cdd4);scene.fog=new THREE.Fog(0xc3cdd4,155,330);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.02).texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe1eeff,0x79715f,1.1));
const sun=new THREE.DirectionalLight(0xfff0d5,3.1);sun.position.set(-40,100,-50);scene.add(sun);
const aimCamera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.035,450);
const ballCamera=aimCamera.clone();
let camera=aimCamera;
const toThree=p=>new THREE.Vector3(p.x,p.y,-p.z);
const ball=new THREE.Mesh(new THREE.SphereGeometry(.023,24,16),new THREE.MeshStandardMaterial({color:0xf1673d,roughness:.42,metalness:.04}));
for(const axis of [0,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.0231,.0012,6,48),new THREE.MeshStandardMaterial({color:0x34252c,roughness:.65,transparent:true,depthWrite:false}));ring.rotation.x=axis*Math.PI/2;ball.add(ring);}scene.add(ball);
const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xe8cba0,transparent:true,opacity:.45}));scene.add(guide);
const trailPositions=new Float32Array(180*3),trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));trailGeometry.setDrawRange(0,0);
const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:0xf49368,transparent:true,opacity:.35,depthWrite:false}));trail.frustumCulled=false;scene.add(trail);let trailCount=0;
let station,robotAsset,motion,loaded=false,guestId='',identityId='',snapshot=null,previous=null,received=0,workerReady=false;
const history=[],ballRotations=new BallRotationBuffer();
let spinExposure=1/60;
let yaw=180,pitch=12,top=0,kick=0,azimuth=-Math.PI,elevation=.006,distance=3.8,manualCamera=false,chargeStarted=0;
let aimDistance=30,powerRange='full',powerLevel='';
let rightDrag=false,lastPointer=null,lastPhase='',lockRequested=false;
let lastThrowAim=null,aimOrbit=null,ballCameraActive=false,flightPending=false,returnRequested=false;
const avatars=new Map(),keys=new Set(),caster=new THREE.Raycaster();caster.firstHitOnly=true;
const cameraTarget=new THREE.Vector3(0,1.3,-20),followTarget=cameraTarget.clone(),desired=new THREE.Vector3(),lookTarget=new THREE.Vector3();
camera.position.set(-3.8,2.3,-20);camera.lookAt(cameraTarget);
let noticeUntil=0,lastImpact=null,startupMs=0;
let workerStatus='starting';
let stationLook,robotShadow,ballShadow;
let cameraClearance=3.8;
function notice(text,duration=4500){$('notice').textContent=text;$('notice').classList.remove('quiet');noticeUntil=performance.now()+duration;}
function send(type,extra={}){if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...extra}));}
let ui,briefing;
const sound=arcadeAudio();
const updateShotDetails=shotDetails(()=>cancel());
const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
socket.addEventListener('open',()=>send('hello',{token:localStorage.getItem('kyoto-guest')}));
socket.addEventListener('close',()=>{workerReady=false;workerStatus='disconnected';cancel();notice('Connection lost. Reload to rejoin.',1e8);$('connection').textContent='Disconnected';});
socket.addEventListener('message',event=>{
  const m=JSON.parse(event.data);ui?.message(m);
  if(m.type==='session'){const level=`${m.challenge?.id||''}:${m.challenge?.revision||''}`;if(level!==powerLevel){powerLevel=level;setPowerRange(m.challenge?.hint?.powerRange||'full',true);}}
  if(m.type==='welcome'){guestId=m.sessionId;identityId=m.id;localStorage.setItem('kyoto-guest',m.token);$('nickname').value=m.name;workerReady=m.worker;}
  if(m.type==='worker-status'){
    const recovering=workerStatus==='recovering';workerStatus=m.status;
    if(m.status==='ready'){if(recovering)notice('Session restored. Your unfinished shot was cancelled; you can throw again.',6500);}
    else{
      workerReady=false;cancel();
      snapshot=null;previous=null;history.length=0;lastPhase='';lastImpact=null;
      trailCount=0;trailGeometry.setDrawRange(0,0);ball.visible=false;guide.visible=false;
      $('power-fill').style.width='0%';$('power-number').textContent='0%';$('power-label').textContent='HOLD TO WIND UP';
      if(m.status==='recovering'||m.status==='failed')notice(m.message,1e8);
    }
  }
  if(m.type==='ready')workerReady=true;
  if(m.type==='state'){ballRotations.add(m);if(m.phase==='Flight')flightPending=false;previous=snapshot;snapshot=m;received=performance.now();history.push(m);if(history.length>30)history.shift();workerReady=true;}
  if(m.type==='error'||m.type==='notice'){if(!m.id||m.id===guestId){if(m.type==='error')flightPending=false;notice(m.message);stopChargeSound();chargeStarted=0;}}
  if(m.type==='impact'){lastImpact=m;$('last-impact').textContent=m.label;if(m.qualifying)sound.cue('impact',m);}
});
$('nickname').addEventListener('change',()=>send('name',{name:$('nickname').value}));
const stopChargeSound=()=>sound.stopCharge();
function flightControls(){return !returnRequested&&(flightPending||['Release','Flight','Result'].includes(snapshot?.phase)||ui?.state.mode==='replay');}
function restoreThrowAim(){
  if(lastThrowAim){yaw=lastThrowAim.yaw;pitch=lastThrowAim.pitch;distance=lastThrowAim.distance;}
  centerOnAim();
}
function startCharge(){
  if(briefing?.blocked||!loaded||!workerReady||!snapshot||chargeStarted||ui.state.mode!=='play')return;
  if(ui.state.session?.busy||ui.state.session?.restoring||['Release','Flight'].includes(snapshot.phase))return;
  if(snapshot.phase==='Result'){returnRequested=true;restoreThrowAim();}
  sound.unlock();sound.startCharge(ui.state.selected?.allowedInputs?.chargeSeconds||2.8);ui.dismissResult();sendInput();send('charge',{challengeId:ui.state.selected?.id||null,revision:ui.state.selected?.revision||null,layout:snapshot.layout,physics:snapshot.physics,powerRange});chargeStarted=performance.now();canvas.focus();
}
function setPowerRange(range,force=false){
  if(!force&&(chargeStarted||flightPending||['Charging','Release','Flight'].includes(snapshot?.phase)||ui?.state.mode==='replay'))return;
  powerRange=range==='precision'?'precision':'full';
  for(const value of ['precision','full'])$('power-'+value).setAttribute('aria-pressed',String(value===powerRange));
  document.querySelectorAll('.power-ticks span').forEach((tick,i)=>{tick.textContent=String(Number(throwSpeed(i/4,powerRange).toFixed(1)))+(i===4?' m/s':'');});
}
for(const range of ['precision','full'])$('power-'+range).onclick=()=>{setPowerRange(range);canvas.focus();};
setPowerRange('full');
function release(){stopChargeSound();if(chargeStarted){lastThrowAim={yaw,pitch,distance};sound.cue('throw');sendInput();send('release');flightPending=true;chargeStarted=0;}}
function pointerLocked(){return document.pointerLockElement===canvas;}
function cancel(){stopChargeSound();flightPending=false;if(ui?.state.mode!=='replay')send('cancel');chargeStarted=0;keys.clear();rightDrag=false;lastPointer=null;lockRequested=false;if(pointerLocked())document.exitPointerLock();}
function pointerLockFailed(error){
  if(error instanceof Error)console.warn('Mouse capture failed:',error.name,error.message);
  if(!lockRequested)return;
  cancel();notice('Mouse capture was blocked. Click the game to try again, or open it in Chrome.',7000);
}
function captureMouse(){
  if(briefing?.active||pointerLocked()||lockRequested||!loaded||!workerReady||ui.state.mode!=='play')return;
  lockRequested=true;
  try{canvas.requestPointerLock()?.catch(pointerLockFailed);}catch{pointerLockFailed();}
}
document.addEventListener('pointerlockerror',pointerLockFailed);
document.addEventListener('pointerlockchange',()=>{
  document.body.classList.toggle('is-playing',pointerLocked());
  $('mouse-mode').textContent=pointerLocked()?'MOUSE':'CLICK TO AIM';
  if(pointerLocked()){
    // A menu, blur or Escape may have cancelled an asynchronous capture request.
    if(!lockRequested||ui.state.mode!=='play'||!workerReady){cancel();return;}
    lockRequested=false;lastPointer=null;if(!flightControls())centerOnAim();canvas.focus();
    notice('Mouse captured · Esc for menus',3000);
  }else{
    cancel();
  }
});
function recall(){if(ui?.state.mode==='replay'){$('close-replay').click();return;}stopChargeSound();ui.dismissResult();send('recall');chargeStarted=0;flightPending=false;returnRequested=true;restoreThrowAim();trailCount=0;}
function syncSpin(){top=Number($('top').value);kick=Number($('kick').value);$('top-value').textContent=top;$('kick-value').textContent=kick;}
for(const id of ['top','kick'])$(id).addEventListener('input',syncSpin);
$('clear-spin').onclick=()=>{$('top').value=0;$('kick').value=0;syncSpin();canvas.focus();};
$('home').onclick=()=>{send('home');lastThrowAim=null;returnRequested=true;yaw=180;pitch=12;centerOnAim();canvas.focus();};
for(const id of ['retry','flight-retry'])$(id).onclick=()=>{recall();canvas.focus();};
$('recenter').onclick=()=>{if(flightControls()){azimuth=-(lastThrowAim?.yaw??yaw)*Math.PI/180;elevation=.24;distance=2.8;}else{centerOnAim();distance=3.8;}canvas.focus();};
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',event=>{
  if(briefing?.blocked)return;
  canvas.focus();
  // The first click only captures the cursor; it must never release a weak shot.
  if(ui.state.mode==='play'&&!pointerLocked()){if(event.button===0)captureMouse();return;}
  if(event.button===2){rightDrag=true;lastPointer={x:event.clientX,y:event.clientY};manualCamera=true;}
  if(event.button===0){caster.setFromCamera(new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2),camera);const ray={origin:{x:caster.ray.origin.x,y:caster.ray.origin.y,z:-caster.ray.origin.z},direction:{x:caster.ray.direction.x,y:caster.ray.direction.y,z:-caster.ray.direction.z}};if(!ui.pointer(event,ray))startCharge();}
});
document.addEventListener('mouseup',event=>{if(event.button===0)release();if(event.button===2)rightDrag=false;});
canvas.addEventListener('pointercancel',cancel);
canvas.addEventListener('mouseenter',event=>{lastPointer={x:event.clientX,y:event.clientY};});
canvas.addEventListener('mouseleave',()=>{if(!rightDrag)lastPointer=null;});
function centerOnAim(){manualCamera=false;azimuth=-yaw*Math.PI/180;elevation=THREE.MathUtils.clamp(.10-pitch*Math.PI/180*.45,-.2,.8);}
document.addEventListener('mousemove',event=>{
  if(briefing?.blocked)return;
  const locked=pointerLocked();
  if(!locked&&(ui.state.mode==='play'||(event.target!==canvas&&!rightDrag)))return;
  const dx=locked?event.movementX:lastPointer?event.clientX-lastPointer.x:0,dy=locked?event.movementY:lastPointer?event.clientY-lastPointer.y:0;
  lastPointer={x:event.clientX,y:event.clientY};
  if(!dx&&!dy)return;
  if(rightDrag||flightControls()){azimuth-=dx*.005;elevation=THREE.MathUtils.clamp(elevation+dy*.004,-.2,1.25);manualCamera=true;return;}
  if(ui.state.mode==='play'){
    // The arrows temporarily orbit away from aim. Mouse motion returns to the
    // reticle. Flight orbit never changes the robot's saved throw direction.
    yaw=THREE.MathUtils.euclideanModulo(yaw+dx*.18+180,360)-180;
    pitch=THREE.MathUtils.clamp(pitch-dy*.14,-65,80);centerOnAim();
  }else if(ui.state.mode==='replay'){
    azimuth-=dx*.005;elevation=THREE.MathUtils.clamp(elevation+dy*.004,-.2,1.25);manualCamera=true;
  }
  // The designer retains a free cursor for clicking its start and goal circles.
});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),.65,12);},{passive:false});
document.addEventListener('pointerdown',e=>{if(e.target!==canvas&&(chargeStarted||pointerLocked()||lockRequested))cancel();},true);
document.addEventListener('focusin',e=>{if(e.target!==canvas&&(chargeStarted||pointerLocked()||lockRequested))cancel();});
window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('keydown',e=>{
  if(briefing?.active){if(e.code==='Space'){e.preventDefault();if(!e.repeat)briefing.start();}if(e.code==='Escape'){e.preventDefault();briefing.start(false);}return;}
  if(briefing?.blocked)return;
  if(['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName))return;
  if(ui.state.mode==='replay'&&!e.code.startsWith('Arrow')){if(e.code==='Space'){e.preventDefault();if(!e.repeat)$('replay-play').click();}if(e.code==='Escape')$('close-replay').click();return;}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyH'&&ui.state.hint&&ui.state.mode==='play')$('use-hint').click();
  if(e.code==='Space'){captureMouse();startCharge();}if(e.code==='Escape')cancel();if(e.code==='KeyR')recall();
  if(e.code==='KeyP')setPowerRange(powerRange==='full'?'precision':'full');
  if(e.code==='KeyX')$('clear-spin').click();
  if(['KeyQ','KeyE','KeyZ','KeyC'].includes(e.code)){
    const control=$(['KeyQ','KeyE'].includes(e.code)?'top':'kick');control.value=THREE.MathUtils.clamp(Number(control.value)+(['KeyQ','KeyZ'].includes(e.code)?-25:25),-200,200);syncSpin();
  }
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)){e.preventDefault();release();}});
function self(){return snapshot?.players.find(p=>p.id===guestId);}
function sendInput(){if(briefing?.blocked||!workerReady||!loaded||ui.state.mode==='replay')return;send('input',{x:flightControls()?0:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z:flightControls()?0:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),fast:keys.has('ShiftLeft')||keys.has('ShiftRight'),yaw,pitch,top,kick});}
setInterval(sendInput,1000/30);

function createAvatar(id){
  const avatar=makeAvatar(robotAsset);scene.add(avatar.group);avatars.set(id,avatar);return avatar;
}

async function load(){
  try{
    const loader=new GLTFLoader();const data=await fetch('/assets/station.json').then(r=>r.json());
    const [atrium,robot,hardware,detailData]=await Promise.all([
      loader.loadAsync('/assets/atrium.glb',e=>{$('load-progress').style.width=`${e.total?Math.min(75,e.loaded/e.total*75):15}%`;$('loading-message').textContent=`Opening the atrium · ${Math.round(e.loaded/1024/1024)} MB`; }),
      loader.loadAsync('/assets/ori.glb'),
      loader.loadAsync('/assets/atrium-detail.glb'),
      fetch('/assets/atrium-detail.json').then(r=>r.json())
    ]);
    station=atrium.scene;robotAsset=robot;$('loading-message').textContent='Preparing surfaces and camera…';
    // Hardware sits on existing surfaces. Keep it out of camera collision
    // raycasts, just as the surface decals are, to avoid little camera jolts.
    const hardwareScene=hardware.scene;scene.add(hardwareScene);
    hardwareScene.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});
    const details=addStationDetails(scene,detailData);
    window.kyotoArt={...details.stats,sourceLayout:detailData.sourceLayoutSha256};
    station.traverse(object=>{if(object.isMesh){object.geometry.computeBoundsTree();object.matrixAutoUpdate=false;object.updateMatrix();}});station.updateMatrixWorld(true);scene.add(station);
    motion=createEscalators(scene,data.escalators);motion(0);
    $('loading-message').textContent='Lighting the glass, stone and steel…';
    stationLook=dressStation(renderer,scene,sun,station,data);
    stationLook.updateLights(camera.position,0);
    stationLook.captureEnvironment();
    robotShadow=contactShadow(scene,station);ballShadow=contactShadow(scene,station);
    if(guestId)createAvatar(guestId);
    await renderer.compileAsync(scene,camera);
    loaded=true;startupMs=performance.now();$('load-progress').style.width='100%';$('loading').classList.add('done');canvas.focus();
    if(ui.state.selected)briefing.open(ui.state.selected);
    notice('Click the game to capture the mouse and aim. Esc releases it for menus.',7000);
  }catch(error){$('loading-message').textContent=`Could not load: ${error.message}`;console.error(error);}
}
// Render a short buffered timeline so the release frame precedes the first
// airborne pose even when those snapshots arrive in the same network packet.
function renderTimeline(now){
  if(!snapshot)return {before:null,after:null,alpha:1,time:0,phase:'Aim'};
  const time=Math.max(history[0].stationTime,snapshot.stationTime+Math.min(.04,(now-received)/1000)-.08);
  let before=history[0],after=snapshot;
  for(const frame of history){if(frame.stationTime<=time)before=frame;else{after=frame;break;}}
  const alpha=after.stationTime>before.stationTime?THREE.MathUtils.clamp((time-before.stationTime)/(after.stationTime-before.stationTime),0,1):1;
  let phase=before.phase;
  if(after.phase==='Charging'&&time>=after.chargeTime)phase='Charging';
  if(after.phase==='Release'&&time>=after.releaseTime-.12)phase='Release';
  if(after.phase==='Flight'&&before.phase!=='Flight')phase=time<after.releaseTime?'Release':'Flight';
  return {before,after,alpha,time,phase};
}
briefing=challengeBriefing({renderer,isReady:()=>loaded&&workerReady&&!ui?.state.session?.restoring,onOpen:()=>{cancel();ui?.dismissResult();},onStart:capture=>{
  sound.cue('start');if(snapshot?.phase==='Result')recall();
  if(capture){const c=ui.state.selected;if(c){const dx=c.goal.center.x-c.start.center.x,dz=c.goal.center.z-c.start.center.z;yaw=Math.atan2(dx,dz)*180/Math.PI;pitch=THREE.MathUtils.clamp(12+Math.atan2(c.goal.center.y-c.start.center.y,Math.hypot(dx,dz))*180/Math.PI,-20,55);centerOnAim();}captureMouse();}else canvas.focus();
}});
ui=competitionUI({overview:c=>briefing.open(c),sound,scene,send,cancel,notice,getGuestId:()=>identityId,getPhase:()=>snapshot?.phase,getLiveTime:()=>snapshot?snapshot.stationTime+(performance.now()-received)/1000:0,resetView:reason=>{if(reason==='level'){lastThrowAim=null;aimOrbit=null;flightPending=false;returnRequested=true;}centerOnAim();distance=3.8;trailCount=0;trailGeometry.setDrawRange(0,0);}});
window.addEventListener('kyoto:retry',()=>{recall();captureMouse();canvas.focus();});
window.addEventListener('kyoto:hint',event=>{const h=event.detail;setPowerRange(h.powerRange||'precision');yaw=h.yaw;pitch=h.pitch;top=h.top;kick=h.kick;$('top').value=top;$('kick').value=kick;syncSpin();centerOnAim();notice(`Suggested aim set. Release at the white ${throwSpeed(h.holdMs/((ui.state.selected?.allowedInputs?.chargeSeconds||2.8)*1000),h.powerRange||'precision').toFixed(1)} m/s mark.`,7000);canvas.focus();});
let lastFrame=performance.now(),frames=0,frameSum=0,frameSample=performance.now(),lastTelemetry=0;
const frameTimes=[];
let qualityCheck=0,qualityGoodSince=0;
function animate(now){
  const frameStart=performance.now();requestAnimationFrame(animate);const rawDt=(now-lastFrame)/1000,dt=Math.min(.1,rawDt);lastFrame=now;
  if(!loaded){renderer.render(scene,camera);return;}
  if(!rightDrag){
    const turn=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),tilt=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
    if(turn||tilt){manualCamera=true;azimuth-=turn*1.3*dt;elevation=THREE.MathUtils.clamp(elevation+tilt*.9*dt,-.2,1.25);}
  }
  ui.update(dt);const replaying=ui.state.mode==='replay';
  const timeline=ui.timeline()||renderTimeline(now),snapshot=timeline.after,previous=timeline.before;
  const p=replaying?snapshot?.players[0]:snapshot?.players.find(p=>p.id===(snapshot?.owner||guestId)),phase=timeline.phase,alpha=timeline.alpha;
  if(['Aim','Charging'].includes(phase))returnRequested=false;
  const inFlight=(phase==='Flight'||phase==='Result')&&!returnRequested;
  document.body.classList.toggle('is-ball-camera',inFlight);
  $('connection').textContent=workerReady?'Solo · shared scores':workerStatus==='recovering'?'Restoring physics':workerStatus==='failed'?'Physics stopped':workerStatus==='disconnected'?'Disconnected':'Physics starting';$('connection-dot').classList.toggle('ready',workerReady);
  ball.visible=!!snapshot;
  if(!snapshot){$('throw-panel').hidden=true;$('flight-panel').hidden=true;$('reticle').style.display='none';}
  if(snapshot){
    const stationTime=timeline.time;motion(stationTime);
    for(const player of snapshot.players){
      const a=avatars.get(player.id)||createAvatar(player.id),prior=previous?.players.find(q=>q.id===player.id)||player;
      a.group.position.copy(toThree(prior.feet)).lerp(toThree(player.feet),alpha);a.group.rotation.y=Math.PI-player.yaw*Math.PI/180;
      const posed={...player,walked:THREE.MathUtils.lerp(prior.walked||0,player.walked||0,alpha),movement:{
        x:THREE.MathUtils.lerp(prior.movement?.x||0,player.movement?.x||0,alpha),y:0,
        z:THREE.MathUtils.lerp(prior.movement?.z||0,player.movement?.z||0,alpha)}};
      poseAvatar(a,posed,phase,snapshot,stationTime);

    }
    for(const [id,a]of avatars)if(!snapshot.players.some(p=>p.id===id)){scene.remove(a.group);avatars.delete(id);}
    if(inFlight){
      const prev=previous?.owner===snapshot.owner&&['Flight','Result'].includes(previous.phase)?previous:snapshot;
      if(previous?.phase==='Release'&&phase==='Flight'){
        const t=THREE.MathUtils.clamp((stationTime-snapshot.releaseTime)/(snapshot.stationTime-snapshot.releaseTime||1),0,1);
        ball.position.copy(toThree(snapshot.launchPosition)).lerp(toThree(snapshot.ball),t);
      }else ball.position.copy(toThree(prev.ball)).lerp(toThree(snapshot.ball),alpha);
      ball.quaternion.set(-prev.rotation.x,-prev.rotation.y,prev.rotation.z,prev.rotation.w).slerp(new THREE.Quaternion(-snapshot.rotation.x,-snapshot.rotation.y,snapshot.rotation.z,snapshot.rotation.w),alpha);
      // The ball is already interpolated on the render timeline. Track that same
      // position directly instead of adding a second, delayed moving target.
      followTarget.copy(ball.position);
      if(phase==='Flight'){
        if(trailCount<180)trailCount++;else trailPositions.copyWithin(0,3);
        trailPositions[(trailCount-1)*3]=ball.position.x;trailPositions[(trailCount-1)*3+1]=ball.position.y;trailPositions[(trailCount-1)*3+2]=ball.position.z;
        trailGeometry.setDrawRange(0,trailCount);trailGeometry.attributes.position.needsUpdate=true;
      }
    }else if(p){
      ball.position.copy(avatars.get(p.id)?.held||toThree(p.release));ball.quaternion.copy(avatars.get(p.id)?.hand.getWorldQuaternion(new THREE.Quaternion())||new THREE.Quaternion());followTarget.copy(toThree(p.feet)).add(new THREE.Vector3(0,.90,0));
      const aimYaw=snapshot.owner&&snapshot.owner!==guestId?p.yaw:yaw,aimPitch=snapshot.owner&&snapshot.owner!==guestId?p.pitch:pitch;
      const aim=new THREE.Vector3(Math.sin(aimYaw*Math.PI/180)*Math.cos(aimPitch*Math.PI/180),Math.sin(aimPitch*Math.PI/180),-Math.cos(aimYaw*Math.PI/180)*Math.cos(aimPitch*Math.PI/180));
      const release=toThree(p.release);guide.geometry.setFromPoints([release,release.clone().addScaledVector(aim,2)]);

    }
    if(phase!==lastPhase){if(phase==='Flight'){trailCount=0;}if(phase==='Aim'){trailCount=0;trailGeometry.setDrawRange(0,0);}if(phase==='Result')notice('Score locked · R to retry · Esc for replay and menus');lastPhase=phase;}
    $('flight-label').textContent=phase==='Result'?'BALL AT REST':snapshot.diagnostics?.supported?'STILL ROLLING':'IN FLIGHT';
    $('throw-panel').hidden=inFlight;$('flight-panel').hidden=!inFlight||!!ui.state.selected;$('surfaces').textContent=snapshot.surfaces;
    $('phase-label').textContent=phase==='Charging'?'WINDING UP':phase==='Release'?'RELEASING':ui.state.selected?'READY TO THROW':'FREE EXPLORATION';
    const power=chargeStarted?Math.min(1,(now-chargeStarted)/((ui.state.selected?.allowedInputs?.chargeSeconds||2.8)*1000)):phase==='Release'||phase==='Charging'?snapshot.power:0;
    const model=ui.state.selected?.throwModel||THROW_MODEL,speed=throwSpeed(power,powerRange,model),maximum=throwSpeed(1,powerRange,model);
    $('power-fill').style.width=`${power*100}%`;
    const meter=document.querySelector('.power-track');meter.setAttribute('aria-valuemin','0.5');meter.setAttribute('aria-valuemax',String(maximum));meter.setAttribute('aria-valuenow',speed.toFixed(1));meter.setAttribute('aria-valuetext',`${speed.toFixed(1)} metres per second`);
    $('power-control').classList.toggle('charging',power>0);$('power-number').textContent=power>0?`${speed.toFixed(1)} m/s`:`0.5–${maximum} m/s`;
    $('power-label').textContent=power>=1?'FULL POWER · RELEASE':power>0?'RELEASE TO THROW':'HOLD TO WIND UP';
    $('release-speed').textContent=power>0?`${Math.round(power*100)}% · ${Math.round(speed*3.6)} km/h`:'';
    for(const range of ['precision','full'])$('power-'+range).disabled=!!chargeStarted||['Charging','Release','Flight'].includes(phase)||flightPending||replaying;
    const hint=ui.state.selected?.hint,marker=$('hint-power-marker');
    marker.hidden=!hint||(hint.powerRange||'precision')!==powerRange;$('hint-power-label').hidden=!hint;
    if(hint){const hp=hint.holdMs/((ui.state.selected?.allowedInputs?.chargeSeconds||2.8)*1000),hs=throwSpeed(hp,hint.powerRange||'precision',model);marker.style.left=`${hp*100}%`;marker.setAttribute('aria-hidden','true');$('hint-power-label').textContent=marker.hidden?`SUGGESTED ${hs.toFixed(1)} m/s · H TO SET RANGE & AIM`:`WHITE MARK · SUGGESTED ${hs.toFixed(1)} m/s`;}
    guide.visible=!inFlight&&!!p&&ui.state.mode==='play';
  }
  // Use native subframes, not a shortest rotation between coarse network frames.
  let visibleSpin=0;
  if(inFlight&&snapshot){
    if(!replaying&&ballRotations.sample(timeline.time,ball.quaternion))visibleSpin=ballRotations.speed;
    else if(previous){rotationBetween(ball.quaternion,previous.rotation,snapshot.rotation,alpha);visibleSpin=rotationSpeed(previous.rotation,snapshot.rotation,snapshot.stationTime-previous.stationTime);}
    // Impacts can exceed the launch-spin limit. Use actual native angular speed
    // for exposure blur even when a full turn fits inside one physics subframe.
    if(!replaying&&snapshot.spin){const magnitude=w=>Math.hypot(w.x,w.y,w.z);visibleSpin=Math.max(visibleSpin,THREE.MathUtils.lerp(magnitude(previous?.spin||snapshot.spin),magnitude(snapshot.spin),alpha));}
  }
  spinExposure=THREE.MathUtils.lerp(spinExposure,Math.min(.1,rawDt),1-Math.exp(-dt*8));
  for(const marking of ball.children)marking.material.opacity=spinMarkOpacity(visibleSpin,spinExposure);
  const poseDone=performance.now();
  if(inFlight!==ballCameraActive){
    if(inFlight){
      aimOrbit={azimuth,elevation,distance,manualCamera};
      azimuth=-(replaying?p?.yaw??yaw:lastThrowAim?.yaw??yaw)*Math.PI/180;elevation=.24;distance=2.8;manualCamera=false;
    }else{
      if(aimOrbit){({azimuth,elevation,distance,manualCamera}=aimOrbit);}
      if(ui.state.mode==='play')restoreThrowAim();
    }
    cameraClearance=distance;cameraTarget.copy(followTarget);ballCameraActive=inFlight;
  }
  camera=inFlight?ballCamera:aimCamera;
  if(inFlight)cameraTarget.copy(followTarget);
  else cameraTarget.lerp(followTarget,1-Math.exp(-dt*12));
  desired.set(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(distance).add(cameraTarget);
  if(!inFlight&&!manualCamera)desired.add(new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth)).multiplyScalar(.55));
  const offset=desired.clone().sub(cameraTarget);caster.set(cameraTarget,offset.clone().normalize());caster.near=0;caster.far=offset.length();
  const obstruction=caster.intersectObject(station,true)[0];
  const clearance=obstruction?Math.max(.18,obstruction.distance-.16):offset.length();
  // Pull in immediately to avoid crossing a wall; ease only the return distance.
  // Orbit angles and the ball target still respond in the current frame.
  cameraClearance=clearance<cameraClearance?clearance:THREE.MathUtils.lerp(cameraClearance,clearance,1-Math.exp(-dt*10));
  desired.copy(cameraTarget).addScaledVector(offset.normalize(),cameraClearance);
  // Orbit is direct input: smoothing the world-space position makes the view
  // chase its requested angle and drift after the mouse has stopped.
  caster.far=Infinity;camera.position.copy(desired);camera.up.set(0,1,0);
  const aim=new THREE.Vector3(Math.sin(yaw*Math.PI/180)*Math.cos(pitch*Math.PI/180),Math.sin(pitch*Math.PI/180),-Math.cos(yaw*Math.PI/180)*Math.cos(pitch*Math.PI/180));
  lookTarget.copy(cameraTarget);
  if(p&&!inFlight&&!manualCamera&&ui.state.mode==='play')lookTarget.copy(toThree(p.release)).addScaledVector(aim,aimDistance);
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld();
  briefing.update(camera,dt);
  $('reticle').style.display=p&&ui.state.mode==='play'&&!inFlight&&!flightPending&&phase!=='Release'?'block':'none';
  for(const a of avatars.values()){
    const close=camera.position.distanceTo(a.group.position.clone().add(new THREE.Vector3(0,1.0,0)))<(inFlight?2.2:1.1);
    a.group.visible=!close;
  }
  if(now>noticeUntil)$('notice').classList.add('quiet');
  if(ui.state.mode!=='play'){$('throw-panel').hidden=true;$('flight-panel').hidden=true;$('reticle').style.display='none';}
  if(briefing.blocked){guide.visible=false;$('reticle').style.display='none';}
  $('arcade-hud').hidden=!ui.state.selected||ui.state.mode!=='play';
  if(ui.state.selected){$('hud-course').textContent=ui.state.selected.name;$('hud-best').textContent=(ui.state.board[0]?.score||0).toLocaleString();const g=toThree(ui.state.selected.goal.center),gap=Math.max(0,ball.position.distanceTo(g)-ui.state.selected.goal.radius);$('hud-target').textContent=inFlight?`${gap.toFixed(1)} m TO TARGET`:'ACCURACY × STYLE';}
  $('power-control').hidden=!snapshot||inFlight||ui.state.mode!=='play'||briefing.blocked;
  sound.motion(snapshot?Math.hypot(snapshot.velocity.x,snapshot.velocity.y,snapshot.velocity.z):0,snapshot?.diagnostics?.supported,phase==='Flight'&&ui.state.mode==='play');
  const cameraDone=performance.now();
  stationLook.updateLights(camera.position,now/1000);
  const avatar=avatars.get(guestId);
  if(avatar)robotShadow(avatar.group.position,1.15,avatar.group.visible&&ui.state.mode!=='replay');
  ballShadow(ball.position,.18,ball.visible&&inFlight);
  const shadowsDone=performance.now();
  renderer.render(scene,camera);
  window.kyotoArt.frameCost={pose:poseDone-frameStart,camera:cameraDone-poseDone,shadows:shadowsDone-cameraDone,render:performance.now()-shadowsDone};
  frames++;frameSum+=dt*1000;frameTimes.push(rawDt*1000);if(frameTimes.length>1000)frameTimes.shift();
  if(now-frameSample>1000){$('performance').textContent=`${Math.round(frames*1000/(now-frameSample))} FPS`;frames=0;frameSum=0;frameSample=now;}
  // Preserve input/physics speed on large displays. Only the 3D drawing buffer
  // adapts; the HUD and reticle remain at native screen resolution. Ignore tab
  // suspension and let new shader variants settle before considering a change.
  if(!document.hidden&&now-startupMs>4500&&now-qualityCheck>3000&&frameTimes.length>=120){
    qualityCheck=now;const recent=frameTimes.slice(-120).filter(t=>t<100).sort((a,b)=>a-b),median=recent[Math.floor(recent.length/2)];
    const ratio=renderer.getPixelRatio(),limit=pixelRatioLimit();
    if(median>24){qualityGoodSince=0;if(ratio>Math.min(.65,limit))renderer.setPixelRatio(Math.max(Math.min(.65,limit),ratio*.85));}
    else if(median<18){
      qualityGoodSince||=now;
      if(now-qualityGoodSince>12000&&ratio<limit){renderer.setPixelRatio(Math.min(limit,ratio*1.1));qualityGoodSince=now;}
    }else qualityGoodSince=0;
  }
  if(now-lastTelemetry>15){lastTelemetry=now;window.kyotoState={briefing:briefing.active,briefingTransition:briefing.blocked&&!briefing.active,audio:sound.state,result:ui.state.lastResult,mode:ui.state.mode,pointerLocked:pointerLocked(),charging:!!chargeStarted,viewerFeet:self()?.feet,challenge:ui.state.selected,busy:ui.state.session?.busy,replayTime:ui.state.replayTime,board:ui.state.board,startupMs,ready:loaded&&workerReady&&!!p,phase,diagnostics:snapshot?.diagnostics,feet:p?.feet,ball:snapshot?.ball,velocity:snapshot?.velocity,spin:snapshot?.spin,flightTime:snapshot?.flightTime,stationTime:snapshot?.stationTime,surfaces:snapshot?.surfaces,impacts:snapshot?.impacts,yaw,pitch,top,kick,rotationSampleCount:ballRotations.samples.length,renderedSpin:visibleSpin,spinMarkOpacity:ball.children[0].material.opacity,guestId,identityId,avatarCount:avatars.size,robotVisible:avatars.get(guestId)?.group.visible,cameraClearance,robotWalk:avatars.get(guestId)?.walkBlend,robotFeet:['L','R'].map(side=>avatars.get(guestId)?.bones[`foot.${side}`]?.getWorldPosition(new THREE.Vector3()).toArray()),lastImpact,held:avatars.get(guestId)?.held.toArray(),renderBall:ball.position.toArray(),renderTime:timeline.time,releaseTime:snapshot?.releaseTime,releaseError:avatars.get(guestId)?.releaseError,camera:{mode:inFlight?'ball':'aim',savedAim:lastThrowAim,position:camera.position.toArray(),target:briefing.active?toThree(ui.state.selected.start.center).lerp(toThree(ui.state.selected.goal.center),.5).toArray():lookTarget.toArray(),up:camera.up.toArray(),manual:manualCamera,azimuth,elevation},render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameMs:frameTimes.slice(-120)}};}
  updateShotDetails({snapshot,render:window.kyotoState,lastImpact,result:ui.state.lastResult,worker:workerStatus});
}
window.addEventListener('resize',()=>{for(const view of [aimCamera,ballCamera]){view.aspect=innerWidth/innerHeight;view.updateProjectionMatrix();}renderer.setPixelRatio(Math.min(renderer.getPixelRatio(),pixelRatioLimit()));renderer.setSize(innerWidth,innerHeight);});
requestAnimationFrame(animate);load();
