import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/avatar-release';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||(process.platform==='linux'?'/usr/bin/google-chrome':'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless:true,args:process.platform==='linux'?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage();await page.route('**/robot-test',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>'}));await page.goto('http://127.0.0.1:4173/robot-test');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/vendor/three/build/three.module.js');
  const {GLTFLoader}=await import('/vendor/three/examples/jsm/loaders/GLTFLoader.js');
  const {createAvatar,poseAvatar}=await import('/avatar.js');
  const asset=await new GLTFLoader().loadAsync('/assets/ori.glb'),results=[];
  for(const yaw of [-150,0,45,90])for(const [top,kick]of [[0,0],[200,0],[-200,0],[0,200],[0,-200],[140,140],[-140,-140]]){
   const a=createAvatar(asset),feet={x:2,y:.025,z:20},q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-yaw*Math.PI/180);
   const offset=new THREE.Vector3(.22,1.5,-.42).applyQuaternion(q),release={x:feet.x+offset.x,y:feet.y+offset.y,z:feet.z-offset.z};
   a.group.position.set(feet.x,feet.y,-feet.z);a.group.rotation.y=Math.PI-yaw*Math.PI/180;
   const player={id:'fixture',feet,release,yaw,pitch:15,top,kick,power:1};
   poseAvatar(a,player,'Release',{owner:'fixture',releaseTime:10},10);
   const endpoint=a.held.clone(),target=new THREE.Vector3(release.x,release.y,-release.z);
   const upper=a.upper.getWorldPosition(new THREE.Vector3()),elbow=a.forearm.getWorldPosition(new THREE.Vector3()),wrist=a.hand.getWorldPosition(new THREE.Vector3());
   results.push({yaw,top,kick,error:endpoint.distanceTo(target),upperLength:upper.distanceTo(elbow),forearmLength:elbow.distanceTo(wrist)});
  }
  // Repeated unchanged aim frames must not accumulate procedural rotation.
  const a=createAvatar(asset),p={id:'fixture',feet:{x:0,y:0,z:0},release:{x:.22,y:1.5,z:.42},yaw:0,pitch:20,top:200,kick:0,power:0};
  poseAvatar(a,p,'Aim',{owner:''},0);const before=a.hand.getWorldQuaternion(new THREE.Quaternion()).clone(),head=a.head.quaternion.clone();
  for(let i=0;i<240;i++)poseAvatar(a,p,'Aim',{owner:''},i/60);
  const after=a.hand.getWorldQuaternion(new THREE.Quaternion());
  return {rows:results,stationaryHandRotationDrift:before.clone().normalize().angleTo(after.clone().normalize()),handQuaternionComponentChange:Math.max(...before.toArray().map((v,i)=>Math.abs(v-after.toArray()[i]))),stationaryHeadRotationDrift:head.clone().normalize().angleTo(a.head.quaternion.clone().normalize())};
 });
 console.log('Pose diagnostics',JSON.stringify({maxEndpointError:Math.max(...result.rows.map(r=>r.error)),handDrift:result.stationaryHandRotationDrift,headDrift:result.stationaryHeadRotationDrift}));
 await writeFile(`${out}/result.json`,JSON.stringify({status:'checks-pending',...result},null,2));
 assert.ok(result.rows.every(r=>r.error<.001),'Visible grip matches the native hand release within 1 mm');
 assert.ok(result.rows.every(r=>r.upperLength>.29&&r.upperLength<.31&&r.forearmLength>.25&&r.forearmLength<.27),'Rigid limb lengths preserved');
 assert.ok(result.stationaryHandRotationDrift<.00001&&result.stationaryHeadRotationDrift<.00001,'No cumulative aim/grip rotation');
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Programmatic endpoint and pose stability using the actual glTF rig; not ordinary-input or full anatomical acceptance',...result},null,2));console.log('PASS 28 rig release endpoints, fixed limb lengths, no accumulated pose rotation');
}finally{await browser.close();}
