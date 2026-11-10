import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const proof=JSON.parse(await readFile('.local/browser-physics/walking-proof.json'));
assert.equal(proof.physics,BROWSER_PHYSICS,'Use the current traversal proof');
const template=JSON.parse(await readFile('web/starter-challenges.json'))[0],out='.local/browser-physics/walking';await mkdir(out,{recursive:true});
const extend=(a,b,d)=>{const n=Math.hypot(a.x-b.x,a.z-b.z);return {x:a.x+(a.x-b.x)/n*d,y:a.y,z:a.z+(a.z-b.z)/n*d};};
// Fixture course starts exercise real station geometry through the real UI and
// worker. Only the fetched catalog is substituted; there is no test movement or
// teleport API, and no modified collision geometry in the game.
const ids=['east-1f-2f walking surface','daikaidan-flight-14 walking surface','hall-basement-east-escalator-1'];
const routes=ids.map((id,i)=>{
 const r=proof.routes.find(r=>r.id===id);assert.ok(r,id);
 const start=extend(r.points[0],r.points[1],.45),end=extend(r.points.at(-1),r.points.at(-2),.5),dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz);
 return {id:`walk-${i}`,name:id,start,end,length,ux:dx/length,uz:dz/length};
});
const courses=routes.map((r,i)=>({...template,id:r.id,name:r.name,physics:BROWSER_PHYSICS,layout:proof.layout,start:{...template.start,center:r.start},goal:null,waypoints:[],order:i,hint:{...template.hint,yaw:Math.atan2(r.ux,r.uz)*180/Math.PI,pitch:12},campaign:{...template.campaign,brief:'Station traversal acceptance fixture.'}}));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--mute-audio']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});await backgroundInput(context);
await context.route('**/campaign.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(courses)}));
const page=await context.newPage(),errors=[],requests=[],results=[];page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Unexpected WebSocket'));page.on('request',r=>requests.push(r.url()));
async function dismiss(){
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);await page.locator('#campaign-chapter').waitFor({state:'hidden'});
}
async function walk(r,reverse){
 const start=reverse?r.end:r.start,ux=r.ux*(reverse?-1:1),uz=r.uz*(reverse?-1:1),key=reverse?'KeyS':'KeyW';
 await page.locator('#game').focus();await page.keyboard.down('ShiftLeft');await page.keyboard.down(key);
 try{await page.waitForFunction(({start,ux,uz,length})=>{const p=kyotoState.feet;return (p.x-start.x)*ux+(p.z-start.z)*uz>length-.08;},{start,ux,uz,length:r.length},{timeout:20000});}
 finally{await page.keyboard.up(key);await page.keyboard.up('ShiftLeft');}
 await page.waitForTimeout(300);const state=await page.evaluate(()=>kyotoState),end=reverse?r.start:r.end;
 assert.ok(Math.abs(state.feet.y-end.y)<.18,`${r.name}: reached the landing elevation`);
 const cross=(state.feet.x-start.x)*uz-(state.feet.z-start.z)*ux;assert.ok(Math.abs(cross)<.15,`${r.name}: stayed in its stair/escalator lane`);
 assert.equal(state.phase,'Aim');assert.equal(state.pointerLocked,false);assert.equal(state.robotVisible,true);
 results.push({id:r.id,name:r.name,reverse,feet:state.feet,physics:state.challenge.physics});
}
try{
 await page.goto(origin+'/level/'+courses[0].id);
 await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});
 await page.locator('#loading-name input[name=player]').fill('Traversal acceptance');await page.locator('#loading-name button[type=submit]').click();
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready,null,{timeout:120000});await dismiss();
 await context.setOffline(true);const offlineStart=requests.length;
 for(const [i,r] of routes.entries()){
  if(i){await page.locator('#game').focus();await page.keyboard.press('l');await page.locator(`#course-list button[data-challenge="${r.id}"]`).click();await page.waitForFunction(id=>kyotoState.challenge?.id===id,r.id);await dismiss();}
  await walk(r,false);await page.screenshot({path:`${out}/${r.id}-top.png`});await walk(r,true);
 }
 assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[],'Walking remains offline');
 assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({layout:proof.layout,physics:BROWSER_PHYSICS,results,errors},null,2)+'\n');
 console.log('PASS headless offline keyboard traversal: east atrium stairs, top Grand Stair and basement escalator, up and down, visible robot and no pointer capture');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await writeFile(out+'/failure.json',JSON.stringify({error:String(error),state:await page.evaluate(()=>window.kyotoState),results,errors},null,2));throw error;}
finally{await browser.close();}
