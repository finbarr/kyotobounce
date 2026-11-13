import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {sitesHarness} from './sites-harness.mjs';
import {backgroundInput} from './background-input.mjs';
import {digest} from '../online/protocol.mjs';

// Explicitly local: the actual deployment bundle, isolated D1, and the private
// approved snapshot. No production requests, new hosted players or UI focus.
const root='.local/native-migration',manifest=JSON.parse(await readFile(root+'/prepared/manifest.json','utf8')),build=JSON.parse(await readFile('dist/.openai/kyoto-build.json','utf8'));
assert.equal(build.nativeImport,manifest.backupSha256,'Build with the prepared native import manifest first');
await writeFile(root+'/browser-import-test.json',JSON.stringify({passed:false,backupSha256:manifest.backupSha256})+'\n',{mode:0o600});
const h=await sitesHarness(),directory=await mkdtemp(join(tmpdir(),'kyoto-native-browser-'));let browser;
try{
 const jobs=[];let players=0;
 for(const entry of manifest.batches){
  const bytes=await readFile(root+'/prepared/'+entry.sha256+'.json');assert.equal(digest(bytes),entry.sha256);
  const r=await h.fetch('/v1/native-import/'+entry.sha256,{method:'POST',body:bytes});assert.equal(r.status,200,await r.text());
  if(entry.kind==='attempt')jobs.push(JSON.parse(bytes));
  if(entry.kind==='players')players+=JSON.parse(bytes).length;
 }
 await h.restart();const origin=await h.url();
 const bytes=await readFile(root+'/current.sqlite.gz');assert.equal(digest(bytes),manifest.backupSha256);
 const file=join(directory,'native.sqlite');await writeFile(file,gunzipSync(bytes),{mode:0o600});const db=new DatabaseSync(file,{readOnly:true});
 const native=db.prepare('SELECT id,token,name FROM guests WHERE id=?').get(jobs[0].owner);db.close();
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--mute-audio']});
 const context=await browser.newContext({viewport:{width:1280,height:800}});await backgroundInput(context);
 await context.addInitScript(({id,token})=>{localStorage.setItem('kyoto-guest-id',id);localStorage.setItem('kyoto-guest',token);},{id:native.id,token:native.token});
 const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Unexpected gameplay WebSocket'));
 for(const [index,job]of jobs.entries()){
  if(index===jobs.length-1)await page.setViewportSize({width:390,height:664});
  await page.goto(origin+'/replay/'+job.id);
  await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.mode==='replay',null,{timeout:120000});
  await page.waitForFunction(()=>kyotoState.replayTime>.2);
  const actual=await page.evaluate(async id=>{
   const store=await(await import('/local-store.js')).localStore();try{
    const r=await store.replay(id),bytes=new TextEncoder().encode(JSON.stringify([r.poses,r.contacts,r.scoreFrames]));
    return {profile:await store.setting('profile'),score:r.score,physics:r.physics,provenance:r.provenance,counts:[r.poses.length,r.contacts.length,r.scoreFrames.length],sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),cachedBytes:r.cacheBytes};
   }finally{store.close();}
  },job.id);
  const arrays={poses:[],contacts:[],scoreFrames:[]};
  for(const hash of job.recordings){const r=JSON.parse(await readFile(root+'/prepared/'+hash+'.json','utf8'));for(const key of Object.keys(arrays))arrays[key].push(...r[key]);}
  assert.equal(actual.sha256,digest(JSON.stringify(Object.values(arrays))));assert.equal(actual.score,job.score);assert.equal(actual.physics,'kyoto-p3-3');assert.equal(actual.provenance.authority,'native-server');assert(actual.cachedBytes>0);
  assert.deepEqual(actual.profile,{id:native.id,name:native.name,named:true});
  results.push({attempt:job.id,score:job.score,counts:actual.counts,sha256:actual.sha256});
  console.log('PASS native browser replay '+(index+1)+'/'+jobs.length+' '+job.courseId+' ('+actual.counts[0]+' poses)');
 }
 const last=jobs.at(-1);await page.screenshot({path:root+'/mobile-recorded-replay.png'});
 await context.route(origin+'/v1/**',route=>route.abort());await page.reload();
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.mode==='replay',null,{timeout:120000});
 assert.equal(await page.evaluate(()=>document.pointerLockElement===null),true);assert.deepEqual(errors,[]);
 const rows=await h.db.prepare('SELECT COUNT(*) n FROM verifier_players').first();assert.equal(rows.n,players,'Returning players must not create a duplicate identity');
 await writeFile(root+'/browser-import-test.json',JSON.stringify({passed:true,backupSha256:manifest.backupSha256,results,offlineReplay:last.id,identityRestored:true,errors},null,2)+'\n',{mode:0o600});
 console.log('PASS actual Site bundle: all native recordings, restored identity, phone view, offline cached replay and no desktop capture');
}finally{await browser?.close();await h.close();await rm(directory,{recursive:true,force:true});}
