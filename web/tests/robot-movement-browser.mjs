// Normal-game input and read-only bone telemetry. Hardware motion review remains
// required when the recorded frame times exceed the motion acceptance threshold.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4287';
const out=process.env.KYOTO_TEST_OUTPUT||'.local/station-detail/browser';await mkdir(out,{recursive:true});
const linux=process.platform==='linux';
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||(linux?'/usr/bin/google-chrome':'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless:process.env.HEADED!=='1',args:linux?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:960,height:640},deviceScaleFactor:linux?.5:1,recordVideo:{dir:out,size:{width:960,height:640}}});
const page=await context.newPage(),rows=[],errors=[];
page.setDefaultTimeout(30000);
const deadline=setTimeout(()=>{errors.push('300 second review budget exceeded');void browser.close();},300000);
// Expose only a read function; all movement, selection and reset uses DOM input.
await page.route('**/game.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nwindow.robotMovementRead=()=>({state:window.kyotoState,avatars:[...avatars.values()].map(a=>({character:a.character,root:a.group.position.toArray(),rotation:a.group.quaternion.toArray(),blend:a.walkBlend,bones:Object.fromEntries(['root','hips','chest','foot.L','foot.R'].map(n=>[n,{position:a.bones[n].getWorldPosition(new THREE.Vector3()).toArray(),rotation:a.bones[n].getWorldQuaternion(new THREE.Quaternion()).toArray()}]))}))});`});});
page.on('pageerror',e=>errors.push(String(e)));
async function capture(name){const r=await page.evaluate(()=>robotMovementRead());assert.ok(r.state?.ready,`${name}: game telemetry is ready`);rows.push({name,...r});await writeFile(`${out}/progress.json`,JSON.stringify({step,errors,rows},null,2)+'\n');await page.screenshot({path:`${out}/${name}.png`,timeout:20000});console.log(name,r.state.phase,r.state.frameDt);return r;}
async function key(code,ms){await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);}
let failure,step='startup';
try{
 await page.goto(origin);await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await capture('fresh');
 await page.waitForFunction(()=>robotMovementRead().avatars.every(a=>a.blend===0));await capture('fresh-settled');
 if(await page.evaluate(()=>kyotoState.briefing)){await page.keyboard.press('Space');await page.waitForFunction(()=>!kyotoState.briefingTransition);}
 for(const character of ['ori','koma','don']){
  step=`${character}: select and walk`;
  await page.locator(`#robot-character-picker [data-character=${character}]`).click();await page.waitForFunction(c=>kyotoState.robotCharacter===c,character);await page.locator('canvas').focus();
  await capture(`${character}-idle`);await key('KeyW',700);await key('KeyD',400);await key('KeyS',400);
  // Mouse movement changes the actual aiming/root heading; arrows only orbit.
  step=`${character}: acquire pointer lock`;
  await page.locator('canvas').click({position:{x:480,y:360}});await page.waitForFunction(()=>kyotoState.pointerLocked);
  step=`${character}: turn and release pointer lock`;
  await page.mouse.move(1480,360,{steps:30});await page.waitForTimeout(1500);await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!kyotoState.pointerLocked);
  // Chrome exits pointer lock asynchronously and briefly suppresses reacquisition
  // after Escape. Wait for release and settled feet before the next character.
  step=`${character}: settle after turn`;
  await page.waitForFunction(()=>robotMovementRead().avatars.every(a=>a.blend===0));
  await page.waitForTimeout(1500);
  await capture(`${character}-turn-stop`);await page.locator('#retry').click();await page.waitForTimeout(500);await capture(`${character}-retry`);
 }
 step='challenge entry';await page.locator('#course-list .course').first().click();
 await page.waitForFunction(()=>kyotoState.briefing);await page.keyboard.press('Space');
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);await capture('challenge-entry');
 step='hint and throw';await page.locator('canvas').focus();await page.keyboard.press('KeyH');
 await key('Space',260);await page.waitForFunction(()=>kyotoState.phase==='Flight');await capture('flight');
 step='result';await page.waitForFunction(()=>kyotoState.phase==='Result',null,{timeout:60000});await capture('result');
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>kyotoState.phase==='Aim');await capture('result-retry');
 step='replay';await page.keyboard.press('Escape');await page.locator('#leaderboard .score-row').first().click();
 await page.waitForFunction(()=>kyotoState.mode==='replay');await capture('replay');
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await capture('replay-seek');
 await page.locator('#close-replay').click();await page.waitForFunction(()=>kyotoState.mode==='play');await capture('replay-return');
 step='fresh reload';await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await capture('fresh-again');
 assert.equal(errors.length,0,'No browser page errors');
 const moved=rows.some(r=>Math.hypot(...r.avatars[0].root.map((v,i)=>v-rows[0].avatars[0].root[i]))>.1);assert.ok(moved,'Normal input moves the authoritative player');
}catch(e){failure=`${step}: ${String(e)}`;await capture('failure').catch(()=>{});}finally{
 clearTimeout(deadline);
 const times=rows.flatMap(r=>r.state.render.frameMs).sort((a,b)=>a-b),p99=times[Math.floor(times.length*.99)],median=times[Math.floor(times.length*.5)];
 await writeFile(`${out}/receipt.json`,JSON.stringify({status:failure?'fail':p99>50?'hardware-review-required':'captured-for-visual-review',origin,linux,medianMs:median,p99Ms:p99,failure,errors,rows},null,2)+'\n');await context.close();await browser.close();
}
if(failure)throw new Error(failure);
