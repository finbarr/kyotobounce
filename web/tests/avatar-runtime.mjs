// Ordinary input against this machine's isolated native service. No injected game state.
import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/robot/runtime';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',headless:process.env.HEADED!=='1',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:.2,recordVideo:{dir:out,size:{width:1280,height:900}}});const recordingStarted=Date.now(),page=await context.newPage(),errors=[],evidence=[],impacts=[];
page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('crash',()=>console.error('Browser renderer crashed'));page.on('requestfailed',r=>console.error('Request failed',r.url(),r.failure()?.errorText));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='impact')impacts.push(m);}catch{}}));
const state=()=>page.evaluate(()=>window.kyotoState);
async function capture(name){const s=await state();evidence.push({name,videoSeconds:(Date.now()-recordingStarted)/1000,state:s});// Video records ordinary input continuously; avoid blocking software GPU readback here.
 console.log(name,JSON.stringify({feet:s.feet,phase:s.phase,walk:s.robotWalk,mode:s.mode}));return s;}
try{
 await page.goto(process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4273');await page.waitForFunction(()=>window.kyotoState?.ready||document.getElementById('connection')?.textContent==='Disconnected',null,{timeout:120000});
 if(!(await state())?.ready){console.log('Reloading once after software-renderer startup timed out joining');await page.reload();await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});}
 if((await state()).briefing)await page.keyboard.press('Space');
 await page.waitForTimeout(1000);await page.locator('canvas').focus();await capture('idle');
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.kyotoState?.robotWalk>.5,null,{timeout:30000});await capture('walk');await page.keyboard.up('KeyW');
 await page.waitForFunction(()=>window.kyotoState?.robotWalk<.01,null,{timeout:30000});const stopped=await capture('stop');assert.ok(stopped.robotWalk<.01);
 await page.keyboard.down('KeyD');await page.waitForTimeout(1200);await capture('strafe');await page.keyboard.up('KeyD');
 await page.keyboard.down('KeyS');await page.waitForTimeout(1200);await capture('backward');await page.keyboard.up('KeyS');
 // Orbit uses the actual game controls and does not change the movement heading.
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');
 await page.keyboard.down('KeyW');await page.waitForTimeout(1400);await capture('side-walk');await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1000);await capture('fast');await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 await page.waitForTimeout(1000);
 await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:10000});await capture('flight');
 await page.waitForTimeout(3500);await capture('bounces');assert.ok(impacts.length>=2,'Actual native ball bounces');
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim',null,{timeout:10000});await capture('recall');
 // Constrained movement uses real challenge collision, even while input stays held.
 await page.keyboard.press('Escape');await page.locator('#course-list .course').first().click();
 await page.waitForFunction(()=>window.kyotoState?.briefing);await page.keyboard.press('Space');
 await page.waitForFunction(()=>!window.kyotoState?.briefing&&!window.kyotoState?.briefingTransition);await page.locator('canvas').focus();
 await page.keyboard.down('KeyW');await page.waitForTimeout(1800);
 await page.waitForFunction(()=>{const s=window.kyotoState,c=s?.challenge?.start;return c&&Math.hypot(s.feet.x-c.center.x,s.feet.z-c.center.z)>c.radius-.08&&s.robotWalk<.01;},null,{timeout:30000});
 await capture('start-circle-stop');await page.keyboard.up('KeyW');await page.keyboard.press('Escape');
 // Seed these immutable local replays with test:runtime on the same isolated server.
 await page.locator('#leaderboard .score-row').first().click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForFunction(()=>window.kyotoState?.phase==='Flight');await capture('replay-end');
 await page.keyboard.press('Home');await page.waitForFunction(()=>window.kyotoState?.phase==='Charging');await capture('replay-seek');
 await page.keyboard.press('End');await page.waitForFunction(()=>window.kyotoState?.phase==='Flight');await capture('replay-end-again');
 await page.locator('#close-replay').click();await page.waitForFunction(()=>window.kyotoState?.mode==='play');
 assert.deepEqual(errors,[]);assert.ok(evidence.some(e=>e.name==='walk'&&e.state.robotWalk>.5),'Actual input animates walking');
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Native browser input: idle, forward, stop, strafe, backward, orbit, fast, throw, bounces, recall, start-circle collision, immutable replay seek',evidence,impacts,errors},null,2));
} catch(e){await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(e),evidence,impacts,errors},null,2));throw e;}finally{await context.close();await browser.close();}
