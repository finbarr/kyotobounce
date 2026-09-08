import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseline=process.env.BASELINE==='1',out=process.env.EVIDENCE_DIR||'.local/fleet/camera-power';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox',...(process.env.CHROME_ANGLE==='gl'?['--use-angle=gl','--enable-webgl','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
const context=await browser.newContext({deviceScaleFactor:Number(process.env.BROWSER_SCALE||1),viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(120000);const samples=[],bounds=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.kyotoState);
async function sample(label){const s=await state();samples.push({label,...s});return s;}
async function shot(){await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(900);await page.screenshot({scale:'css',path:`${out}/charge.png`});await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.phase==='Flight');}
try{
 if(baseline)await page.route('**/arcade.css',route=>route.fulfill({contentType:'text/css',path:'.local/fleet/baseline-arcade.css'}));
 if(baseline)await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',path:'.local/fleet/baseline-game.js'}));
 await page.goto(process.env.KYOTO_TEST_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:300000});await page.waitForTimeout(1000);
 console.log('ready');await page.screenshot({scale:'css',path:`${out}/desktop.png`});console.log('desktop');bounds.push(await page.locator('#power-control').boundingBox());
 await page.mouse.click(720,400);await page.mouse.move(720,220,{steps:5});await page.waitForTimeout(200);const aim=await sample('aim');
 console.log('aim',aim.pitch);await shot();console.log('flight');for(let i=0;i<25;i++){await sample('auto');await page.waitForTimeout(80);}await page.screenshot({scale:'css',path:`${out}/auto.png`});
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.kyotoState?.camera.manual);await page.keyboard.up('ArrowRight');await page.waitForTimeout(150);const manual=await sample('keyboard');await page.waitForTimeout(400);const sticky=await sample('sticky');
 assert.equal(manual.camera.manual,true);assert.equal(sticky.camera.manual,true);assert.equal(sticky.camera.azimuth,manual.camera.azimuth);
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');const recalled=await sample('recall');assert.equal(recalled.pitch,aim.pitch);assert.equal(recalled.yaw,aim.yaw);
 await shot();const next=await sample('new-throw');assert.equal(next.camera.manual,false);await page.mouse.move(850,300,{steps:3});await page.waitForFunction(()=>window.kyotoState?.camera.manual);assert.equal((await sample('mouse')).camera.manual,true);await page.screenshot({scale:'css',path:`${out}/manual.png`});
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({scale:'css',path:`${out}/mobile.png`});bounds.push(await page.locator('#power-control').boundingBox());
 if(!baseline){const auto=samples.filter(s=>s.label==='auto');assert(auto[0].camera.elevation<0,'Launch retains upward pitch');assert(auto.some(s=>Math.abs(s.camera.elevation-auto[0].camera.elevation)>.03),'Auto tracks trajectory');for(const s of auto){assert.deepEqual(s.camera.up,[0,1,0]);assert(s.camera.elevation>=-.95&&s.camera.elevation<=.95);assert(s.cameraClearance>=.18);} }
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({scale:'css',path:`${out}/failure.png`}).catch(()=>{});console.error({phase:(await state())?.phase,camera:(await state())?.camera});throw error;}finally{await writeFile(`${out}/telemetry.json`,JSON.stringify({baseline,samples,bounds,errors},null,2));await context.close();await browser.close();}
console.log('PASS camera input, recall, new throw and viewport capture');
