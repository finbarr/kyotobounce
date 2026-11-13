import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {exportNative} from '../../deploy/sites/native-export.mjs';
import {nativeCredential} from '../public/native-identity.js';
import {VerifiedReplay} from '../public/physics/verified-replay.js';
import {digest} from '../online/protocol.mjs';
import {D1VerificationService} from '../online/d1-service.mjs';
import {d1Harness} from './d1-harness.mjs';
import {course,header,fixtureWorld,simulate} from './verification-fixture.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';

const snapshot=process.argv.includes('--snapshot'),directory=await mkdtemp(join(tmpdir(),'kyoto-native-test-'));
let h;const originalFetch=globalThis.fetch;
try{
 let backup,expectedSha256,catalog,token,player,sourceReplay;const originals=new Map();
 if(snapshot){
  backup='.local/native-migration/current.sqlite.gz';expectedSha256=JSON.parse(await readFile('.local/native-migration/receipt.json','utf8')).sha256;
  catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8')).map(c=>({...c,physics:BROWSER_PHYSICS}));
  const file=join(directory,'original.sqlite');await writeFile(file,gunzipSync(await readFile(backup)),{mode:0o600});const db=new DatabaseSync(file,{readOnly:true});
  for(const row of db.prepare('SELECT id,replay FROM attempts').all())originals.set(row.id,JSON.parse(row.replay));db.close();
 }else{
  catalog=[course];player=randomUUID();const oldToken=randomUUID();token=await nativeCredential(player,oldToken);
  const world=fixtureWorld(),baseline=await simulate(world,course,header,[],{attempt:randomUUID(),subject:player});world.free();
  sourceReplay={...baseline.result,id:player,physics:'kyoto-p3-3',challenge:{...course,physics:'kyoto-p3-3'},poses:baseline.poses,contacts:baseline.contacts,scoreFrames:[],playerName:'Returning player'};
  originals.set(sourceReplay.attempt,sourceReplay);
  const file=join(directory,'native.sqlite'),db=new DatabaseSync(file);
  db.exec('CREATE TABLE guests(id TEXT,token TEXT,name TEXT); CREATE TABLE settings(key TEXT,value TEXT); CREATE TABLE attempts(id TEXT,guest TEXT,challenge TEXT,revision INTEGER,success INTEGER,score INTEGER,surfaces INTEGER,duration REAL,accepted INTEGER,replay TEXT);');
  db.prepare('INSERT INTO guests VALUES (?,?,?)').run(player,oldToken,'Returning player');db.prepare('INSERT INTO settings VALUES (?,?)').run('named:'+player,'true');
  db.prepare('INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?,?,?)').run(sourceReplay.attempt,player,course.id,course.revision,sourceReplay.success?1:0,sourceReplay.score,sourceReplay.surfaces,sourceReplay.duration,1700000000000,JSON.stringify(sourceReplay));db.close();
  const bytes=gzipSync(await readFile(file));backup=join(directory,'native.sqlite.gz');await writeFile(backup,bytes);expectedSha256=digest(bytes);
 }
 const exported=await exportNative({backup,expectedSha256,catalog});
 await assert.rejects(()=>exportNative({backup,expectedSha256:'0'.repeat(64),catalog}),/checksum changed/);
 await assert.rejects(()=>exportNative({backup,expectedSha256,catalog:catalog.map(c=>({...c,revision:c.revision+1}))}),/course changed/);
 h=await d1Harness({catalog,nativeImport:exported.manifest});
 const path=hash=>'/v1/native-import/'+hash;
 async function send(b,status=200,bytes=b.bytes){const r=await h.fetch(path(b.descriptor.sha256),{method:'POST',body:bytes});assert.equal(r.status,status,await r.text());}
 const first=exported.batches[0],attempt=exported.batches.find(b=>b.descriptor.kind==='attempt');
 await send(first,403,Buffer.from('x'.repeat(first.bytes.length)));await send(first,413,Buffer.alloc(first.bytes.length+1));
 assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_players').first()).n,0);
 await send(attempt,409);assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_attempts').first()).n,0);
 for(const b of exported.batches)await send(b);
 await h.restart({});
 for(const b of exported.batches)await send(b);
 assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_players').first()).n,exported.counts.players);
 assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_attempts').first()).n,exported.counts.attempts);
 assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_recordings').first()).n,exported.counts.recordings);
 const usage=JSON.parse((await h.db.prepare("SELECT data FROM verifier_usage WHERE id='global'").first()).data);
 assert.equal(usage.identities,exported.counts.players);assert.equal(usage.jobs,exported.counts.attempts);assert.equal(usage.inputBytes,exported.batches.filter(b=>b.descriptor.kind==='recording').reduce((n,b)=>n+b.bytes.length,0));
 const service=new D1VerificationService({db:h.db,catalog,world:()=>{throw Error('Recorded replay must not load a physics engine');}}),jobs=exported.batches.filter(b=>b.descriptor.kind==='attempt').map(b=>JSON.parse(b.bytes));
 for(const job of jobs){
  const board=await service.board(job.courseId,job.owner),expected=jobs.filter(j=>j.courseId===job.courseId).sort((a,b)=>b.score-a.score||a.duration-b.duration||a.accepted-b.accepted||a.id.localeCompare(b.id));
  assert.deepEqual(board.entries.map(e=>e.attempt),expected.slice(0,10).map(j=>j.id));assert.equal(board.personal.score,expected.find(j=>j.owner===job.owner).score);
  const progress=(await service.progress(job.owner)).entries.find(p=>p.challengeId===job.courseId);assert.equal(progress.bestScore,board.personal.score);assert.equal(progress.completed,expected.some(j=>j.owner===job.owner&&j.success));
  const seed=await(await h.fetch('/v1/replays/'+job.id)).json();assert.equal(seed.format,'kyoto-recorded-replay-1');assert.equal(seed.result.physics,'kyoto-p3-3');assert.equal(seed.result.provenance.authority,'native-server');
  const actual={poses:[],contacts:[],scoreFrames:[]},expectedRecording={poses:[],contacts:[],scoreFrames:[]};
  for(const b of exported.batches.filter(b=>b.descriptor.kind==='recording'&&b.descriptor.attempt===job.id)){const r=JSON.parse(b.bytes);for(const k of Object.keys(actual))expectedRecording[k].push(...r[k]);}
  globalThis.fetch=(url,options)=>h.fetch(new URL(url).pathname,options);
  let finished,replay;replay=new VerifiedReplay(null,seed,'https://game.example',randomUUID(),message=>{
   if(message.type==='replay-recording'){for(const k of Object.keys(actual))actual[k].push(...message.recording[k]);queueMicrotask(()=>replay.ack(message.sequence));}
   else if(message.type==='replay-error')throw Error(message.message);else finished=message.result;
  });
  await replay.run();assert(finished);assert.equal(finished.score,job.score);assert.deepEqual(actual,expectedRecording);
  for(const k of Object.keys(actual))assert.deepEqual(actual[k],originals.get(job.id)[k],'Every sample must match the original SQLite replay');
  if(job===jobs[0]){
   const corrupt={...seed,recordings:['0'.repeat(64),...seed.recordings.slice(1)]},messages=[];
   await new VerifiedReplay(null,corrupt,'https://game.example',randomUUID(),m=>messages.push(m)).run();
   assert.equal(messages.length,1);assert.equal(messages[0].type,'replay-error');assert.match(messages[0].message,/checksum changed/);
  }
 }
 if(token){
  const identity=await h.fetch('/v1/identity',{headers:{Authorization:'Bearer '+token}});assert.deepEqual(await identity.json(),{id:player,name:'Returning player',named:true});
  const imposter=await nativeCredential(player,randomUUID());assert.equal((await h.fetch('/v1/identity',{headers:{Authorization:'Bearer '+imposter}})).status,401);
 }
 // Cancellation and retention use the same authoritative rules as new scores.
 const cancelled=jobs[0];await service.cancel(cancelled.owner,cancelled.id);await send(attempt);
 assert.equal((await service.get(cancelled.id)).state,'cancelled','Idempotent import cannot resurrect a recalled score');
 assert.equal((await h.fetch('/v1/replays/'+cancelled.id+'/recordings/0')).status,404);
 const cleaning=new D1VerificationService({db:h.db,catalog,world:()=>null,now:()=>Date.now()+20*86400000});
 // Cancellation's expiry comes from the service clock above.
 for(let i=0;i<100&&await cleaning.get(cancelled.id);i++)await cleaning.cleanup();
 assert.equal(await cleaning.get(cancelled.id),null);assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM verifier_recordings WHERE attempt=?').bind(cancelled.id).first()).n,0);
 console.log('PASS native migration: pinned backup, immutable authorized payloads, all scores/ranks/progress, exact streamed recordings, identity authentication, restart/idempotence and recall cleanup');
 if(snapshot){await mkdir('.local/native-migration',{recursive:true});await writeFile('.local/native-migration/import-test.json',JSON.stringify({passed:true,backupSha256:expectedSha256,...exported.counts,bytes:exported.bytes})+'\n',{mode:0o600});}
}finally{globalThis.fetch=originalFetch;await h?.close();await rm(directory,{recursive:true,force:true});}
