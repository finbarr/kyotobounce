// Walk the Isetan B1 entry and food-hall loop with actual browser keyboard controls.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(manifest)),geometry=JSON.parse(await readFile(component+'/report.json')).geometry,route=geometry.routes.find(r=>r.label==='B1 station hall to Isetan loop'),report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,checks:[],errors:[]};
assert.deepEqual(m.spawn,route.points[0]);
const point=(x,y,z)=>({x,y,z});
const stair=geometry.routes.find(r=>r.label==='Isetan internal stair return');
const points=process.env.KYOTO_ISETAN_ROUTE==='stairs'?[
 m.spawn,point(-30,geometry.B1,0),point(-35,geometry.B1,3.5),point(-47,geometry.B1,3.5),point(-70,geometry.B1,3.5),point(-75,geometry.B1,3.5),...stair.points,
 point(-75,geometry.B2,18),point(-51,geometry.B2,18),point(-27,geometry.B2,18),point(-17,geometry.B2,18),point(-27,geometry.B2,18),point(-27,geometry.B2,1.5),point(-47,geometry.B2,1.5)
]:route.points;
report.route=process.env.KYOTO_ISETAN_ROUTE||'loop';
const treads=JSON.parse(await readFile(component+'/native-panels.json')).panels.filter(p=>['stair-tread','stair-landing'].includes(p.role)).map(p=>({id:p.id,x0:Math.min(...p.vertices.map(v=>v.x)),x1:Math.max(...p.vertices.map(v=>v.x)),z0:Math.min(...p.vertices.map(v=>v.z)),z1:Math.max(...p.vertices.map(v=>v.z)),top:Math.max(...p.vertices.map(v=>v.y))}));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+'\nwindow.__isetanAim=(y)=>{yaw=y;pitch=0;centerOnAim();};'}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Isetan route verification',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 for(const [i,p]of points.entries()){
  const feet=await page.evaluate(()=>kyotoState.feet);await page.evaluate(y=>__isetanAim(y),Math.atan2(p.x-feet.x,p.z-feet.z)*180/Math.PI);
  await page.keyboard.down('w');try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.22,p,{timeout:35000});}finally{await page.keyboard.up('w');}
  await page.waitForTimeout(180);const at=await page.evaluate(()=>kyotoState.feet);const tread=treads.filter(t=>at.x>=t.x0&&at.x<=t.x1&&at.z>=t.z0&&at.z<=t.z1).sort((a,b)=>b.top-a.top)[0];const floor=tread?.top??p.y;report.checks.push({point:p,feet:at,support:tread?.id,expectedFloor:floor});assert(Math.abs(at.y-floor)<.07,'Route landing '+i+' '+JSON.stringify({feet:at,expectedFloor:floor}));
 }
 await page.screenshot({path:out+'/arrival.png'});assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS Chrome Isetan '+report.route+' route, '+report.checks.length+' waypoints');
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
