// Exercise declared component lifts in the real client using native placement,
// ordinary keyboard walking and the public lift control; no client teleporting.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {liftPartCenter} from '../../public/lifts.js';
const [origin,manifest,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),layout=await read(m.layout),motion=await read(component+'/motion.json');
const report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,lifts:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),waiters=[];page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const msg=JSON.parse(String(payload));if(msg.type==='error')report.errors.push(msg.message);for(const w of [...waiters])if(w.type===msg.type||msg.type==='error'){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(msg);}}));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
 window.__componentLift={send,aim(y){yaw=y;pitch=0;centerOnAim();},read(id){return{pose:snapshot?.lifts.find(l=>l.id===id),feet:self()?.feet,grounded:self()?.grounded,parts:lifts.parts.map(p=>({id:p.part.id,position:p.mesh.position.toArray()}))};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Terrace lift check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 async function request(type,data,expected){const pending=new Promise((resolve,reject)=>{const w={type:expected,resolve,timer:setTimeout(()=>reject(Error('No '+expected)),15000)};waiters.push(w);});await page.evaluate(({type,data})=>__componentLift.send(type,data),{type,data});const msg=await pending;assert.notEqual(msg.type,'error',msg.message);return msg;}
 for(const source of motion.lifts){
  const l=layout.lifts.find(l=>l.id===source.id),a=(l.yaw||0)*Math.PI/180,threshold={x:l.origin.x-1.95*Math.sin(a),y:l.origin.y,z:l.origin.z-1.95*Math.cos(a)},row={id:l.id,checks:[],pass:false};report.lifts.push(row);
  const placed=await request('place',{slot:'start',radius:.3,origin:{...threshold,y:threshold.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(placed.disk);
  await request('design-start',{start:placed.disk},'design-ready');await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.1,threshold);await page.waitForTimeout(200);
  const read=()=>page.evaluate(id=>__componentLift.read(id),l.id);
  async function walk(z,inward){await page.evaluate(y=>__componentLift.aim(y),(l.yaw||0)+(inward?0:180));await page.keyboard.down('w');try{await page.waitForFunction(({l,z,inward})=>{const p=kyotoState.feet,a=(l.yaw||0)*Math.PI/180,v=Math.sin(a)*(p.x-l.origin.x)+Math.cos(a)*(p.z-l.origin.z);return inward?v>=z:v<=z;},{l,z,inward},{timeout:10000});}finally{await page.keyboard.up('w');}await page.waitForTimeout(220);}
  await walk(-.2,true);let s=await read();assert(s.grounded&&Math.abs(s.feet.y-l.origin.y)<.06);row.checks.push('Walk from street into car');
  await page.keyboard.press('e');await page.waitForFunction(id=>__componentLift.read(id).pose.moving,l.id,{timeout:12000});
  s=await read();assert(s.grounded&&Math.abs(s.feet.y-l.origin.y-s.pose.height)<.09);assert(s.pose.carDoor===0&&s.pose.lowerDoor===0&&s.pose.upperDoor===0);row.checks.push('Grounded ascent with all doors closed');
  await page.waitForFunction(id=>{const p=__componentLift.read(id).pose;return p.upperDoor>.99&&!p.busy;},l.id,{timeout:20000});
  const pose={height:l.height,carDoor:1,lowerDoor:0,upperDoor:1},expected=l.parts.map(p=>{const q=liftPartCenter(l,p,pose);return{id:p.id,position:[q.x,q.y,-q.z]};});
  await page.waitForFunction(({id,expected})=>{const parts=__componentLift.read(id).parts;return expected.every(e=>e.position.every((v,i)=>Math.abs(v-parts.find(p=>p.id===e.id).position[i])<.002));},{id:l.id,expected},{timeout:3000});row.checks.push('Rendered parts match native rotated arrival');
  await walk(-1.95,false);s=await read();assert(s.grounded&&Math.abs(s.feet.y-l.origin.y-l.height)<.06);row.checks.push('Exit onto terrace landing');await page.screenshot({path:out+'/'+l.id+'-upper.png'});
  await walk(-.2,true);await page.keyboard.press('e');await page.waitForFunction(id=>{const p=__componentLift.read(id).pose;return p.lowerDoor>.99&&!p.busy;},l.id,{timeout:20000});await walk(-1.95,false);s=await read();assert(s.grounded&&Math.abs(s.feet.y-l.origin.y)<.06);row.checks.push('Return and exit onto street');row.pass=true;console.log('PASS Chrome',row.id,row.checks.length);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
