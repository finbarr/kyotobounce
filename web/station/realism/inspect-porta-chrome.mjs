import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,out]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const B1=-4.913582801818848,B2=B1-3.8;
// Native coordinates, converted only at the camera boundary.
const views=[
 ['first-west-bank',[-12,1.7,4],[-2,-4,4]],
 ['first-east-bank',[15.5,1.7,4.8],[4,-4,4.08]],
 ['b1-west-turnback',[-11.4,B1+1.7,2.5],[-3,B2+1,4.3]],
 ['b1-east-turnback',[14,B1+1.7,7],[5,B2+1,5.3]],
 ['b2-west-arrival',[1.2,B2+1.7,4.8],[-7,B1,4.6]],
 ['b2-east-arrival',[1.2,B2+1.7,4.8],[9,B1,4.8]],
 ['b2-main-aisle',[12,B2+1.7,3],[100,B2+1.5,3]],
 ['b2-north-aisle',[15,B2+1.7,18],[110,B2+1.5,18]],
 ['b2-cross-passage',[1.2,B2+1.7,18],[1.2,B2+1.5,3]],
 ['subway-stair-approach',[135,B2+1.7,-32],[147,-5,-32]],
 ['subway-stairs-down',[146,-4.5,-32],[133,B2+1.3,-32]],
 ['ramp-entry',[84,B2+1.7,-38],[90,B2+1.5,-41]],
 ['ramp-up',[90,B2+1.85,-41],[136,-4.7,-41]],
 ['ramp-down',[137,-4.5,-41],[100,B2+2,-41]],
 ['subway-connection',[153,-4.5,-37],[137,-4.6,-37]]
];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),errors=[],report={origin,views:[],errors};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',async route=>{const source=await readFile('web/public/game.js','utf8');await route.fulfill({contentType:'text/javascript',body:source+`
window.__portaInspection={view(p,t){setFly(true,false);fly.camera.position.set(p[0],p[1],-p[2]);fly.camera.lookAt(t[0],t[1],-t[2]);},read(){const lanes=[];scene.traverse(o=>{if(/^porta-connection-.*-escalator-[12]$/.test(o.name)){const t=o.children.find(c=>c.name==='exposed treads');lanes.push({name:o.name,count:t.count,matrices:Array.from(t.instanceMatrix.array)});}});return{lanes,textures:renderer.info.memory.textures,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,captures:stationLook.stats.reflection.captures};}};`});});
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Porta route inspection',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 const first=await page.evaluate(()=>__portaInspection.read());assert.equal(first.lanes.length,4);
 for(const [id,p,t]of views){
  await page.evaluate(([p,t])=>__portaInspection.view(p,t),[p,t]);await page.waitForTimeout(900);
  const state=await page.evaluate(()=>({camera:kyotoState.camera,render:kyotoState.render,resources:__portaInspection.read()}));
  assert(state.camera.position.every((v,i)=>Math.abs(v-[p[0],p[1],-p[2]][i])<.001),id+' camera position');
  await page.screenshot({path:out+'/'+id+'.png'});report.views.push({id,camera:state.camera,render:state.render,resources:{...state.resources,lanes:state.resources.lanes.map(({matrices,...l})=>l)}});console.log(id);
 }
 const last=await page.evaluate(()=>__portaInspection.read());for(const lane of first.lanes)assert(last.lanes.find(l=>l.name===lane.name).matrices.some((v,i)=>Math.abs(v-lane.matrices[i])>.001),'Treads must move');
 assert.equal(first.textures,last.textures);assert.equal(first.captures,last.captures);assert.deepEqual(errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/views.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
