// Walk both flights and North Street, then return using actual browser controls.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(manifest)),geometry=JSON.parse(await readFile(component+'/report.json')).geometry,route=geometry.routes.find(r=>r.label==='Pavilion stair to North Street'),report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,checks:[],errors:[]};
assert.deepEqual(m.spawn,route.points[0]);
// Stop on flat landings: a capsule straddling a tread edge legitimately sits above its center's tread.
const forward=[...route.points.slice(0,3),{x:40.5,y:geometry.stair.mid,z:(geometry.stair.firstEnd+geometry.stair.secondStart)/2},...route.points.slice(7)];
const points=[...forward,...forward.toReversed().slice(1)];report.route='pavilion round trip';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+'\nwindow.__pavilionAim=(y)=>{yaw=y;pitch=0;centerOnAim();};'}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('pavilion route verification',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 for(const [i,p]of points.entries()){
  const feet=await page.evaluate(()=>kyotoState.feet);await page.evaluate(y=>__pavilionAim(y),Math.atan2(p.x-feet.x,p.z-feet.z)*180/Math.PI);
  await page.keyboard.down('w');try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.22,p,{timeout:35000});}finally{await page.keyboard.up('w');}
  await page.waitForTimeout(180);const at=await page.evaluate(()=>kyotoState.feet);report.checks.push({point:p,feet:at,expectedFloor:p.y});assert(Math.abs(at.y-p.y)<.07,'Route landing '+i+' '+JSON.stringify({feet:at,expectedFloor:p.y}));
 }
 await page.screenshot({path:out+'/arrival.png'});assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS Chrome pavilion '+report.route+' route, '+report.checks.length+' waypoints');
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
