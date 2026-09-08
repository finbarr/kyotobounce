// Generate a real replay on the immutable old layout, then view it read-only
// through the task-local current service. Never connects to production.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PhysicsWorker} from '../worker.ts';
import {Competition} from '../competition.ts';
import {Store} from '../store.ts';
import {withChallengeRules,SCORING_VERSION,THROW_MODEL} from '../types.ts';
import {scoreAttempt} from '../scoring.ts';
import {chromium} from 'playwright';
const out='artifacts/station-detail/photorealism',origin='http://127.0.0.1:4282';
const old=Object.keys(JSON.parse(await readFile('web/layout-assets.json','utf8')).layouts)[0];
const sha=s=>createHash('sha256').update(s).digest('hex');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
if(process.argv[2]==='seed'){
 process.env.KYOTO_WORKER_EXECUTABLE='/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64';
 process.env.KYOTO_LAYOUT=`web/public/assets/layouts/${old}/station-layout.json`;
 process.env.KYOTO_WORKER_LOG='.local/station-detail/archive-worker.log';
 assert.equal(sha(await readFile('/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')),'9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef');
 const worker=new PhysicsWorker(),store=new Store('.local/station-detail/archive-native.sqlite');
 const events=[],competition=new Competition(store,worker,m=>events.push(m));
 let ready;
 const readiness=new Promise(resolve=>ready=resolve);
 worker.on('message',m=>{if(m.type==='ready')competition.ready(m).then(()=>ready(m));else if(m.type==='state')competition.state(m);else if(m.type==='result')competition.result(m);});
 try{
  await worker.start();const info=await Promise.race([readiness,delay(65000).then(()=>{throw Error('Old-layout native readiness timeout');})]);
  const guest=store.guest(),member=await competition.add(guest,'k026-archive');
  const first=JSON.parse(await readFile('web/starter-challenges.json','utf8'))[0];
  const course=withChallengeRules({...first,id:`k026-old-${Date.now()}`,revision:1,name:'K026 historical native replay',creator:guest.id,layout:old,physics:info.physics,scoring:SCORING_VERSION,throwModel:THROW_MODEL});
  await worker.request({type:'validate',id:member.id,start:course.start,goal:course.goal,scoring:course.scoring});store.saveChallenge(course);
  await competition.command(member,{type:'select-challenge',challengeId:course.id,revision:1});
  worker.send({type:'input',id:member.id,x:0,z:0,yaw:90,pitch:15,top:0,kick:0,fast:false});await delay(150);
  await competition.command(member,{type:'charge',challengeId:course.id,revision:1,layout:old,physics:info.physics,powerRange:'precision'});await delay(260);await competition.command(member,{type:'release'});
  const deadline=Date.now()+60000;while(!events.some(m=>m.type==='result')&&Date.now()<deadline)await delay(100);
  const result=events.find(m=>m.type==='result');assert.ok(result?.score>0,JSON.stringify(result));
  const replay=store.replay(result.attempt);assert.deepEqual(scoreAttempt(replay),replay.breakdown);assert.equal(replay.layout,old);
  assert(member.snapshot.diagnostics.sleeping);assert(Math.hypot(...Object.values(member.snapshot.velocity))<1e-5);assert(Math.hypot(...Object.values(member.snapshot.spin))<1e-5);
  // Copy exact local native record bytes; the current service can read this old
  // layout without changing its current physics worker or any historical JSON.
  const destination=new Store('.local/4282/data/kyoto.sqlite');
  const row=store.db.prepare('SELECT * FROM attempts WHERE id=?').get(result.attempt),challenge=store.db.prepare('SELECT * FROM challenges WHERE id=?').get(course.id);
  destination.db.prepare('INSERT OR IGNORE INTO guests VALUES (?,?,?)').run(guest.id,guest.token,guest.name);
  destination.db.prepare('INSERT OR IGNORE INTO challenges VALUES (?,?,?,?,?)').run(...Object.values(challenge));
  destination.db.prepare('INSERT OR IGNORE INTO attempts VALUES (?,?,?,?,?,?,?,?,?,?)').run(...Object.values(row));destination.close();
  await writeFile(`${out}/archive-native.json`,JSON.stringify({attempt:result.attempt,layout:old,physics:info.physics,score:replay.score,replaySha256:sha(row.replay),nativeTranslationAndSpinRest:true,scope:'new isolated native replay recorded on the immutable historical layout'},null,2));
  console.log('PASS old-layout native replay',result.attempt,replay.score);
 }finally{worker.stop();store.close();}
}else{
 const native=JSON.parse(await readFile(`${out}/archive-native.json`,'utf8'));
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],sockets=[],assets=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('websocket',s=>sockets.push(s.url()));page.on('request',r=>{if(r.url().includes('/assets/'))assets.push(new URL(r.url()).pathname);});
 try{
  await page.goto(`${origin}/?replay=${native.attempt}`);await page.waitForFunction(()=>window.kyotoState?.ready&&kyotoState.mode==='replay',null,{timeout:300000});
  assert.equal(await page.evaluate(()=>kyotoState.archiveLayout),old);assert.equal(sockets.length,0);assert(assets.length>=5);assert(assets.every(p=>p.startsWith(`/assets/layouts/${old}/`)));
  await page.locator('#replay-play').evaluate(el=>el.click());await page.locator('#replay-scrub').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>kyotoState.replayTime>0,null,{timeout:120000});
  assert((await page.evaluate(()=>kyotoState.replayTime))>0);assert.deepEqual(errors,[]);
  const store=new Store('.local/4282/data/kyoto.sqlite'),raw=store.db.prepare('SELECT replay FROM attempts WHERE id=?').get(native.attempt).replay;
  assert.equal(sha(raw),native.replaySha256);assert.equal(JSON.parse(raw).score,native.score);store.close();
  await writeFile(`${out}/archive-browser.json`,JSON.stringify({status:'pass',...native,assets,sockets,errors,scoreAndReplayBytesUnchanged:true},null,2));console.log('PASS matching old assets, zero live WebSockets, replay scrub and unchanged authoritative score');
 }finally{await browser.close();}
}
