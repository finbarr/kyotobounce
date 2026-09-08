// Ordinary game loop and native WebSocket; no camera/heartbeat/render proxies.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const approach=process.env.KYOTO_WAYFINDING_APPROACH||'hall';assert.ok(['hall','west','east'].includes(approach));
const tag=process.argv[2]||'after',out=`.local/station-detail/${tag}`;
await mkdir(out,{recursive:true});
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4286';
assert.equal(new URL(origin).port,'4286','Only assigned isolated port');
const browser=await chromium.launch({executablePath:process.env.KYOTO_CHROME||'/usr/bin/google-chrome',headless:true,args:process.platform==='darwin'?['--use-angle=metal']:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:640},recordVideo:{dir:out,size:{width:960,height:640}}});
const page=await context.newPage(),errors=[],samples=[],connections=[];let nativeStates=0;
page.on('pageerror',e=>errors.push(e.message));
page.on('websocket',ws=>{connections.push({url:ws.url(),closed:false});const connection=connections.at(-1);ws.on('close',()=>connection.closed=true);ws.on('framereceived',e=>{try{if(JSON.parse(String(e.payload)).type==='state')nativeStates++;}catch{}});});
let status='pass',failure;
try{
 if(tag==='before')await page.route('**/station-details.js',async route=>route.fulfill({body:await readFile('.local/station-detail/station-details-before.js','utf8'),contentType:'text/javascript'}));
 await page.goto(origin);await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:90000});
 const sample=async label=>{const state=await page.evaluate(()=>window.kyotoState);samples.push({label,state});console.log(label,JSON.stringify({feet:state.feet,ready:state.ready,frameMs:state.render.frameMs.slice(-5)}));return state;};
 await page.getByRole('button',{name:`K030 ${approach} sign approach`,exact:true}).click({timeout:15000});
 await page.locator('#briefing-play').click({timeout:15000});
 await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition,null,{timeout:30000});
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Free exploration',exact:true}).click({timeout:15000});
 const start=await sample('entrance');
 await page.screenshot({path:`${out}/entrance.png`,timeout:45000});
 await page.locator('canvas').focus();await page.keyboard.down('ShiftLeft');await page.keyboard.down('w');await page.waitForFunction(p=>{const s=window.kyotoState;return Math.hypot(s.feet.x-p.x,s.feet.z-p.z)>.5},start.feet,{timeout:30000}).finally(()=>page.keyboard.up('w'));await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');
 const moved=await sample('walk');
 assert.ok(Math.hypot(moved.feet.x-start.feet.x,moved.feet.z-start.feet.z)>.5,'Native feet move using keyboard');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1500);await page.keyboard.up('ArrowLeft');await sample('orbit');
 await page.screenshot({path:`${out}/moving-view.png`,timeout:45000});
 assert.ok(nativeStates>10,'Real native state stream');assert.ok(connections.every(c=>!c.closed),'No lost live connection');assert.deepEqual(errors,[]);
}catch(e){status='fail';failure=String(e);console.log(failure);samples.push({label:'failure',state:await page.evaluate(()=>window.kyotoState).catch(()=>null)});}
const art=await page.evaluate(()=>window.kyotoArt).catch(()=>null);
await context.close();await browser.close();
await writeFile(`${out}/runtime.json`,JSON.stringify({status,failure,origin,approach,render:'Unmodified normal game loop; software GPU on Linux',nativeStates,connections,errors,art,samples},null,2));
if(status!=='pass')process.exitCode=1;
