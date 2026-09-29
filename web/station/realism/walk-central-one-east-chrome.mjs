// Normal keyboard movement through both gates, the public bypass, stairs and lift.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2);
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(manifest)),geometry=JSON.parse(await readFile(component+'/report.json')).geometry;
assert.deepEqual(m.spawn,geometry.browserRoute[0]);
const report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,route:geometry.browserRoute,waypoints:[],checks:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
window.__centralGate={aim(y){yaw=y;pitch=0;centerOnAim();},read(){return{lift:snapshot?.lifts?.find(l=>l.id==='subway-central-one-lift'),feet:self()?.feet,grounded:self()?.grounded};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Central 1 route verification',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 async function walk(p){
  const from=await page.evaluate(()=>kyotoState.feet);
  await page.evaluate(y=>__centralGate.aim(y),Math.atan2(p.x-from.x,p.z-from.z)*180/Math.PI);
  if(Math.hypot(p.x-from.x,p.z-from.z)>.22){
   await page.keyboard.down('w');try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.22,p,{timeout:35000});}finally{await page.keyboard.up('w');}
  }
  await page.waitForTimeout(180);const at=await page.evaluate(()=>__centralGate.read());
  assert(at.grounded&&Math.abs(at.feet.y-p.y)<.07,'Route landing '+JSON.stringify({at,expected:p}));report.waypoints.push({point:p,feet:at.feet});
 }
 for(const p of geometry.browserRoute)await walk(p);
 report.checks.push('Both gate entrances, the southern public bypass, stair descent and ascent, and upper lift approach');
 await page.screenshot({path:out+'/upper-lift-approach.png'});
 await page.keyboard.press('e');await page.waitForFunction(()=>__centralGate.read().lift.upperDoor>.99,null,{timeout:20000});
 await walk({x:177,y:-6.2,z:6.1});await page.keyboard.press('e');
 await page.waitForFunction(()=>__centralGate.read().lift.moving,null,{timeout:12000});
 let state=await page.evaluate(()=>__centralGate.read());assert(state.grounded&&Math.abs(state.feet.y-(-11.2+state.lift.height))<.09);
 await page.waitForFunction(()=>__centralGate.read().lift.lowerDoor>.99,null,{timeout:20000});
 await walk({x:177,y:-11.2,z:3.4});report.checks.push('Call the lift from the new gate route, enter, ride to the platform and walk out');
 await page.screenshot({path:out+'/platform-arrival.png'});assert.deepEqual(report.errors,[]);report.pass=true;
 console.log('PASS Chrome Central 1 route and lift:',report.waypoints.length,'waypoints');
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
