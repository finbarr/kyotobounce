import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),report={origin,errors:[],views:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
 window.__boundaryCheck={night(enabled){stationLook.setNight(enabled);return scene.background.equals(scene.fog.color);},view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},focus(){focusDesignTarget({center:{x:1000,y:500,z:1000},radius:20});},read(){return {inside:boundary.contains(camera.position),position:camera.position.toArray(),ready:loaded,layout:loadedLayout,startupMs,render:window.kyotoState.render};}};
 `}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Station boundary check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 const views=[['forecourt',[0,5,75],[30,55,175]],['tower-side',[0,70,155],[35,70,177]],['garden',[-157,56,-19],[25,55,177]],['beyond-forecourt',[10,65,211.5],[10,45,330]],['atrium',[0,2,18],[0,20,-10]]];
 for(const [id,p,t]of views){await page.evaluate(([p,t])=>__boundaryCheck.view(p,t),[p,t]);await page.waitForTimeout(1100);const state=await page.evaluate(()=>__boundaryCheck.read());assert(state.inside,id+' view inside boundary');await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,...state});}
 await page.evaluate(()=>__boundaryCheck.view([30,80,210],[30,80,330]));await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.keyboard.up('Shift');
 const stopped=await page.evaluate(()=>__boundaryCheck.read());assert(stopped.inside);assert(Math.abs(stopped.position[2]+212)<1e-5,'Boost cannot cross the north limit');report.boost=stopped;
 await page.evaluate(()=>__boundaryCheck.focus());await page.waitForTimeout(150);report.focus=await page.evaluate(()=>__boundaryCheck.read());assert(report.focus.inside,'Focus jump stays bounded');
 for(const p of [[900,900,900],[-900,-900,-900]]){await page.evaluate(p=>__boundaryCheck.view(p,[0,10,0]),p);await page.waitForTimeout(100);assert((await page.evaluate(()=>__boundaryCheck.read())).inside);}
 // Day/evening switching must retain fog that matches the clear background.
 assert(await page.evaluate(()=>__boundaryCheck.night(true)));await page.waitForTimeout(150);assert(await page.evaluate(()=>__boundaryCheck.night(false)));await page.waitForTimeout(150);
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS Chrome fog shaders, tower/forecourt/garden/atrium views, boosted boundary, focus and altitude limits');
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
