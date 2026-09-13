import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import WebSocket from 'ws';
import {Client,delay} from './api-client.mjs';
const stage=process.env.K027_STAGE||'before',out=`artifacts/station-detail/east-square/${stage}`;
await mkdir(out,{recursive:true});
const c=new Client('ws://127.0.0.1:4283');await c.join();
const views=[{name:'wide',x:106,y:34.62,z:-14,yaw:-25},{name:'tree-close',x:105.6,y:34.62,z:-10.7,yaw:-30},{name:'globe-close',x:101.2,y:34.62,z:-7,yaw:0}];
const courses=[];
for(const v of views){await delay(1050);const start=await c.place(v,.5,'start');courses.push((await c.request('save-challenge',{name:`K027 ${stage} ${v.name}`,start,goal:await c.place({x:106,y:34.62,z:-12},.6,'goal'),waypoints:[],scoring:'waypoint-v2'},'saved-challenge')).challenge);}
const token=c.token,layout=c.state.layout;c.close();
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']});
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:960,height:640},recordVideo:{dir:out,size:{width:960,height:640}}});
await context.addInitScript(token=>localStorage.setItem('kyoto-guest',token),token);
const disconnects=[];
// Forward real protocol frames through Node so native heartbeat replies are not
// blocked by Linux software shader compilation in Chromium's routed socket.
await context.routeWebSocket('**',route=>{
 let socket,closing=false;const queue=[];
 route.onMessage(data=>{
  if(!socket){socket=new WebSocket('ws://127.0.0.1:4283',{origin:'http://127.0.0.1:4283'});
   socket.on('open',()=>{for(const m of queue.splice(0))socket.send(m);});
   socket.on('message',data=>{if(!closing)route.send(data.toString());});
   socket.on('error',e=>console.log('Native bridge:',e.message));
   socket.on('close',(code,reason)=>{if(!closing){disconnects.push({code,reason:String(reason)});console.log('Native closed',code,String(reason));route.close({code:code===1006?1011:code,reason:String(reason)}).catch(()=>{});}});
  }
  if(socket.readyState===WebSocket.OPEN)socket.send(data);else queue.push(data);
 });
 route.onClose(()=>{closing=true;socket?.close();});
});
const page=await context.newPage(),errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.log('BROWSER_RENDERER_CRASH'));page.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text());});
page.setDefaultTimeout(180000);
await page.goto('http://127.0.0.1:4283');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:180000});
console.log('Full game ready');assert.equal(await page.evaluate(()=>window.kyotoArt.sourceLayout),layout);
await writeFile(`${out}/ui.txt`,await page.locator('body').innerText());
for(let i=0;i<views.length;i++){
 const v=views[i];await page.evaluate(()=>{document.exitPointerLock();document.body.classList.remove('is-playing');});await page.waitForFunction(()=>!window.kyotoState.pointerLocked);
 await page.getByRole('button',{name:courses[i].name,exact:true}).last().dispatchEvent('click');
 await page.waitForFunction(()=>window.kyotoState.briefing);
 await page.locator('#briefing-play').dispatchEvent('click');
 await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);
 // Use the game's existing suggested-aim event for reproducible camera setup.
 await page.evaluate(v=>window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:{yaw:v.yaw,pitch:8,top:0,kick:0,holdMs:260,powerRange:'precision'}})),v);
 await page.evaluate(()=>document.exitPointerLock());
 await page.waitForFunction(()=>!window.kyotoState.pointerLocked);
 await page.waitForFunction(v=>window.kyotoState.phase==='Aim'&&Math.abs(window.kyotoState.yaw-v.yaw)<.1&&window.kyotoState.camera.position[1]<38,v);
 await page.locator('canvas').dispatchEvent('wheel',{deltaY:-5000});
 await page.waitForFunction(()=>window.kyotoState.robotVisible===false);
 await page.waitForTimeout(2500);
 // Capture the existing play HUD while retaining keyboard control without pointer lock.
 await page.evaluate(()=>{document.body.classList.add('is-playing');document.querySelector('canvas').focus();});
 console.log('Capturing',v.name);await page.screenshot({path:`${out}/${v.name}.png`,timeout:180000});shots.push(await page.evaluate(()=>window.kyotoState));
 await writeFile(`${out}/progress.json`,JSON.stringify({stage,layout,shots,errors},null,2));
 // Real DOM walking frames make the recorded video a moving inspection.
 if(i===2){await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');await page.waitForTimeout(2500);shots.push(await page.evaluate(()=>window.kyotoState));}

}
assert.deepEqual(errors,[]);assert.equal(shots.length,4);assert.ok(shots.every(s=>s.phase==='Aim'&&s.ready));assert.deepEqual(disconnects,[]);
await writeFile(`${out}/result.json`,JSON.stringify({stage,layout,renderer:'Linux Chromium SwiftShader software',viewport:{width:960,height:640},cameraSetup:'Existing suggested-aim event; actual native private-course starts; existing play-HUD class during still capture; real DOM walking',shots,errors,disconnects},null,2));console.log('Captured',stage,errors);
await writeFile(`${out}/courses.json`,JSON.stringify(courses,null,2));
const video=page.video();await context.close();if(video)await rename(await video.path(),`${out}/inspection.webm`);await browser.close();
