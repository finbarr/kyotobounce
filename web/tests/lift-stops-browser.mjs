import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Client,delay} from './api-client.mjs';
const [origin,fixture,out]=process.argv.slice(2);
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const spec=JSON.parse(await readFile(fixture+'/lift-spec.json')),identity=JSON.parse(await readFile(fixture+'/assets.json'));
const report={pass:false,...identity,checks:[],errors:[]};
const check=(pass,message)=>{assert(pass,message);report.checks.push(message);console.log('PASS',message);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});let other;
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',socket=>socket.on('framereceived',({payload})=>{const m=JSON.parse(String(payload));if(m.type==='error')report.errors.push('Service: '+m.message);}));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
 window.__liftStopsTest={aim(y){yaw=y;pitch=0;centerOnAim();},read(){return{lift:snapshot?.lifts.find(p=>p.id==='five-floor-test'),feet:self()?.feet,grounded:self()?.grounded,phase:snapshot?.phase,menu:liftFloors.open,parts:lifts.parts.map(p=>({id:p.part.id,position:p.mesh.position.toArray()}))};}};`}));
 const deadline=Date.now()+60000;while(!(await fetch(origin+'/api/health').then(r=>r.json()).catch(()=>null))?.worker){assert(Date.now()<deadline,'Fixture worker ready');await delay(250);}
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Lift floors verification',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 other=new Client(origin.replace(/^http/,'ws'));await other.join();
 const read=()=>page.evaluate(()=>__liftStopsTest.read());
 async function walk(z,yaw){await page.evaluate(y=>__liftStopsTest.aim(y),yaw);await page.keyboard.down('w');try{await page.waitForFunction(([z,yaw])=>yaw===0?kyotoState.feet.z>=z:kyotoState.feet.z<=z,[z,yaw],{timeout:12000});}finally{await page.keyboard.up('w');}await page.waitForTimeout(200);}
 await walk(-.2,0);check((await read()).grounded,'Walk from lower landing into the five-floor car');
 await page.keyboard.press('e');await page.locator('#lift-floors').waitFor({state:'visible'});
 check(await page.locator('#lift-floors button[data-stop]').count()===5,'Floor picker offers all five named destinations');
 check(await page.locator('#lift-floors [data-stop="b3"]').isDisabled(),'Current floor is identified and disabled');
 await page.screenshot({path:out+'/floor-picker.png'});
 const feet=(await read()).feet;await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
 let s=await read();check(s.phase==='Aim'&&Math.hypot(s.feet.x-feet.x,s.feet.y-feet.y,s.feet.z-feet.z)<.02,'Floor picker suspends walking and throwing');
 await page.getByRole('button',{name:'Cancel',exact:true}).focus();await page.keyboard.press('Space');
 check(!(await read()).menu&&(await read()).phase==='Aim','Space activates the focused dialog button without throwing');
 await page.keyboard.press('e');
 await page.keyboard.press('Escape');check(!(await read()).menu,'Escape closes the floor picker');
 for(const target of [2,1,4,3,0]){
  await page.keyboard.press('e');await page.locator('#lift-floors [data-stop="'+spec.stops[target].id+'"]').click();
  await page.waitForFunction(()=>__liftStopsTest.read().lift.moving,null,{timeout:10000});
  s=await read();check(s.lift.landingDoors.every(v=>v===0)&&s.lift.carDoor===0,'All landing doors stay closed during the trip to '+spec.stops[target].id);
  check(await page.locator('#lift-control').isDisabled(),'Floor control is disabled during the trip to '+spec.stops[target].id);
  check(other.state.lifts.find(l=>l.id===spec.id).height===0,'Other private session remains at its starting floor');
  if(target===3){
   await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:15000});await page.waitForTimeout(350);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim',null,{timeout:10000});
   s=await read();check(Math.abs(s.feet.y-s.lift.height)<.09,'Throw and recall preserve the rider on a descending intermediate-floor trip');
  }
  await page.waitForFunction(i=>{const s=__liftStopsTest.read();return !s.lift.busy&&s.lift.landingDoors[i]>.99;},target,{timeout:45000});
  // Presentation intentionally trails the newest native snapshot. Wait for the
  // rendered doors too before comparing exact resting transforms.
  await page.waitForFunction(({spec,target})=>{
   const parts=__liftStopsTest.read().parts;
   return spec.parts.filter(p=>p.motion==='landing').every(p=>{const pos=parts.find(r=>r.id===p.id).position;return Math.abs(pos[0]-(p.center.x+(p.floor===target?p.doorSide*spec.doorTravel:0)))<.002;});
  },{spec,target},{timeout:3000});
  s=await read();check(s.grounded&&Math.abs(s.feet.y-spec.stops[target].height)<.06,'Rider reaches '+spec.stops[target].label+' grounded');
  for(const p of spec.parts.filter(p=>p.motion==='landing')){
   const pos=s.parts.find(r=>r.id===p.id).position,open=p.floor===target?1:0;
   assert(Math.abs(pos[0]-(p.center.x+p.doorSide*spec.doorTravel*open))<.002);assert(Math.abs(pos[1]-(p.center.y+spec.stops[p.floor].height))<.002);
  }
  await walk(-2.8,180);s=await read();check(s.grounded&&Math.abs(s.feet.y-spec.stops[target].height)<.06,'Walk onto '+spec.stops[target].label+' landing');
  if(target===2)await page.screenshot({path:out+'/middle-landing.png'});
  if(target!==0)await walk(-.2,0);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');other?.close();await browser.close();}
