import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out,viewFile]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
// Native coordinates, converted at the camera boundary.
const views=viewFile?JSON.parse(await readFile(viewFile)):[
 ['platform-0-descent',[125,1.7,-35.2],[136,-3,-35.0]],
 ['platform-2-3-descent',[125,1.7,-49.95],[138,-4,-49.7]],
 ['platform-4-5-arrival',[143,-4.5,-75.68],[132,-2,-75.82]],
 ['platform-6-7-descent',[126,1.7,-92.23],[139,-4,-92]],
 ['platform-8-9-descent',[125,1.7,-108.75],[139,-4,-108.5]],
 ['platform-10-descent',[125,1.7,-121.75],[139,-4,-121.5]],
 ['underpass-north',[143.5,-4.5,-116],[143.5,-4.7,-35]],
 ['underpass-south',[143.5,-4.5,-43],[143.5,-4.7,-126]],
 ['jr-east-gate-public',[152,-4.5,-36.45],[143,-4.7,-36.45]],
 ['jr-east-gate-paid',[142,-4.5,-36.45],[151,-4.7,-36.45]],
 ['transfer-bottom',[136,-4.5,-132.5],[136,-1,-143]],
 ['transfer-middle',[136,.4,-145.1],[136,4.8,-157]],
 ['transfer-gate',[136.3,5.3,-160],[136.3,3.7,-153]],
 ['transfer-upper-bypass',[131.5,5.3,-165],[131.5,5.1,-140]],
 ['porta-stairs',[135,-7.0,-18],[148,-4.5,-18]],
 ['porta-ramp',[91,-6.8,-27],[137,-4.7,-27]],
 ['public-junction',[152,-4.5,-27],[145,-4.7,-27]]
];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),errors=[],report={origin,views:[],errors};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',async route=>{const source=await readFile('web/public/game.js','utf8');await route.fulfill({contentType:'text/javascript',body:source+`
window.__eastInspection={view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},read(){return{textures:renderer.info.memory.textures,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,captures:stationLook.stats.reflection.captures};}};`});});
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('East transfer inspection',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 // Upload each view's first-use textures before checking resource stability.
 for(const [,p,t]of views){await page.evaluate(([p,t])=>__eastInspection.view(p,t),[p,t]);await page.waitForTimeout(200);}
 await page.waitForTimeout(1200);
 const first=await page.evaluate(()=>__eastInspection.read());
 for(const [id,p,t]of views){
  await page.evaluate(([p,t])=>__eastInspection.view(p,t),[p,t]);await page.waitForTimeout(900);
  const state=await page.evaluate(()=>({camera:kyotoState.camera,render:kyotoState.render,resources:__eastInspection.read()}));
  assert(state.camera.position.every((v,i)=>Math.abs(v-[p[0],p[1],-p[2]][i])<.001),id+' camera position');
  await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,camera:state.camera,render:state.render,resources:state.resources});console.log(id);
 }
 const last=await page.evaluate(()=>__eastInspection.read());
 assert.equal(first.textures,last.textures);assert.equal(first.captures,last.captures);assert.deepEqual(errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/views.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
