import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-editor';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1280,height:888}}}),page=await context.newPage(),errors=[],events=[];
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(['placement','saved-challenge','selected','error','result'].includes(m.type))events.push(m);}catch{}}));
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank');await page.locator('#use-hint').click();await page.waitForTimeout(350);
 await page.locator('#new-challenge').click();await page.waitForFunction(()=>window.kyotoState?.mode==='editor');
 await page.locator('#challenge-name').fill('Atrium Window Bank');
 await page.locator('#place-start').click();await page.mouse.click(500,160);await page.waitForTimeout(250);
 assert.ok(events.some(e=>e.type==='error'&&/floor|circle|wall|room/.test(e.message)),'Invalid sky/wall placement rejected');
 await page.screenshot({path:`${out}/01-invalid-placement.png`});
 await page.locator('#place-start').click();await page.mouse.click(910,820);await page.getByText('Start circle is on a valid floor.',{exact:true}).waitFor();
 await page.locator('#start-radius').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await page.locator('#place-goal').click();await page.mouse.click(920,650);await page.getByText('Goal circle is on a valid floor.',{exact:true}).waitFor();
 await page.locator('#goal-radius').focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');
 await page.screenshot({path:`${out}/02-valid-circles.png`});await page.locator('#save-challenge').click();
 await page.waitForFunction(()=>window.kyotoState?.challenge?.name==='Atrium Window Bank');const original=await page.evaluate(()=>window.kyotoState.challenge);
 assert.ok(Math.abs(original.start.radius-.35)<.0001);assert.ok(Math.abs(original.goal.radius-1.95)<.0001);
 await page.locator('#explore').click();await page.waitForFunction(()=>!window.kyotoState?.challenge);await page.getByRole('button',{name:'Atrium Window Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.name==='Atrium Window Bank');
 assert.deepEqual(await page.evaluate(()=>window.kyotoState.challenge),original,'Saved circles reopen unchanged');
 await page.locator('#edit-challenge').click();await page.locator('#challenge-name').fill('Atrium Window Bank II');await page.locator('#save-challenge').click();await page.waitForFunction(()=>window.kyotoState?.challenge?.revision===2);
 const revised=await page.evaluate(()=>window.kyotoState.challenge);assert.equal(revised.id,original.id);assert.equal(revised.name,'Atrium Window Bank II');
 await page.screenshot({path:`${out}/03-reopened-revision.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Named challenge creation, both radius controls, invalid placement rejection, reopen and new revision through DOM input',headless:true,original,revised,events,errors},null,2));console.log('PASS browser challenge editor, placement validation, radii, persistence and revision');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),events,state:await page.evaluate(()=>window.kyotoState).catch(()=>null),errors},null,2));throw error;}finally{await context.close();await browser.close();}
