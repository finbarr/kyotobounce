import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
const out='artifacts/phase3/async-play/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1152,height:800}}}),page=await context.newPage();
const errors=[],events=[],checks={};let peer;
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(['result','error','saved-challenge','placement'].includes(m.type))events.push(m);}));
const state=()=>page.evaluate(()=>window.kyotoState);
async function key(code,ms){await page.locator('canvas').focus();await page.keyboard.down(code);await delay(ms);await page.keyboard.up(code);await delay(150);}
async function worldPoint(point){return page.evaluate(async point=>{const THREE=await import('/vendor/three/build/three.module.js'),s=window.kyotoState;const c=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.035,450);c.position.fromArray(s.camera.position);c.up.fromArray(s.camera.up);c.lookAt(new THREE.Vector3().fromArray(s.camera.target));c.updateMatrixWorld();const p=new THREE.Vector3(point.x,point.y,-point.z).project(c);return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};},point);}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 assert.equal(await page.locator('#pass-turn').count(),0);
 await page.locator('#explore').click();await page.waitForFunction(()=>!window.kyotoState.challenge);await page.locator('canvas').focus();
 const start=await state();await page.keyboard.down('KeyW');await delay(300);const left=await state();await page.screenshot({path:`${out}/walk-a.png`});await delay(300);const right=await state();await page.screenshot({path:`${out}/walk-b.png`});await page.keyboard.up('KeyW');await delay(700);const stopped=await state();
 assert.ok(Math.hypot(stopped.feet.x-start.feet.x,stopped.feet.z-start.feet.z)>.65,'Robot moves through the station');
 assert.ok(left.robotWalk>.7&&right.robotWalk>.7);assert.ok(stopped.robotWalk<.02,'Gait stops when movement stops');
 const footSeparation=s=>s.robotFeet[0].map((v,i)=>v-s.robotFeet[1][i]);
 assert.ok(Math.hypot(...footSeparation(left).map((v,i)=>v-footSeparation(right)[i]))>.08,'Feet articulate instead of sliding rigidly together');
 checks.walking={start:start.feet,end:stopped.feet,leftFeet:left.robotFeet,rightFeet:right.robotFeet,stoppedBlend:stopped.robotWalk};
 await page.mouse.click(650,440);await page.waitForFunction(()=>document.pointerLockElement?.id==='game');await page.mouse.move(850,385,{steps:8});await delay(300);const mouse=await state();
 assert.ok(Math.abs(mouse.yaw-stopped.yaw)>20);assert.equal(mouse.camera.manual,false);
 await key('ArrowRight',350);await key('ArrowUp',250);const orbit=await state();assert.equal(orbit.yaw,mouse.yaw);assert.equal(orbit.pitch,mouse.pitch);assert.equal(orbit.camera.manual,true);assert.ok(Math.abs(orbit.camera.azimuth-mouse.camera.azimuth)>.3);assert.ok(orbit.camera.elevation>mouse.camera.elevation+.1);
 await key('ArrowLeft',200);await key('ArrowDown',150);const reverse=await state();assert.ok(reverse.camera.azimuth>orbit.camera.azimuth);assert.ok(reverse.camera.elevation<orbit.camera.elevation);
 await page.mouse.move(780,420,{steps:4});await delay(350);const centered=await state();assert.equal(centered.camera.manual,false);assert.ok(Math.abs(centered.camera.azimuth+centered.yaw*Math.PI/180)<.00001);
 const reticle=await page.locator('#reticle').boundingBox();assert.ok(Math.abs(reticle.x+reticle.width/2-720)<1&&Math.abs(reticle.y+reticle.height/2-500)<1,'Mouse centers the reticle');checks.camera={mouse,orbit,centered};
 await page.keyboard.press('Escape');await delay(1300);await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.challenge?.id==='atrium-first-bank');
 peer=new Client();await peer.join();await peer.request('select-challenge',{challengeId:'atrium-return-ticket'},'selected');await delay(150);
 assert.equal((await state()).avatarCount,1);assert.equal((await state()).challenge.id,'atrium-first-bank');assert.equal((await state()).busy,false);
 await page.locator('#use-hint').click();await page.mouse.click(680,430);await page.waitForFunction(()=>document.pointerLockElement?.id==='game');await delay(200);await page.keyboard.down('Space');await delay(365);await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState.phase==='Flight');
 const peerShot=peer.throw(298,{top:-200});
 await key('ArrowRight',300);const flightOrbit=await state();assert.equal(flightOrbit.camera.manual,true);await page.mouse.move(720,430);await delay(150);assert.equal((await state()).camera.manual,false);
 await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:40000});const own=events.find(m=>m.type==='result');assert.equal(own.success,true);assert.equal(own.score,1100);assert.equal((await peerShot).result.success,true);assert.equal((await state()).avatarCount,1);checks.independentShots={score:own.score,peerScore:1100};
 // Existing level designer: place, name, save, reopen, and revise through its UI.
 await page.keyboard.press('Escape');await delay(1300);await page.locator('#new-challenge').click();await page.waitForFunction(()=>window.kyotoState.mode==='editor');await page.locator('#challenge-name').fill('Browser Solo Bank');
 await page.locator('canvas').focus();await key('ArrowUp',650);await delay(200);
 await page.locator('#place-start').click();const startPoint=await worldPoint({x:2,y:0,z:20});assert.ok(startPoint.x>320&&startPoint.x<1100&&startPoint.y>120&&startPoint.y<930,JSON.stringify(startPoint));await page.mouse.click(startPoint.x,startPoint.y);await page.getByText('Start circle is on a valid floor.',{exact:true}).waitFor();
 await page.locator('#place-goal').click();const goalPoint=await worldPoint({x:6,y:0,z:20});await page.mouse.click(goalPoint.x,goalPoint.y);await page.getByText('Goal circle is on a valid floor.',{exact:true}).waitFor();
 await page.screenshot({path:`${out}/existing-designer.png`});await page.locator('#save-challenge').click();await page.waitForFunction(()=>window.kyotoState.challenge?.name==='Browser Solo Bank');const original=(await state()).challenge;
 assert.equal(original.creator,(await state()).identityId);await page.locator('#edit-challenge').click();await page.locator('#challenge-name').fill('Browser Solo Bank II');await page.locator('#save-challenge').click();await page.waitForFunction(()=>window.kyotoState.challenge?.name==='Browser Solo Bank II');assert.equal((await state()).challenge.revision,2);
 await page.reload();await page.waitForFunction(()=>window.kyotoState?.ready&&window.kyotoState.challenge?.name==='Browser Solo Bank II',null,{timeout:120000});checks.designer={id:original.id,revision:2};
 await page.screenshot({path:`${out}/ready.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Actual browser mouse/keyboard walking, camera, isolated shots, retained designer and per-guest selection persistence',checks,errors},null,2));console.log('PASS walking animation, mouse/arrow camera, private shots and existing designer');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),events,checks,state:await state().catch(()=>null),errors},null,2));throw error;}
finally{peer?.close();await context.close();await browser.close();}
