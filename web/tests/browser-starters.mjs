import { chromium } from 'playwright';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.KYOTO_EVIDENCE||'artifacts/phase3/browser-starters';await mkdir(out,{recursive:true});
const starters=JSON.parse(await readFile('web/starter-challenges.json','utf8'));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1280,height:888}}}),page=await context.newPage(),errors=[],results=[];
let latest,received=0;const events=[];
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='state'){latest=m;received=performance.now();}if(['result','error'].includes(m.type))events.push(m);}catch{}}));
const clock=()=>latest.stationTime+(performance.now()-received)/1000;
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 for(const c of starters.slice(process.env.KYOTO_ONLY_MOVING?2:1)){
  if(!results.length)await page.getByRole('button',{name:c.name,exact:true}).click();else await page.locator('#next-challenge').click();
  await page.waitForFunction(id=>window.kyotoState?.challenge?.id===id,c.id);await page.locator('#use-hint').click();await page.waitForTimeout(350);await page.locator('canvas').focus();
  let targetRelease;
  if(c.hint.period){
   // Exercise cancellation and initialize browser audio before scheduling the
   // timed gesture; first-use AudioContext setup can delay the first key event.
   await page.keyboard.down('Space');await page.waitForTimeout(60);await page.keyboard.press('Escape');await page.keyboard.up('Space');await page.waitForTimeout(150);
   const now=clock(),h=c.hint;targetRelease=h.releasePhase+Math.ceil((now+h.holdMs/1000+.4-h.releasePhase)/h.period)*h.period;
   await page.waitForTimeout(Math.max(0,(targetRelease-.14-h.holdMs/1000-clock())*1000));
  }
  events.push({type:'scheduled-shot',name:c.name,targetRelease,stationBefore:clock(),holdMs:c.hint.holdMs});
  const begin=events.length;await page.keyboard.down('Space');await page.waitForTimeout(c.hint.holdMs);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:5000});await page.waitForTimeout(700);await page.screenshot({path:`${out}/${c.order}-flight.png`});
  await page.locator('#result-label').filter({hasText:'CHALLENGE COMPLETE'}).waitFor({timeout:35000});
  const result=events.slice(begin).find(m=>m.type==='result'),state=await page.evaluate(()=>window.kyotoState);assert.ok(result?.success);
  if(c.order===1)assert.ok(state.ball.x<c.start.center.x-1,'Backspin returns behind the thrower');
  if(c.requiredSurface)assert.ok(state.lastImpact,'Moving challenge received contact events');
  await page.screenshot({path:`${out}/${c.order}-success.png`});
  results.push({name:c.name,result,state,targetRelease,phaseError:targetRelease===undefined?null:result.releaseTime-targetRelease});
  console.log('PASS',c.name,result.score,'points',result.duration.toFixed(2),'seconds','phase error',results.at(-1).phaseError);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Return Ticket and Moving Return completed via browser DOM input, with progression and timed moving-surface requirement',headless:true,results,errors},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),results,events,latest,errors},null,2));throw error;}finally{await context.close();await browser.close();}
