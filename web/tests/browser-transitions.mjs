import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {staticPreview} from '../static-preview.mjs';
import {launchTestBrowser,testBrowserName} from './browser-engine.mjs';
import {backgroundInput} from './background-input.mjs';
import {silentOutput,activateButton} from './browser-game-input.mjs';
import {isTutorial} from '../public/tutorial.js';
const output=process.env.KYOTO_TEST_OUTPUT||'.local/browser-transition-test';await mkdir(output,{recursive:true});
await writeFile(output+'/receipt.json',JSON.stringify({passed:false})+'\n');
const catalog=JSON.parse(await readFile('web/starter-challenges.json'));
const server=await staticPreview('.local/browser-release');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page,profiler,passed=false;const errors=[],requests=[];
try{
 browser=await launchTestBrowser({render:true});const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
 await backgroundInput(context);await silentOutput(context);
 await context.addInitScript(()=>{
  const bench=window.transitionBench={operation:'loading',active:false,frames:[],tasks:[],longFrames:[],gl:[],programLinks:[],canvasResizes:[],audioGaps:[],visibility:[],operations:[],resources:{},resourceMax:{},audio:[]};
  for(const name of ['width','height']){
   const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name);
   Object.defineProperty(HTMLCanvasElement.prototype,name,{...descriptor,set(value){const at=performance.now();descriptor.set.call(this,value);if(bench.active&&this.id==='game')bench.canvasResizes.push({at,ms:performance.now()-at,name,value,operation:bench.operation});}});
  }
  const NativeAudioContext=window.AudioContext;let audioContext;
  window.AudioContext=class extends NativeAudioContext{constructor(...args){super(...args);audioContext=this;this.addEventListener('statechange',()=>bench.audio.push({at:performance.now(),state:this.state,operation:bench.operation}));}};
  const interval=window.setInterval;
  window.setInterval=function(callback,ms,...args){
   if(callback.name!=='schedule'||ms!==25)return interval(callback,ms,...args);
   let last,lastAudio;
   return interval(function(...values){
    const at=performance.now(),audio=audioContext?.currentTime;
    if(bench.active&&last!==undefined&&at-last>40)bench.audioGaps.push({at,wallMs:at-last,audioMs:(audio-lastAudio)*1000,operation:bench.operation,state:audioContext?.state,hidden:document.hidden});
    last=at;lastAudio=audio;return callback(...values);
   },ms,...args);
  };
  for(const type of ['longtask','long-animation-frame'])if(PerformanceObserver.supportedEntryTypes.includes(type))new PerformanceObserver(list=>{
   if(!bench.active)return;
   for(const e of list.getEntries()){const value=e.toJSON();value.operation=bench.operation;(type==='longtask'?bench.tasks:bench.longFrames).push(value);}
  }).observe({type,buffered:false});
  const shaderNames=new WeakMap(),programNames=new WeakMap();
  for(const name of ['shaderSource','attachShader']){
   const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){if(name==='shaderSource')shaderNames.set(args[0],args[1].match(/#define SHADER_NAME (.*)/)?.[1]||args[1].match(/#define SHADER_TYPE (.*)/)?.[1]);else programNames.set(args[0],shaderNames.get(args[1]));return original.apply(this,args);};
  }
  for(const name of ['compileShader','linkProgram','getProgramParameter','getShaderParameter','getProgramInfoLog','getShaderInfoLog','texImage2D','texSubImage2D','bufferData']){
   const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-at,shader=programNames.get(args[0])||shaderNames.get(args[0]);if(bench.active&&name==='linkProgram')bench.programLinks.push({at,shader,operation:bench.operation});if(bench.active&&ms>5)bench.gl.push({name,at,ms,shader,operation:bench.operation});}};
  }
  for(const kind of ['Texture','Buffer','Program','Shader','Framebuffer','Renderbuffer']){
   const live=new WeakSet();bench.resources[kind]=0;bench.resourceMax[kind]=0;
   for(const action of ['create','delete']){
    const name=action+kind,original=WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name]=function(...args){const result=original.apply(this,args);if(action==='create'&&result){live.add(result);bench.resources[kind]++;bench.resourceMax[kind]=Math.max(bench.resourceMax[kind],bench.resources[kind]);}else if(action==='delete'&&args[0]&&live.delete(args[0]))bench.resources[kind]--;return result;};
   }
  }
  document.addEventListener('visibilitychange',()=>bench.visibility.push({at:performance.now(),hidden:document.hidden,operation:bench.operation}));
  let last;
  function frame(at){if(bench.active&&last!==undefined)bench.frames.push({at,ms:at-last,operation:bench.operation});last=at;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  bench.begin=operation=>{bench.active=true;bench.operation=operation;bench.operations.push({operation,start:performance.now(),audioStart:window.kyotoState?.audio,resourcesStart:{...bench.resources},heapStart:performance.memory?.usedJSHeapSize});};
  bench.end=()=>Object.assign(bench.operations.at(-1),{end:performance.now(),audioEnd:window.kyotoState?.audio,resourcesEnd:{...bench.resources},heapEnd:performance.memory?.usedJSHeapSize});
 });
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));page.on('websocket',()=>errors.push('Unexpected gameplay WebSocket'));
 await page.goto('http://127.0.0.1:'+server.address().port+'/level/atrium-welcome');
 await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});
 await page.locator('#loading-name input[name=player]').fill('Transition acceptance');await page.locator('#loading-name button[type=submit]').click();
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready);
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 if(process.env.KYOTO_TRANSITION_PROFILE==='1'){
  assert.equal(testBrowserName,'chrome','CPU profiling uses Chrome DevTools');
  profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.setSamplingInterval',{interval:1000});await profiler.send('Profiler.start');
 }
 await context.setOffline(true);const offlineStart=requests.length;
 const begin=name=>page.evaluate(name=>transitionBench.begin(name),name),end=()=>page.evaluate(()=>transitionBench.end());
 async function resize(width,height){
  await begin(`resize:${width}x${height}`);await page.setViewportSize({width,height});
  await page.waitForFunction(mobile=>document.body.classList.contains('mobile-ui')===mobile,width<=900);await page.waitForTimeout(500);await end();
  const size=await page.evaluate(()=>({width:document.getElementById('game').width,height:document.getElementById('game').height,ratio:kyotoState.render.pixelRatio}));
  assert.equal(size.width,Math.floor(width*size.ratio));assert.equal(size.height,Math.floor(height*size.ratio));
 }
 for(const width of [1280,390]){
  await resize(width,width===390?664:800);
  for(const [index,c] of catalog.entries()){
   await begin(`choose:${width}:${c.id}`);
   await page.locator('#game').focus();await page.keyboard.press('l');await page.locator('#campaign-chapter').selectOption(String(c.campaign.chapter));await page.locator(`#course-list button[data-challenge="${c.id}"]`).click();
   await page.waitForFunction(c=>kyotoState.ready&&kyotoState.challenge?.id===c.id&&Math.hypot(kyotoState.feet.x-c.start.center.x,kyotoState.feet.z-c.start.center.z)<.01,c);
   if(!isTutorial(c)){await page.locator('#briefing-play').waitFor({state:'visible'});await page.waitForTimeout(300);await end();await begin(`return:${width}:${c.id}`);await activateButton(page.locator('#briefing-play'));}
   await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);await page.locator('#campaign-chapter').waitFor({state:'hidden'});await page.waitForTimeout(100);await end();
   assert.equal(await page.evaluate(()=>kyotoState.pointerLocked),false);
   if((index+1)%10===0)console.log(`Transition checks: ${width}px ${index+1}/30`);
  }
 }
 for(let round=0;round<3;round++)for(const [width,height] of [[844,390],[390,844],[1280,800]])await resize(width,height);
 assert.equal(await page.evaluate(()=>{const before=transitionBench.canvasResizes.length;window.dispatchEvent(new Event('resize'));return transitionBench.canvasResizes.length-before;}),0,'An unchanged viewport must not reset the drawing buffer');
 await begin('idle');await page.waitForTimeout(2000);await end();
 assert.deepEqual(errors,[]);assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[]);
 const music=await page.evaluate(()=>({start:transitionBench.operations[0].audioStart,end:kyotoState.audio}));
 assert.equal(music.end.status,'running');assert.ok(music.end.step>music.start.step+10,'The real audio clock continued scheduling music');
 assert.equal(music.end.skippedMusicSteps,music.start.skippedMusicSteps,'Transitions must not drop scheduled music beats');
 assert.deepEqual(await page.evaluate(()=>transitionBench.programLinks),[],'Campaign transitions must reuse programs prepared during loading');
 passed=true;
}catch(error){errors.push(String(error));throw error;}
finally{
 if(profiler)try{const {profile}=await profiler.send('Profiler.stop');await writeFile(output+'/cpu-profile.json',JSON.stringify(profile)+'\n');await profiler.detach();}catch(error){errors.push(String(error));passed=false;process.exitCode=1;}
 let measurements;
 if(page)try{measurements=await page.evaluate(()=>{transitionBench.active=false;return {...transitionBench,finalAudio:window.kyotoState?.audio};});}catch{}
 if(passed&&!measurements){passed=false;errors.push('Transition measurements unavailable');process.exitCode=1;}
 const operations=(measurements?.operations||[]).map(op=>{
  const frames=measurements.frames.filter(f=>f.at>=op.start&&f.at<=op.end).map(f=>f.ms).sort((a,b)=>a-b);
  return {...op,frames:frames.length,frameP95Ms:frames[Math.floor(frames.length*.95)]||0,frameMaxMs:frames.at(-1)||0,skippedMusicSteps:(op.audioEnd?.skippedMusicSteps||0)-(op.audioStart?.skippedMusicSteps||0)};
 });
 const frames=(measurements?.frames||[]).map(f=>f.ms).sort((a,b)=>a-b);
 const frameSummary={frames:frames.length,meanFPS:1000*frames.length/frames.reduce((a,b)=>a+b,0),p95Ms:frames[Math.floor(frames.length*.95)]||0,maxMs:frames.at(-1)||0};
 const receipt={passed,engine:testBrowserName,browser:browser?.version(),errors,...measurements,operations,frameSummary};
 await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
 if(measurements)console.log(JSON.stringify({operations:operations.length,frameSummary,canvasDimensionWrites:measurements.canvasResizes.length,tasks:measurements.tasks.length,longFrames:measurements.longFrames.length,slowGL:measurements.gl.length,finalAudio:measurements.finalAudio,worst:operations.toSorted((a,b)=>b.frameMaxMs-a.frameMaxMs).slice(0,8).map(({operation,frameMaxMs,frameP95Ms,skippedMusicSteps})=>({operation,frameMaxMs,frameP95Ms,skippedMusicSteps}))},null,2));
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
