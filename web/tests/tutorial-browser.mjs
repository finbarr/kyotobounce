import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4186';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Browser gameplay tests require a local database');
const out=process.env.KYOTO_EVIDENCE||'.local/tutorial-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const errors=[],receipts=[];let current;
async function enter(context){const page=current=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('#loading-name input').waitFor({state:'visible',timeout:120000});await page.locator('#loading-name input').fill('First timer');await page.locator('#loading-name button').click();await page.locator('#loading').waitFor({state:'hidden',timeout:180000});await page.locator('#tutorial').waitFor();assert.equal(await page.locator('#briefing').isVisible(),false);return page;}
async function bounds(page,label){
 const result=await page.evaluate(()=>{
  const ids=['tutorial','result-leaderboard','power-control','mobile-tools','mobile-move','mobile-actions'];
  const visible=el=>el&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width&&el.getBoundingClientRect().height;
  const rectangles=ids.map(id=>document.getElementById(id)).filter(visible).map(el=>({id:el.id,...Object.fromEntries(['x','y','width','height'].map(k=>[k,el.getBoundingClientRect()[k]]))}));
  return {canvasWidth:document.querySelector('#game').getBoundingClientRect().width,clientWidth:document.documentElement.clientWidth,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,rectangles};
 });
 assert.equal(result.canvasWidth,result.clientWidth,label+' canvas matches the visible viewport');
 assert.equal(result.width,result.clientWidth,label+' uses the real mobile viewport');
 assert.equal(result.overflow,false,label+' has no horizontal overflow');
 const t=result.rectangles.find(r=>r.id==='tutorial');assert.ok(t&&t.x>=0&&t.y>=0&&t.x+t.width<=result.width+1&&t.y+t.height<=result.height+1,label+' tutorial fits');
 for(const r of result.rectangles.filter(r=>r!==t)){const area=Math.max(0,Math.min(t.x+t.width,r.x+r.width)-Math.max(t.x,r.x))*Math.max(0,Math.min(t.y+t.height,r.y+r.height)-Math.max(t.y,r.y));assert.equal(area,0,label+' tutorial does not overlap '+r.id);}
 receipts.push({label,...result});console.log('PASS layout',label);await page.screenshot({path:`${out}/${label}.png`});
}
try{
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),page=await enter(desktop);
 await bounds(page,'desktop-move');await page.locator('#game').focus();await page.keyboard.down('w');try{await page.waitForFunction(()=>document.querySelector('#tutorial').dataset.step==='aim',null,{timeout:5000});}finally{await page.keyboard.up('w');}
 await page.keyboard.press('h');await page.waitForFunction(()=>document.querySelector('#tutorial').dataset.step==='charge');await bounds(page,'desktop-charge');
 await page.keyboard.down('Space');await page.waitForTimeout(560);await page.keyboard.up('Space');await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.keyboard.down('Space');
 await page.locator('#result-label').filter({hasText:'TUTORIAL COMPLETE'}).waitFor({timeout:70000});await page.keyboard.up('Space');
 assert.ok(await page.locator('#next-challenge').isVisible());assert.match(await page.locator('#next-challenge').innerText(),/Play Level 1/);assert.ok((await page.evaluate(()=>kyotoState.lastResult?.score||kyotoState.scorePresentation.score?.total))>0);
 await page.screenshot({path:`${out}/result.png`});await page.keyboard.press('Space');await page.waitForFunction(()=>kyotoState.challenge?.order===0);assert.equal(await page.locator('#tutorial').isVisible(),false);
 await page.reload();await page.locator('#loading-name button').waitFor({state:'visible',timeout:120000});await page.locator('#loading-name button').click();await page.locator('#loading').waitFor({state:'hidden',timeout:180000});assert.equal(await page.evaluate(()=>kyotoState.challenge.order),0,'Returning player keeps Level 1');await desktop.close();
 for(const [label,width,height,touch]of [['laptop',1280,720,false],['phone',390,844,true],['small-phone',320,568,true],['landscape',844,390,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),p=await enter(context);await bounds(p,label);
  if(touch){assert.match(await p.locator('#tutorial-copy').innerText(),/MOVE/);await p.locator('#tutorial-action').click();await p.waitForFunction(()=>document.querySelector('#tutorial').dataset.step==='aim');await p.locator('#tutorial-action').click();await p.waitForFunction(()=>document.querySelector('#tutorial').dataset.step==='charge');await bounds(p,label+'-charge');}
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/receipt.json`,JSON.stringify({receipts,errors},null,2));console.log('PASS real browser tutorial movement, aim, throw, score, next-level Space, saved selection and responsive layouts');
}catch(error){await current?.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.log('STATE',await current?.evaluate(()=>({phase:window.kyotoState?.phase,feet:window.kyotoState?.feet,tip:document.querySelector('#tutorial').outerHTML,body:document.body.className})).catch(()=>null));throw error;}finally{await browser.close();}
