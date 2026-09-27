// Local correctness and visual checks; timings here are diagnostic, not pacing acceptance.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {browserVariant,serveVariant} from './source-variant.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4391';
const out='.local/optimization/checks';await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('.local/stability/native-fixture.json','utf8'));
const hook=await readFile('web/benchmarks/fixture-hook.js','utf8');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,args:['--enable-webgl','--use-angle=metal','--autoplay-policy=no-user-gesture-required']});
const controlsOnly=process.argv.includes('--controls-only');
const result=controlsOnly?JSON.parse(await readFile(out+'/visual-result.json','utf8')):{date:new Date().toISOString(),checks:[],errors:[],views:[],queries:null,adaptive:null};
const views=[{name:'hall',position:[0,2.5,-25],target:[0,13,2]},{name:'escalators',position:[-47,10,14],target:[-90,22,16]},{name:'garden',position:[-156,58,24],target:[-142,57,18]},{name:'concourse',position:[32,2.5,0],target:[26,3,14]}];
async function load(page,url){
 page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__bench?.connected(),null,{timeout:30000});
 await page.locator('#loading-setup input[name=player]').fill('Local verification');await page.locator('#loading-setup button[type=submit]').click();
 await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:180000});
 await page.evaluate(()=>{__bench.briefing.dismiss();__bench.ui.closeLevels();});await page.waitForTimeout(3000);
}
try{
 if(!controlsOnly)for(const [label,ref] of [['baseline','14091f0'],['candidate',null]]){
  const variant=await browserVariant(ref);
  // The evening artwork uses a wall-clock shader, separate from native motion.
  // Pin that animation alone for exact visual comparisons in both variants.
  const installation=variant.files.get('/station-installations.js').toString();assert.ok(installation.includes('u.value=time'));
  variant.files.set('/station-installations.js',Buffer.from(installation.replace('u.value=time','u.value=123.4')));
  result.visualClock={shaderSeconds:123.4,nativeTrajectory:fixture.fixtureHash||'native-fixture.json',scope:'Fixed-view captures only'};
  const proxy=await serveVariant(origin,variant,game=>game.replace('function animate(now){','function animate(now){\n window.__bench?.beforeFrame(now);').replace('  scoutTargets.update(camera,','  window.__bench?.applyCamera(camera);\n  scoutTargets.update(camera,').replace(/  updateShotDetails(?:\?\.)?\(/,'  window.__bench?.recordFrame(timeline);\n $&')+hook);
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();
  try{
   await load(page,proxy.origin+'/?debug=1');
   if(label==='candidate'){
    await page.locator('#shot-details summary').click();await page.waitForTimeout(400);
    assert.match(await page.locator('#shot-state').textContent(),/Worker: ready/);await page.locator('#shot-details summary').click();result.checks.push('Enabled debug panel continues to update');
    result.queries=await page.evaluate(async()=>{
     const THREE=await import('three'),{staticRayQueries}=await import('./static-ray-queries.js'),root=__bench.station(),index=staticRayQueries(root);
     const rays=[],v=new THREE.Vector3(),ray=new THREE.Raycaster();ray.firstHitOnly=true;
     let seed=424242;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
     for(let i=0;i<1200;i++){const x=-164+random()*214,z=-30+random()*65,y=[.25,6.2,14,32,58][i%5];rays.push({origin:new THREE.Vector3(x,y,z),direction:i%2?new THREE.Vector3(0,-1,0):new THREE.Vector3(random()-.5,random()-.35,random()-.5).normalize(),far:i%2?8:300,support:!!(i%2)});}
     let hits=0,maxError=0;const accept=h=>h.face&&v.copy(h.face.normal).transformDirection(h.object.matrixWorld).y>.45;
     const query=(r,fast)=>{ray.set(r.origin,r.direction);ray.far=r.far;return fast?index.first(ray,r.support?accept:null):ray.intersectObject(root,true).find(r.support?accept:()=>true);};
     for(const r of rays){const a=query(r,false),b=query(r,true);if(!!a!==!!b||a&&a.object!==b.object)throw Error('Station surface mismatch');if(a){hits++;maxError=Math.max(maxError,a.point.distanceTo(b.point));}}
     if(maxError>.001)throw Error('Station query exceeds 1 mm error');
     const times={baseline:[],candidate:[]};const candidatesBefore=index.stats.candidates;
     for(let batch=0;batch<5;batch++)for(const fast of batch%2?[true,false]:[false,true]){const began=performance.now();for(const r of rays)query(r,fast);times[fast?'candidate':'baseline'].push(performance.now()-began);}
     return {rays:rays.length,hits,maxErrorMetres:maxError,meshes:index.stats.meshes,meanCandidates:(index.stats.candidates-candidatesBefore)/(5*rays.length),batchMs:times};
    });result.checks.push('Actual station: 1200 aim/support rays select identical surfaces');
   }
   await page.evaluate(data=>{__bench.playback(data);__bench.renderer.setPixelRatio(1);__bench.renderer.setPixelRatio=()=>{};},fixture.stages[0].fixture);
   for(const evening of [false,true])for(const view of views){
    await page.evaluate(({view,evening})=>{__bench.reviewView(view);__bench.stationLook().setNight(evening);},{view,evening});await page.waitForTimeout(2000);
    const name=view.name+(evening?'-evening':''),png=await page.evaluate(()=>__bench.captureImage());await writeFile(`${out}/${label}-${name}.png`,Buffer.from(png.split(',')[1],'base64'));
    if(label==='candidate'){
     const a=await sharp(`${out}/baseline-${name}.png`).raw().toBuffer(),b=await sharp(`${out}/candidate-${name}.png`).raw().toBuffer();let changed=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);}result.views.push({name,changedChannels:changed,maxDifference:max});assert.ok(max<=1&&changed<=100,name+' stays within one 8-bit level in at most 100 channels');
    }
   }
  }finally{await context.close();await proxy.close();}
 }
 if(!controlsOnly)result.checks.push('Four fixed views match in day and evening within the recorded 8-bit rounding tolerance');
 delete result.error;result.status='running';result.controlsDate=new Date().toISOString();
 const variant=await browserVariant(),proxy=await serveVariant(origin,variant,game=>game+hook);
 const context=await browser.newContext({viewport:{width:1470,height:786},deviceScaleFactor:2}),page=await context.newPage();
 try{
  await load(page,proxy.origin);await page.bringToFront();await page.locator('canvas#game').click();await page.waitForFunction(()=>kyotoState.pointerLocked);await page.locator('canvas#game').focus();
  const start=await page.evaluate(()=>kyotoState.feet);await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');await page.waitForTimeout(200);
  const end=await page.evaluate(()=>kyotoState.feet);assert.ok(Math.hypot(end.x-start.x,end.z-start.z)>.1);result.checks.push('Keyboard walking moves the authoritative player');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1200);await page.keyboard.up('ArrowRight');
  await page.keyboard.press('h');await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');await page.waitForFunction(()=>kyotoState.phase==='Flight');
  await page.keyboard.down('Space');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>kyotoState.audio.playbackRate),2);await page.keyboard.up('Space');
  await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');result.checks.push('Keyboard throw, flight, 2x and recall');
  await page.keyboard.press('h');const hold=await page.evaluate(()=>kyotoState.challenge.hint.holdMs);await page.keyboard.down('Space');await page.waitForTimeout(hold);await page.keyboard.up('Space');
  await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result?.saved,null,{timeout:90000});await page.waitForTimeout(1200);
  const saved=await page.evaluate(()=>kyotoState.result);assert.equal(await page.locator('#result-title').textContent(),saved.score.toLocaleString()+' PTS');
  await page.locator('#watch-result').click();await page.waitForFunction(()=>kyotoState.mode==='replay');
  await page.locator('#replay-scrub').evaluate(el=>{el.value=String(Number(el.max)*.25);el.dispatchEvent(new Event('input'));});await page.waitForTimeout(200);
  assert.equal(await page.locator('#replay-play').textContent(),'Play');await page.locator('#replay-play').click();await page.waitForTimeout(200);
  await page.locator('#close-replay').click();await page.waitForFunction(()=>kyotoState.mode==='play');await page.keyboard.press('r');
  result.checks.push('Displayed final score equals native result; saved replay loads, seeks and resumes');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  await page.waitForTimeout(10000);result.adaptive=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,render:kyotoState.render,resources:__bench.diagnostics().resources}));
  await page.screenshot({path:out+'/ordinary-adaptive.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-ui')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/mobile-reduced-motion.png'});result.checks.push('Ordinary Retina-size adaptive view, reduced motion and mobile-size layout');
 }catch(error){result.failure=await page.evaluate(()=>({state:kyotoState,active:document.activeElement?.id,focused:document.hasFocus(),hidden:document.hidden,notice:document.getElementById('notice')?.textContent}));await page.screenshot({path:out+'/controls-failure.png'});throw error;}finally{await context.close();await proxy.close();}
 assert.deepEqual(result.errors,[]);result.status='pass';console.log(JSON.stringify(result));
}catch(error){result.status='fail';result.error=String(error);throw error;}finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2));await browser.close();}
