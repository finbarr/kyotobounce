import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.KYOTO_EVIDENCE||'artifacts/phase3/browser-challenge';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1280,height:888}}});const page=await context.newPage(),errors=[],events=[];const shots=[];
page.on('pageerror',e=>{if(!errors.includes(e.message)){errors.push(e.message);console.error(e.stack);}page.close().catch(()=>{});});
page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(['result','error','placement','saved-challenge','selected'].includes(m.type))events.push(m);}catch{}}));
async function state(){return page.evaluate(()=>window.kyotoState);}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank');
 await page.locator('#use-hint').click();await page.waitForTimeout(350);await page.screenshot({path:`${out}/01-challenge.png`});
 await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(365);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:5000});await page.waitForTimeout(500);await page.screenshot({path:`${out}/02-flight.png`});
 await page.locator('#result-label').filter({hasText:'CHALLENGE COMPLETE'}).waitFor({timeout:35000});shots.push(await state());await page.screenshot({path:`${out}/03-success-board.png`});
 assert.ok((await state()).board.some(e=>e.score>=1100),'Accepted result is in the leaderboard');
 await page.locator('#watch-result').click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');await page.waitForTimeout(1500);await page.locator('#replay-play').click();
 const before=await state();await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForTimeout(350);const end=await state();assert.ok(end.replayTime>before.replayTime,'Scrub advances replay');
 const savedScore=end.board[0].score;await page.mouse.move(900,450);await page.mouse.down({button:'right'});await page.mouse.move(1050,480,{steps:10});await page.mouse.up({button:'right'});await page.waitForTimeout(350);await page.screenshot({path:`${out}/04-replay-scrub-orbit.png`});
 assert.equal((await state()).board[0].score,savedScore,'Replay does not add points');await page.locator('#close-replay').click();await page.waitForFunction(()=>window.kyotoState?.mode==='play');
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'First starter completion, authoritative saved score and replay controls using browser DOM input; remaining MVP checks still required',headless:true,shots,events,errors},null,2));console.log('PASS browser challenge success, leaderboard, replay scrub/orbit and unchanged score');
}catch(error){await page.screenshot({path:`out/failure.png`.replace('out/',`${out}/`)}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),shots,events,errors},null,2));throw error;}finally{await context.close();await browser.close();}
