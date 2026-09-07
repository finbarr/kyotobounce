import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.KYOTO_TEST_ORIGIN;
if(!origin?.startsWith('https://'))throw new Error('Set KYOTO_TEST_ORIGIN');
const out='artifacts/online/verification/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],responses=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().includes('/assets/'))responses.push({url:r.url(),status:r.status(),headers:r.headers()});});
try{
 await page.goto(origin);await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:180000});
 assert.equal(await page.evaluate(()=>isSecureContext),true);
 await page.getByRole('button',{name:'First Bank',exact:true}).click();
 await page.waitForFunction(()=>window.kyotoState.briefing);
 await page.screenshot({path:`${out}/overview.png`});
 await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>window.kyotoState.pointerLocked&&!window.kyotoState.briefingTransition);
 await page.keyboard.press('KeyH');await page.waitForTimeout(700);
 await page.keyboard.down('Space');await page.waitForTimeout(365);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:60000});
 const ended=await page.evaluate(()=>window.kyotoState);
 assert.ok(ended.result.score>0&&ended.result.saved);assert.equal(ended.diagnostics.sleeping,true);
 assert.deepEqual(ended.velocity,{x:0,y:0,z:0});assert.deepEqual(ended.spin,{x:0,y:0,z:0});
 await page.keyboard.press('Escape');await page.waitForTimeout(1000);
 await page.screenshot({path:`${out}/result.png`});
 await page.locator('#watch-result').click();await page.waitForFunction(()=>window.kyotoState.mode==='replay');
 await page.waitForTimeout(1200);const replayTime=await page.evaluate(()=>window.kyotoState.replayTime);
 await page.waitForTimeout(500);assert.ok(await page.evaluate(t=>window.kyotoState.replayTime>t,replayTime));
 await page.screenshot({path:`${out}/replay.png`});
 assert.deepEqual(errors,[]);
 const geometry=responses.find(r=>r.url.endsWith('/atrium.glb'));assert.equal(geometry.status,200);assert.equal(geometry.headers['content-encoding'],'br');
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',origin,score:ended.result.score,duration:ended.flightTime,rest:ended.diagnostics.sleeping,secure:true,pointerLock:true,replay:true,asset:geometry,errors},null,2));
 console.log('PASS HTTPS browser load, Brotli station asset, overview, pointer lock, real throw, at-rest scoring and animated replay');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors,state:await page.evaluate(()=>window.kyotoState).catch(()=>null)},null,2));throw error;}
finally{await context.close();await browser.close();}
