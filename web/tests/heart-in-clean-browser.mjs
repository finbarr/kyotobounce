// Full-game visual acceptance: unchanged scene/settings and normal native WebSocket.
// Only the inspection camera and explicitly labeled HUD visibility are modified.
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.local/station-detail/evidence/clean';await mkdir(out,{recursive:true});
const health=await fetch('http://127.0.0.1:4281/api/health').then(r=>r.json());assert(health.worker,'Start the matched candidate service and wait for native readiness');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',env:{...process.env,VK_ICD_FILENAMES:'/usr/share/vulkan/icd.d/lvp_icd.json'},args:['--no-sandbox','--use-angle=vulkan','--enable-features=Vulkan','--use-vulkan=native','--disable-vulkan-surface','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:960,height:640},recordVideo:{dir:out,size:{width:960,height:640}}});
const page=await context.newPage(),errors=[],closed=[],evidence=[];let lastState=null,lastStateAt=0;
const {token}=JSON.parse(await readFile('.local/station-detail/gameplay-session.json'));
await page.addInitScript(token=>localStorage.setItem('kyoto-guest',token),token);
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('websocket',socket=>{socket.on('close',()=>closed.push(Date.now()));socket.on('framereceived',({payload})=>{try{const m=JSON.parse(String(payload));if(m.type==='state'){lastState=m;lastStateAt=Date.now();}}catch{}});});
await page.route('**/game.js',async route=>{
 let body=await readFile('web/public/game.js','utf8');
 const move=`if(window.heartCleanView){camera.position.fromArray(window.heartCleanView.eye);camera.lookAt(new THREE.Vector3(...window.heartCleanView.target));}`;
 body=body.replace('stationLook.updateLights(camera.position,now/1000);',move+'stationLook.updateLights(camera.position,now/1000);');
 body=body.replaceAll('renderer.render(scene,camera);',move+`renderer.render(scene,camera);window.heartCleanFrames=(window.heartCleanFrames||0)+1;const badge=document.getElementById('heart-clean-status');if(badge)badge.textContent='FULL-GAME INSPECTION · aiming HUD hidden · '+(workerReady?'LIVE NATIVE':'DISCONNECTED')+' · '+(1000/(window.kyotoState?.frameDt*1000||1000)).toFixed(1)+' FPS (software)';`);
 body+='\nwindow.heartCleanRenderer=()=>{const gl=renderer.getContext(),ext=gl.getExtension("WEBGL_debug_renderer_info");return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);};';
 await route.fulfill({body,contentType:'text/javascript'});
});
try{
 await page.goto('http://127.0.0.1:4281');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:240000});console.log('Ready',await page.evaluate(()=>window.heartCleanRenderer()));
 if(await page.evaluate(()=>window.kyotoState.briefing))await page.keyboard.press('Space');
 await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition,null,{timeout:60000});
 if(!await page.evaluate(()=>window.kyotoState.pointerLocked))await page.mouse.click(470,420);
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState.phase==='Aim'&&window.kyotoState.pointerLocked);
 // Keep game header, connection indicator, notice/errors and native FPS intact.
 // Hide only view-obscuring aiming controls; this is disclosed in every image.
 await page.addStyleTag({content:'#throw-panel,#power-control,#arcade-hud,#reticle{display:none!important}#heart-clean-status{position:fixed;right:20px;bottom:43px;padding:8px 12px;background:#10232deb;color:#e5f5ee;font:11px monospace;z-index:30}'});
 await page.evaluate(()=>{const badge=document.createElement('div');badge.id='heart-clean-status';document.body.append(badge);});
 const views=[['approach',[-55.4,9.05,12],[-53.5,8.9,18]],['facade',[-56.4,9.5,15.3],[-52,8.8,18]],['entrance',[-54.6,9.3,16.7],[-51,8.5,18]],['interior',[-53.65,9,18],[-50,8.65,18]]];
 for(const [name,eye,target]of views){
  const initial=await page.evaluate(v=>{window.heartCleanView=v;return window.heartCleanFrames;},{eye,target});
  await page.waitForFunction(n=>window.heartCleanFrames>n+8,initial,{timeout:90000});
  const state=await page.evaluate(()=>window.kyotoState);
  assert(state.ready&&state.pointerLocked&&state.phase==='Aim');assert.equal(closed.length,0,'Normal native transport disconnected');assert(Date.now()-lastStateAt<2000,'Native state stale');
  assert.equal(await page.locator('#competition').isVisible(),false);assert.equal(await page.locator('#result-card').isVisible(),false);assert(!/Connection lost|Reload to rejoin/.test(await page.locator('#notice').textContent()));
  await page.waitForFunction(()=>window.kyotoState.render.frameMs.slice(-8).every(ms=>ms<1000),null,{timeout:60000}).catch(()=>{});
  const settled=await page.evaluate(()=>window.kyotoState),frame=settled.render.frameMs.slice(-8),motionReady=frame.every(ms=>ms<1000);
  assert(settled.ready&&Date.now()-lastStateAt<2000&&closed.length===0,'Native transport must remain live during warm-up');
  assert.equal((await page.evaluate(()=>window.kyotoArt.sourceLayout)),lastState.layout,'Browser/native layout mismatch');
  await page.screenshot({path:`${out}/${name}.png`,timeout:60000});evidence.push({name,eye,target,state:settled,motionReady,settledFrameMs:frame,latestNativeLayout:lastState.layout,nativeAgeMs:Date.now()-lastStateAt});console.log('Captured',name,frame);
 }
 for(let i=0;i<30;i++){await page.evaluate(t=>window.heartCleanView={eye:[-55.7+2*t,9.3,14+4*t],target:[-50.5,8.8,18]},i/29);await page.waitForTimeout(100);}
 assert.deepEqual(errors,[]);assert.equal(closed.length,0);assert(evidence.every(v=>v.motionReady),'Software renderer remains below 1 FPS in at least one view; visual acceptance blocked');
 await writeFile(`${out}/browser.json`,JSON.stringify({status:'pass',renderer:await page.evaluate(()=>window.heartCleanRenderer()),transport:'Normal browser WebSocket; no proxy, heartbeat changes or protocol changes',scene:'Full game with original geometry, lighting and renderer settings; camera override only',hud:'Aiming controls hidden explicitly for inspection; native connection/error/FPS indicators retained',viewport:[960,640],errors,closed,evidence},null,2));
}catch(error){await writeFile(`${out}/blocker.json`,JSON.stringify({status:'blocked',renderer:await page.evaluate(()=>window.heartCleanRenderer?.()).catch(()=>null),transport:'Normal browser WebSocket; no proxy or heartbeat changes',viewport:[960,640],error:String(error),errors,closed,nativeAgeMs:Date.now()-lastStateAt,evidence},null,2));await page.screenshot({path:`${out}/wip-failure.png`,timeout:60000}).catch(()=>{});throw error;}
finally{await context.close();await browser.close();}
