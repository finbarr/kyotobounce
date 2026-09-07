import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/escalator-walking/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],evidence=[];
page.on('pageerror',error=>errors.push(error.message));
const state=()=>page.evaluate(()=>window.kyotoState);
async function capture(name){const s=await state();evidence.push({name,state:s});await page.screenshot({path:`${out}/${name}.png`});return s;}
async function axis(axis,target){
  const deadline=Date.now()+20000;await page.keyboard.down('ShiftLeft');
  while(Date.now()<deadline){
    const delta=target-(await state()).viewerFeet[axis];if(Math.abs(delta)<.065)break;
    const key=axis==='x'?(delta>0?'w':'s'):(delta>0?'a':'d');
    await page.keyboard.down(key);await page.waitForTimeout(Math.min(500,Math.max(25,Math.abs(delta)/4.2*1000)));await page.keyboard.up(key);await page.waitForTimeout(110);
  }
  await page.keyboard.up('ShiftLeft');await page.waitForTimeout(100);
  assert.ok(Math.abs((await state()).viewerFeet[axis]-target)<.17,`Reach ${axis}=${target}`);
}
try{
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
  await page.getByRole('button',{name:'Free exploration',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.challenge===null);
  await page.locator('canvas').focus();
  // Choose the traversal heading explicitly; the arrival view now faces into the atrium.
  await page.mouse.click(700,450);await page.waitForFunction(()=>window.kyotoState.pointerLocked);
  const heading=await state();await page.mouse.move(700+(90-heading.yaw)/.18,450-(15-heading.pitch)/.14,{steps:5});await page.waitForTimeout(180);
  await axis('x',17.8);await axis('z',4.65);await axis('x',30);
  assert.ok(Math.abs((await state()).viewerFeet.y-5.5)<.1,'Ascend first stairs to the landing');
  await axis('z',1.571);await axis('x',33.6);await capture('01-approaching-reported-corner');
  await page.keyboard.down('w');await page.waitForTimeout(3000);await page.keyboard.up('w');await page.waitForTimeout(120);
  const walked=await capture('02-walked-past-corner');
  assert.ok(walked.viewerFeet.x>36.5&&walked.viewerFeet.y>6.5,'Robot walks through the reported sticking point');
  assert.ok(walked.viewerFeet.z>=1.58,'Robot slides clear of the inner handrail');
  await page.waitForTimeout(3500);const riding=await capture('03-riding-with-no-input');
  assert.ok(riding.viewerFeet.x>walked.viewerFeet.x+1&&riding.viewerFeet.y>walked.viewerFeet.y+.5,'Escalator carries the idle robot uphill');
  await page.keyboard.down('s');await page.waitForTimeout(2200);await page.keyboard.up('s');await page.waitForTimeout(100);
  const back=await capture('04-walking-back');assert.ok(back.viewerFeet.x<riding.viewerFeet.x-.5,'Robot can walk back against the escalator');
  assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',evidence,errors},null,2));
  console.log('PASS browser stairs, reported handrail corner, passive escalator ride and walking back');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),state:await state().catch(()=>null),evidence,errors},null,2));throw error;}
finally{await browser.close();}
