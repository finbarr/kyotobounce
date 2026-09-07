import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-traversal';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],evidence=[],impacts=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('websocket',ws=>ws.on('framereceived',event=>{try{const m=JSON.parse(String(event.payload));if(m.type==='impact')impacts.push(m);}catch{}}));
async function state(){return page.evaluate(()=>window.kyotoState);}
async function capture(name){const s=await state();evidence.push({name,state:s});await page.screenshot({path:`${out}/${name}.png`});console.log(name,JSON.stringify({feet:s.feet,phase:s.phase,impacts:s.impacts,surfaces:s.surfaces}));}
async function axis(axis,target){
  const before=Date.now();await page.keyboard.down('ShiftLeft');
  while(Date.now()-before<20000){
    const p=(await state()).feet,delta=target-p[axis];if(Math.abs(delta)<.07)break;
    const key=axis==='x'?(delta>0?'w':'s'):(delta>0?'a':'d');
    await page.keyboard.down(key);await page.waitForTimeout(Math.min(700,Math.max(35,Math.abs(delta)/4.2*1000)));await page.keyboard.up(key);await page.waitForTimeout(130);
  }
  await page.keyboard.up('ShiftLeft');await page.waitForTimeout(200);
  assert.ok(Math.abs((await state()).feet[axis]-target)<.16,`Reached ${axis}=${target}`);
}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await page.locator('canvas').focus();
  // Choose the traversal heading explicitly; the arrival view now faces into the atrium.
  await page.mouse.click(700,450);await page.waitForFunction(()=>window.kyotoState.pointerLocked);
  const heading=await state();await page.mouse.move(700+(90-heading.yaw)/.18,450-(15-heading.pitch)/.14,{steps:5});await page.waitForTimeout(180);
 await page.waitForTimeout(1500);await capture('01-entrance');
 await axis('x',17.8);await axis('z',4.65);await capture('02-first-stair-bottom');
 await axis('x',30);assert.ok((await state()).feet.y>5.45,'First landing climbed');await capture('03-first-landing');
 await axis('x',17.8);assert.ok((await state()).feet.y<.1,'First stairs descended');await capture('04-returned-downstairs');
 await axis('z',6.5);
 await page.keyboard.down('Space');await page.waitForTimeout(340);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:5000});
 await page.waitForFunction(()=>window.kyotoState?.lastImpact?.surface?.startsWith('east-concourse-lower-escalator'),null,{timeout:10000});await capture('05-moving-step-bounce');
 assert.ok(impacts.some(i=>i.surface.startsWith('east-concourse-lower-escalator')),'Moving lane produces a real native impact');
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await capture('06-recalled');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'First connected stair/landing traversal and moving-step contact through browser controls; not final MVP acceptance',input:'Playwright DOM keyboard events; telemetry and WebSocket events are read-only',headless:true,evidence,impacts,errors},null,2));console.log('PASS stairs up/down, authoritative moving-step bounce and recall');
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(e),evidence,impacts,errors},null,2));throw e;}finally{await browser.close();}
