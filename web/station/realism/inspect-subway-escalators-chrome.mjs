import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out,manifest,component]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const config=JSON.parse(await readFile(manifest));
const build=JSON.parse(await readFile(component+'/report.json'));
const views=build.geometry.banks.flatMap(b=>[
 [b.name+'-platform',[176.8,-9.5,b.end+b.direction*3],[175.8,-8,b.start]],
 [b.name+'-concourse',[177,-4.5,b.start-b.direction*2.1],[175.8,-9.3,b.end]],
 [b.name+'-ride',[174.85,-11.2+b.height*3/b.run+1.65,b.lowerCenter.z+b.uphill.z*3],[174.85,-4.5,b.start]]
]);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),errors=[],report={origin,layoutSha256:config.layoutSha256,geometrySha256:config.geometrySha256,views:[],errors};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',async route=>{const source=await readFile('web/public/game.js','utf8');await route.fulfill({contentType:'text/javascript',body:source+`
window.__subwayInspection={view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},read(){const lanes=[];scene.traverse(o=>{if(/^subway-escalators-(south|central-two|central-one|north)$/.test(o.name)){const t=o.children.find(c=>c.name==='exposed treads');lanes.push({name:o.name,count:t.count,matrices:Array.from(t.instanceMatrix.array)});}});return{lanes,textures:renderer.info.memory.textures,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,captures:stationLook.stats.reflection.captures};}};`});});
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Subway escalator inspection',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 // Upload first-use materials and finish reflection captures before measuring
 // resource stability across a second visit to these same views.
 for(const [,p,t]of views){await page.evaluate(([p,t])=>__subwayInspection.view(p,t),[p,t]);await page.waitForTimeout(250);}
 await page.waitForTimeout(1500);
 const first=await page.evaluate(()=>__subwayInspection.read());assert.equal(first.lanes.length,4);
 for(const [id,p,t]of views){
  await page.evaluate(([p,t])=>__subwayInspection.view(p,t),[p,t]);await page.waitForTimeout(900);
  const state=await page.evaluate(()=>({camera:kyotoState.camera,render:kyotoState.render,resources:__subwayInspection.read()}));
  assert(state.camera.position.every((v,i)=>Math.abs(v-[p[0],p[1],-p[2]][i])<.001),id+' camera position');
  await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,camera:state.camera,render:state.render,resources:{...state.resources,lanes:state.resources.lanes.map(({matrices,...l})=>l)}});console.log(id);
 }
 const last=await page.evaluate(()=>__subwayInspection.read());for(const lane of first.lanes)assert(last.lanes.find(l=>l.name===lane.name).matrices.some((v,i)=>Math.abs(v-lane.matrices[i])>.001),'Treads must move');
 assert.equal(first.textures,last.textures);assert.equal(first.captures,last.captures);assert.deepEqual(errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/views.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
