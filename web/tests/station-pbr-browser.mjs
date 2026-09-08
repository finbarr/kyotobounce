// Isolated full-game K026 capture. No production URL, persisted runtime hooks or camera teleport.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import WebSocket from 'ws';
const origin='http://127.0.0.1:4282',mode=process.argv[2]||'candidate';
const root='artifacts/station-detail/photorealism',out=`${root}/${mode}`;await mkdir(out,{recursive:true});
const views=JSON.parse(await readFile('.local/station-detail/inspection-views.json','utf8')).views.slice(0,6);
let setup;
try{setup=JSON.parse(await readFile('.local/station-detail/courses.json','utf8'));}catch{
 const c=new Client(origin.replace('http','ws'));await c.join();setup={token:c.token,courses:[]};
 try{for(const [name,x,y,z,yaw,pitch] of views){
  const start=await c.place({x,y,z},.25,'start');const goal=await c.place({x:1,y:0,z:-10},1,'goal');
  await delay(1100);const {challenge}=await c.request('save-challenge',{name:`K026 ${name}`,start,goal},'saved-challenge');
  setup.courses.push({name,id:challenge.id,start,yaw,pitch});console.log('course',name,start.center);
 }}finally{c.close();}await writeFile('.local/station-detail/courses.json',JSON.stringify(setup,null,2));
}
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,...(mode==='candidate'?{recordVideo:{dir:out,size:{width:1280,height:800}}}:{})});const page=await context.newPage();page.setDefaultTimeout(240000);
const errors=[],samples=process.env.K026_RESUME==='1'?JSON.parse(await readFile(`${out}/receipt.json`,'utf8')).samples:[],transport={inputReceived:0,inputSent:0,closes:[]},transportClosers=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await context.addInitScript(token=>localStorage.setItem('kyoto-guest',token),setup.token);
// Transparent test transport: Node answers protocol pings even when SwiftShader
// stalls Chrome's renderer for tens of seconds. All game messages are forwarded
// to/from the real isolated service; no state or score is fabricated. Redundant
// input intents are coalesced to the normal 30Hz budget to avoid queued bursts.
await page.routeWebSocket('ws://127.0.0.1:4282/',route=>{
 let upstream=null,latestInput=null;const pending=[];
 const inputClock=setInterval(()=>{if(latestInput&&upstream?.readyState===WebSocket.OPEN){upstream.send(latestInput);latestInput=null;transport.inputSent++;}},34);
 function connect(){
  // Open upstream only once Chrome has sent hello, so software startup stalls
  // cannot consume the service's five-second authentication deadline.
  upstream=new WebSocket('ws://127.0.0.1:4282',{origin});
  upstream.on('open',()=>pending.splice(0).forEach(message=>upstream.send(message)));
  upstream.on('message',message=>route.send(message.toString()));
  upstream.on('close',(code,reason)=>{clearInterval(inputClock);transport.closes.push({code,reason:reason.toString()});console.log('transport closed',code,reason.toString());route.close({code:1000,reason:reason.toString()}).catch(()=>{});});
  upstream.on('error',error=>errors.push(error.message));
 }
 route.onMessage(message=>{if(!upstream){pending.push(message);connect();}else if(JSON.parse(message.toString()).type==='input'){latestInput=message;transport.inputReceived++;}else if(upstream.readyState===WebSocket.OPEN)upstream.send(message);else pending.push(message);});
 route.onClose(()=>{clearInterval(inputClock);upstream?.close();});
 transportClosers.push(()=>{clearInterval(inputClock);upstream?.terminate();});
});
await page.route('**/game.js',async route=>{
 let source=await readFile('web/public/game.js','utf8');
 // Fixed native drawing resolution for all measured views. Test-only read access.
 source=source.replace(/renderer.setPixelRatio\(Math.max\([^;]+;/g,'void 0; /* K026 fixed-resolution capture */');
 source+='\nwindow.__pbr={get renderer(){return renderer},get scene(){return scene},get station(){return station},get look(){return stationLook},select(c){send("select-challenge",{challengeId:c.id,revision:1});},skipIntro(){briefing.start(false);briefing.update(camera,2);},zoom(d){distance=d;},aim(y,p){yaw=y;pitch=p;azimuth=-y*Math.PI/180;elevation=-p*Math.PI/180;manualCamera=false;}};';
 await route.fulfill({contentType:'text/javascript',body:source});
});
if(mode==='baseline')await page.route('**/station-look.js',r=>r.fulfill({contentType:'text/javascript',path:'.local/station-detail/baseline-station-look.js'}));
try{
 await page.goto(origin);await page.waitForFunction(()=>window.kyotoState?.ready);console.log(mode,'ready');
 if(process.env.K026_RESUME==='1'&&samples.length===6){await page.evaluate(c=>{window.__pbr.skipIntro();window.__pbr.aim(c.yaw,c.pitch);},setup.courses[5]);await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');await page.screenshot({path:`${out}/shop-gallery-moving.png`});}
 for(const course of [...setup.courses,...setup.courses.slice(0,1)].slice(samples.length)){
  console.log(mode,'select',course.name);
  await page.evaluate(c=>window.__pbr.select(c),course);
  await page.waitForFunction(id=>{if(document.querySelector('#connection').textContent==='Disconnected')throw Error('Inspection transport disconnected');return window.kyotoState?.challenge?.id===id&&window.kyotoState.briefing;},course.id);
  // Fast-forward only the menu's intro animation, which otherwise consumes
  // minutes on SwiftShader. Native start selection and full game rendering stay real.
  await page.evaluate(c=>{window.__pbr.skipIntro();window.__pbr.aim(c.yaw,c.pitch);},course);
  await page.waitForTimeout(1800);
  const stats=await page.evaluate(async()=>{
   const p=window.__pbr,r=p.renderer,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const textures=new Map(),materials=new Map();p.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){materials.set(m.uuid,{name:m.name,family:m.userData.stationFamily,zone:m.userData.stationZone,metalness:m.metalness,roughness:m.roughness,opacity:m.opacity,map:m.map?.uuid,normal:m.normalMap?.uuid});for(const v of Object.values(m))if(v?.isTexture)textures.set(v.uuid,{name:v.name,width:v.image?.width||v.image?.[0]?.width,height:v.image?.height||v.image?.[0]?.height,type:v.type,colorSpace:v.colorSpace,mipmaps:v.generateMipmaps});}});
   const timings=[];for(let i=0;i<6;i++)await new Promise(resolve=>requestAnimationFrame(t=>{timings.push(t);resolve();}));
   return {state:window.kyotoState,look:p.look.stats,memory:r.info.memory,programs:r.info.programs.length,drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',textures:[...textures.values()],materials:[...materials.values()],frameIntervals:timings.slice(1).map((t,i)=>t-timings[i]),resources:performance.getEntriesByType('resource').filter(r=>r.name.startsWith(location.origin)).map(r=>({url:new URL(r.name).pathname,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize}))};
  });
  const label=samples.length===6?'hall-return':course.name;
  assert(Math.hypot(stats.state.feet.x-course.start.center.x,stats.state.feet.y-course.start.center.y,stats.state.feet.z-course.start.center.z)<.1,`native feet match ${label}`);
  samples.push({label,...stats});await writeFile(`${out}/receipt.json`,JSON.stringify({mode,resolution:[1280,800],errors,transport,samples},null,2));await page.screenshot({path:`${out}/${label}.png`});console.log(mode,label,stats.state.render.calls,stats.state.render.triangles,stats.memory,stats.drawingBuffer);
  if(mode==='candidate'&&['hall','garden','shop-gallery'].includes(label)){
   await page.mouse.click(640,400); // normal cursor capture hides the stage menu
   await page.evaluate(c=>{window.__pbr.zoom(.8);window.__pbr.aim(c.yaw,-24);},course);
   await page.screenshot({path:`${out}/${label}-near.png`});
   await page.evaluate(c=>{window.__pbr.zoom(3.8);window.__pbr.aim(c.yaw,c.pitch);document.exitPointerLock();},course);
  }
  // Continuous native motion and camera orbit. Keep representative moving frames.
  if(samples.length<=6){await page.locator('canvas').focus();await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('d');await page.keyboard.up('ArrowRight');await page.screenshot({path:`${out}/${label}-moving.png`});}
 }
 assert.deepEqual(errors,[]);
 for(const sample of samples)assert.deepEqual(sample.drawingBuffer,[1280,800]);
 if(mode==='candidate'){assert(samples.every(s=>s.look.reflection.captures===3));assert(samples.every(s=>s.memory.textures===samples[0].memory.textures),'texture count stable after transitions');
 const baseline=JSON.parse(await readFile(`${root}/baseline/receipt.json`,'utf8'));assert(samples.every(s=>s.memory.geometries<=baseline.samples[0].memory.geometries),'lazy geometry uploads stay within unchanged baseline geometry budget');}

}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error('Capture failure',String(e));await writeFile(`${out}/capture-error.json`,JSON.stringify({error:String(e),completed:samples.map(s=>s.label),transport},null,2));throw e;}
finally{await writeFile(`${out}/receipt.json`,JSON.stringify({mode,resolution:[1280,800],errors,transport,samples},null,2));transportClosers.forEach(close=>close());await context.close();await browser.close();}
