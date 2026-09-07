import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
const out='artifacts/phase3/browser-avatar';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}}),page=await context.newPage();const errors=[],states=[];
page.on('pageerror',e=>{errors.push(e.stack);page.close().catch(()=>{});});
const record=async name=>{states.push({name,state:await page.evaluate(()=>window.kyotoState)});await page.screenshot({path:`${out}/${name}.png`});};
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await page.waitForTimeout(800);
 await page.mouse.move(900,450);await page.mouse.down({button:'right'});await page.mouse.move(640,420,{steps:12});await page.mouse.up({button:'right'});await page.mouse.wheel(0,-400);await page.waitForTimeout(500);await record('01-neutral-grip');
 await page.locator('#top').focus();await page.keyboard.press('End');await page.locator('canvas').focus();await page.waitForTimeout(500);await record('02-top-grip');
 await page.keyboard.down('Space');await page.waitForTimeout(600);await record('03-half-windup');await page.waitForTimeout(650);await record('04-full-windup');
 await page.keyboard.up('Space');await page.waitForTimeout(85);await record('05-release');await page.waitForTimeout(180);await record('06-follow-through');
 await page.keyboard.press('r');await page.waitForTimeout(300);
 await page.locator('#top').focus();await page.keyboard.press('Home');await page.locator('canvas').focus();await page.waitForTimeout(500);await record('07-back-grip');
 await writeFile(`${out}/result.json`,JSON.stringify({status:errors.length?'fail':'captured',scope:'Visual review and native release-pose sampling; images require inspection',headless:true,input:'DOM controls',states,errors},null,2));console.log('Captured neutral/top/back grip, windup, release and follow-through');
}finally{await context.close();await browser.close();}
