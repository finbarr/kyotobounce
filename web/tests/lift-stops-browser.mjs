import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Client,delay} from './api-client.mjs';
import {liftPartCenter} from '../public/lifts.js';
const [origin,fixture,out,manifest]=process.argv.slice(2);
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const spec=JSON.parse(await readFile(fixture+'/lift-spec.json')),identity=JSON.parse(await readFile(manifest||fixture+'/assets.json'));
const report={pass:false,...identity,checks:[],errors:[]};
const check=(pass,message)=>{assert(pass,message);report.checks.push(message);console.log('PASS',message);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});let other;
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',socket=>socket.on('framereceived',({payload})=>{const m=JSON.parse(String(payload));if(m.type==='error')report.errors.push('Service: '+m.message);}));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
 window.__liftStopsTest={aim(y){yaw=y;pitch=0;centerOnAim();},read(){return{lift:snapshot?.lifts.find(p=>p.id==='${spec.id}'),feet:self()?.feet,grounded:self()?.grounded,phase:snapshot?.phase,menu:liftFloors.open,parts:lifts.parts.map(p=>({id:p.part.id,position:p.mesh.position.toArray()}))};}};`}));
 const deadline=Date.now()+60000;while(!(await fetch(origin+'/api/health').then(r=>r.json()).catch(()=>null))?.worker){assert(Date.now()<deadline,'Fixture worker ready');await delay(250);}
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Lift floors verification',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 other=new Client(origin.replace(/^http/,'ws'));await other.join();
 const read=()=>page.evaluate(()=>__liftStopsTest.read());
 async function walk(z,yaw){await page.evaluate(y=>__liftStopsTest.aim(y),yaw+(spec.yaw||0));await page.keyboard.down('w');try{await page.waitForFunction(({z,yaw,spec})=>{const a=(spec.yaw||0)*Math.PI/180,p=kyotoState.feet,localZ=Math.sin(a)*(p.x-spec.origin.x)+Math.cos(a)*(p.z-spec.origin.z);return yaw===0?localZ>=z:localZ<=z;},{z,yaw,spec},{timeout:12000});}finally{await page.keyboard.up('w');}await page.waitForTimeout(200);}
 const startFloor=spec.stops.findIndex(s=>Math.abs(identity.spawn.y-spec.origin.y-s.height)<.06);assert(startFloor>=0);
 async function useLift(){await page.waitForFunction(()=>{const b=document.getElementById('lift-control');return b&&!b.hidden&&!b.disabled;},null,{timeout:5000});await page.keyboard.press('e');}
 if(startFloor!==0){await useLift();await page.waitForFunction(i=>{const l=__liftStopsTest.read().lift;return !l.busy&&l.landingDoors[i]>.99;},startFloor,{timeout:45000});check(true,'Call central car to the starting landing');}
 await walk(-.2,0);check((await read()).grounded,'Walk from lower landing into the five-floor car');
 await useLift();await page.locator('#lift-floors').waitFor({state:'visible'});
 check(await page.locator('#lift-floors button[data-stop]').count()===5,'Floor picker offers all five named destinations');
 check(await page.locator('#lift-floors [data-stop="'+spec.stops[startFloor].id+'"]').isDisabled(),'Current floor is identified and disabled');
 await page.screenshot({path:out+'/floor-picker.png'});
 const feet=(await read()).feet;await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
 let s=await read();check(s.phase==='Aim'&&Math.hypot(s.feet.x-feet.x,s.feet.y-feet.y,s.feet.z-feet.z)<.02,'Floor picker suspends walking and throwing');
 await page.getByRole('button',{name:'Cancel',exact:true}).focus();await page.keyboard.press('Space');
 check(!(await read()).menu&&(await read()).phase==='Aim','Space activates the focused dialog button without throwing');
 await useLift();
 await page.keyboard.press('Escape');check(!(await read()).menu,'Escape closes the floor picker');
 // HTMLDialogElement queues its close event. Reopening in that same task must
 // not let the old event clear the new menu's selected lift or steal focus.
 await page.evaluate(async()=>{
  const dialog=document.getElementById('lift-floors'),control=document.getElementById('lift-control');
  control.click();
  const closed=new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
  dialog.lastElementChild.click();control.click();
  await closed;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
 check((await read()).menu,'Rapid floor picker close and reopen keeps the new dialog open');
 await page.keyboard.press('Escape');
 for(const target of [2,1,4,3,0]){
  await useLift();await page.locator('#lift-floors [data-stop="'+spec.stops[target].id+'"]').click();
  await page.waitForFunction(()=>__liftStopsTest.read().lift.moving,null,{timeout:10000});
  s=await read();check(s.lift.landingDoors.every(v=>v===0)&&s.lift.carDoor===0,'All landing doors stay closed during the trip to '+spec.stops[target].id);
  check(await page.locator('#lift-control').isDisabled(),'Floor control is disabled during the trip to '+spec.stops[target].id);
  check(other.state.lifts.find(l=>l.id===spec.id).height===0,'Other private session remains at its starting floor');
  if(target===3){
   await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:15000});await page.waitForTimeout(350);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim',null,{timeout:10000});
   s=await read();check(Math.abs(s.feet.y-spec.origin.y-s.lift.height)<.09,'Throw and recall preserve the rider on a descending intermediate-floor trip');
  }
  await page.waitForFunction(i=>{const s=__liftStopsTest.read();return !s.lift.busy&&s.lift.landingDoors[i]>.99;},target,{timeout:45000});
  // Presentation intentionally trails the newest native snapshot. Wait for the
  // rendered doors too before comparing exact resting transforms.
  const pose={height:spec.stops[target].height,carDoor:1,lowerDoor:target===0?1:0,upperDoor:target===spec.stops.length-1?1:0,landingDoors:spec.stops.map((_,i)=>i===target?1:0)};
  const expected=spec.parts.map(p=>{const q=liftPartCenter(spec,p,pose);return{id:p.id,position:[q.x,q.y,-q.z]};});
  await page.waitForFunction(expected=>{const parts=__liftStopsTest.read().parts;return expected.every(e=>e.position.every((v,i)=>Math.abs(v-parts.find(p=>p.id===e.id).position[i])<.002));},expected,{timeout:3000});
  s=await read();check(s.grounded&&Math.abs(s.feet.y-spec.origin.y-spec.stops[target].height)<.06,'Rider reaches '+spec.stops[target].label+' grounded');
  for(const e of expected)assert(e.position.every((v,i)=>Math.abs(v-s.parts.find(p=>p.id===e.id).position[i])<.002),'Rendered part matches rotated native frame '+e.id);
  await walk(-2.8,180);s=await read();check(s.grounded&&Math.abs(s.feet.y-spec.origin.y-spec.stops[target].height)<.06,'Walk onto '+spec.stops[target].label+' landing');
  if(target===2)await page.screenshot({path:out+'/middle-landing.png'});
  if(target!==0)await walk(-.2,0);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');other?.close();await browser.close();}
