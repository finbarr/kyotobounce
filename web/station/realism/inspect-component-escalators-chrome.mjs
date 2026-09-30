// Native placement, ordinary keyboard boarding, passive riding and walking off
// in real Chrome. Verify the rendered treads also advance during each ride.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [origin,manifest,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),motion=await read(component+'/motion.json'),report={pass:false,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,rides:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),waiters=[];page.on('pageerror',e=>report.errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const msg=JSON.parse(String(payload));if(msg.type==='error')report.errors.push(msg.message);for(const w of [...waiters])if(w.type===msg.type||msg.type==='error'){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(msg);}}));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
 window.__componentEscalator={send,aim(y){yaw=y;pitch=0;centerOnAim();},read(id){const root=scene.getObjectByName(id),treads=root?.getObjectByName('exposed treads');return{feet:self()?.feet,grounded:self()?.grounded,treads:treads?{count:treads.count,matrix:Array.from(treads.instanceMatrix.array)}:null};}};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Terrace escalator check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 async function request(type,data,expected){const pending=new Promise((resolve,reject)=>{const w={type:expected,resolve,timer:setTimeout(()=>reject(Error('No '+expected)),15000)};waiters.push(w);});await page.evaluate(({type,data})=>__componentEscalator.send(type,data),{type,data});const msg=await pending;assert.notEqual(msg.type,'error',msg.message);return msg;}
 for(const e of motion.escalators){
  const d=Math.sign(e.speed),at=a=>({x:e.lowerCenter.x+e.uphill.x*a,y:e.lowerCenter.y+(a<0?0:a>e.run?e.height:e.height*a/e.run),z:e.lowerCenter.z+e.uphill.z*a}),along=p=>(p.x-e.lowerCenter.x)*e.uphill.x+(p.z-e.lowerCenter.z)*e.uphill.z,start=at(d>0?-e.flatLength-1.15:e.run+e.flatLength+1.15),end=at(d>0?e.run+e.flatLength+1.15:-e.flatLength-1.15),row={id:e.id,direction:d,samples:[],pass:false};report.rides.push(row);
  const placed=await request('place',{slot:'start',radius:.3,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(placed.disk);await request('design-start',{start:placed.disk},'design-ready');await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.1,start);await page.waitForTimeout(200);
  const read=()=>page.evaluate(id=>__componentEscalator.read(id),e.id);
  async function walk(target){await page.evaluate(y=>__componentEscalator.aim(y),Math.atan2(e.uphill.x*d,e.uphill.z*d)*180/Math.PI);await page.keyboard.down('w');try{await page.waitForFunction(({e,d,target})=>{const p=kyotoState.feet,a=(p.x-e.lowerCenter.x)*e.uphill.x+(p.z-e.lowerCenter.z)*e.uphill.z;return d*(a-target)>=0;},{e,d,target},{timeout:12000});}finally{await page.keyboard.up('w');}await page.waitForTimeout(180);}
  await walk(d>0?1:e.run-1);let s=await read();assert(s.grounded);assert(s.treads?.count>0,e.id+' visible treads');const first=s.treads.matrix,from=along(s.feet),deadline=Date.now()+30000;let last=from;
  while(d>0?along(s.feet)<e.run+.4:along(s.feet)>-.4){await page.waitForTimeout(150);s=await read();const a=along(s.feet);assert(s.grounded,e.id+' lost ground');assert(d*(a-last)>-.03,e.id+' moved against the lane');assert(Math.abs(s.feet.y-at(a).y)<.17,e.id+' feet differ from slope');assert(Date.now()<deadline,e.id+' stalled');row.samples.push({feet:s.feet,grounded:s.grounded,treadCount:s.treads.count});last=a;}
  assert(first.some((v,i)=>Math.abs(v-s.treads.matrix[i])>.01),e.id+' rendered treads did not move');row.travel=d*(along(s.feet)-from);assert(row.travel>e.run-1.8);
  await walk(along(end));s=await read();assert(s.grounded&&Math.abs(s.feet.y-end.y)<.06,e.id+' landing height');row.endpoint=s.feet;row.renderedTreadsMoved=true;row.pass=true;await page.screenshot({path:out+'/'+e.id+'-arrival.png'});await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Chrome',e.id,'idle ride',row.travel.toFixed(3),'m');
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
