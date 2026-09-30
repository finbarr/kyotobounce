// Walk declared stair and aisle routes with Chrome keyboard controls.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),build=await read(component+'/report.json'),layout=await read(m.layout),report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,routes:[],errors:[]};
const previous=process.env.KYOTO_SKIP_REPORT?await read(process.env.KYOTO_SKIP_REPORT):null;
if(previous){assert.equal(previous.layoutSha256,m.layoutSha256);assert.equal(previous.geometrySha256,m.geometrySha256);assert.deepEqual(previous.errors,[]);report.reusedFrom=process.env.KYOTO_SKIP_REPORT;}
const declaredTreads=new Set(build.geometry.stair?.stepIds||[]);
const treads=layout.panels.filter(p=>declaredTreads.has(p.id)||p.id.startsWith('isetan-')&&['stair-tread','stair-landing'].includes(p.role)).map(p=>({id:p.id,x0:Math.min(...p.vertices.map(v=>v.x)),x1:Math.max(...p.vertices.map(v=>v.x)),z0:Math.min(...p.vertices.map(v=>v.z)),z1:Math.max(...p.vertices.map(v=>v.z)),top:Math.max(...p.vertices.map(v=>v.y))}));
function treadSupport(feet,waypoint){
 const radius=.24;
 return treads.map(t=>{
  const distance=Math.hypot(Math.max(t.x0-feet.x,0,feet.x-t.x1),Math.max(t.z0-feet.z,0,feet.z-t.z1));
  // The spherical foot can touch a higher tread edge before its centre reaches
  // that tread. Compare against that contact height, as for generated ramps.
  const expectedFeet=t.top-radius+Math.sqrt(Math.max(0,radius*radius-distance*distance));
  return {...t,distance,expectedFeet};
 }).filter(t=>t.distance<=radius&&Math.abs(t.top-waypoint.y)<.25&&Math.abs(feet.y-t.expectedFeet)<.07).sort((a,b)=>b.expectedFeet-a.expectedFeet)[0];
}
// Generated stairs use the contour-cell interpolation from StairGeometry.Create
// for players. Check the height at the actual foot position on that ramp,
// rather than treating the nearest riser waypoint as a flat floor.
const ramps=[];
for(const id of build.geometry.generatedStairs||[]){
 const f=layout.flights.find(f=>f.id===id);assert(f&&f.role!=='escalator',id);
 for(let row=0;row<f.contours.length-1;row++)for(let col=0;col<f.contours[row].points.length-1;col++){
  const vertices=[[row,col],[row,col+1],[row+1,col+1],[row+1,col]].map(([r,c])=>{const p=f.contours[r].points[c];return{x:p.x,y:f.baseElevation+r*f.rise,z:p.y};});
  for(const ids of[[0,1,2],[0,2,3]]){
   const points=ids.map(i=>vertices[i]),[a,b,c]=points,u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-a.x,c.y-a.y,c.z-a.z],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],normalY=Math.abs(n[1])/Math.hypot(...n);
   const length=Math.hypot(...n),sign=Math.sign(n[1]);ramps.push({id,points,normalY,normal:n.map(v=>v/length*sign),x0:Math.min(...points.map(p=>p.x)),x1:Math.max(...points.map(p=>p.x)),z0:Math.min(...points.map(p=>p.z)),z1:Math.max(...points.map(p=>p.z))});
  }
 }
}
function rampSupport(feet){
 const hits=[],radius=.24;
 for(const r of ramps){
  if(feet.x<r.x0-radius||feet.x>r.x1+radius||feet.z<r.z0-radius||feet.z>r.z1+radius)continue;
  const[a,b,c]=r.points,det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-12)continue;
  // Test the spherical foot's contact point, which lies uphill of its centre.
  // Include triangle edges so flat-to-slope joins also use finite geometry.
  const x=feet.x-radius*r.normal[0],z=feet.z-radius*r.normal[2];
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det,w=1-u-v,contacts=[];
  if(Math.min(u,v,w)>=-1e-6)contacts.push(u*a.y+v*b.y+w*c.y+radius*r.normalY-radius);
  for(const[p,q]of[[a,b],[b,c],[c,a]]){
   const dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz);if(length<1e-9)continue;
   const along=((feet.x-p.x)*dx+(feet.z-p.z)*dz)/length,across=((feet.x-p.x)*dz-(feet.z-p.z)*dx)/length;
   if(Math.abs(across)>radius)continue;
   const reach=Math.sqrt(radius*radius-across*across),slope=(q.y-p.y)/length,t=Math.max(0,Math.min(length,along+reach*slope/Math.sqrt(1+slope*slope)));
   if(Math.abs(t-along)<=reach)contacts.push(p.y+slope*t+Math.sqrt(Math.max(0,reach*reach-(t-along)**2))-radius);
  }
  if(!contacts.length)continue;
  const expectedFeet=Math.max(...contacts);if(Math.abs(expectedFeet-feet.y)>.35)continue;
  hits.push({id:r.id,expectedFeet,walkable:r.normalY>=Math.cos(48*Math.PI/180)});
 }
 return hits.sort((a,b)=>b.expectedFeet-a.expectedFeet)[0];
}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),waiters=[];page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const msg=JSON.parse(String(payload));if(msg.type==='error')report.errors.push(msg.message);for(const w of [...waiters])if(w.type===msg.type||msg.type==='error'){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(msg);}}));
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+'\nwindow.__isetanGround={send,aim(y){yaw=y;pitch=0;centerOnAim();},read(){return {feet:self()?.feet,grounded:self()?.grounded};}};'}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Isetan connected route check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 async function request(type,data,expected){const pending=new Promise((resolve,reject)=>{const w={type:expected,resolve,timer:setTimeout(()=>reject(Error('No '+expected)),15000)};waiters.push(w);});await page.evaluate(({type,data})=>__isetanGround.send(type,data),{type,data});const msg=await pending;assert.notEqual(msg.type,'error',msg.message);return msg;}
 const labels=build.geometry.chromeRoutes||['Ground to second stair','Ground to second stair return','Second floor northern bypass','Second entrance to stair','Ground entrance to stair','B1 to ground stair','Isetan internal stair'];
 for(const label of labels){const route=build.geometry.routes.find(r=>r.label===label);assert(route);const passed=previous?.routes.find(r=>r.label===label&&r.pass);if(passed){assert.deepEqual(passed.checks.map(c=>c.point),route.points.slice(1));report.routes.push(passed);continue;}const row={label,checks:[],pass:false};report.routes.push(row);const start=route.points[0],placed=await request('place',{slot:'start',radius:.3,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(placed.disk);await request('design-start',{start:placed.disk},'design-ready');await page.waitForFunction(p=>{const feet=window.kyotoState?.feet;return feet&&Math.hypot(feet.x-p.x,feet.z-p.z)<.1&&Math.abs(feet.y-p.y)<.06;},start);await page.waitForTimeout(200);
  for(const p of route.points.slice(1)){
   const feet=await page.evaluate(()=>kyotoState.feet);await page.evaluate(y=>__isetanGround.aim(y),Math.atan2(p.x-feet.x,p.z-feet.z)*180/Math.PI);
   await page.keyboard.down('w');try{await page.waitForFunction(p=>{const feet=window.kyotoState?.feet;return feet&&Math.hypot(feet.x-p.x,feet.z-p.z)<.16;},p,{timeout:35000});}catch(e){row.failure={point:p,from:feet,state:await page.evaluate(()=>({feet:kyotoState.feet,yaw:kyotoState.yaw,mode:kyotoState.mode,phase:kyotoState.phase,activeElement:document.activeElement?.outerHTML}))};await page.screenshot({path:out+'/failure.png'});throw Error(label+' '+JSON.stringify(row.failure),{cause:e});}finally{await page.keyboard.up('w');}
   // The capsule can contact the next tread before its center crosses the riser.
   // Require a nearby tread at the actual foot height as well as the route height.
   await page.waitForTimeout(180);const at=await page.evaluate(()=>__isetanGround.read()),tread=rampSupport(at.feet)||treadSupport(at.feet,p),floor=tread?.top??p.y,expectedFeet=tread?.expectedFeet??floor;row.checks.push({point:p,...at,support:tread?.id,expectedFloor:floor,expectedFeet});assert(at.grounded&&tread?.walkable!==false&&Math.abs(at.feet.y-expectedFeet)<.07&&Math.abs(at.feet.y-p.y)<.25,label+' landing '+JSON.stringify(at));
  }
  row.pass=true;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Chrome',label,row.checks.length,'waypoints');
 }
 await page.screenshot({path:out+'/arrival.png'});assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
