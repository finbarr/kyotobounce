import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const out='artifacts/robot/gaze';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.route('**/robot-test',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>'}));await page.goto('http://127.0.0.1:4173/robot-test');
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{createAvatar,poseAvatar}=await import('/avatar.js');
  const asset=await new GLTFLoader().loadAsync('/assets/ori.glb'),rows=[];
  for(const character of ['ori','koma','don'])for(const yaw of [-150,0,45,90,180])for(const phase of ['Flight','Result']){
   const a=createAvatar(asset,{character}),parent=new T.Group();parent.rotation.y=.3;parent.add(a.group);a.group.position.set(2,.1,4);a.group.rotation.y=Math.PI-yaw*Math.PI/180;
   const p={id:'owner',yaw,pitch:15,top:200,kick:-140,power:1},q=a.group.getWorldQuaternion(new T.Quaternion());
   const ball=a.group.getWorldPosition(new T.Vector3()).add(new T.Vector3(.8,.85,2).applyQuaternion(q)),state={owner:p.id,releaseTime:0,ball:{x:ball.x,y:ball.y,z:-ball.z}};
   for(let i=0;i<180;i++)poseAvatar(a,p,phase,state,2+i/60);
   const forward=new T.Vector3(0,0,1).applyQuaternion(a.head.getWorldQuaternion(new T.Quaternion())),direction=ball.clone().sub(a.head.getWorldPosition(new T.Vector3())).normalize(),before=a.head.quaternion.clone();
   for(let i=0;i<300;i++)poseAvatar(a,p,phase,state,5+i/60);
   rows.push({character,yaw,phase,error:forward.angleTo(direction),drift:before.angleTo(a.head.quaternion)});
   let previous=a.head.quaternion.clone(),maxFrame=0;
   for(let i=0;i<240;i++){
    const b=a.group.getWorldPosition(new T.Vector3()).add(new T.Vector3(Math.sin(i/60)*1.5,.15+Math.abs(Math.sin(i/30))*2,2).applyQuaternion(q));state.ball={x:b.x,y:b.y,z:-b.z};
    poseAvatar(a,p,phase,state,10+i/60);maxFrame=Math.max(maxFrame,previous.angleTo(a.head.quaternion));previous.copy(a.head.quaternion);
   }
   for(let i=0;i<120;i++)poseAvatar(a,p,'Aim',state,14+i/60);
   const returned=a.head.quaternion.clone();poseAvatar(a,p,'Aim',state,0);const returnError=returned.angleTo(a.head.quaternion);
   // Seeking backwards resets the smoothing history to the new frame.
   poseAvatar(a,p,phase,state,-1);const seek=a.head.quaternion.clone();const fresh=createAvatar(asset,{character});parent.add(fresh.group);fresh.group.position.copy(a.group.position);fresh.group.quaternion.copy(a.group.quaternion);poseAvatar(fresh,p,phase,state,-1);
   const seekError=seek.angleTo(fresh.head.quaternion);
   state.ball={x:100,y:100,z:100};for(let i=0;i<120;i++)poseAvatar(a,p,phase,state,i/60);
   const angles=new T.Euler().setFromQuaternion(a.gaze,'YXZ');
   rows.at(-1).motion={maxFrame,returnError,seekError,yaw:angles.y,pitch:angles.x};
  }
  return rows;
 });
 await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));
 assert.ok(result.every(r=>r.error<.001&&r.drift<.00001),'Ball tracking independent of heading, parent transforms and phase; no drift');
 assert.ok(result.every(r=>r.motion.maxFrame<.15&&r.motion.returnError<.0001&&r.motion.seekError<.00001),'Smooth bounces, aim return and reproducible replay seek');
 assert.ok(result.every(r=>Math.abs(r.motion.yaw)<=1.15001&&Math.abs(r.motion.pitch)<=.65001),'Natural neck limits');
 console.log('PASS gaze headings, parent transforms, Flight/Result, bounces, limits, return, seek and drift');
}finally{await browser.close();}
