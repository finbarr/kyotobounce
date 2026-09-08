import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR||'.local/fleet/verified-power';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox',...(process.env.CHROME_ANGLE==='gl'?['--use-angle=gl','--enable-webgl','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
const context=await browser.newContext({deviceScaleFactor:Number(process.env.BROWSER_SCALE||1),viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(120000);const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function capture(name,width,height){
 await page.setViewportSize({width,height});await page.waitForTimeout(300);
 const geometry=await page.evaluate(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {panel:rect('#power-control'),footer:rect('footer'),spin:rect('#throw-panel'),details:rect('#shot-details'),menu:rect('#competition'),font:getComputedStyle(document.querySelector('#power-number')).fontSize,overflow:document.querySelector('#power-control').scrollWidth>document.querySelector('#power-control').clientWidth};});
 const p=geometry.panel;assert(p.width<=360&&p.height<=165);assert(p.x>=0&&p.right<=width);assert(p.y>height*.55&&p.bottom<=geometry.footer.y);assert.equal(geometry.overflow,false);assert(parseFloat(geometry.font)>=23);
 if(width<800){assert(geometry.spin.bottom<=p.y,'Spin panel clears launch controls');assert(geometry.menu.bottom<=p.y,'Scrollable stage menu clears launch controls');}
 await page.screenshot({scale:'css',path:`${out}/${name}.png`});checks.push({name,...geometry});
}
try{
 await page.goto(process.env.KYOTO_TEST_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:300000});
 await capture('desktop',1440,900);
 await page.locator('#power-precision').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.power-track').getAttribute('aria-valuemax')==='12');
 await page.locator('canvas').focus();await page.keyboard.press('p');await page.waitForFunction(()=>document.querySelector('.power-track').getAttribute('aria-valuemax')==='100');
 await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('.power-track').getAttribute('aria-valuenow'))>1);assert(await page.locator('#power-full').isDisabled());assert.match(await page.locator('#power-number').innerText(),/m\/s/);await page.screenshot({scale:'css',path:`${out}/charging.png`});await page.keyboard.press('Escape');await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');
 await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.briefing);await page.locator('#briefing-play').click();await page.waitForFunction(()=>window.kyotoState?.pointerLocked&&!window.kyotoState?.briefingTransition);await page.locator('canvas').focus();await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.kyotoState?.pointerLocked);await page.locator('#use-hint').click();await page.waitForFunction(()=>!document.querySelector('#hint-power-marker').hidden);
 await capture('desktop-hint',1440,900);await capture('mobile-hint',390,844);
 await page.locator('canvas').focus();await page.keyboard.down('Space');await page.waitForFunction(()=>window.kyotoState?.pointerLocked&&window.kyotoState?.charging);await capture('mobile-playing',390,844);await page.keyboard.press('Escape');await page.keyboard.up('Space');
 assert.deepEqual(errors,[]);console.log('PASS compact bounds, hints, keyboard range selection, m/s meter, charge locking and mobile play');
}finally{await writeFile(`${out}/geometry.json`,JSON.stringify({checks,errors},null,2));await context.close();await browser.close();}
