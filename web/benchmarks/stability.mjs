// Local gameplay benchmark. Test hooks are injected by Playwright only.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {browserVariant,serveVariant,hash} from './source-variant.mjs';
const label=process.argv[2]||'baseline',profile=process.argv.includes('--profile'),trace=process.argv.includes('--trace'),stallTrace=process.argv.includes('--stall-trace');
const fixturePath=process.env.KYOTO_BENCH_FIXTURE,capture=process.env.KYOTO_BENCH_CAPTURE==='1';
const fixture=fixturePath?JSON.parse(await readFile(fixturePath,'utf8')):null;
const soakMinutes=Number(process.env.KYOTO_BENCH_SOAK_MINUTES||0);
const measuredMs=Number(process.env.KYOTO_BENCH_STAGE_MS||30000),warmupMs=Number(process.env.KYOTO_BENCH_WARMUP_MS||10000);
const cpu=Number(process.env.KYOTO_BENCH_CPU||1),ref=process.env.KYOTO_BENCH_REF;
let origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4391';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
if(!/^[a-z0-9-]+$/.test(label)||!Number.isFinite(cpu)||cpu<1||cpu>10)throw Error('Invalid benchmark label or CPU rate');
const variant=await browserVariant(ref),sourceHashes=variant.receipt;
const out='.local/stability';await mkdir(out,{recursive:true});
const viewport={width:Number(process.env.KYOTO_BENCH_WIDTH||1440),height:Number(process.env.KYOTO_BENCH_HEIGHT||900)};
if(!Object.values(viewport).every(n=>Number.isInteger(n)&&n>=320&&n<=3840))throw Error('Invalid benchmark viewport');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl','--ignore-gpu-blocklist',...(process.platform==='darwin'?['--use-angle=metal']:[]),'--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport,deviceScaleFactor:1});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],reports=[],consoleMessages=[],failedRequests=[],socketErrors=[];
page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e));});
page.on('console',m=>{if(['error','warning'].includes(m.type())){consoleMessages.push({type:m.type(),text:m.text()});console.log('BROWSER',m.text());}});
page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
page.on('websocket',ws=>ws.on('socketerror',e=>{socketErrors.push(String(e));console.log('SOCKET',e);}));
console.log('Chrome launched',browser.version());
page.on('websocket',ws=>ws.on('framesent',({payload})=>{try{const m=JSON.parse(payload);if(m.type==='client-performance')reports.push(m.report);}catch{}}));
const hook=await readFile('web/benchmarks/fixture-hook.js','utf8');
const proxy=await serveVariant(origin,variant,game=>game
 .replace('function animate(now){','function animate(now){\n  window.__bench?.beforeFrame(now);')
 .replace('  scoutTargets.update(camera,','  window.__bench?.applyCamera(camera);\n  scoutTargets.update(camera,')
 .replace(/  updateShotDetails(?:\?\.)?\(/,'  window.__bench?.recordFrame(timeline);\n  $&')+hook);
origin=proxy.origin;
await page.addInitScript(({dom})=>{
 window.__visibility=[];const visibility=event=>{if(window.__visibility.length<1000)window.__visibility.push({at:performance.now(),event,hidden:document.hidden,focused:document.hasFocus()});};visibility('initial');document.addEventListener('visibilitychange',()=>visibility('visibilitychange'));window.addEventListener('blur',()=>visibility('blur'));window.addEventListener('focus',()=>visibility('focus'));
 window.__contextLosses=0;document.addEventListener('webglcontextlost',()=>window.__contextLosses++,true);window.__traceLag=null;window.__fullCost=0;window.__mutations=0;window.__samples=[];window.__long=[];window.__loaf=[];window.__measuring=false;
 new PerformanceObserver(l=>{if(window.__measuring)for(const e of l.getEntries())window.__long.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask'});
 if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))new PerformanceObserver(l=>{if(window.__measuring)for(const e of l.getEntries())window.__loaf.push({duration:e.duration,blockingDuration:e.blockingDuration,renderStart:e.renderStart,styleAndLayoutStart:e.styleAndLayoutStart,scripts:e.scripts.map(s=>({duration:s.duration,forcedStyleAndLayoutDuration:s.forcedStyleAndLayoutDuration,sourceFunctionName:s.sourceFunctionName,sourceURL:s.sourceURL,sourceCharPosition:s.sourceCharPosition,invoker:s.invoker}))});}).observe({type:'long-animation-frame'});
 if(dom)new MutationObserver(list=>{if(window.__measuring)window.__mutations+=list.length;}).observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
 const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(cb.name==='animate'?now=>{const start=performance.now();cb(now);window.__fullCost=performance.now()-start;}:cb);
 let last;function frame(now){if(window.__measuring&&last&&now-last>100)window.__traceLag={at:now,dt:now-last};if(window.__measuring&&last&&window.kyotoArt?.frameCost)window.__samples.push({at:now,dt:now-last,full:window.__fullCost,...window.kyotoArt.frameCost,ratio:window.kyotoState?.render.pixelRatio,calls:window.kyotoState?.render.calls,triangles:window.kyotoState?.render.triangles,phase:window.kyotoState?.phase,hidden:document.hidden});last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
},{dom:process.env.KYOTO_BENCH_DOM==='1'});
const summary=rows=>{const q=(xs,p)=>xs.toSorted((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]||0;const metric=k=>({p50:q(rows.map(x=>x[k]),.5),p95:q(rows.map(x=>x[k]),.95),p99:q(rows.map(x=>x[k]),.99),max:Math.max(...rows.map(x=>x[k]))});return {frames:rows.length,fps:rows.length*1000/rows.reduce((s,x)=>s+x.dt,0),over33:rows.filter(x=>x.dt>33.4).length,over50:rows.filter(x=>x.dt>50).length,over100:rows.filter(x=>x.dt>100).length,over200:rows.filter(x=>x.dt>200).length,hidden:rows.filter(x=>x.hidden).length,dt:metric('dt'),full:metric('full'),pose:metric('pose'),camera:metric('camera'),shadows:metric('shadows'),render:metric('render'),calls:metric('calls'),triangles:metric('triangles'),ratios:[...new Set(rows.map(x=>x.ratio))],phases:[...new Set(rows.map(x=>x.phase))]};};
const harnessHashes={};for(const file of ['stability.mjs','source-variant.mjs','fixture-hook.js'])harnessHashes[file]=hash(await readFile('web/benchmarks/'+file));
const result={label,fixtureHash:fixture?hash(await readFile(fixturePath)):null,harnessHashes,sourceRef:ref||'working-copy',sourceHashes,date:new Date().toISOString(),browser:browser.version(),machine:{model:os.cpus()[0].model,cpus:os.cpus().length,memory:os.totalmem(),platform:os.platform()},viewport:{...viewport,dpr:1},profile,fixture:fixturePath||null,fixtureCapture:capture,stallTrace,cpuThrottle:cpu,stages:[],errors,consoleMessages,failedRequests,socketErrors,reports};
let traceLag=null;
async function stage(name,ms,action=async()=>{},cleanup=async()=>{}){
 await page.evaluate(continuous=>{if(!continuous||!window.__measuring){window.__samples=[];window.__long=[];window.__loaf=[];window.__mutations=0;}window.__measuring=true;},!!soakMinutes);
 if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 await action();if(capture)await page.evaluate(()=>__bench.captureStart());if(stallTrace){const until=Date.now()+ms;while(Date.now()<until&&!traceLag){await page.waitForTimeout(500);traceLag=await page.evaluate(()=>window.__traceLag);}}else await page.waitForTimeout(ms);await cleanup();
 if(profile){const {profile:p}=await cdp.send('Profiler.stop');await writeFile(`${out}/${label}-${name}.cpuprofile`,JSON.stringify(p));}
 const captured=capture?await page.evaluate(()=>__bench.captureStop()):null;
 const data=await page.evaluate(continuous=>{const data={visibility:window.__visibility,mutations:window.__mutations,samples:window.__samples,longTasks:window.__long,loaf:window.__loaf,audio:window.kyotoState.audio,shot:window.__bench.shotPlayback.stats(),diagnostics:__bench.diagnostics(),contextLosses:window.__contextLosses,memory:performance.memory?{used:performance.memory.usedJSHeapSize}:null};if(continuous){window.__samples=[];window.__long=[];window.__loaf=[];window.__mutations=0;}else window.__measuring=false;return data;},!!soakMinutes);
 const dom=await cdp.send('Memory.getDOMCounters');
 result.stages.push({name,dom,...(captured?{fixture:captured}:{}),summary:summary(data.samples),...data});await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));console.log(name,JSON.stringify(result.stages.at(-1).summary));
}
try{
 const began=Date.now();
 await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
 console.log('Page loaded',origin);
 await page.waitForFunction(()=>window.__bench?.connected(),{},{timeout:20000});
 await page.locator('#loading-setup input[name=player]').fill('Local benchmark',{timeout:90000});await page.locator('#loading-setup button[type=submit]').click();
 await page.waitForFunction(()=>window.kyotoState?.ready,{},{timeout:240000});
 result.cold={navigationToReadyMs:Date.now()-began,startupMs:await page.evaluate(()=>window.kyotoState.startupMs)};
 await page.evaluate(()=>{__bench.briefing.dismiss();__bench.ui.closeLevels();__bench.renderer.setPixelRatio(1);__bench.renderer.setPixelRatio=()=>{};});
 await page.locator('canvas#game').focus();await page.waitForTimeout(5000);
 result.display=await page.evaluate(()=>({screen:{width:screen.width,height:screen.height},drawingBuffer:{width:__bench.renderer.domElement.width,height:__bench.renderer.domElement.height},estimatedRefreshHz:1000/(window.kyotoState.render.frameMs.toSorted((a,b)=>a-b)[60]||16.667)}));
 result.pageTimeOrigin=await page.evaluate(()=>performance.timeOrigin);
 result.power=process.platform==='darwin'?execFileSync('pmset',['-g','batt'],{encoding:'utf8'}).trim():null;
 result.workload=execFileSync('ps',['-Ao','pcpu,comm'],{encoding:'utf8'}).trim().split('\n').slice(1).map(line=>{const m=line.trim().match(/^([0-9.]+) (.+)$/);return m?{cpu:Number(m[1]),process:m[2].split('/').at(-1)}:null;}).filter(Boolean).sort((a,b)=>b.cpu-a.cpu).slice(0,10);
 if(stallTrace)await cdp.send('Tracing.start',{traceConfig:{recordMode:'recordContinuously',traceBufferSizeInKb:32768,includedCategories:['devtools.timeline','v8','blink','cc','gpu']},transferMode:'ReturnAsStream'});
 result.gpu=await page.evaluate(()=>{const gl=__bench.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
 if(cpu!==1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
 if(soakMinutes){
  await cdp.send('HeapProfiler.collectGarbage');result.memoryStart={heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters')};
  await page.waitForTimeout(10000);await page.evaluate(()=>__bench.startSoak());
  for(let minute=0;minute<soakMinutes&&!traceLag;minute++)await stage('soak-'+String(minute+1).padStart(2,'0'),60000);
  await page.evaluate(()=>{window.__measuring=false;__bench.stopSoak();});
  await cdp.send('HeapProfiler.collectGarbage');result.memoryEnd={heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters')};
 }else if(fixture){
  for(const item of fixture.stages){
   await page.evaluate(data=>__bench.playback(data),item.fixture);
   await page.waitForTimeout(warmupMs);await page.evaluate(()=>__bench.resetClock());
   await stage(item.name,measuredMs);
  }
  if(process.argv.includes('--views')){
   const views=[{name:'hall',position:[0,2.5,-25],target:[0,13,2]},{name:'escalators',position:[-47,10,14],target:[-90,22,16]},{name:'garden',position:[-156,58,24],target:[-142,57,18]},{name:'concourse',position:[32,2.5,0],target:[26,3,14]}];
   await page.evaluate(data=>__bench.playback(data),fixture.stages[0].fixture);
   for(const view of views){
    await page.evaluate(view=>__bench.reviewView(view),view);await page.waitForTimeout(warmupMs);await stage(view.name,measuredMs);
    const png=await page.evaluate(()=>__bench.captureImage());await writeFile(`${out}/${label}-${view.name}.png`,Buffer.from(png.split(',')[1],'base64'));
   }
  }
 }else{
 await stage('aim',10000);
 await stage('walk',6000,()=>page.keyboard.down('w'),()=>page.keyboard.up('w'));
 await page.evaluate(()=>__bench.send('home'));await page.waitForTimeout(1000);
 await stage('orbit',6000,()=>page.keyboard.down('ArrowRight'),()=>page.keyboard.up('ArrowRight'));
 await page.evaluate(()=>__bench.hint());await page.waitForTimeout(300);
 if(trace)await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink,cc,gpu,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});
 await page.evaluate(()=>__bench.startCharge());await page.waitForTimeout(1100);await page.evaluate(()=>__bench.release());
 await page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:20000});
 await stage('flight',12000);
 if(trace){const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await completed;let data='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});data+=chunk.data;if(chunk.eof)break;}await cdp.send('IO.close',{handle:stream});await writeFile(`${out}/${label}.trace.json`,data);}
 await stage('fast-forward',4000,()=>page.evaluate(()=>__bench.setFastForward(true)),()=>page.evaluate(()=>__bench.setFastForward(false)));
 }
 if(stallTrace){result.traceLag=traceLag;const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await completed;let data='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});data+=chunk.data;if(chunk.eof)break;}await cdp.send('IO.close',{handle:stream});await writeFile(`${out}/${label}.trace.json`,data);}
 await page.screenshot({path:`${out}/${label}.png`});
 await page.evaluate(()=>__bench.recall());
 await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));
 console.log('DONE',label,'errors',errors.length);
}catch(error){result.error=String(error);result.failure=await page.evaluate(()=>({state:window.kyotoState,notice:document.getElementById('notice')?.textContent}));await page.screenshot({path:`${out}/${label}-failure.png`});await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));throw error;}finally{await browser.close();await proxy.close();}
