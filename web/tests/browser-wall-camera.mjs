import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {backgroundInput} from './background-input.mjs';
const out=resolve(process.env.KYOTO_CAMERA_EVIDENCE||'.local/camera-cutaway');
await mkdir(out,{recursive:true});
const courses=JSON.parse(await readFile('web/starter-challenges.json'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await backgroundInput(context);
const page=await context.newPage(),errors=[],entries=[],walks=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>{const s=window.kyotoState;return {name:s.challenge?.name,id:s.challenge?.id,phase:s.phase,feet:s.feet,renderFeet:s.renderFeet,camera:s.camera,clearance:s.cameraClearance,robotVisible:s.robotVisible,yaw:s.yaw,pitch:s.pitch,reticle:s.reticle,locked:s.pointerLocked};});
async function select(c){
 await page.keyboard.press('l');
 await page.locator('#campaign-chapter').selectOption(String(c.campaign.chapter));
 await page.locator(`#course-list button[data-challenge="${c.id}"]`).click();
 await page.waitForFunction(id=>kyotoState.challenge?.id===id,c.id);
 if(!await page.evaluate(()=>kyotoState.briefing)){
  if(!await page.locator('#show-overview').isVisible())await page.keyboard.press('l');
  await page.locator('#show-overview').click();
 }
 await page.waitForFunction(()=>kyotoState.briefing);
 await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'The audit must never capture the desktop pointer');
 await page.waitForFunction(c=>kyotoState.feet&&Math.hypot(kyotoState.feet.x-c.start.center.x,kyotoState.feet.z-c.start.center.z)<.2,c);
 await page.locator('#game').focus();await page.keyboard.press('h');await page.waitForTimeout(650);
}
try{
 await page.goto('http://127.0.0.1:4425');
 await page.locator('#loading-name input[name="player"]').fill('Local camera audit',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!kyotoState.briefingTransition);
 for(const c of courses){
  await select(c);const s=await state();entries.push(s);
  assert(s.robotVisible,`${c.name}: robot must remain visible`);
  assert(s.clearance>3.7,`${c.name}: wall must not squeeze the camera`);
  if(!s.robotVisible||[6,7,9,10,11,26].includes(c.order)||['garden-corner','skyway-circuit','tower-return','grand-descent','atrium-ticket-slalom','atrium-welcome'].includes(c.id))await page.screenshot({path:resolve(out,`${c.order+1}-entry.png`)});
  console.log(JSON.stringify({level:c.order+1,name:c.name,robotVisible:s.robotVisible,clearance:s.clearance,feet:s.feet}));
 }
 for(const id of ['atrium-blue-bank','bridge-pinball','basement-glass-loop','garden-corner','skyway-circuit']){
  await select(courses.find(c=>c.id===id));const samples=[await state()];
  await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.locator('#game').focus();
  await page.keyboard.down('s');
  for(let i=0;i<30;i++){await page.waitForTimeout(100);const s=await state();samples.push(s);assert(s.robotVisible,`${id}: robot disappears while backing up`);}
  await page.keyboard.up('s');await page.waitForTimeout(300);
  const after=await state();await page.screenshot({path:resolve(out,`${id}-back-wall.png`)});
  await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');await page.waitForTimeout(500);
  const recovered=await state();walks.push({id,samples,after,recovered});
  console.log('WALL',JSON.stringify({id,hiddenFrames:samples.filter(s=>!s.robotVisible).length,minClearance:Math.min(...samples.map(s=>s.clearance)),after:after.robotVisible,recovered:recovered.robotVisible}));
 }
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(resolve(out,'browser.json'),JSON.stringify({entries,walks,errors},null,2));
 await page.screenshot({path:resolve(out,'final-view.png')}).catch(()=>{});
 await context.close();await browser.close();
}
