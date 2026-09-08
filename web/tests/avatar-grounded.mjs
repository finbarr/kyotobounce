import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const out='artifacts/robot/walk';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||(process.platform==='linux'?'/usr/bin/google-chrome':'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.route('**/robot-test',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>'}));await page.goto(`${process.env.KYOTO_TEST_URL||'http://127.0.0.1:4173'}/robot-test`);
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{createAvatar,poseAvatar}=await import('/avatar.js'),asset=await new GLTFLoader().loadAsync('/assets/ori.glb'),rows=[];
  for(const character of ['ori','koma','don'])for(const [name,vx,vz,speed]of [['forward',0,1,1.1],['backward',0,-1,1.1],['strafe',1,0,1.1],['diagonal',.707,.707,1.1],['fast',0,1,4.2],['fast-strafe',1,0,4.2]])for(const fps of [15,30,60,120]){
   const a=createAvatar(asset,{character}),p={id:'p',yaw:180,pitch:15,power:0,top:0,kick:0,grounded:true,movement:{x:vx*speed,z:-vz*speed}};let maxSlip=0,maxTargetError=0,minFoot=Infinity,maxLengthError=0,previous={},steps=0,lastSide,worst,minSeparation=Infinity;
   poseAvatar(a,p,'Aim',{owner:''},0);
   for(let i=1;i<=fps*5;i++){
    a.group.position.x+=vx*speed/fps;a.group.position.z+=vz*speed/fps;poseAvatar(a,p,'Aim',{owner:''},i/fps);
    minSeparation=Math.min(minSeparation,a.bones['foot.L'].getWorldPosition(new T.Vector3()).x-a.bones['foot.R'].getWorldPosition(new T.Vector3()).x);
    if(a.gait.swing?.side&&a.gait.swing.side!==lastSide){steps++;lastSide=a.gait.swing.side;}
    for(const side of ['L','R']){
     const foot=a.bones[`foot.${side}`].getWorldPosition(new T.Vector3()),support=a.gait.swing?.side!==side;
     if(support&&previous[side]?.support&&previous[side].plant.distanceTo(a.gait.feet[side].plant)<.00001)maxSlip=Math.max(maxSlip,foot.distanceTo(previous[side].foot));
     if(foot.distanceTo(a.gait.feet[side].target)>maxTargetError)worst={i,side,root:a.group.position.toArray(),target:a.gait.feet[side].target.toArray(),swing:a.gait.swing,blend:a.walkBlend};maxTargetError=Math.max(maxTargetError,foot.distanceTo(a.gait.feet[side].target));minFoot=Math.min(minFoot,foot.y);
     const hip=a.bones[`thigh.${side}`].getWorldPosition(new T.Vector3()),knee=a.bones[`shin.${side}`].getWorldPosition(new T.Vector3());
     maxLengthError=Math.max(maxLengthError,Math.abs(hip.distanceTo(knee)-Math.hypot(.39,.012)),Math.abs(knee.distanceTo(foot)-Math.hypot(.39,.012)));previous[side]={support,foot,plant:a.gait.feet[side].plant.clone()};
    }
   }
   // Stale nonzero velocity at a collision must not keep cycling the feet.
   for(let i=1;i<=fps*2;i++)poseAvatar(a,p,'Aim',{owner:''},5+i/fps);
   const stopped=['L','R'].map(s=>a.bones[`foot.${s}`].getWorldPosition(new T.Vector3()));
   for(let i=1;i<=fps*2;i++)poseAvatar(a,p,'Aim',{owner:''},7+i/fps);
   const idleDrift=Math.max(...['L','R'].map((s,i)=>a.bones[`foot.${s}`].getWorldPosition(new T.Vector3()).distanceTo(stopped[i])));
   rows.push({character,name,fps,maxSlip,maxTargetError,minFoot,maxLengthError,steps,idleDrift,minSeparation,worst,blend:a.walkBlend});
  }
  return rows;
 });
 await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.table(result);
 assert.ok(result.every(r=>r.maxSlip<.002&&r.maxTargetError<.003),'Support stays planted and solver reaches foot targets');
 assert.ok(result.every(r=>r.minSeparation>.169),'Side steps do not cross shoes');
 assert.ok(result.every(r=>r.minFoot>.118&&r.maxLengthError<.00001),'Soles stay above ground and rigid leg lengths preserved');
 assert.ok(result.every(r=>r.idleDrift<.0001&&r.blend===0),'Wall/idle settles without treadmill or drift');
 console.log('PASS planted support, rigid limbs, clearance, actual-distance gait and wall settling at 15/30/60/120 Hz');
}finally{await browser.close();}
