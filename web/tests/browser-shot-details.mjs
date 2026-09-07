import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='artifacts/phase3/at-rest/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('websocket',socket=>socket.on('framereceived',frame=>{
  const message=JSON.parse(String(frame.payload));if(message.type==='result')results.push(message);
}));
const state=()=>page.evaluate(()=>window.kyotoState);
try{
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
  assert.equal(await page.locator('#shot-details').evaluate(el=>el.open),false);
  if((await state()).briefing){await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);}
  await page.getByRole('button',{name:'First Bank',exact:true}).click();
  await page.waitForFunction(()=>window.kyotoState.challenge?.id==='atrium-first-bank');
  await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);await page.waitForFunction(()=>window.kyotoState.pointerLocked);
  await page.keyboard.press('KeyH');await page.waitForFunction(()=>window.kyotoState.yaw===90&&window.kyotoState.pitch===15);
  await page.waitForTimeout(700);await page.keyboard.down('Space');await page.waitForTimeout(365);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:40000});
  const ended=await state();await page.waitForTimeout(1200);
  await page.waitForFunction(()=>window.kyotoState.diagnostics.sleeping,null,{timeout:10000});const later=await state();
  assert.equal(results.length,1);assert.equal(results[0].success,true);assert.equal(results[0].score,10800);
  assert.equal(ended.diagnostics.sleeping,true,'Result is issued only after native rest');
  assert.deepEqual(ended.velocity,{x:0,y:0,z:0});assert.deepEqual(ended.spin,{x:0,y:0,z:0});
  assert.deepEqual(later.ball,ended.ball);assert.equal(later.flightTime,ended.flightTime,'Final shot clock is stable');
  assert.equal(later.diagnostics.simulating,false);
  assert.equal(later.surfaces,ended.surfaces);assert.equal(later.impacts,ended.impacts);
  assert.equal(later.diagnostics.endReason,'Target settled');assert.equal(later.diagnostics.sleeping,true);
  await page.keyboard.press('Escape');
  await page.locator('#shot-details summary').click();
  await page.waitForFunction(()=>document.getElementById('shot-state').textContent.includes('Target settled'));
  const text=await page.locator('#shot-state').innerText();
  assert.match(text,/Phase: Result · At rest/);assert.match(text,/Last surface:/);
  const live=await page.request.get('http://127.0.0.1:4173/api/debug/sessions');assert.equal(live.status(),200);
  const diagnostic=await live.json(),session=diagnostic.sessions.find(s=>s.id===later.guestId);
  assert.ok(session&&session.snapshotAgeMs<2000);assert.equal(session.snapshot.diagnostics.endReason,'Target settled');
  assert.ok(!JSON.stringify(diagnostic).includes('token'),'No guest credential in local diagnostic endpoint');
  const denied=await page.request.get('http://127.0.0.1:4173/api/debug/sessions',{headers:{Origin:'https://example.com'}});assert.equal(denied.status(),403);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save shot report'}).click();
  const download=await downloadPromise;await download.saveAs(`${out}/shot-report.json`);
  const saved=JSON.parse(await readFile(`${out}/shot-report.json`,'utf8'));assert.equal(saved.snapshot.id,later.guestId);assert.equal(saved.result.score,10800);
  await page.screenshot({path:`${out}/shot-details.png`});
  await page.locator('#shot-details summary').click();
  await page.locator('#watch-result').click();
  await page.waitForFunction(()=>window.kyotoState.mode==='replay');
  await page.waitForTimeout(350);const replayStart=(await state()).replayTime;
  await page.waitForTimeout(500);assert.ok((await state()).replayTime>replayStart+.25,'Scored shot replays with the detailed station');
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(100);const paused=(await state()).replayTime;
  await page.waitForTimeout(250);assert.equal((await state()).replayTime,paused,'Replay pause');
  await page.locator('#replay-speed').selectOption('0.5');
  await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForTimeout(100);
  assert.ok((await state()).replayTime>paused,'Replay scrubbing');
  await page.screenshot({path:`${out}/replay.png`});
  await page.locator('#close-replay').click();await page.waitForFunction(()=>window.kyotoState.mode==='play');
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',ended,later,session,results,text,errors},null,2));
  console.log('PASS scored throw, native rest before finishing, stable score, diagnostics, saved report and replay controls');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),results,errors,state:await state().catch(()=>null)},null,2));throw error;}
finally{await context.close();await browser.close();}
