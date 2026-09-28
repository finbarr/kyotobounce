// Appended to game.js by the loopback benchmark only; never shipped as a hook.
let fixtureCapture=null,fixturePlayback=null,reviewView=null,imageResolve=null,soakTimer=null;
const reviewBaseNear=camera.near;
const soakStats={cycles:0,walkMetres:0,savedShots:0,forfeits:0,recallsIssued:0,recallsReturned:0,replays:0,seeks:0,rateChanges:0};
const fixtureIds=new Map();
window.__bench={sound,ui,briefing,startCharge,release,recall,setFastForward,renderer,scene,station:()=>station,camera:()=>camera,stationLook:()=>stationLook,motion:()=>motion,shotPlayback,send,
 connected:()=>workerReady,
 hint:()=>window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:ui.state.selected.hint})),
 captureStart(){fixtureIds.clear();fixtureCapture={course:ui.state.selected,states:[],frames:[]};},
 captureStop(){const result=fixtureCapture;fixtureCapture=null;return result;},
 recordFrame(timeline){
  if(imageResolve){imageResolve(renderer.domElement.toDataURL('image/png'));imageResolve=null;}
  if(!fixtureCapture||!timeline.after)return;
  const id=state=>{if(!fixtureIds.has(state)){fixtureIds.set(state,fixtureCapture.states.length);fixtureCapture.states.push(state);}return fixtureIds.get(state);};
  fixtureCapture.frames.push({at:performance.now(),before:id(timeline.before),after:id(timeline.after),alpha:timeline.alpha,time:timeline.time,phase:timeline.phase,
   view:{yaw,pitch,azimuth,elevation,distance,manualCamera,powerRange},rate:livePlaybackRate,
   camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:lookTarget.toArray()}});
 },
 playback(data){
  connection.stop();ui.closeLevels();briefing.dismiss();ui.dismissResult();keys.clear();
  if(ui.state.selected?.id!==data.course.id)throw Error('Fixture course differs from loaded course');
  fixturePlayback={data,start:performance.now(),cycle:-1,state:-1,frame:null,timeline:null};
  ui.timeline=()=>fixturePlayback.timeline;
  shotPlayback.sample=()=>fixturePlayback.timeline?.phase==='Flight'?{...fixturePlayback.timeline,messages:[]}:null;
 },
 resetClock(){fixturePlayback.start=performance.now();fixturePlayback.cycle=-1;},
 beforeFrame(now){
  if(!fixturePlayback)return;
  const f=fixturePlayback,{frames,states}=f.data;
  const duration=frames.at(-1).at-frames[0].at+1000/60,elapsed=reviewView?0:now-f.start,cycle=Math.floor(elapsed/duration),time=frames[0].at+elapsed%duration;
  if(cycle!==f.cycle){ui.dismissResult();ballRotations.samples=[];ballRotations.releaseTime=null;trailCount=0;trailGeometry.setDrawRange(0,0);f.state=-1;f.cycle=cycle;}
  let low=0,high=frames.length-1;while(low<high){const mid=Math.ceil((low+high)/2);if(frames[mid].at<=time)low=mid;else high=mid-1;}
  const frame=f.frame=frames[low],after=states[frame.after],before=states[frame.before];
  f.timeline={before,after,alpha:frame.alpha,time:frame.time,phase:frame.phase};
  snapshot=after;previous=before;guestId=after.owner||after.players[0].id;
  liveThrow.mode=frame.phase==='Flight'?'released':'holding';liveThrow.attempt=after.attempt;
  returnRequested=false;ballCameraActive=frame.phase==='Flight';flightManual=true;flightPending=false;
  ({yaw,pitch,azimuth,elevation,distance,manualCamera,powerRange}=frame.view);livePlaybackRate=frame.rate;
  if(f.state!==frame.after){ui.message(after);f.state=frame.after;}
 },
 reviewView(value){reviewView=value;if(!value){camera.near=reviewBaseNear;camera.updateProjectionMatrix();}},
 captureImage(){return new Promise(resolve=>{imageResolve=resolve;});},
 applyCamera(view){if(reviewView){view.position.fromArray(reviewView.position);view.lookAt(new THREE.Vector3(...reviewView.target));view.near=reviewView.near??reviewBaseNear;if(reviewView.fov!==undefined)view.fov=reviewView.fov;view.updateProjectionMatrix();if(reviewView.rollDegrees)view.rotateZ(THREE.MathUtils.degToRad(reviewView.rollDegrees));if(view.view?.enabled)view.clearViewOffset();view.updateMatrixWorld();return;}if(!fixturePlayback?.frame)return;const frame=fixturePlayback.frame;view.position.fromArray(frame.camera.position);view.quaternion.fromArray(frame.camera.quaternion);view.updateMatrixWorld();lookTarget.fromArray(frame.camera.target);},
 startSoak(){
  const began=performance.now(),seenResults=new Set();let cycle=-1,done=new Set(),opened=false,waitingRecall=false,walkStart=null;
  const act=(key,at,t,fn)=>{if(t>=at&&!done.has(key)){done.add(key);fn();}};
  soakTimer=setInterval(()=>{
   const elapsed=performance.now()-began,current=Math.floor(elapsed/120000),t=elapsed%120000;
   if(current!==cycle){cycle=current;soakStats.cycles++;done=new Set();opened=false;}
   if(waitingRecall&&window.kyotoState.phase==='Aim'&&!recallPending){waitingRecall=false;soakStats.recallsReturned++;}
   const result=ui.state.lastResult;
   if(result&&!seenResults.has(result.attempt)){seenResults.add(result.attempt);if(result.saved)soakStats.savedShots++;else if(result.breakdown?.outcome==='forfeit')soakStats.forfeits++;}
   act('home',0,t,()=>{keys.clear();if(ui.state.mode==='replay')document.getElementById('close-replay').click();recall();send('home');});
   act('walk',1500,t,()=>{walkStart={...self()?.feet};keys.add('KeyW');});act('stop-walk',3500,t,()=>{keys.delete('KeyW');const p=self()?.feet;if(p&&walkStart)soakStats.walkMetres+=Math.hypot(p.x-walkStart.x,p.z-walkStart.z);});
   act('orbit',4500,t,()=>keys.add('ArrowRight'));act('stop-orbit',8500,t,()=>keys.delete('ArrowRight'));
   act('throw',10000,t,()=>{__bench.hint();startCharge();setTimeout(release,ui.state.selected.hint.holdMs);});
   act('fast',16000,t,()=>{setFastForward(true);soakStats.rateChanges++;});
   act('normal',24000,t,()=>{setFastForward(false);soakStats.rateChanges++;});
   if(t>26000&&t<85000&&!opened&&result?.saved&&window.kyotoState.phase==='Result'){
    opened=true;ui.openReplay(result.attempt).then(()=>{if(ui.state.mode==='replay')soakStats.replays++;});
   }
   if(ui.state.mode==='replay'){
    act('seek',55000,t,()=>{const scrub=document.getElementById('replay-scrub');scrub.value=String(ui.state.replay.duration*.25);scrub.dispatchEvent(new Event('input'));document.getElementById('replay-play').click();soakStats.seeks++;});
    act('replay-fast',65000,t,()=>{setFastForward(true);soakStats.rateChanges++;});
    act('replay-normal',75000,t,()=>{setFastForward(false);soakStats.rateChanges++;});
   }
   act('retry',90000,t,()=>{if(ui.state.mode==='replay')document.getElementById('close-replay').click();recall();});
   act('second-shot',97000,t,()=>{__bench.hint();startCharge();setTimeout(release,1100);});
   act('forfeit',110000,t,()=>{if(window.kyotoState.phase==='Flight'){soakStats.recallsIssued++;waitingRecall=true;}recall();});
  },100);
 },
 stopSoak(){clearInterval(soakTimer);keys.clear();setFastForward(false);},
 diagnostics(){return {soak:{...soakStats},escalators:motion.stats||null,resources:{...renderer.info.memory},audio:sound.state,shot:shotPlayback.stats()};}
};
