import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { get } from 'node:http';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client, delay } from './api-client.mjs';

const out='artifacts/phase3/async-play/recovery';await mkdir(out,{recursive:true});
const serverPid=Number(process.env.KYOTO_SERVER_PID);
assert.ok(serverPid,'Pass the verified task-owned KYOTO_SERVER_PID');
assert.match(execFileSync('ps',['-p',String(serverPid),'-o','command='],{encoding:'utf8'}).trim(),/^(?:\S+\/)?node web\/server\.ts$/);
assert.ok(execFileSync('lsof',['-a','-p',String(serverPid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').includes(`n${process.cwd()}`));
function workerPid(){
 const children=execFileSync('pgrep',['-P',String(serverPid)],{encoding:'utf8'}).trim().split(/\s+/).map(Number);
 assert.equal(children.length,1,'Exactly one physics child');
 assert.match(execFileSync('ps',['-p',String(children[0]),'-o','command='],{encoding:'utf8'}),/Kyoto Physics Worker.app\/Contents\/MacOS\/Kyoto Physics Worker/);
 return children[0];
}
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const health=()=>new Promise((resolve,reject)=>{
 const request=get({hostname:'127.0.0.1',port:4173,path:'/api/health',agent:false,family:4},r=>{let body='';r.on('data',c=>body+=c);r.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});});
 request.on('error',reject);request.setTimeout(2000,()=>request.destroy(new Error('Health timed out')));
});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
const errors=[],messages=[],recoveries=[];let spectator,before,guestId,identityId,connectionClosed=false;
const db=new DatabaseSync('web/data/kyoto.sqlite',{readOnly:true});
const savedCount=()=>db.prepare('SELECT count(*) AS n FROM attempts WHERE guest=?').get(identityId).n;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
page.on('pageerror',e=>errors.push(e.message));
const sent=[];
page.on('websocket',ws=>{ws.on('close',()=>{connectionClosed=true;});ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));messages.push(m);});ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type!=='input')sent.push(m);});});
async function killAndRecover(label,pid=workerPid()){
 const time=performance.now(),index=messages.length;process.kill(pid,'SIGKILL');
 await page.waitForFunction(()=>!window.kyotoState.ready&&document.getElementById('connection').textContent==='Restoring physics',null,{timeout:5000});
 assert.equal(await page.locator('#power-number').textContent(),'0%');
 await page.waitForFunction(()=>window.kyotoState?.ready&&window.kyotoState.phase==='Aim'&&window.kyotoState.avatarCount===1&&window.kyotoState.challenge?.id==='atrium-first-bank',null,{timeout:30000});
 assert.equal(alive(pid),false);const replacement=workerPid();assert.notEqual(replacement,pid);
 const h=await health();assert.equal(h.status,'ready');assert.equal(h.error,'');
 await spectator.next(m=>m.type==='state'&&m.challenge?.id==='atrium-return-ticket');assert.deepEqual(spectator.state.players.map(p=>p.id),[spectator.id]);
 const after=await page.evaluate(()=>({guestId:window.kyotoState.guestId,challenge:window.kyotoState.challenge,board:window.kyotoState.board}));assert.deepEqual(after,before);
 assert.equal(savedCount(),0,'Interrupted attempts must not be persisted');
 assert.equal(messages.slice(index).some(m=>m.type==='result'),false);
 assert.equal(messages.slice(index).filter(m=>m.type==='worker-status'&&m.status==='recovering').length,1,'No duplicate failure reports');
 recoveries.push({label,killedPid:pid,replacementPid:replacement,milliseconds:Math.round(performance.now()-time)});
 console.log('PASS recovery:',label,replacement);
}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>window.kyotoState.avatarCount),1,'Only the local robot is visible');
 await page.getByRole('button',{name:'First Bank',exact:true}).click();
 await page.waitForFunction(()=>window.kyotoState.challenge?.id==='atrium-first-bank'&&window.kyotoState.board?.length);
 guestId=await page.evaluate(()=>window.kyotoState.guestId);identityId=await page.evaluate(()=>window.kyotoState.identityId);
 before=await page.evaluate(()=>({guestId:window.kyotoState.guestId,challenge:window.kyotoState.challenge,board:window.kyotoState.board}));
 const replayId=before.board[0].attempt;
 const originalReplay=db.prepare('SELECT replay FROM attempts WHERE id=?').get(replayId).replay;
 spectator=new Client();await spectator.join();await spectator.request('select-challenge',{challengeId:'atrium-return-ticket'},'selected');
 await page.waitForFunction(()=>window.kyotoState.avatarCount===1);
 await page.locator('#use-hint').click();await page.locator('#game').focus();await delay(200);await page.keyboard.down('Space');await delay(365);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.kyotoState.phase==='Flight');await killAndRecover('in-flight SIGKILL');
 await page.keyboard.down('Space');await page.waitForFunction(()=>window.kyotoState.phase==='Charging');
 await killAndRecover('charging SIGKILL');await page.keyboard.up('Space');await delay(500);
 assert.equal(await page.evaluate(()=>window.kyotoState.phase),'Aim','Releasing a stale charge must not throw');
 const stalled=workerPid();process.kill(stalled,'SIGSTOP');
 const rpcStart=performance.now();
 const pending=spectator.request('place',{slot:'goal',radius:1,origin:{x:0,y:3,z:20},direction:{x:0,y:-1,z:0}},'placement').then(()=>({unexpected:true}),error=>({message:error.message,elapsed:performance.now()-rpcStart}));
 await delay(150);await killAndRecover('pending validation SIGKILL',stalled);
 const rpc=await pending;assert.match(rpc.message,/interrupted/);assert.ok(rpc.elapsed<2000,'Pending requests reject promptly');
 assert.equal(db.prepare('SELECT replay FROM attempts WHERE id=?').get(replayId).replay,originalReplay,'Saved replay remains byte-identical');
 const shotIndex=messages.length;
 await page.locator('#use-hint').click();await page.locator('#game').focus();await delay(200);await page.keyboard.down('Space');await delay(365);await page.keyboard.up('Space');
 const deadline=performance.now()+45000;let result;
 while(!(result=messages.slice(shotIndex).find(m=>m.type==='result'))){assert.equal(connectionClosed,false,'Browser connection must remain open');if(performance.now()>deadline)throw new Error('Post-recovery shot did not finish');await delay(100);}
 assert.equal(result.success,true);assert.equal(result.saved,true);assert.equal(result.score,1100);assert.equal(savedCount(),1);
 await page.screenshot({path:`${out}/restored.png`});
 console.log('PASS successful scored throw after recovery');
 const finalPid=workerPid();process.kill(finalPid,'SIGKILL');
 await page.waitForFunction(()=>document.getElementById('connection').textContent==='Physics stopped',null,{timeout:5000});
 await delay(5000);assert.equal(alive(finalPid),false);assert.equal((await health()).status,'failed');
 let children='';try{children=execFileSync('pgrep',['-P',String(serverPid)],{encoding:'utf8'}).trim();}catch{}assert.equal(children,'','Repeated failures must stop restarting');
 assert.equal(savedCount(),1);assert.deepEqual(errors,[]);
 const evidence={status:'pass',scope:'Native worker kills preserve two independent selected levels and private sessions, without reloading the browser',serverPid,guestId,recoveries,pendingRequest:rpc,successfulRetry:{score:result.score,attempt:result.attempt},savedReplaySha256:hash(originalReplay),boundedRestarts:3,stoppedAfterFourthKill:true,errors};
 await writeFile(`${out}/result.json`,JSON.stringify(evidence,null,2)+'\n');console.log('PASS bounded recovery, cancelled attempts, preserved replay and guests; service needs normal restart after the deliberate circuit-breaker test');
}catch(error){await page.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),recoveries,errors,sent,messages:messages.filter(m=>!['state','catalog','leaderboard'].includes(m.type)).slice(-30),state:await page.evaluate(()=>({game:window.kyotoState,focus:document.activeElement.id,notice:document.getElementById('notice').textContent}))},null,2));throw error;}
finally{spectator?.close();await context.close();await browser.close();db.close();}
