import { chromium } from 'playwright';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Client } from './api-client.mjs';
const origin='http://127.0.0.1:4273',out='artifacts/robot/cast-menu';await mkdir(out,{recursive:true});
// The celebration demonstration consumes an actual saved native result and its
// authoritative record flags, rather than a made-up score or a flight timer.
let trigger;
if(process.env.KYOTO_RECORD_FIXTURE){
 trigger=JSON.parse(await readFile(process.env.KYOTO_RECORD_FIXTURE,'utf8'));trigger.snapshot??=trigger.state;
 if(!trigger.replay){assert.ok(process.env.KYOTO_REPLAY_FIXTURE,'Supply the separate immutable native replay fixture');trigger.replay=JSON.parse(await readFile(process.env.KYOTO_REPLAY_FIXTURE,'utf8'));}
}
else{
const client=new Client(origin.replace('http','ws'));
try{
 await client.join();const course=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');
 await client.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const shot=await client.throw(260,{yaw:90,pitch:15,powerRange:'precision'},45000);
 assert.ok(shot.result.saved&&(shot.result.records?.personalBest||shot.result.records?.courseBest),'Use the records-enabled isolated backend or KYOTO_RECORD_FIXTURE');
 const replay=(await client.request('replay',{attempt:shot.result.attempt},'replay')).replay;
 trigger={result:shot.result,snapshot:shot.state,replay};await writeFile(`${out}/authoritative-trigger.json`,JSON.stringify(trigger,null,2));
}finally{client.close();}
}
assert.ok(trigger.result.records?.personalBest||trigger.result.records?.courseBest);
assert.equal(trigger.snapshot.attempt,trigger.result.attempt);assert.equal(trigger.snapshot.phase,'Result');assert.equal(trigger.snapshot.diagnostics.sleeping,true);
assert.equal(Math.hypot(...Object.values(trigger.snapshot.velocity),...Object.values(trigger.snapshot.spin)),0);
await writeFile(`${out}/authoritative-trigger.json`,JSON.stringify(trigger,null,2));
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1200,height:760},recordVideo:{dir:out,size:{width:1200,height:760}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/cast-lab',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><style>body{margin:0;background:#263842;color:#ffe8c2;font:15px system-ui}#menu{position:absolute;left:14px;top:0;width:310px}#controls{position:absolute;right:20px;top:20px}button{padding:8px}#score{position:absolute;left:410px;top:18px}</style><div id="menu"></div><div id="score"></div><div id="controls"><button id="celebrate">Celebrate record</button><button id="retry">Retry</button><button id="replay">Replay</button></div><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>'}));
async function load(){
 await page.goto(`${origin}/cast-lab`);
 await page.evaluate(async(trigger)=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const api=await import('/avatar.js'),{createCharacterPicker,readCharacterChoice}=await import('/character-picker.js');
  const asset=await new GLTFLoader().loadAsync('/assets/ori.glb'),a=api.createAvatar(asset,{character:readCharacterChoice()}),scene=new T.Scene();scene.background=new T.Color(0x293943);
  scene.add(a.group,new T.HemisphereLight(0xffffff,0x506078,3));const light=new T.DirectionalLight(0xffffff,3);scene.add(light);
  const renderer=new T.WebGLRenderer({antialias:false});renderer.setPixelRatio(.75);renderer.setSize(1200,760);document.body.append(renderer.domElement);
  const floor=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshStandardMaterial({color:0x52616b}));floor.rotation.x=-Math.PI/2;scene.add(floor,new T.GridHelper(100,200,0x82949d,0x677b84));
  const cameras=[[2,1.6,3],[3,1.5,0],[-2,1.6,-3]].map(v=>{const c=new T.PerspectiveCamera(40,400/760,.01,200);c.userData.offset=new T.Vector3(...v);return c;});
  const p=trigger.snapshot.players.find(p=>p.id===trigger.snapshot.owner),state={...trigger.snapshot};let phase='Result',time=state.stationTime,last=performance.now(),replayTime=0,replaying=false;
  a.group.position.set(p.feet.x,p.feet.y,-p.feet.z);a.group.rotation.y=Math.PI-p.yaw*Math.PI/180;light.position.copy(a.group.position).add(new T.Vector3(3,5,3));
  const picker=createCharacterPicker({onChange:id=>api.setAvatarCharacter(a,id)});document.getElementById('menu').append(picker.element);
  if(trigger.fixtureKind)document.getElementById('score').title=trigger.fixtureKind;
  document.getElementById('score').textContent=`${trigger.result.score.toLocaleString()} PTS · ${trigger.result.records.courseBest?'COURSE RECORD':'PERSONAL BEST'}`;
  if(trigger.fixtureKind||trigger.source){const note=document.createElement('small');note.textContent=trigger.fixtureKind?'Record-contract fixture · native saved score':'Isolated authoritative result fixture';note.style.display='block';document.getElementById('score').append(note);}
  document.getElementById('celebrate').onclick=()=>{replaying=false;phase='Result';api.celebrateAvatar(a,trigger.result);};
  document.getElementById('retry').onclick=()=>{function settle(){const delay=api.cancelAvatarCelebration(a);if(delay)setTimeout(settle,delay);else phase='Aim';}settle();};
  document.getElementById('replay').onclick=()=>{replaying=true;replayTime=0;};
  window.cast={a,api,p,rows:[],get character(){return a.character;},get phase(){return phase;},get replaying(){return replaying;},get active(){return api.isAvatarCelebrating(a);}};
  function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;time+=dt;
   let poseState=state,poseTime=time,posePlayer=p;
   if(replaying){replayTime=(replayTime+dt)%trigger.replay.duration;const poses=trigger.replay.poses,b=poses.find(v=>v.t>=replayTime)||poses.at(-1);phase='Flight';posePlayer=trigger.replay.thrower;poseTime=trigger.replay.releaseTime+replayTime;poseState={...state,owner:posePlayer.id,attempt:undefined,releaseTime:trigger.replay.releaseTime,diagnostics:undefined,ball:b.p};}
   a.group.position.set(posePlayer.feet.x,posePlayer.feet.y,-posePlayer.feet.z);a.group.rotation.y=Math.PI-posePlayer.yaw*Math.PI/180;
   api.poseAvatar(a,posePlayer,phase,poseState,poseTime);
   window.cast.rows.push({time,character:a.character,phase,active:api.isAvatarCelebrating(a),left:a.bones['hand.L'].getWorldPosition(new T.Vector3()).toArray(),right:a.hand.getWorldPosition(new T.Vector3()).toArray(),feet:['L','R'].map(s=>a.bones[`foot.${s}`].getWorldPosition(new T.Vector3()).toArray())});
   renderer.setScissorTest(true);cameras.forEach((c,i)=>{c.position.copy(a.group.position).add(c.userData.offset.clone().applyQuaternion(a.group.quaternion));c.lookAt(a.group.position.clone().add(new T.Vector3(0,1.05,0)));renderer.setViewport(i*400,0,400,760);renderer.setScissor(i*400,0,400,760);renderer.render(scene,c);});requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
 },trigger);
}
const rows=[];
try{
 for(const character of ['ori','koma','don']){
  await load();await page.getByRole('button',{name:new RegExp(`^${character.toUpperCase()} ·`)}).click();await page.waitForFunction(id=>window.cast.character===id,character);
  await load();assert.equal(await page.evaluate(()=>window.cast.character),character,'Character choice persists through reload');
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${character}-menu.png`});
  await page.locator('#celebrate').click();await page.waitForFunction(()=>window.cast.active);await page.waitForTimeout(850);await page.screenshot({path:`${out}/${character}-celebrate.png`});
  await page.locator('#retry').click();await page.waitForFunction(()=>window.cast.phase==='Aim'&&!window.cast.active);await page.screenshot({path:`${out}/${character}-neutral.png`});
  await page.locator('#replay').click();await page.waitForFunction(()=>window.cast.replaying&&window.cast.phase==='Flight');await page.waitForTimeout(500);await page.screenshot({path:`${out}/${character}-replay.png`});
  rows.push(...await page.evaluate(()=>window.cast.rows));
 }
 await page.emulateMedia({reducedMotion:'reduce'});await load();await page.locator('#celebrate').click();await page.waitForFunction(()=>window.cast.active);await page.screenshot({path:`${out}/reduced-motion.png`});await page.waitForFunction(()=>!window.cast.active);
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Candidate picker/renderer; game/menu integration remains an explicit root patch',triggerSource:trigger.fixtureKind||trigger.source||'native records backend',trigger:{attempt:trigger.result.attempt,score:trigger.result.score,records:trigger.result.records},rows,errors},null,2));
 console.log('PASS three menu choices, reload persistence, distinct celebrations, neutral retry, replay rendering and reduced-motion');
}finally{await context.close();await browser.close();}
