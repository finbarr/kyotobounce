import { chromeGraphicsArgs } from '../../../tools/chrome-graphics.mjs';
// Capture the actual game at fixed review cameras, with asynchronous GPU queries.
// Research photographs are referenced by the manifest, never bundled here.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {browserVariant,serveVariant,hash} from '../../benchmarks/source-variant.mjs';
const label=process.argv[2]||'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid capture label');
const manifestBytes=await readFile(process.env.KYOTO_REVIEW_MANIFEST||'web/station/realism/views.json');
const manifest=JSON.parse(manifestBytes);
const selection=process.env.KYOTO_REVIEW_VIEWS?.split(',');
const views=selection?manifest.views.filter(v=>selection.includes(v.id)):manifest.views;
if(selection&&views.length!==selection.length)throw Error('Unknown or duplicate review view');
const out=`.local/station-realism/${label}`;await mkdir(out,{recursive:true});
await writeFile(`${out}/views.json`,manifestBytes);
const liveReview=process.env.KYOTO_REVIEW_LIVE==='1';
const fixturePath=process.env.KYOTO_BENCH_FIXTURE||'.local/stability/native-fixture.json';
const fixture=liveReview?null:JSON.parse(await readFile(fixturePath,'utf8')).stages[0].fixture;
const variant=await browserVariant(process.env.KYOTO_BENCH_REF);
if(process.env.KYOTO_REVIEW_ASSETS){
 const root=resolve(process.env.KYOTO_REVIEW_ASSETS);
 if(!root.startsWith(resolve('.local')+'/'))throw Error('Candidate assets must be isolated under .local');
 const station=await readFile(root+'/station.json'),art=await readFile(root+'/atrium.runtime.glb');
 variant.files.set('/assets/station.json',station);variant.files.set('/assets/runtime/atrium.glb',art);
 variant.receipt.candidateAssets={directory:root,stationSha256:hash(station),artSha256:hash(art),layoutSha256:JSON.parse(station).layoutSha256,artBytes:art.length};
}
const hook=await readFile('web/benchmarks/fixture-hook.js','utf8');
const replaceOnce=(s,a,b)=>{if(s.split(a).length!==2)throw Error(`Capture hook no longer matches: ${a}`);return s.replace(a,b);};
const proxy=await serveVariant(process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4392',variant,source=>{
 source=replaceOnce(source,'function animate(now){','function animate(now){\nwindow.__bench?.beforeFrame(now);');
 source=replaceOnce(source,'  scoutTargets.update(camera,','  window.__bench?.applyCamera(camera);\n  scoutTargets.update(camera,');
 source=replaceOnce(source,'  blur.render(scene,camera,','  window.__review?.begin();\n  blur.render(scene,camera,');
 source=replaceOnce(source,'  window.kyotoArt.frameCost=','  window.__review?.end();\n  window.kyotoArt.frameCost=');
 source=source.replace(/  updateShotDetails(?:\?\.)?\(/,'  window.__bench?.recordFrame(timeline);\n  $&');
 return source+hook;
});
let browser,page;
const readPower=()=>execFileSync('pmset',['-g','batt'],{encoding:'utf8'}).trim();
const result={date:new Date().toISOString(),powerStart:readPower(),powerSettings:execFileSync('pmset',['-g','custom'],{encoding:'utf8'}).trim(),manifestHash:hash(manifestBytes),source:variant.receipt,fixtureHash:liveReview?null:hash(await readFile(fixturePath)),reviewMode:liveReview?'live native session; fixed camera; no replay fixture':'recorded fixture',viewport:manifest.viewport,views:[],errors:[],warnings:[]};
const quantiles=xs=>{if(!xs.length)return null;xs.sort((a,b)=>a-b);const q=p=>xs[Math.min(xs.length-1,Math.floor(xs.length*p))];return {samples:xs.length,p50:q(.5),p95:q(.95),p99:q(.99),max:xs.at(-1)};};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl',...chromeGraphicsArgs(),'--autoplay-policy=no-user-gesture-required']});
 result.browser=browser.version();
 page=await browser.newPage({viewport:manifest.viewport,deviceScaleFactor:1});
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))result.warnings.push(m.text());});
 await page.goto(proxy.origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__bench?.connected(),null,{timeout:30000});
 await page.locator('#loading-setup input[name=player]').fill('Local station review',{timeout:90000});await page.locator('#loading-setup button[type=submit]').click();
 await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:240000});
 await page.evaluate(data=>{if(data)__bench.playback(data);else{__bench.ui.closeLevels();__bench.briefing.dismiss();__bench.ui.dismissResult();}__bench.renderer.setPixelRatio(1);__bench.renderer.setPixelRatio=()=>{};},fixture);
 await page.locator('canvas#game').focus();
 result.shadowCoverage=await page.evaluate(()=>__bench.stationLook().stats.shadowCoverage);
 result.reflections=await page.evaluate(()=>__bench.stationLook().stats.reflection);
 result.gpu=await page.evaluate(()=>{
  const gl=__bench.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  let pending=[],active=null,enabled=false,last=null,epoch=0,rows=[],times=[],disjoints=0,dropped=0;
  // Never wait for the GPU. Poll later frames and cap the outstanding queue.
  // A disjoint invalidates the entire measurement epoch, not just its last query.
  window.__review={
   begin(){
    if(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoints++;for(const q of pending)gl.deleteQuery(q.query);pending=[];times=[];}
    if(ext)pending=pending.filter(q=>{if(!gl.getQueryParameter(q.query,gl.QUERY_RESULT_AVAILABLE))return true;const ms=gl.getQueryParameter(q.query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q.query);if(q.epoch===epoch)times.push(ms);return false;});
    if(enabled){const now=performance.now();if(last!==null)rows.push({dt:now-last,hidden:document.hidden,cost:{...window.kyotoArt.frameCost},calls:__bench.renderer.info.render.calls,triangles:__bench.renderer.info.render.triangles});last=now;
     if(ext&&pending.length<12){active={query:gl.createQuery(),epoch};gl.beginQuery(ext.TIME_ELAPSED_EXT,active.query);}else if(ext)dropped++;
    }
   },
   end(){if(active){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;}},
   start(){epoch++;enabled=true;last=null;rows=[];times=[];disjoints=0;dropped=0;},
   stop(){enabled=false;},
   result(){return {rows,gpuMs:disjoints?[]:times,gpuSupported:!!ext,disjoints,dropped,unfinished:pending.filter(q=>q.epoch===epoch).length};}
  };
  return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,timerQueries:!!ext};
 });
 for(const v of views){
  const powerBefore=readPower();
  await page.evaluate(v=>{__bench.reviewView(v.camera);__bench.stationLook().setNight(v.lighting==='evening');},v);
  await page.waitForTimeout(Number(process.env.KYOTO_REVIEW_WARMUP_MS||2500));await page.evaluate(()=>__review.start());
  await page.waitForTimeout(Number(process.env.KYOTO_REVIEW_MEASURE_MS||4000));await page.evaluate(()=>__review.stop());
  await page.waitForTimeout(500);
  const data=await page.evaluate(()=>({timing:__review.result(),camera:{position:__bench.camera().position.toArray(),quaternion:__bench.camera().quaternion.toArray(),fov:__bench.camera().fov,near:__bench.camera().near,far:__bench.camera().far},buffer:{width:__bench.renderer.domElement.width,height:__bench.renderer.domElement.height},resources:{...__bench.renderer.info.memory},audio:__bench.sound.state}));
  if(data.buffer.width!==manifest.viewport.width||data.buffer.height!==manifest.viewport.height)throw Error('Drawing buffer differs from manifest');
  const png=await page.evaluate(()=>__bench.captureImage());await writeFile(`${out}/${v.id}.png`,Buffer.from(png.split(',')[1],'base64'));
  const {rows,gpuMs,...gpuStatus}=data.timing;
  const row={id:v.id,powerBefore,powerAfter:readPower(),inspectionNote:v.inspectionNote||null,...data,timing:{...gpuStatus,frameMs:quantiles(rows.map(r=>r.dt)),renderCpuMs:quantiles(rows.map(r=>r.cost.render)),gpuMs:quantiles(gpuMs),drawCalls:quantiles(rows.map(r=>r.calls)),triangles:quantiles(rows.map(r=>r.triangles)),hiddenFrames:rows.filter(r=>r.hidden).length},imageSha256:hash(await readFile(`${out}/${v.id}.png`))};
  result.views.push(row);await writeFile(`${out}/capture.json`,JSON.stringify(result,null,2)+'\n');
  console.log(v.id,JSON.stringify(row.timing));
 }
 result.reflectionsAfter=await page.evaluate(()=>__bench.stationLook().stats.reflection);
 if(result.reflectionsAfter.captures!==result.reflections.captures)throw Error('Static reflection capture repeated during view changes');
 result.localReflectionMaterials=await page.evaluate(()=>{
  const found=new Map();__bench.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&/^Registered courtyard \| court-fold-/.test(m.name))found.set(m.name,{name:m.name,environment:m.envMap?.name||null,metalness:m.metalness,roughness:m.roughness,environmentIntensity:m.envMapIntensity});});return [...found.values()];
 });
 result.power=readPower();
 result.note='Fixed-view diagnostic. Camera registration and any cutaway are described by the manifest and per-view inspection notes; these captures do not establish full gameplay or soak acceptance.';
 await writeFile(`${out}/capture.json`,JSON.stringify(result,null,2)+'\n');
 if(result.errors.length)throw Error(`${result.errors.length} browser errors`);
}catch(error){result.failure=String(error);if(page){result.failedPage=await page.evaluate(()=>({url:location.href,state:window.kyotoState,loading:document.querySelector('#loading')?.textContent})).catch(()=>null);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}await writeFile(`${out}/capture.json`,JSON.stringify(result,null,2)+'\n');throw error;}finally{await browser?.close();await proxy.close();}
