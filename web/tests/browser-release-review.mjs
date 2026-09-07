import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-release-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1280,height:888}}}),page=await context.newPage(),errors=[],captures=[];
page.on('pageerror',e=>errors.push(e.message));
const record=async name=>{captures.push({name,state:await page.evaluate(()=>window.kyotoState)});await page.screenshot({path:`${out}/${name}.png`});};
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank');await page.locator('#use-hint').click();await page.locator('#explore').click();await page.waitForFunction(()=>!window.kyotoState?.challenge);
 for(const [name,key]of [['top-right','End'],['back-left','Home']]){
  await page.mouse.move(950,430);await page.mouse.down({button:'right'});await page.mouse.move(660,410,{steps:12});await page.mouse.up({button:'right'});await page.mouse.wheel(0,-360);await page.waitForTimeout(300);
  for(const control of ['top','kick']){await page.locator(`#${control}`).focus();await page.keyboard.press(key);}await page.locator('canvas').focus();await page.waitForTimeout(250);await record(`${name}-grip`);
  await page.keyboard.down('Space');await page.waitForTimeout(800);await record(`${name}-windup`);
  const frames=page.evaluate(()=>new Promise(resolve=>{const samples=[];function sample(){samples.push(structuredClone(window.kyotoState));if(samples.length===30)resolve(samples);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
  await page.keyboard.up('Space');const sampled=await frames;captures.push({name:`${name}-release-frames`,samples:sampled});assert.ok(sampled.some(s=>s.phase==='Release'));assert.ok(sampled.some(s=>s.phase==='Flight'));assert.ok(sampled.filter(s=>s.phase==='Release').every(s=>s.renderBall.every(Number.isFinite)));
  await record(`${name}-follow-through`);await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');
 }
 await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(250);await page.locator('#nickname').focus();await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({status:'captured',scope:'Combined-spin grip/windup/release visual review and input-focus cancellation; images and animation samples need review',headless:true,captures,errors,inputFocusCancel:true,backgroundTabExperiment:'Headless tab switching did not provide usable focus-loss evidence; excluded from this capture check. Window blur/visibility call the same cancel handler.'},null,2));console.log('Captured combined spin grips, release frames, follow-through; input-focus cancellation passed');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),captures,errors},null,2));throw error;}finally{await context.close();await browser.close();}
