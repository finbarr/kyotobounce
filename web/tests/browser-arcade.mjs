import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/arcade/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',s=>s.on('framereceived',f=>{const m=JSON.parse(String(f.payload));if(m.type==='result')results.push(m);}));
const state=()=>page.evaluate(()=>window.kyotoState);
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 if((await state()).briefing){await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.kyotoState.briefingTransition);}
 await page.screenshot({path:`${out}/01-stage-select.png`});
 await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.briefing);
 await page.waitForTimeout(1200);assert.match(await page.locator('#map-start-radius').innerText(),/0.75/);assert.match(await page.locator('#map-goal-radius').innerText(),/1.25/);
 assert.equal((await state()).challenge.scoring,'accuracy-v3');assert.equal((await state()).phase,'Aim');
 await page.screenshot({path:`${out}/02-overview.png`});
 const labels=await page.locator('.map-label').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 for(const r of labels){assert.ok(r.x>=0&&r.x+r.width<=1440&&r.y>100&&r.y+r.height<780,JSON.stringify(r));}
 await page.locator('#briefing-play').click();await page.waitForFunction(()=>window.kyotoState.pointerLocked&&!window.kyotoState.briefingTransition);assert.equal((await state()).phase,'Aim','Starting preview never throws');
 await page.keyboard.press('KeyH');await page.waitForTimeout(700);await page.keyboard.down('Space');await page.waitForTimeout(365);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:40000});await page.waitForTimeout(1000);
 assert.equal(results.at(-1).success,true);assert.equal(results.at(-1).breakdown.accuracy,10000);assert.equal(results.at(-1).saved,true);assert.ok(results.at(-1).score<=12500);
 assert.equal(await page.locator('#result-card').isVisible(),true,'Result visible while pointer locked');
 await page.screenshot({path:`${out}/03-perfect.png`});
 await page.keyboard.press('Escape');await page.locator('#watch-result').click();await page.waitForFunction(()=>window.kyotoState.mode==='replay');await page.waitForTimeout(400);
 const first=(await state()).replayTime;await page.waitForTimeout(400);assert.ok((await state()).replayTime>first);await page.locator('#replay-play').click();await page.waitForTimeout(100);const paused=(await state()).replayTime;await page.waitForTimeout(200);assert.equal((await state()).replayTime,paused);
 await page.screenshot({path:`${out}/04-replay.png`});await page.locator('#close-replay').click();
 await page.locator('#sound-toggle').click();await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.kyotoState.audio.muted)),true);await page.locator('#music-toggle').click();await page.waitForTimeout(100);assert.equal((await state()).audio.music,false);await page.locator('#sound-toggle').click();
 await page.getByRole('button',{name:'Catch the Lift',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.briefing);await page.waitForTimeout(500);await page.screenshot({path:`${out}/05-elevated-overview.png`});
 assert.match(await page.locator('#briefing-distance').innerText(),/5.5 m ELEVATION/);await page.keyboard.press('Space');await page.waitForFunction(()=>!window.kyotoState.briefingTransition&&!window.kyotoState.briefing);assert.equal((await state()).phase,'Aim');
 await page.keyboard.press('Escape');await page.locator('#explore').click();await page.waitForFunction(()=>!window.kyotoState.challenge);await page.locator('#new-challenge').click();assert.equal(await page.locator('#editor-view').isVisible(),true);await page.screenshot({path:`${out}/06-editor.png`});await page.locator('#close-editor').click();
 await page.setViewportSize({width:1024,height:720});await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.briefing);await page.waitForTimeout(500);await page.screenshot({path:`${out}/07-small-overview.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',labels,results,errors,state:await state()},null,2));console.log('PASS arcade overview, no accidental throw, actual perfect score, locked result, replay controls, audio toggles, elevation, editor and smaller viewport');
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),errors,results,state:await state().catch(()=>null)},null,2));throw e;}
finally{await context.close();await browser.close();}
