import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import { openSync,closeSync } from 'node:fs';
import { spawn,execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { get as httpGet } from 'node:http';
import assert from 'node:assert/strict';
const out='artifacts/phase3/browser-restart';await mkdir(out,{recursive:true});
const pid=Number(process.env.KYOTO_SERVER_PID);if(!pid)throw new Error('Pass the verified task-owned KYOTO_SERVER_PID');
const command=execFileSync('ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}).trim();assert.match(command,/^(?:\S+\/)?node web\/server\.ts$/);
const workerPid=Number(execFileSync('pgrep',['-P',String(pid)],{encoding:'utf8'}).trim());assert.ok(workerPid);assert.match(execFileSync('ps',['-p',String(workerPid),'-o','command='],{encoding:'utf8'}),/Kyoto Physics Worker.app\/Contents\/MacOS\/Kyoto Physics Worker/);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];let replay,lastChild;
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='replay')replay=m.replay;}catch{}}));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const health=()=>new Promise(resolve=>{const request=httpGet('http://127.0.0.1:4173/api/health',{agent:false},response=>{let body='';response.on('data',chunk=>body+=chunk);response.on('end',()=>{try{resolve(JSON.parse(body));}catch{resolve({error:'Health response was not JSON',status:response.statusCode});}});});request.on('error',error=>resolve({error:error.message}));request.setTimeout(2000,()=>request.destroy(new Error('Health request timed out')));});
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.challenge?.id==='atrium-first-bank'&&window.kyotoState?.challenge?.scoring==='distinct-v1'&&window.kyotoState?.challenge?.allowedInputs&&window.kyotoState?.board?.length);
 const before=await page.evaluate(()=>({guestId:window.kyotoState.guestId,challenge:window.kyotoState.challenge,board:window.kyotoState.board}));
 await page.locator('.score-row').first().click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');const beforeHash=hash(replay);
 process.kill(pid,'SIGTERM');const stoppedAt=performance.now();while(alive(pid)||alive(workerPid)){if(performance.now()-stoppedAt>12000)throw new Error('Server/worker did not shut down');await sleep(100);}
 const fd=openSync('artifacts/phase3/worker/server.log','a');lastChild=spawn(process.execPath,['web/server.ts'],{cwd:process.cwd(),detached:true,stdio:['ignore',fd,fd]});closeSync(fd);lastChild.unref();const startedAt=performance.now();
 let lastHealth;while(true){lastHealth=await health();if(lastHealth?.worker)break;if(performance.now()-startedAt>60000)throw new Error('Restarted worker not ready: '+JSON.stringify(lastHealth));await sleep(200);}
 const workerStartupMs=performance.now()-startedAt;await page.reload();await page.waitForFunction(()=>window.kyotoState?.ready&&window.kyotoState?.board?.length,null,{timeout:120000});
 const after=await page.evaluate(()=>({guestId:window.kyotoState.guestId,challenge:window.kyotoState.challenge,board:window.kyotoState.board}));assert.deepEqual(after,before);
 replay=null;await page.locator('.score-row').first().click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');assert.equal(hash(replay),beforeHash);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/recovered-replay.png`});await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Same browser guest/challenge/board/replay after verified service and worker shutdown/restart',headless:true,guestId:before.guestId,challengeId:before.challenge.id,boardEntries:before.board.length,replaySha256:beforeHash,workerStartupMs,stoppedPids:[pid,workerPid],serverPid:lastChild.pid,errors},null,2));console.log('PASS restart preserves browser guest, selected challenge, board and byte-identical replay; server PID',lastChild.pid);
}catch(error){await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),serverPid:lastChild?.pid,errors},null,2));throw error;}finally{await context.close();await browser.close();}
