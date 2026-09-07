import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/atrium-detail/verification';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const state=()=>page.evaluate(()=>window.kyotoState);
let mx=800,my=450;
async function capture(name){const s=await state();evidence.push({name,state:s});await page.screenshot({path:`${out}/${name}.png`});return s;}
async function lock(){mx=800;my=450;await page.mouse.click(mx,my);await page.waitForFunction(()=>window.kyotoState.pointerLocked);}
async function aim(yaw,pitch=12){const s=await state(),delta=((yaw-s.yaw+540)%360)-180;mx+=Math.round(delta/.18);my-=Math.round((pitch-s.pitch)/.14);await page.mouse.move(mx,my,{steps:4});await page.waitForTimeout(180);const a=await state();assert.ok(Math.abs(((a.yaw-yaw+540)%360)-180)<.3,'Requested mouse aim');}
async function move(key,ms,fast=false){if(fast)await page.keyboard.down('ShiftLeft');await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);if(fast)await page.keyboard.up('ShiftLeft');await page.waitForTimeout(120);}
async function axis(axis,target){const deadline=Date.now()+22000;while(Date.now()<deadline){const delta=target-(await state()).viewerFeet[axis];if(Math.abs(delta)<.065)break;const key=axis==='x'?(delta>0?'w':'s'):(delta>0?'a':'d');await move(key,Math.min(550,Math.max(25,Math.abs(delta)/4.2*1000)),true);}assert.ok(Math.abs((await state()).viewerFeet[axis]-target)<.17,`Reach ${axis}=${target}`);}
async function home(){await page.keyboard.press('Escape');await page.getByRole('button',{name:'↶ Entrance',exact:true}).click();await page.waitForFunction(()=>Math.abs(window.kyotoState.viewerFeet.z-20)<.1&&Math.abs(window.kyotoState.viewerFeet.x)<.1);await lock();}
try{
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
  await page.getByRole('button',{name:'Free exploration',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.challenge===null);
  const art=await page.evaluate(()=>window.kyotoArt);assert.equal(art.combPlates,40);assert.equal(art.warningPads,40);assert.equal(art.glassClamps,672);
  const rects=await page.evaluate(()=>['throw-panel','shot-details'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));assert.ok(rects[0].right<rects[1].x,'Shot details no longer overlaps throw controls');
  await capture('01-entrance');await lock();assert.equal(await page.locator('#competition').isVisible(),false,'Menus recede during play');
  const reticle=await page.locator('#reticle').boundingBox();assert.ok(Math.abs(reticle.x+reticle.width/2-800)<1,'Reticle stays centered');
  await aim(-135);await move('w',6500,true);await page.waitForFunction(()=>window.kyotoState.cameraClearance<1.1,null,{timeout:2000});const blocked=await capture('02-column-camera');
  assert.ok(blocked.cameraClearance<1.1,'Reproduce near-column camera obstruction');assert.equal(blocked.robotVisible,false,'Robot cannot fill the view when the camera is pushed inside it');
  await move('s',1800,true);const clear=await state();assert.equal(clear.robotVisible,true,'Robot returns once the camera clears the column');
  await home();await aim(180,10);await move('w',4700,true);await aim(90,24);await capture('03-east-atrium');await aim(-90,24);await capture('04-west-atrium');
  await home();await aim(90);await axis('x',17.8);await axis('z',4.65);await capture('05-escalator-approach');
  await axis('x',30);assert.ok(Math.abs((await state()).viewerFeet.y-5.5)<.1,'Climb the unchanged stairs');await capture('06-first-landing');
  await axis('z',1.571);await axis('x',33.6);await move('w',3000);const walked=await capture('07-upper-escalator');
  assert.ok(walked.viewerFeet.x>36.5&&walked.viewerFeet.y>6.5,'Walk through the previously stuck escalator corner');
  await page.waitForTimeout(3500);const ride=await state();assert.ok(ride.viewerFeet.x>walked.viewerFeet.x+1,'Idle escalator ride');await move('s',2200);assert.ok((await state()).viewerFeet.x<ride.viewerFeet.x-.5,'Walk against escalator travel');
  await page.keyboard.press('Escape');await page.locator('#competition').waitFor({state:'visible'});assert.equal(await page.locator('#competition').isVisible(),true,'Escape restores challenge controls');
  await capture('08-menu-restored');assert.deepEqual(errors,[]);
  const frames=evidence.flatMap(e=>e.state.render.frameMs).sort((a,b)=>a-b),median=frames[Math.floor(frames.length*.5)],p95=frames[Math.floor(frames.length*.95)];
  assert.ok(median<35,'Detail layer maintains an interactive frame rate');
  await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',art,medianFrameMs:median,p95FrameMs:p95,errors,evidence},null,2));
  console.log('PASS atrium visuals, clear aiming UI, obstructed camera, stairs, escalator riding and menu restoration',JSON.stringify({medianFrameMs:median,p95FrameMs:p95}));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),errors,evidence,state:await state().catch(()=>null)},null,2));throw error;}
finally{await browser.close();}
