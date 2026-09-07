import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/robot-power/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1152,height:800}}}),page=await context.newPage(),errors=[],checks={};
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.kyotoState);
const angleError=s=>{const dx=s.camera.position[0]-s.camera.target[0],dz=s.camera.position[2]-s.camera.target[2];return Math.abs(Math.atan2(Math.sin(Math.atan2(dx,dz)-s.camera.azimuth),Math.cos(Math.atan2(dx,dz)-s.camera.azimuth)));};
try{
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
  if((await state()).briefing){await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);}
  await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.challenge?.throwModel==='robot-v3');
  await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);
  await page.waitForFunction(()=>window.kyotoState.pointerLocked);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1250);await page.keyboard.up('ArrowRight');await page.mouse.wheel(0,-540);await page.waitForTimeout(150);
  await page.screenshot({path:`${out}/carry.png`});
  await page.keyboard.press('KeyH');await page.keyboard.down('Space');await page.waitForTimeout(600);await page.screenshot({path:`${out}/windup.png`});await page.waitForTimeout(650);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState.phase==='Flight');await page.waitForTimeout(80);
  const first=await state();assert.ok(Math.hypot(first.velocity.x,first.velocity.y,first.velocity.z)>75,'Full charge produces a strong native throw');
  assert.equal(await page.locator('#ball-marker').count(),0,'No separate red screen marker');
  const samples=[];await page.keyboard.down('ArrowRight');
  for(let i=0;i<6;i++){await page.waitForTimeout(45);samples.push(await state());}
  await page.keyboard.up('ArrowRight');await page.mouse.move(920,400,{steps:5});samples.push(await state());
  await page.waitForTimeout(80);const stopped=await state();samples.push(stopped);
  checks.orbitSamples=samples.map(s=>({error:angleError(s),camera:s.camera,ball:s.renderBall}));
  assert.ok(samples.every(s=>angleError(s)<.001),'Camera reaches the requested orbit angle in the same frame');
  assert.ok(samples.every(s=>Math.hypot(...s.camera.target.map((v,i)=>v-s.renderBall[i]))<.0001),'Follow target is the rendered ball without another smoothing delay');
  await page.waitForTimeout(120);const settled=await state();assert.equal(settled.camera.azimuth,stopped.camera.azimuth);assert.ok(angleError(settled)<.001,'No delayed rotation after input stops');
  await page.screenshot({path:`${out}/flight.png`});
  await page.waitForFunction(()=>window.kyotoState.impacts>0,null,{timeout:8000});checks.fastImpacts=(await state()).impacts;
  checks.initialSpeed=Math.hypot(first.velocity.x,first.velocity.y,first.velocity.z);checks.maxOrbitError=Math.max(...samples.map(angleError));checks.samples=samples.map(s=>({phase:s.phase,ball:s.renderBall,camera:s.camera}));
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.kyotoState.phase==='Aim');await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',checks,errors},null,2));console.log('PASS relaxed pose captures, strong throw, immediate orbit, no marker/camera lag and fast collision');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),checks,state:await state().catch(()=>null),errors},null,2));throw error;}
finally{await context.close();await browser.close();}
