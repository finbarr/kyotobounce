// Test-only camera/render scheduling; full game, native sessions and station lighting.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const mode=process.argv[2]||'baseline',out='artifacts/station-detail/plaza-landmarks/'+mode;
const selectedViews=process.env.K028_VIEWS?.split(','),resume=process.env.K028_RESUME==='1';
assert.ok(['baseline','candidate'].includes(mode));await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[],consoleErrors=[];
page.on('pageerror',e=>{errors.push(String(e));console.log('ERROR',String(e));});page.on('console',m=>{if(m.type()==='error'){consoleErrors.push(m.text());console.log(m.text());}});
await page.addInitScript(()=>{window.k028view={eye:[-65,21.3,10],target:[-63.5,23,-3.5]};window.k028frames=0;});
await page.route('**/game.js',async route=>{
 let s=await readFile('web/public/game.js','utf8');
 s=s.replaceAll('renderer.render(scene,camera);',`if(window.k028view){camera.position.fromArray(window.k028view.eye);camera.lookAt(...window.k028view.target);}
 if(!window.k028view||window.k028frames-->0){const t=performance.now();renderer.render(scene,camera);if(window.k028benchmark){renderer.getContext().finish();window.k028samples.push({ms:performance.now()-t,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});}}`);
 s+='\nwindow.k028={scene,renderer,send,socket,briefing,view:(v,frames=3)=>{window.k028view=v;window.k028frames=frames;}};';
 await route.fulfill({body:s,contentType:'text/javascript'});
});
const progress=setInterval(()=>page.evaluate(()=>({loading:document.querySelector('#loading-message')?.textContent,ready:window.kyotoState?.ready})).then(s=>console.log('PROGRESS',s)).catch(()=>{}),30000);
const settle=()=>page.waitForFunction(()=>window.k028frames<0,null,{timeout:120000});
const setView=async v=>{await page.evaluate(({v,frames})=>window.k028.view(v,frames),{v,frames:1});await settle();};
const play=async()=>{if(await page.evaluate(()=>window.k028.briefing.active)){await page.locator('#briefing-play').click({force:true});await page.waitForFunction(()=>!window.k028.briefing.blocked,null,{timeout:30000});}};
try{
 await page.goto('http://127.0.0.1:4284');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:240000});await play();
 await page.locator('canvas').click({position:{x:480,y:320},force:true});
 const windowLayout=await page.evaluate(()=>window.kyotoArt.sourceLayout);
 const views=JSON.parse(await readFile('web/station/plaza-landmarks/views.json','utf8')).filter(v=>!selectedViews||selectedViews.includes(v.id)),previous=(selectedViews||resume)?JSON.parse(await readFile(out+'/browser.json','utf8')):null,records=previous?previous.records.filter(r=>!selectedViews?.includes(r.id)):[],performancePairs=previous?.performancePairs||[];let selected='';
 if(previous&&mode==='candidate')assert.ok(previous.records.every(r=>r.art.sourceLayout===windowLayout), 'Cannot resume another layout');
 for(const v of views){
  if(resume&&records.some(r=>r.id===v.id&&JSON.stringify(r.inspectionView)===JSON.stringify(v)))continue;
  const name=v.id.split('-')[0];
  if(mode==='candidate'&&name!==selected){
   await page.evaluate(name=>window.k028.send('select-challenge',{challengeId:'k028-inspect-'+name,revision:1}),name);
   await page.waitForFunction(name=>window.kyotoState.challenge?.id==='k028-inspect-'+name&&window.k028.briefing.active,name);await play();selected=name;
  }
  await setView(v);await page.screenshot({path:`${out}/${v.id}.png`,timeout:120000});
  if(v.id.endsWith('-opposite')){const style=await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important}'});await page.screenshot({path:`${out}/${v.id}-viewport.png`,timeout:120000});await style.evaluate(el=>el.remove());}
  const record={id:v.id,inspectionView:v,...await page.evaluate(()=>({state:window.kyotoState,art:window.kyotoArt,clippingPlanes:window.k028.renderer.clippingPlanes.length}))};
  assert.equal(record.clippingPlanes,0,'Inspection must leave the cutaway briefing');assert.equal(record.state.briefing,false);
  if(mode==='candidate')assert.equal(record.art.sourceLayout,JSON.parse(await readFile(out+'/build.json','utf8')).layoutSha256);
  records.push(record);await writeFile(out+'/browser.json',JSON.stringify({mode,errors,consoleErrors,records,performancePairs,partial:true},null,2));console.log(v.id);
 }
 if(mode==='candidate'&&!selectedViews){
  // Paired draw cost with the same camera/scene. Hide only the new layer to isolate
  // its cost; this hidden-layer mode is not used for collision or visual acceptance.
  for(const v of views.filter(v=>v.id.endsWith('-approach'))){
   if(resume&&performancePairs.some(p=>p.id===v.id))continue;
   const pair={id:v.id};
   for(const visible of [false,true]){
    await page.evaluate(({v,visible})=>{window.k028.scene.traverse(o=>{if(o.userData.k028_layer)o.visible=visible;});window.k028samples=[];window.k028benchmark=true;window.k028.view(v,10);},{v,visible});await settle();
    pair[visible?'candidate':'layerHidden']=await page.evaluate(()=>window.k028samples.slice(2));
   }
   performancePairs.push(pair);await writeFile(out+'/browser.json',JSON.stringify({mode,errors,consoleErrors,records,performancePairs,partial:true},null,2));console.log('COST',v.id);
  }
  await page.evaluate(()=>window.k028benchmark=false);
  await mkdir(out+'/movement',{recursive:true});const movement=resume?JSON.parse(await readFile(out+'/movement/cameras.json','utf8').catch(()=>'[]')):[];let frame=0;
  for(const name of ['shukobu','space','kyoto']){
   const a=views.find(v=>v.id===name+'-approach'),b=views.find(v=>v.id===name+'-near');
   for(let i=0;i<18;i++){
    const t=i/17,v={eye:a.eye.map((q,j)=>q*(1-t)+b.eye[j]*t),target:a.target.map((q,j)=>q*(1-t)+b.target[j]*t)};
    if(resume&&movement[frame]&&JSON.stringify(movement[frame].eye)===JSON.stringify(v.eye)){frame++;continue;}
    await setView(v);await page.screenshot({path:`${out}/movement/frame-${String(frame).padStart(3,'0')}.png`,timeout:120000});movement[frame]={frame,landmark:name,...v};frame++;await writeFile(out+'/movement/cameras.json',JSON.stringify(movement,null,2));
   }
   console.log('MOVEMENT',name);
  }
  await writeFile(out+'/movement/cameras.json',JSON.stringify(movement,null,2));
 }
 await writeFile(out+'/browser.json',JSON.stringify({mode,errors,consoleErrors,renderer:'Linux SwiftShader software',capture:'Full game; fixed test camera; paused render submission between screenshots',performanceMethod:'8 samples after 2 warmups; synchronous GL finish; paired layer visibility; draw-only wall time, not hardware frame time',performancePairs,records},null,2));
 assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);
}catch(e){await writeFile(out+'/browser-failure.json',JSON.stringify({error:String(e),errors,consoleErrors,diagnostic:await page.evaluate(()=>({loading:document.querySelector('#loading-message')?.textContent,state:window.kyotoState})).catch(()=>null)},null,2));throw e;}
finally{clearInterval(progress);await browser.close();}
