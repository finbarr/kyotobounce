import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425',out='.local/v2/west-circulation-browser-check';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/game.js',async route=>{const source=await readFile('web/public/game.js','utf8');await route.fulfill({contentType:'text/javascript',body:source+`
window.__westInspection={
 view(position,target){setFly(true,false);fly.camera.position.set(...position);fly.camera.lookAt(...target);},
 read(){const lanes=[],oldHardware=[];scene.traverse(o=>{if(/^west-v2-(lower|upper)-escalator-[12]$/.test(o.name)){const t=o.children.find(c=>c.name==='exposed treads');lanes.push({name:o.name,instances:t.count,matrices:Array.from(t.instanceMatrix.array)});}if(/^west-concourse-(lower|upper)-escalator-/.test(o.name))oldHardware.push(o.name);});return {lanes,oldHardware,textures:renderer.info.memory.textures,captures:stationLook.stats.reflection.captures,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
};`});});
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Western route check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 await page.evaluate(()=>__westInspection.view([-5,13,-27],[-29,6,-18]));await page.waitForTimeout(1000);await page.screenshot({path:out+'/connected-route.png'});
 const first=await page.evaluate(()=>__westInspection.read());assert.equal(first.lanes.length,4);assert.deepEqual(first.oldHardware,[]);
 await page.waitForTimeout(650);const moved=await page.evaluate(()=>__westInspection.read());for(const lane of first.lanes)assert(moved.lanes.find(l=>l.name===lane.name).matrices.some((v,i)=>Math.abs(v-lane.matrices[i])>.001),'Visible treads move: '+lane.name);
 await page.evaluate(()=>__westInspection.view([-7.3,1.75,-18.85],[-24,6,-18.7]));await page.waitForTimeout(700);await page.screenshot({path:out+'/lower-entry.png'});
 await page.evaluate(()=>__westInspection.view([-43,18,-10],[-49,15.8,-17]));await page.waitForTimeout(700);await page.screenshot({path:out+'/upper-landing.png'});
 const frames=await page.evaluate(async()=>{const rows=[];let previous=await new Promise(requestAnimationFrame),start=previous;while(previous-start<10000){const now=await new Promise(requestAnimationFrame);rows.push(now-previous);previous=now;}return rows;});frames.sort((a,b)=>a-b);const timing={samples:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)};
 const last=await page.evaluate(()=>__westInspection.read());assert.equal(first.textures,last.textures);assert.equal(first.captures,last.captures);assert.equal(first.captures,5);assert(timing.p95<35);assert.deepEqual(errors,[]);
 const compact=r=>({...r,lanes:r.lanes.map(({matrices,...lane})=>lane)});await writeFile(out+'/receipt.json',JSON.stringify({origin,browser:browser.version(),first:compact(first),last:compact(last),timing,errors},null,2)+'\n');console.log('PASS western moving lanes, retired hardware, fixed resources and Chrome timing',timing);
}finally{await browser.close();}
