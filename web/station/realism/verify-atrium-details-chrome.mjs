import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),report={origin,errors:[],views:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`\nwindow.__atriumCheck={view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},read(){return{ready:loaded,layout:loadedLayout,render:window.kyotoState.render};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Atrium fixture check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 const meta=await page.evaluate(async()=>await(await fetch('/assets/station.json')).json());
 assert(!meta.concourseDetails.labels.some(p=>/^add-central-gate-departure-|^concourse-hall-clock$/.test(p.id)));
 assert(meta.concourseDetails.labels.some(p=>p.id==='atrium-gate-clock-face'));
 const views=[['gate-wide',[0,3,9],[0,5,-16]],['gate-upper',[0,7,-1],[0,6,-18]],['gate-oblique',[14,4,0],[0,5,-17]],['gate-support',[-.8,5.6,-10],[-1.2,5.5,-14]],['clock',[1.42,5.6,-10],[1.42,5.5,-13.3]],['west-fascia',[-28,3,-2],[-33.1,3.3,-2]],['west-south-joint',[-31,4,-9],[-34,3.6,-6.5]],['west-north-joint',[-31,4,9],[-34,3.6,6.6]],['basement-glass',[0,3,4],[4,-1,0]]];
 for(const [id,p,t]of views){await page.evaluate(([p,t])=>__atriumCheck.view(p,t),[p,t]);await page.waitForTimeout(900);const state=await page.evaluate(()=>__atriumCheck.read());assert(state.ready);await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,...state});}
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS Chrome atrium joints, mounted clock, gate fixtures, basement glass and no runtime errors');
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
