// Local gameplay benchmark. Test hooks are injected by Playwright only.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const label=process.argv[2]||'baseline',profile=process.argv.includes('--profile'),trace=process.argv.includes('--trace');
const cpu=Number(process.env.KYOTO_BENCH_CPU||1),ref=process.env.KYOTO_BENCH_REF;
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4391';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
if(!/^[a-z0-9-]+$/.test(label)||!Number.isFinite(cpu)||cpu<1||cpu>10)throw Error('Invalid benchmark label or CPU rate');
const source=file=>ref?execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'}):readFile(file,'utf8');
const sourceHashes={};
for(const name of ['arcade-audio','arcade-feedback']){
 const body=await source(`web/public/${name}.js`);sourceHashes[name]=createHash('sha256').update(body).digest('hex');
 // The baseline and working copy differ only in these browser modules.
 // A historical revision with other changes needs a complete matching checkout.
 sourceHashes[name+'-source']=body;
}
const out='.local/stability';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl','--ignore-gpu-blocklist',...(process.platform==='darwin'?['--use-angle=metal']:[]),'--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],reports=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('websocket',ws=>ws.on('framesent',({payload})=>{try{const m=JSON.parse(payload);if(m.type==='client-performance')reports.push(m.report);}catch{}}));
for(const name of ['arcade-audio','arcade-feedback']){
 const body=sourceHashes[name+'-source'];delete sourceHashes[name+'-source'];
 await page.route(`**/${name}.js`,route=>route.fulfill({contentType:'text/javascript',body}));
}
const game=await readFile('web/public/game.js','utf8');sourceHashes.game=createHash('sha256').update(game).digest('hex');
await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:game+`\nwindow.__bench={sound,ui,briefing,startCharge,release,recall,setFastForward,renderer,scene,shotPlayback,send,hint:()=>window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:ui.state.selected.hint}))};\n`}));
await page.addInitScript(()=>{
 window.__samples=[];window.__long=[];window.__loaf=[];window.__measuring=false;
 new PerformanceObserver(l=>{if(window.__measuring)for(const e of l.getEntries())window.__long.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask'});
 if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))new PerformanceObserver(l=>{if(window.__measuring)for(const e of l.getEntries())window.__loaf.push({duration:e.duration,blockingDuration:e.blockingDuration,renderStart:e.renderStart,styleAndLayoutStart:e.styleAndLayoutStart,scripts:e.scripts.map(s=>({duration:s.duration,forcedStyleAndLayoutDuration:s.forcedStyleAndLayoutDuration,sourceFunctionName:s.sourceFunctionName,sourceURL:s.sourceURL,sourceCharPosition:s.sourceCharPosition,invoker:s.invoker}))});}).observe({type:'long-animation-frame'});
 let last;function frame(now){if(window.__measuring&&last&&window.kyotoArt?.frameCost)window.__samples.push({dt:now-last,...window.kyotoArt.frameCost,ratio:window.kyotoState?.render.pixelRatio,calls:window.kyotoState?.render.calls,triangles:window.kyotoState?.render.triangles,phase:window.kyotoState?.phase,hidden:document.hidden});last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
});
const summary=rows=>{const q=(xs,p)=>xs.toSorted((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]||0;const metric=k=>({p50:q(rows.map(x=>x[k]),.5),p95:q(rows.map(x=>x[k]),.95),p99:q(rows.map(x=>x[k]),.99),max:Math.max(...rows.map(x=>x[k]))});return {frames:rows.length,fps:rows.length*1000/rows.reduce((s,x)=>s+x.dt,0),over50:rows.filter(x=>x.dt>50).length,hidden:rows.filter(x=>x.hidden).length,dt:metric('dt'),pose:metric('pose'),camera:metric('camera'),shadows:metric('shadows'),render:metric('render'),calls:metric('calls'),triangles:metric('triangles'),ratios:[...new Set(rows.map(x=>x.ratio))],phases:[...new Set(rows.map(x=>x.phase))]};};
const result={label,sourceRef:ref||'working-copy',sourceHashes,date:new Date().toISOString(),browser:browser.version(),machine:{model:os.cpus()[0].model,cpus:os.cpus().length,memory:os.totalmem(),platform:os.platform()},viewport:{width:1440,height:900,dpr:1},profile,cpuThrottle:cpu,stages:[],errors,reports};
async function stage(name,ms,action=async()=>{},cleanup=async()=>{}){
 await page.evaluate(()=>{window.__samples=[];window.__long=[];window.__loaf=[];window.__measuring=true;});
 if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 await action();await page.waitForTimeout(ms);await cleanup();
 if(profile){const {profile:p}=await cdp.send('Profiler.stop');await writeFile(`${out}/${label}-${name}.cpuprofile`,JSON.stringify(p));}
 const data=await page.evaluate(()=>{window.__measuring=false;return {samples:window.__samples,longTasks:window.__long,loaf:window.__loaf,audio:window.kyotoState.audio,shot:window.__bench.shotPlayback.stats(),memory:performance.memory?{used:performance.memory.usedJSHeapSize}:null};});
 result.stages.push({name,summary:summary(data.samples),...data});await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));console.log(name,JSON.stringify(result.stages.at(-1).summary));
}
try{
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#loading-setup input[name=player]').fill('Local benchmark',{timeout:90000});await page.locator('#loading-setup button[type=submit]').click();
 await page.waitForFunction(()=>window.kyotoState?.ready,{},{timeout:240000});
 await page.evaluate(()=>{__bench.briefing.dismiss();__bench.ui.closeLevels();__bench.renderer.setPixelRatio(1);__bench.renderer.setPixelRatio=()=>{};});
 await page.locator('canvas#game').focus();await page.waitForTimeout(5000);
 result.gpu=await page.evaluate(()=>{const gl=__bench.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
 if(cpu!==1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
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
 await page.screenshot({path:`${out}/${label}.png`});
 await page.evaluate(()=>__bench.recall());
 await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));
 console.log('DONE',label,'errors',errors.length);
}catch(error){result.error=String(error);result.failure=await page.evaluate(()=>({state:window.kyotoState,notice:document.getElementById('notice')?.textContent}));await page.screenshot({path:`${out}/${label}-failure.png`});await writeFile(`${out}/${label}.json`,JSON.stringify(result,null,2));throw error;}finally{await browser.close();}
