// Walk the entry loop and both directions of the stacked stairs in real Chrome.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),build=await read(component+'/report.json'),layout=await read(m.layout),report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,routes:[],errors:[]};
const previous=process.env.KYOTO_SKIP_REPORT?await read(process.env.KYOTO_SKIP_REPORT):null;
if(previous){assert.equal(previous.layoutSha256,m.layoutSha256);assert.equal(previous.geometrySha256,m.geometrySha256);assert.deepEqual(previous.errors,[]);report.reusedFrom=process.env.KYOTO_SKIP_REPORT;}
const treads=layout.panels.filter(p=>p.id.startsWith('isetan-')&&['stair-tread','stair-landing'].includes(p.role)).map(p=>({id:p.id,x0:Math.min(...p.vertices.map(v=>v.x)),x1:Math.max(...p.vertices.map(v=>v.x)),z0:Math.min(...p.vertices.map(v=>v.z)),z1:Math.max(...p.vertices.map(v=>v.z)),top:Math.max(...p.vertices.map(v=>v.y))}));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),waiters=[];page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const msg=JSON.parse(String(payload));if(msg.type==='error')report.errors.push(msg.message);for(const w of [...waiters])if(w.type===msg.type||msg.type==='error'){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(msg);}}));
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+'\nwindow.__isetanGround={send,aim(y){yaw=y;pitch=0;centerOnAim();},read(){return {feet:self()?.feet,grounded:self()?.grounded};}};'}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Isetan connected route check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 async function request(type,data,expected){const pending=new Promise((resolve,reject)=>{const w={type:expected,resolve,timer:setTimeout(()=>reject(Error('No '+expected)),15000)};waiters.push(w);});await page.evaluate(({type,data})=>__isetanGround.send(type,data),{type,data});const msg=await pending;assert.notEqual(msg.type,'error',msg.message);return msg;}
 const labels=['Ground entrance and aisle loop','B1 to ground stair return','Isetan internal stair return','Isetan internal stair','B1 to ground stair'];
 for(const label of labels){const route=build.geometry.routes.find(r=>r.label===label);assert(route);const passed=previous?.routes.find(r=>r.label===label&&r.pass);if(passed){assert.deepEqual(passed.checks.map(c=>c.point),route.points.slice(1));report.routes.push(passed);continue;}const row={label,checks:[],pass:false};report.routes.push(row);const start=route.points[0],placed=await request('place',{slot:'start',radius:.3,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(placed.disk);await request('design-start',{start:placed.disk},'design-ready');await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.1&&Math.abs(kyotoState.feet.y-p.y)<.06,start);await page.waitForTimeout(200);
  for(const p of route.points.slice(1)){
   const feet=await page.evaluate(()=>kyotoState.feet);await page.evaluate(y=>__isetanGround.aim(y),Math.atan2(p.x-feet.x,p.z-feet.z)*180/Math.PI);
   await page.keyboard.down('w');try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.16,p,{timeout:35000});}catch(e){row.failure={point:p,from:feet,state:await page.evaluate(()=>({feet:kyotoState.feet,yaw:kyotoState.yaw,mode:kyotoState.mode,phase:kyotoState.phase,activeElement:document.activeElement?.outerHTML}))};await page.screenshot({path:out+'/failure.png'});throw Error(label+' '+JSON.stringify(row.failure),{cause:e});}finally{await page.keyboard.up('w');}
   // The capsule can contact the next tread before its center crosses the riser.
   // Require a nearby tread at the actual foot height as well as the route height.
   await page.waitForTimeout(180);const at=await page.evaluate(()=>__isetanGround.read()),tread=treads.filter(t=>Math.hypot(Math.max(t.x0-at.feet.x,0,at.feet.x-t.x1),Math.max(t.z0-at.feet.z,0,at.feet.z-t.z1))<=.265&&Math.abs(t.top-p.y)<.25&&Math.abs(at.feet.y-t.top)<.07).sort((a,b)=>Math.abs(a.top-at.feet.y)-Math.abs(b.top-at.feet.y))[0],floor=tread?.top??p.y;row.checks.push({point:p,...at,support:tread?.id,expectedFloor:floor});assert(at.grounded&&Math.abs(at.feet.y-floor)<.07&&Math.abs(at.feet.y-p.y)<.25,label+' landing '+JSON.stringify(at));
  }
  row.pass=true;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Chrome',label,row.checks.length,'waypoints');
 }
 await page.screenshot({path:out+'/arrival.png'});assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
