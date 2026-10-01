import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),report={origin,errors:[],views:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`\nwindow.__frontageCheck={view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},read(){return{ready:loaded,layout:loadedLayout,render:window.kyotoState.render,hasLiftState:!!snapshot&&'lifts'in snapshot};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Public frontage check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 assert.equal(await page.locator('#lift-control, #lift-floors').count(),0);
 const views=[['atrium-doors',[-33,1.7,-3],[-38,1.2,-3]],['basement-doors',[-33,-3.2,-3],[-38,-3.7,-3]],['east-square-doors',[174,33.3,10],[174,32.8,15]],['north-frontage',[-96,1.7,24],[-96,1.2,29]],['porta-paving',[25,3,42],[22,0,45]],['atrium-open-volume',[0,8,15],[0,3,-12]]];
 for(const [id,p,t]of views){await page.evaluate(([p,t])=>__frontageCheck.view(p,t),[p,t]);await page.waitForTimeout(900);const state=await page.evaluate(()=>__frontageCheck.read());assert(state.ready&&!state.hasLiftState);await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,...state});}
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS Chrome closed public frontages, restored paving, atrium views, no elevator controls/state or shader errors');
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
