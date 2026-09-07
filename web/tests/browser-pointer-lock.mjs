import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='artifacts/phase3/pointer-lock';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],events=[],checks={};
page.on('pageerror',e=>errors.push(e.message));
page.on('websocket',ws=>ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(['result','error'].includes(m.type))events.push(m);}));
await page.addInitScript(()=>{
  window.mouseEvidence=[];
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement)window.mouseEvidence.push({x:e.clientX,y:e.clientY,dx:e.movementX,dy:e.movementY,trusted:e.isTrusted});});
});
const state=()=>page.evaluate(()=>window.kyotoState);
async function centered(){const r=await page.locator('#reticle').boundingBox();assert.ok(r&&Math.abs(r.x+r.width/2-720)<.5&&Math.abs(r.y+r.height/2-500)<.5,'Reticle stays at the exact screen center');}
async function unlock(){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement&&!window.kyotoState.pointerLocked);await page.waitForTimeout(1300);}
async function capture(x=680,y=430){await page.mouse.click(x,y);await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&window.kyotoState.pointerLocked);}
try{
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
  const initial=await state();await page.mouse.move(650,430);await page.mouse.move(900,380);await page.waitForTimeout(100);
  assert.equal((await state()).yaw,initial.yaw,'Free menu cursor does not alter aim');
  await capture();await page.waitForTimeout(180);assert.equal((await state()).phase,'Aim');assert.equal((await state()).charging,false,'Capture click must not throw');await centered();
  const before=await state();
  for(let x=780;x<=2780;x+=200)await page.mouse.move(x,430,{steps:2});
  await page.waitForTimeout(200);const moved=await state(),motion=await page.evaluate(()=>window.mouseEvidence);
  assert.ok(motion.length>10&&motion.every(e=>e.trusted),'Real browser input reaches the captured canvas');
  assert.ok(motion.reduce((sum,e)=>sum+Math.abs(e.dx),0)>1800,'Relative movement continues beyond the viewport width');
  assert.ok(new Set(motion.map(e=>`${e.x}:${e.y}`)).size<=2,'OS cursor coordinates stay fixed during capture');
  assert.ok(Math.abs(moved.yaw-before.yaw)>5,'Captured movement changes aim');await centered();
  checks.capture={beforeYaw:before.yaw,afterYaw:moved.yaw,motion};

  await page.keyboard.down('ArrowRight');await page.waitForTimeout(240);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(180);await page.keyboard.up('ArrowUp');await page.waitForTimeout(100);
  const orbit=await state();assert.equal(orbit.camera.manual,true);assert.equal(orbit.yaw,moved.yaw);await centered();
  await page.mouse.move(2810,420);await page.waitForTimeout(150);const recentered=await state();assert.equal(recentered.camera.manual,false);await centered();
  await page.mouse.down({button:'right'});await page.mouse.move(2880,445,{steps:3});await page.mouse.up({button:'right'});await page.waitForTimeout(100);assert.equal((await state()).camera.manual,true);assert.equal((await state()).yaw,recentered.yaw);await centered();
  checks.orbit={arrow:orbit.camera,recentered:recentered.camera};

  await page.mouse.down();await page.waitForFunction(()=>window.kyotoState.charging&&window.kyotoState.phase==='Charging');await unlock();await page.mouse.up();
  await page.waitForFunction(()=>window.kyotoState.phase==='Aim');assert.equal((await state()).charging,false);assert.equal(events.filter(m=>m.type==='result').length,0);checks.escapeCancels=true;
  await page.locator('#new-challenge').click();await page.waitForFunction(()=>window.kyotoState.mode==='editor');await page.locator('#challenge-name').fill('Pointer input check');
  await page.locator('#place-start').click();await page.mouse.click(920,800);await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Designer keeps its free placement cursor');assert.equal((await state()).mode,'editor');
  assert.equal(await page.locator('#challenge-name').inputValue(),'Pointer input check');await page.locator('#close-editor').click();checks.designer=true;

  await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.challenge?.id==='atrium-first-bank');
  await page.locator('#use-hint').click();await page.locator('canvas').focus();await page.waitForTimeout(100);
  // Space captures and charges from a menu without needing an extra click.
  await page.keyboard.down('Space');await page.waitForTimeout(365);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState.phase==='Flight'&&window.kyotoState.pointerLocked);await centered();
  await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:40000});
  const result=events.find(m=>m.type==='result');assert.ok(result.duration>0);checks.spaceThrow={power:result.thrower.power,reason:result.reason};
  await unlock();await page.locator('.score-row').first().click();await page.waitForFunction(()=>window.kyotoState.mode==='replay');
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null);await page.locator('#close-replay').click();checks.replayMenus=true;
  await capture();await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.kyotoState.phase==='Aim');
  await page.mouse.down();await page.waitForTimeout(365);await page.mouse.up();await page.waitForFunction(()=>window.kyotoState.phase==='Flight');checks.mouseThrow=true;
  await unlock();await page.screenshot({path:`${out}/centered.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(events.filter(m=>m.type==='error'),[]);
  await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Actual Chrome pointer capture, unbounded relative movement, fixed reticle, orbit/recenter, Escape cancellation, designer/replay menus, keyboard and mouse throws',checks,errors},null,2));
  console.log('PASS pointer capture, centered aim, Escape, menus and throws');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),state:await state().catch(()=>null),checks,events,errors},null,2));throw error;}
finally{await browser.close();}
