// Fresh onboarding matters: selecting the course after dismissing its tutorial
// does not exercise the view that a new player actually sees.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';

const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const out=resolve(process.env.KYOTO_INTRO_EVIDENCE||'.local/first-bounce/framing');
assert(out.startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await backgroundInput(context);
const page=await context.newPage(),errors=[],views=[];
page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(30000);
async function check(name){
 await page.waitForTimeout(400);
 const s=await page.evaluate(()=>{const s=window.kyotoState;return {course:s.challenge,phase:s.phase,camera:s.camera,clearance:s.cameraClearance,robotVisible:s.robotVisible,tips:document.body.classList.contains('tutorial-active'),locked:document.pointerLockElement!==null};});
 assert.equal(s.course.id,'atrium-welcome');assert.equal(s.robotVisible,true);
 assert(s.clearance>5&&s.clearance<5.5,'The opening view must leave room around the robot');
 assert.equal(s.camera.manual,false);assert.equal(s.locked,false);
 assert.equal(s.course.waypoints.length,1);assert.equal(s.course.goal,null);
 const start=s.course.start.center,target=s.course.waypoints[0].center;
 assert(Math.hypot(target.x-start.x,target.z-start.z)>=6,'The introductory target must be ahead of the robot');
 views.push({name,...s});await page.screenshot({path:resolve(out,`${name}.png`)});
 return s;
}
try{
 await page.goto(origin);
 await page.locator('#loading-name input[name="player"]').fill('Intro framing check',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 assert.equal((await check('fresh-entry')).tips,true,'First entry includes tutorial coaching');
 await page.locator('#tutorial-action').click();await page.locator('#tutorial-action').click();
 await page.waitForFunction(()=>document.getElementById('tutorial').dataset.step==='charge');
 const course=await page.evaluate(()=>kyotoState.challenge);
 const speed=(.5+11.5*course.hint.holdMs/2800).toFixed(1);
 assert((await page.locator('#tutorial-copy').innerText()).includes(`${speed} m/s`),'Coaching must match the current suggested charge');
 await check('suggested-aim');
 await page.locator('#tutorial-hide').click();
 await page.locator('#game').focus();
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
 await page.waitForFunction(()=>kyotoState.camera.manual);
 await page.keyboard.press('l');await page.locator('#recenter').click();
 await page.getByRole('button',{name:'Close levels'}).click();await check('recenter');
 await page.keyboard.press('l');await page.locator('#home').click();
 await page.getByRole('button',{name:'Close levels'}).click();await check('return-to-start');
 await page.keyboard.press('l');
 const ids=await page.locator('#course-list button[data-challenge]').evaluateAll(buttons=>buttons.map(b=>b.dataset.challenge));
 assert.deepEqual(ids.slice(0,5),['atrium-welcome','atrium-glass-return','atrium-clock-in','atrium-blue-bank','atrium-ticket-slalom']);
 assert.deepEqual(errors,[]);
 console.log('PASS fresh tutorial framing, suggested aim, recenter, return to start and opening course order');
}finally{
 await writeFile(resolve(out,'views.json'),JSON.stringify({views,errors},null,2));
 await context.close();await browser.close();
}
