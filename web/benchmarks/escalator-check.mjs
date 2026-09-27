// Visible native riding and camera-turn check; run outside performance samples.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {browserVariant,serveVariant} from './source-variant.mjs';
const out='.local/optimization/escalator-check';await mkdir(out,{recursive:true});
const variant=await browserVariant(),hook=await readFile('web/benchmarks/fixture-hook.js','utf8');
const proxy=await serveVariant(process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4391',variant,game=>game.replace(/  updateShotDetails(?:\?\.)?\(/,'  window.__rideTime=timeline.time;\n$&')+hook);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,args:['--enable-webgl','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),result={date:new Date().toISOString(),errors:[],samples:[],approach:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function controlState(){return page.evaluate(()=>({feet:window.kyotoState?.feet,yaw:window.kyotoState?.yaw,pitch:window.kyotoState?.pitch,phase:window.kyotoState?.phase,locked:!!document.pointerLockElement,focused:document.hasFocus(),hidden:document.hidden,active:document.activeElement?.id,levels:window.__bench?.ui.levelsOpen,briefing:window.kyotoState?.briefing,events:window.__rideEvents,ignoredMouseMoves:window.__rideIgnoredMouseMoves}));}
async function axis(axis,target){
 await page.keyboard.down('ShiftLeft');const began=Date.now();
 while(Date.now()-began<20000){const state=await controlState();result.approach.push({axis,target,...state});assert.equal(state.yaw,90,'Keyboard traversal keeps its chosen heading');const p=state.feet,delta=target-p[axis];if(Math.abs(delta)<.1)break;const key=axis==='x'?(delta>0?'w':'s'):(delta>0?'a':'d');await page.keyboard.down(key);await page.waitForTimeout(Math.min(700,Math.max(30,Math.abs(delta)/4.2*1000)));await page.keyboard.up(key);await page.waitForTimeout(100);}
 await page.keyboard.up('ShiftLeft');const p=await page.evaluate(()=>kyotoState.feet);assert.ok(Math.abs(p[axis]-target)<.3,`Reached ${axis}=${target}: ${JSON.stringify(await controlState())}`);
}
async function sample(name){
 const data=await page.evaluate(()=>{
  const mesh=__bench.scene.getObjectByName('east-concourse-lower-escalator-1').children[0],camera=__bench.camera();
  const frustum=new __rideThree.Frustum().setFromProjectionMatrix(new __rideThree.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const visible=frustum.intersectsBox(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  __rideReference.update(window.__rideTime);const expected=__rideReference.scene.getObjectByName('east-concourse-lower-escalator-1').children[0];
  let maxMatrixError=0;if(visible)for(let i=0;i<mesh.count*16;i++)maxMatrixError=Math.max(maxMatrixError,Math.abs(mesh.instanceMatrix.array[i]-expected.instanceMatrix.array[i]));
  return {feet:kyotoState.feet,camera:kyotoState.camera,clearance:kyotoState.cameraClearance,visible,maxMatrixError,count:mesh.count,expectedCount:expected.count,lanes:__bench.motion().stats,time:window.__rideTime};
 });result.samples.push({name,...data});console.log('SAMPLE',name,JSON.stringify(data));if(data.visible){assert.equal(data.maxMatrixError,0);assert.equal(data.count,data.expectedCount);}await page.screenshot({path:`${out}/${name}.png`});return data;
}
try{
 // Keep physical mouse movement out of this keyboard route. Native walking and
 // arrow-key camera turns still use the normal game input handlers.
 await page.addInitScript(()=>{window.__rideEvents=[];window.__rideIgnoredMouseMoves=0;document.addEventListener('mousemove',event=>{window.__rideIgnoredMouseMoves++;event.stopImmediatePropagation();},true);for(const name of ['blur','focus','visibilitychange','pointerlockchange','pointerlockerror'])(name.startsWith('pointer')||name==='visibilitychange'?document:window).addEventListener(name,()=>{__rideEvents.push({name,time:performance.now(),hidden:document.hidden,focused:document.hasFocus(),locked:!!document.pointerLockElement});});});
 await page.goto(proxy.origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__bench?.connected(),null,{timeout:30000});await page.locator('#loading-setup input[name=player]').fill('Local riding check');await page.locator('#loading-setup button[type=submit]').click();await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:180000});
 await page.evaluate(()=>{__bench.briefing.dismiss();__bench.ui.closeLevels();});await page.waitForTimeout(3000);await page.bringToFront();await page.mouse.click(700,450);await page.waitForFunction(()=>kyotoState.pointerLocked);
 await page.evaluate(async()=>{
  window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:{yaw:90,pitch:15,top:0,kick:0,powerRange:'precision',holdMs:500}}));
  window.__rideThree=await import('three');const {createEscalators}=await import('/escalators.js'),specs=await(await fetch('/assets/station.json')).json(),detail=await(await fetch('/assets/atrium-detail.json')).json(),scene=new __rideThree.Scene();window.__rideReference={scene,update:createEscalators(scene,specs.escalators,detail.combSupports)};
 });
 await axis('z',6.5);await axis('x',17.8);await sample('approach');
 await axis('x',20.2);const boarded=await sample('boarded');
 await page.waitForTimeout(4000);const riding=await sample('riding');assert.ok(riding.feet.y-boarded.feet.y>.2,'The native escalator carries the standing player upward');assert.ok(riding.visible,'The ridden lane is visible');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(2500);await page.keyboard.up('ArrowRight');await sample('turned-away');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(2500);await page.keyboard.up('ArrowLeft');const returned=await sample('turned-back');assert.ok(returned.visible,'Lane is visible after returning the camera');
 assert.ok(returned.feet.y>riding.feet.y,'Standing ride continues through camera turns');
 const resourcesBefore=await page.evaluate(()=>__bench.diagnostics().resources);result.courseChanges=[];const courseResources=[];
 for(const [chapter,id]of [['1','atrium-first-bank'],['0','kyoto-tutorial'],['1','atrium-first-bank'],['0','kyoto-tutorial']]){
  await page.keyboard.press('l');await page.locator('#campaign-chapter').selectOption(chapter);await page.locator(`[data-challenge="${id}"]`).click();
  await page.waitForFunction(id=>kyotoState.challenge?.id===id,id);if(id!=='kyoto-tutorial')await page.locator('#briefing-play').click();await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
  assert.equal(await page.locator('#hud-course').textContent(),await page.evaluate(()=>kyotoState.challenge.name));result.courseChanges.push(id);console.log('COURSE',id);courseResources.push(await page.evaluate(()=>__bench.diagnostics().resources));
 }
 result.resources={before:resourcesBefore,afterFirstCycle:courseResources[1],afterSecondCycle:courseResources[3]};assert.deepEqual(result.resources.afterSecondCycle,result.resources.afterFirstCycle,'Repeated warmed course cycles return to the same renderer resource count');
 const {measureEscalatorCost}=await import('./escalator-cost.mjs');result.updateCost=await measureEscalatorCost(page);
 assert.deepEqual(result.errors,[]);result.status='pass';console.log(JSON.stringify(result));
}catch(error){result.status='fail';result.error=String(error);result.failureState=await controlState().catch(()=>null);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2));await browser.close();await proxy.close();}
