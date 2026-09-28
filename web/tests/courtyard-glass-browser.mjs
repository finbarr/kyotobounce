// Actual v2 rendering, with inspection hooks injected only into this local test page.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Use an isolated local preview');
const service=process.argv.includes('--service');
const output=service?'.local/v2/niwa-service-browser':'.local/v2/courtyard-glass';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/game.js',async route=>{
  const source=await readFile('web/public/game.js','utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`
window.__courtInspection={
 read(){const materials=new Map();scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&/Registered courtyard \\| niwa-/.test(m.name))materials.set(m.name,{name:m.name,env:m.envMap?.name,roughness:m.roughness,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,singlePass:m.forceSinglePass,family:m.userData.stationFamily,plaster:m.userData.niwaServicePlaster});});return {materials:[...materials.values()],reflection:stationLook.stats.reflection,textures:renderer.info.memory.textures,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,audio:sound.state};},
 closeView(){setFly(true,false);fly.camera.position.set(117,32.5,-4);fly.camera.lookAt(124,32.3,-2);},
 serviceView(){setFly(true,false);fly.camera.position.set(125.9,33.2,-5.5);fly.camera.lookAt(128.5,33.15,-8.1);},
 interiorView(){setFly(true,false);fly.camera.position.set(128.97,33.35,-5.65);fly.camera.lookAt(128.58,33.0,-8.9);},
 exit(){setFly(false);}
};`});
 });
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Courtyard check',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 const start=await page.evaluate(()=>__courtInspection.read());
 const glass=start.materials.find(m=>m.name==='Registered courtyard | niwa-glass | Browser');assert(glass);
 for(const material of ['glass','aluminium','dark-metal'])assert.equal(start.materials.find(m=>m.name===`Registered courtyard | niwa-${material} | Browser`).env,'K026 east-court PMREM');
 assert(glass.transparent&&!glass.depthWrite&&glass.singlePass);assert.equal(glass.family,'guard');assert.equal(glass.opacity,1,'Shader coverage preserves the reflected light');
 assert.equal(start.reflection.captures,5,'Reuse the existing five captures');
 await page.screenshot({path:output+'/courtyard.png'});
 await page.evaluate(()=>__courtInspection.closeView());await page.waitForTimeout(1000);
 await page.screenshot({path:output+'/cafe-glass.png'});
 if(service){
  assert(start.materials.some(m=>m.name==='Registered courtyard | niwa-service-plaster | Browser'&&m.plaster?.coveY===34.165));
  assert.equal(start.materials.find(m=>m.name==='Registered courtyard | niwa-service-steel | Browser')?.env,'K026 east-court PMREM');
  await page.evaluate(()=>__courtInspection.serviceView());await page.waitForTimeout(1000);
  await page.screenshot({path:output+'/service-counter.png'});
  await page.evaluate(()=>__courtInspection.interiorView());await page.waitForTimeout(1000);
  await page.screenshot({path:output+'/counter-workspace.png'});
 }
 const frames=await page.evaluate(async()=>{const samples=[];let previous=await new Promise(requestAnimationFrame),started=previous;while(previous-started<10000){const now=await new Promise(requestAnimationFrame);samples.push(now-previous);previous=now;}return samples;});
 await page.evaluate(()=>__courtInspection.exit());await page.waitForTimeout(200);
 const end=await page.evaluate(()=>__courtInspection.read());
 assert.equal(end.reflection.captures,start.reflection.captures,'Camera movement adds no captures');assert.equal(end.textures,start.textures,'No textures allocated while exploring');assert.deepEqual(errors,[]);
 frames.sort((a,b)=>a-b);const timing={samples:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)};
 assert(timing.p95<35,'Courtyard stays responsive at 1280 × 800');
 await writeFile(output+'/receipt.json',JSON.stringify({origin,browser:browser.version(),glass,start,end,timing,errors},null,2)+'\n');
 console.log('PASS actual courtyard shaders, local reflections, '+(service?'service-counter materials and cove, ':'')+'five fixed captures, stable textures and Chrome frame timing',timing);
}finally{await browser.close();}
