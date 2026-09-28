import { chromeGraphicsArgs } from '../../../tools/chrome-graphics.mjs';
// Real Chrome controls against the isolated candidate; telemetry is read-only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const [outArg,catalogArg]=process.argv.slice(2),out=resolve(outArg);assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const expected=JSON.parse(await readFile(catalogArg)).find(c=>c.id==='kyoto-cascade5');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist',...chromeGraphicsArgs()]});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const report={scope:'Actual Chrome start, hint and keyboard throw for unaccepted private Escalator Relay proposal; not a performance or all-course gate.',input:'DOM keyboard and button events. Game telemetry is read-only.',errors:[],pass:false};
page.on('pageerror',e=>report.errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:4421/?level=kyoto-cascade5',{waitUntil:'domcontentloaded'});
  await page.locator('#loading-name input[name=player]').fill('Hall course check');
  await page.locator('#loading-name button[type=submit]').click();
  await page.waitForFunction(()=>window.kyotoState?.ready&&window.kyotoState.challenge?.id==='kyoto-cascade5',null,{timeout:120000});
  if(await page.evaluate(()=>window.kyotoState.briefing)){await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefingTransition);}
  await page.waitForFunction(()=>window.kyotoState?.ready&&!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);
  await page.locator('#game').focus();await page.keyboard.press('h');
  await page.waitForFunction(({yaw,pitch})=>window.kyotoState.yaw===yaw&&window.kyotoState.pitch===pitch,expected.hint);
  report.aim=await page.evaluate(()=>window.kyotoState);
  for(const key of ['id','revision','start','hint','waypoints','scoring','layout'])assert.deepEqual(report.aim.challenge[key],expected[key]);assert(Math.hypot(report.aim.feet.x-expected.start.center.x,report.aim.feet.z-expected.start.center.z)<.05);
  await page.screenshot({path:out+'/aim.png'});console.log('Chrome shows the revised start and hint; throwing through Space controls.');
  await page.keyboard.down('Space');await page.waitForTimeout(expected.hint.holdMs);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState.phase==='Flight',null,{timeout:15000});
  await page.screenshot({path:out+'/flight.png'});
  await page.waitForFunction(()=>window.kyotoState.phase==='Result'&&!!window.kyotoState.result,null,{timeout:120000});
  report.result=await page.evaluate(()=>window.kyotoState);
  await page.waitForTimeout(1000);
  await page.waitForFunction(score=>document.querySelector('#result-title').textContent===score.toLocaleString()+' PTS',report.result.result.score);
  await page.screenshot({path:out+'/result.png'});
  const r=report.result.result;
  const response=await page.request.get('http://127.0.0.1:4421/api/replay/'+r.attempt);assert(response.ok());await writeFile(out+'/replay.json',JSON.stringify(await response.json())+'\n');
  assert(Math.hypot(...Object.values(report.result.velocity))<1e-5);assert(Math.hypot(...Object.values(report.result.spin))<1e-5);
  assert.equal(report.result.diagnostics.sleeping,true);assert(r.saved,'Local authoritative score must be saved');assert(r.success,'The authoritative result must clear the course');
  assert.equal(new Set(r.waypointHits.map(h=>h.waypointId)).size,7);assert.equal(report.errors.length,0);
  report.pass=true;console.log(JSON.stringify({pass:true,hits:r.waypointHits.length,score:r.score,saved:r.saved,rest:report.result.diagnostics.sleeping}));
}catch(error){report.error=String(error);report.failureState=await page.evaluate(()=>window.kyotoState).catch(()=>null);await page.screenshot({path:out+'/failure.png',timeout:10000}).catch(()=>{});throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
