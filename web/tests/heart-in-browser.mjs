// Local full-game inspection with camera/input hooks and heartbeat transport.
// Scene, materials, lights and authoritative service behavior are unchanged.
import {chromium} from 'playwright';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const [stage='before',assets]=process.argv.slice(2),out=`.local/station-detail/evidence/${stage}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:640},recordVideo:{dir:out,size:{width:960,height:640}}});
const page=await context.newPage(),errors=[],upstreams=[];
// Node transport answers heartbeats while SwiftShader compiles the full scene.
// Native messages and inputs are forwarded unchanged.
await page.routeWebSocket('ws://127.0.0.1:4281',route=>{const upstream=new WebSocket('ws://127.0.0.1:4281');upstreams.push(upstream);const pending=[];route.onMessage(data=>{if(upstream.readyState===WebSocket.OPEN){upstream.send(data);if(stage==='gameplay'&&JSON.parse(data).type==='charge')setTimeout(()=>upstream.send(JSON.stringify({type:'release'})),430);}else pending.push(data);});upstream.on('open',()=>pending.splice(0).forEach(data=>upstream.send(data)));upstream.on('message',data=>route.send(data.toString()));upstream.on('close',(code,reason)=>route.close({code,reason:String(reason)}).catch(()=>{}));upstream.on('error',e=>errors.push(String(e)));route.onClose(()=>upstream.close());});
const session=JSON.parse(await readFile(`.local/station-detail/${stage==='gameplay'?'gameplay-session':'browser-session'}.json`));await page.addInitScript(token=>localStorage.setItem('kyoto-guest',token),session.token);
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/game.js',async route=>{let body=await readFile('web/public/game.js','utf8');body=body.replaceAll('stationLook.updateLights(camera.position,now/1000);',`if(window.heartView){camera.position.fromArray(window.heartView.eye);camera.lookAt(new THREE.Vector3(...window.heartView.target));} stationLook.updateLights(camera.position,now/1000);`);body+='\nwindow.heartThrow=()=>{yaw=90;pitch=-45;setPowerRange(\"precision\");sendInput();send(\"charge\",{challengeId:ui.state.selected.id,revision:ui.state.selected.revision,layout:snapshot.layout,physics:snapshot.physics,powerRange: \"precision\"});};window.heartRelease=()=>send(\"release\");window.heartExplore=()=>send(\"select-challenge\",{challengeId:null});window.heartInput=(v)=>{yaw=v.yaw;pitch=v.pitch;keys.clear();if(v.z)keys.add(\"KeyW\");sendInput();};';body=body.replaceAll('renderer.render(scene,camera);',`if(window.heartView){camera.position.fromArray(window.heartView.eye);camera.lookAt(new THREE.Vector3(...window.heartView.target));} renderer.render(scene,camera);`);await route.fulfill({body,contentType:'text/javascript'});});
if(assets)await page.route(/\/assets\/(atrium.glb|station.json|atrium-detail.glb|atrium-detail.json)$/,async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);await route.fulfill({path:`${assets}/${name}`});});
try{
 await page.goto('http://127.0.0.1:4281');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:300000});
 if(await page.evaluate(()=>window.kyotoState.briefing))await page.keyboard.press('Space');await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition,null,{timeout:60000});if(stage!=='gameplay')await page.evaluate(()=>window.heartExplore());await page.waitForTimeout(600);if(!await page.evaluate(()=>window.kyotoState.pointerLocked))await page.mouse.click(470,420);await page.keyboard.press('r');await page.waitForTimeout(600);
 const views=[['approach',[-55.4,9.05,12],[-53.5,8.9,18]],['facade',[-56.25,9,17],[-53,8.9,18]],['entrance',[-55.2,9,18],[-50,8.7,18]],['interior',[-53.65,9,18],[-50,8.65,18]]];
 if(stage==='gameplay'){views[1]=['facade',[-56.4,9.5,15.3],[-52,8.8,18]];views[2]=['entrance',[-54.6,9.3,16.7],[-51,8.5,18]];}else views[0]=['approach',[-56.3,9.4,10],[-53,9,18]];
 const evidence=[];
 for(const [name,eye,target]of views){await page.evaluate(v=>window.heartView=v,{eye,target});await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${name}.png`,timeout:60000});evidence.push({name,state:await page.evaluate(()=>window.kyotoState),art:await page.evaluate(()=>window.kyotoArt)});}
 for(let i=0;i<24;i++){const t=i/23;await page.evaluate(t=>window.heartView={eye:[-55.3+1.8*t,9,14+4*t],target:[-50.5,8.8,18]},t);await page.waitForTimeout(85);}
 let shot=null;if(stage==='gameplay'){await page.evaluate(()=>{window.heartView={eye:[-56.1,9.2,16.6],target:[-51.5,7.8,18]};window.heartThrow();});await page.waitForFunction(()=>window.kyotoState.phase==='Result',null,{timeout:60000});shot=await page.evaluate(()=>window.kyotoState);await page.screenshot({path:`${out}/shot-rest.png`,timeout:60000});assert(shot.result?.score>0);assert(shot.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(shot.velocity)),0);assert.equal(Math.hypot(...Object.values(shot.spin)),0);}
 assert((await page.evaluate(()=>window.kyotoState)).ready,'Browser remained connected');
 await writeFile(`${out}/browser.json`,JSON.stringify({stage,renderer:'Linux SwiftShader software; not hardware performance',camera:'inspection override within normal full game; unchanged native messages over Node heartbeat transport during software rendering',shot,errors,evidence},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{for(const upstream of upstreams)upstream.terminate();await context.close();await browser.close();}
