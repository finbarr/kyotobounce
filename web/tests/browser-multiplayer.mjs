import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-multiplayer';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const contexts=[],errors=[],records=[];
async function guest(storageState){
 const context=await browser.newContext({viewport:{width:1280,height:900},storageState,recordVideo:{dir:out,size:{width:1280,height:900}}});contexts.push(context);const page=await context.newPage(),messages=[],frames=new Map();
 page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='state'&&m.phase==='Flight'){frames.set(`${m.attempt}:${m.stationTime}`,{ball:m.ball,rotation:m.rotation,owner:m.owner});}else if(['result','room','leaderboard','replay','error'].includes(m.type))messages.push(m);}catch{}}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});return {context,page,messages,frames};
}
const state=g=>g.page.evaluate(()=>window.kyotoState);
async function name(g,name){await g.page.locator('#nickname').fill(name);await g.page.locator('#nickname').press('Tab');}
async function shot(g,hold){await g.page.locator('#use-hint').click();await g.page.locator('canvas').focus();await g.page.keyboard.down('Space');await g.page.waitForTimeout(hold);await g.page.keyboard.up('Space');await g.page.waitForFunction(()=>window.kyotoState?.phase==='Flight',null,{timeout:5000});}
try{
 const a=await guest();await name(a,'Kyoto A');const aid=(await state(a)).guestId;
 const b=await guest();await name(b,'Kyoto B');const bid=(await state(b)).guestId;assert.notEqual(aid,bid);
 await a.page.waitForFunction(()=>window.kyotoState?.guestCount===2);
 await a.page.getByRole('button',{name:'First Bank',exact:true}).click();await b.page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank');
 await b.page.locator('canvas').focus();await b.page.keyboard.press('Space');await b.page.getByText('Wait for your turn.',{exact:true}).waitFor();assert.equal((await state(a)).phase,'Aim');
 await shot(a,365);await b.page.waitForFunction(()=>window.kyotoState?.phase==='Flight');await b.page.mouse.move(850,450);await b.page.mouse.down({button:'right'});await b.page.mouse.move(990,470,{steps:8});await b.page.mouse.up({button:'right'});
 await a.page.locator('#result-label').filter({hasText:'CHALLENGE COMPLETE'}).waitFor({timeout:35000});await b.page.locator('#result-label').filter({hasText:'CHALLENGE COMPLETE'}).waitFor();
 const first=a.messages.find(m=>m.type==='result'&&m.success);assert.ok(first);assert.deepEqual(a.messages.find(m=>m.type==='result'&&m.attempt===first.attempt),b.messages.find(m=>m.type==='result'&&m.attempt===first.attempt));
 let common=0;for(const [key,frame]of a.frames)if(b.frames.has(key)){assert.deepEqual(frame,b.frames.get(key));common++;}assert.ok(common>20);
 assert.deepEqual((await state(a)).board,(await state(b)).board);assert.equal((await state(a)).turn,bid);
 await a.page.screenshot({path:`${out}/01-a-shared-result.png`});await b.page.screenshot({path:`${out}/02-b-shared-result.png`});
 await a.page.locator('#watch-result').click();await a.page.waitForFunction(()=>window.kyotoState?.mode==='replay');
 await b.page.getByRole('button',{name:'Return Ticket',exact:true}).click();await b.page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-return-ticket');await shot(b,298);
 const before=await state(b);await a.page.locator('#replay-scrub').focus();await a.page.keyboard.press('End');await a.page.waitForTimeout(600);const after=await state(b);
 assert.ok(after.flightTime>before.flightTime,'Replay seeking does not rewind the live attempt');assert.equal((await state(a)).mode,'replay');assert.ok(a.messages.some(m=>m.type==='replay'&&m.replay.attempt===first.attempt));
 await b.page.locator('#result-label').filter({hasText:'CHALLENGE COMPLETE'}).waitFor({timeout:35000});const second=b.messages.filter(m=>m.type==='result'&&m.success).at(-1);assert.equal(second.id,bid);assert.equal(second.score,1100);
 await a.page.locator('#close-replay').click();await a.page.waitForFunction(()=>window.kyotoState?.mode==='play');assert.deepEqual((await state(a)).board,(await state(b)).board);assert.equal((await state(a)).turn,aid);
 const saved=await b.context.storageState();await b.context.close();await a.page.waitForFunction(()=>window.kyotoState?.guestCount===1);const rejoined=await guest(saved);assert.equal((await state(rejoined)).guestId,bid);assert.ok((await state(rejoined)).board.some(e=>e.guest===bid&&e.score===1100));
 await a.page.waitForFunction(()=>window.kyotoState?.guestCount===2);await a.page.locator('#pass-turn').click();await rejoined.page.waitForFunction(id=>window.kyotoState?.turn===id,bid);
 await rejoined.page.screenshot({path:`${out}/03-rejoined-board-turn.png`});assert.deepEqual(errors,[]);
 records.push({guests:[aid,bid],matchingFlightFrames:common,attempts:[first.attempt,second.attempt],scores:[first.score,second.score],replayIsolation:{before:before.flightTime,after:after.flightTime},rejoin:true,pass:true});
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Two independent browser sessions, DOM turns/throws, identical authority poses/results/boards, spectator orbit, replay isolation, leave/rejoin and passing',headless:true,records,errors},null,2));console.log('PASS two-browser turns, matching throws/results/boards, replay isolation and rejoin');
}catch(error){for(const [i,c]of contexts.entries())await c.pages()[0]?.screenshot({path:`${out}/failure-${i}.png`}).catch(()=>{});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),records,errors},null,2));throw error;}finally{for(const c of contexts)await c.close();await browser.close();}
