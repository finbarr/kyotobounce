import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Client,delay} from '../../tests/api-client.mjs';
const [origin,manifest,component,out,liftId]=process.argv.slice(2);
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const config=JSON.parse(await readFile(manifest)),spec=liftId?JSON.parse(await readFile(component+'/lift-specs.json')).find(l=>l.id===liftId):JSON.parse(await readFile(component+'/lift-spec.json'));
assert(spec,'Requested lift must exist');
const L=spec.origin.y,H=L+spec.height,Z=spec.origin.z,report={pass:false,lift:spec.id,spawn:config.spawn,layoutSha256:config.layoutSha256,geometrySha256:config.geometrySha256,checks:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});let other;
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
window.__liftInspection={aim(y){yaw=y;pitch=0;centerOnAim();},read(){return{lifts:snapshot?.lifts.filter(p=>p.id==='${spec.id}'),feet:self()?.feet,grounded:self()?.grounded,parts:lifts.parts.map(p=>({id:p.part.id,position:p.mesh.position.toArray()})),render:kyotoState.render};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Public lift inspection',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 // Connect the second session after first-use textures load, within the hello timeout.
 other=new Client(origin.replace(/^http/,'ws'));await other.join();await delay(200);assert.equal(other.state.lifts.find(p=>p.id===spec.id).height,0);
 const read=()=>page.evaluate(()=>__liftInspection.read());
 async function useLift(){await page.waitForFunction(()=>{const b=document.getElementById('lift-control');return b&&!b.hidden&&!b.disabled;},null,{timeout:5000});await page.keyboard.press('e');}
 async function walk(z,yaw){await page.evaluate(y=>__liftInspection.aim(y),yaw);await page.keyboard.down('w');try{await page.waitForFunction(([z,yaw])=>yaw===0?kyotoState.feet.z>=z:kyotoState.feet.z<=z,[z,yaw],{timeout:15000});}finally{await page.keyboard.up('w');}await page.waitForTimeout(180);}
 await page.evaluate(()=>__liftInspection.aim(0));await page.screenshot({path:out+'/passage.png'});
 await walk(Z-.2,0);let s=await read();assert(Math.abs(s.feet.y-L)<.06&&s.grounded,'Walk into the lower car');report.checks.push('Walk from public passage into the car');
 assert.match(await page.locator('#lift-control').innerText(),/Ride lift/);
 await page.locator('#lift-control').click();await walk(Z-1.39,180);await page.waitForTimeout(2200);
 s=await read();assert(s.lifts[0].blocked&&s.lifts[0].height===0&&s.lifts[0].carDoor>.95,'A player in the doorway holds both doors open');report.checks.push('Doorway sensor pauses departure until the player clears it');
 await walk(Z-.2,0);
 await page.waitForFunction(()=>__liftInspection.read().lifts[0].moving,null,{timeout:12000});
 s=await read();assert(Math.abs(s.feet.y-(L+s.lifts[0].height))<.08&&s.grounded);assert.equal(other.state.lifts.find(p=>p.id===spec.id).height,0,'The other private session remains at floor 0');report.checks.push('Native lift carries the player; private sessions stay independent');
 await page.waitForFunction(()=>{const s=__liftInspection.read();return s.lifts[0].upperDoor>.99&&!s.lifts[0].busy;},null,{timeout:20000});
 s=await read();assert(s.grounded);report.upper=s;await page.screenshot({path:out+'/upper-car.png'});
 await walk(Z-2.95,180);s=await read();assert(Math.abs(s.feet.y-H)<.06&&s.grounded);report.checks.push('Walk out onto the upper public landing');await page.screenshot({path:out+'/upper-landing.png'});
 // Return to the public passage while the car stays upstairs, and test the landing.
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'↶ Start',exact:true}).click();await page.getByRole('button',{name:'Close levels'}).click();await page.waitForTimeout(300);
 await page.evaluate(()=>__liftInspection.aim(0));await page.keyboard.down('w');await page.waitForTimeout(3000);await page.keyboard.up('w');s=await read();assert(s.feet.z<Z-1.5&&s.grounded&&Math.abs(s.feet.y-L)<.06,'Closed door blocks entry to the empty shaft');report.checks.push('Empty lower shaft remains inaccessible');
 await useLift();await page.waitForFunction(()=>{const p=__liftInspection.read().lifts[0];return p.lowerDoor>.99&&!p.busy;},null,{timeout:20000});await walk(Z-.2,0);await useLift();await page.waitForFunction(()=>{const p=__liftInspection.read().lifts[0];return p.upperDoor>.99&&!p.busy;},null,{timeout:20000});
 await useLift();
 await page.waitForFunction(()=>__liftInspection.read().lifts[0].moving,null,{timeout:12000});
 // A moving lift must survive the game's ahead simulation and recall rewind.
 await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');
 await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:15000});await page.waitForTimeout(400);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim',null,{timeout:10000});
 s=await read();assert(Math.abs(s.feet.y-(L+s.lifts[0].height))<.09,'Recall restores the rider at the car presentation time');report.checks.push('Throw and recall while descending preserve car and rider alignment');
 await page.waitForFunction(()=>{const p=__liftInspection.read().lifts[0];return p.lowerDoor>.99&&!p.busy;},null,{timeout:20000});await walk(Z-2.95,180);
 s=await read();assert(s.grounded&&Math.abs(s.feet.y-L)<.06);report.lower=s;report.checks.push('Return trip and exit to public passage');
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS',report.checks);
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');other?.close();await browser.close();}
