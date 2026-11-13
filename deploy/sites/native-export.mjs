import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,writeFile,mkdir,mkdtemp,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {digest,uuid} from '../../web/online/protocol.mjs';
import {verificationCourseKey} from '../../web/verification-checkpoint.mjs';
import {BROWSER_PHYSICS} from '../../web/public/physics/shot.js';
import {nativeCredential} from '../../web/public/native-identity.js';

// Only an operator's consistent, integrity-checked native snapshot can enter
// this exporter. Its output is private deployment input, never browser assets.
export async function exportNative({backup,expectedSha256,catalog,output}){
 const compressed=await readFile(backup),backupSha256=digest(compressed);
 assert.equal(backupSha256,expectedSha256,'Native backup checksum changed');
 const directory=await mkdtemp(join(tmpdir(),'kyoto-native-'));let db;
 const batches=[],manifest={format:'kyoto-native-import-1',backupSha256,batches:[]};
 function batch(kind,data,extra={}){
  const bytes=Buffer.from(JSON.stringify(data)),hash=digest(bytes);assert(bytes.length<=512*1024,'Native batch exceeds request/row bound');
  const descriptor={kind,...extra,sha256:hash,bytes:bytes.length};manifest.batches.push(descriptor);batches.push({descriptor,bytes});return descriptor;
 }
 try{
  const file=join(directory,'snapshot.sqlite');await pipeline(createReadStream(backup),createGunzip(),createWriteStream(file,{flags:'wx',mode:0o600}));
  db=new DatabaseSync(file,{readOnly:true});assert.deepEqual(db.prepare('PRAGMA integrity_check').all().map(r=>r.integrity_check),['ok']);
  const courses=new Map(catalog.map(c=>[c.id,{...c,physics:BROWSER_PHYSICS}])),guests=db.prepare('SELECT id,token,name FROM guests ORDER BY id').all(),players=[];
  for(const guest of guests){
   const token=await nativeCredential(guest.id,guest.token);assert(token,'Invalid native identity');
   const named=db.prepare('SELECT value FROM settings WHERE key=?').get('named:'+guest.id);
   players.push({id:guest.id,credentialHash:digest(token),name:guest.name,named:named?JSON.parse(named.value)===true:false});
  }
  for(let i=0;i<players.length;i+=40)batch('players',players.slice(i,i+40));
  const attempts=db.prepare('SELECT * FROM attempts ORDER BY id').all();
  for(const row of attempts){
   assert(uuid(row.id)&&players.some(p=>p.id===row.guest),'Unknown score owner');
   const replay=JSON.parse(row.replay),course=courses.get(row.challenge);assert(course,'Score uses a retired course');
   for(const key of ['id','revision','layout','scoring','throwModel','start','goal','waypoints','requiredSurface'])assert.deepEqual(replay.challenge[key],course[key],'Native course changed: '+key);
   assert.equal(replay.physics,'kyoto-p3-3');assert.equal(replay.challenge.physics,replay.physics);
   for(const [field,value]of Object.entries({attempt:row.id,id:row.guest,score:row.score,duration:row.duration,surfaces:row.surfaces,success:!!row.success}))assert.deepEqual(replay[field],value,'Saved native result disagrees: '+field);
   assert.equal(row.revision,course.revision);assert(row.score>0&&replay.breakdown.outcome!=='forfeit');assert.equal(replay.breakdown.total,row.score);
   const {poses,contacts,scoreFrames,...summary}=replay;assert(poses.length&&Array.isArray(contacts)&&Array.isArray(scoreFrames));
   const recordings=[],recording={poses:[],contacts:[],scoreFrames:[]};let size=60;
   function flush(){if(Object.values(recording).some(a=>a.length)){const part=batch('recording',structuredClone(recording),{attempt:row.id,sequence:recordings.length});recordings.push(part.sha256);for(const k of Object.keys(recording))recording[k]=[];size=60;}}
   for(const [key,values]of Object.entries({poses,contacts,scoreFrames}))for(const value of values){const bytes=Buffer.byteLength(JSON.stringify(value))+1;if(size+bytes>240*1024)flush();recording[key].push(value);size+=bytes;}
   flush();
   const provenance={authority:'native-server',physics:replay.physics,backupSha256,replaySha256:digest(row.replay)};
   // Geometry is identical, so rank under the current course. The result's
   // physics/provenance and every recorded sample remain the native originals.
   const result={...summary,challenge:course,accepted:row.accepted,verified:true,local:false,remote:true,provenance};
   const job={id:row.id,owner:row.guest,playerName:players.find(p=>p.id===row.guest).name,header:{courseId:course.id},inputHash:null,courseId:course.id,courseKey:verificationCourseKey(course),state:'verified',score:row.score,duration:row.duration,success:!!row.success,accepted:row.accepted,created:row.accepted,expiresAt:null,lease:null,checkpoint:null,cursor:{chunk:0,run:0},inputChunks:0,inputSteps:0,inputBytes:0,recordings,result,provenance};
   batch('attempt',job,{attempt:row.id});
  }
  if(output){
   await mkdir(output,{recursive:true,mode:0o700});await chmod(output,0o700);
   for(const {descriptor,bytes}of batches)await writeFile(join(output,descriptor.sha256+'.json'),bytes,{mode:0o600});
   await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
  }
  return {manifest,batches,counts:{players:players.length,attempts:attempts.length,recordings:manifest.batches.filter(b=>b.kind==='recording').length},bytes:batches.reduce((n,b)=>n+b.bytes.length,0)};
 }finally{db?.close();await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const backup='.local/native-migration/current.sqlite.gz',receipt=JSON.parse(await readFile('.local/native-migration/receipt.json','utf8')),catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8'));
 const result=await exportNative({backup,expectedSha256:receipt.sha256,catalog,output:'.local/native-migration/prepared'});
 console.log(JSON.stringify({backupSha256:result.manifest.backupSha256,...result.counts,bytes:result.bytes}));
}
