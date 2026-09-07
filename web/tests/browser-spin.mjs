import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-spin';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],results=[];let authoritative;
page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='state')authoritative=m;}catch{}}));
page.on('pageerror',e=>{if(!errors.includes(e.message)){errors.push(e.message);console.error(e.stack);}page.close().catch(()=>{});});
async function state(){return page.evaluate(()=>window.kyotoState);}
async function charge(ms=280){await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(ms);await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.phase==='Flight');}
async function reset(){await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.locator('#clear-spin').click();await page.locator('canvas').focus();}
async function spin(id,key){await page.locator(`#${id}`).focus();await page.keyboard.press(key);await page.locator('canvas').focus();await page.waitForTimeout(180);}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank');await page.locator('#use-hint').click();await page.locator('#explore').click();await page.waitForFunction(()=>!window.kyotoState?.challenge);await page.waitForTimeout(500);
 await page.screenshot({path:`${out}/01-held-ball.png`});
 await charge();await page.waitForFunction(()=>window.kyotoState?.impacts>0);await page.waitForTimeout(150);results.push({name:'neutral',state:await state()});await reset();
 await spin('top','Home');await page.screenshot({path:`${out}/02-backspin-grip.png`});await charge();
 await page.waitForFunction(()=>window.kyotoState?.velocity.x < -.1,null,{timeout:5000});results.push({name:'backspin',state:await state()});await page.screenshot({path:`${out}/03-backspin-return.png`});await reset();
 await spin('kick','Home');await charge();await page.waitForFunction(()=>window.kyotoState?.velocity.z>.1,null,{timeout:5000});results.push({name:'left',state:await state()});await reset();
 await spin('kick','End');await charge();await page.waitForFunction(()=>window.kyotoState?.velocity.z < -.1,null,{timeout:5000});results.push({name:'right',state:await state()});await page.screenshot({path:`${out}/04-right-kick.png`});await reset();
 // Cancel must not leave a latent key-up throw.
 await page.keyboard.down('Space');await page.waitForTimeout(450);await page.keyboard.press('Escape');await page.keyboard.up('Space');await page.waitForTimeout(250);assert.equal((await state()).phase,'Aim');
 // Full charge holds without key-repeat restart; focus and menus cancel it.
 await page.keyboard.down('Space');await page.waitForTimeout(1300);const fullCharge=authoritative.chargeTime;assert.equal(authoritative.power,1);await page.keyboard.down('Space');await page.waitForTimeout(200);assert.equal(authoritative.chargeTime,fullCharge);
 await page.locator('#nickname').focus();await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');results.push({name:'full-charge-key-repeat-focus-cancel',state:await state()});
 await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(250);await page.locator('#new-challenge').click();await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.mode==='editor'&&window.kyotoState?.phase==='Aim');results.push({name:'menu-cancel',state:await state()});await page.locator('#close-editor').click();await page.locator('canvas').focus();
 // Mouse capture preserves release when the pointer leaves the canvas viewport.
 await page.mouse.move(1050,440);await page.mouse.down();await page.waitForTimeout(300);await page.mouse.move(1500,1050);await page.mouse.up();await page.waitForFunction(()=>window.kyotoState?.phase==='Flight');results.push({name:'mouse-release-outside',state:await state()});
 await page.mouse.move(900,450);await page.mouse.down({button:'right'});await page.mouse.move(1100,520,{steps:10});await page.mouse.up({button:'right'});await page.waitForTimeout(300);const orbit=await state();assert.equal(orbit.camera.manual,true);assert.deepEqual(orbit.camera.up,[0,1,0]);results.push({name:'orbit',state:orbit});await page.screenshot({path:`${out}/05-orbit.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Browser spin direction, basic grip view, cancellation, mouse release and camera orbit; final anatomical/replay acceptance pending',headless:true,input:'DOM keyboard, mouse and range controls; read-only telemetry',results,errors},null,2));console.log('PASS backspin return, left/right kick, cancel, mouse release and orbit');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),results,errors},null,2));throw error;}finally{await browser.close();}
