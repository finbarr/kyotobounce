import {randomUUID} from 'node:crypto';
import {D1Storage} from './d1-storage.mjs';
import {ShotVerification,validateInputHeader,validateWalkRun} from '../verification.mjs';
import {saveVerification,restoreVerification,verificationCourseKey} from '../verification-checkpoint.mjs';
import {INPUT_CHUNK_RUNS} from '../public/physics/input-recorder.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {HttpError,insist,uuid,digest,sameHash,view} from './protocol.mjs';
import {publicationCourse,solvedPublication} from './course-publication.mjs';
import {resourceLimits,chargeUsage} from './resource-policy.mjs';

const terminal=new Set(['verified','published','forfeited','cancelled','failed']);
const clean=value=>JSON.parse(JSON.stringify(value));
const order='score DESC,duration,accepted,id';
const ranked="state='verified' AND score>0";
const ahead='(score>? OR (score=? AND (duration<? OR (duration=? AND (accepted<? OR (accepted=? AND id<?))))))';
const decode=row=>row?{...JSON.parse(row.data),checkpoint:row.checkpoint?new Uint8Array(row.checkpoint):null}:null;
class InputReader{
 constructor(service,job,cursor=job.cursor){this.service=service;this.job=job;this.cursor={...cursor};}
 [Symbol.asyncIterator](){return this;}
 async next(){
  const c=this.cursor;if(c.chunk===this.job.inputChunks)return {done:true};
  if(this.loaded!==c.chunk){const row=await this.service.read().one('SELECT runs FROM verifier_inputs WHERE attempt=? AND sequence=?',this.job.id,c.chunk);insist(row,409,'A saved input chunk is missing');this.runs=JSON.parse(row.runs);this.loaded=c.chunk;}
  const value=this.runs[c.run];insist(value,409,'The saved input cursor is invalid');
  if(++c.run===this.runs.length){c.chunk++;c.run=0;}return {done:false,value};
 }
}

export class D1VerificationService{
 constructor({db,catalog,world,now=Date.now,limits,batchesPerRequest=4,stepsPerBatch=180}){
  this.storage=new D1Storage(db);this.catalog=new Map(catalog.map(c=>[c.id,structuredClone(c)]));
  insist(catalog.length&&this.catalog.size===catalog.length&&catalog.every(c=>c.layout===catalog[0].layout&&c.physics===BROWSER_PHYSICS&&c.scoring==='waypoint-v4'),500,'Incompatible canonical catalog');
  insist(Number.isSafeInteger(batchesPerRequest)&&batchesPerRequest>=1&&batchesPerRequest<=8&&Number.isSafeInteger(stepsPerBatch)&&stepsPerBatch>=1&&stepsPerBatch<=180,500,'Invalid verification work budget');
  this.layout=catalog[0].layout;this.loadWorld=world;this.now=now;this.limits=resourceLimits(limits);this.batchesPerRequest=batchesPerRequest;this.stepsPerBatch=stepsPerBatch;
 }
 read(){const s=this.storage.session();return {one:(sql,...args)=>s.prepare(sql).bind(...args).first(),all:async(sql,...args)=>(await s.prepare(sql).bind(...args).all()).results};}
 transaction(fn){return this.storage.transaction(fn);}
 async get(id,tx=this.read()){return decode(await tx.one('SELECT data,checkpoint FROM verifier_attempts WHERE id=?',id));}
 save(tx,job){
  const {checkpoint,...data}=job;
  tx.write('INSERT INTO verifier_attempts (id,owner,courseId,courseKey,state,score,duration,accepted,success,expiresAt,leaseUntil,data,checkpoint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,score=excluded.score,duration=excluded.duration,accepted=excluded.accepted,success=excluded.success,expiresAt=excluded.expiresAt,leaseUntil=excluded.leaseUntil,data=excluded.data,checkpoint=excluded.checkpoint',job.id,job.owner,job.courseId,job.courseKey,job.state,job.score||0,job.duration||0,job.accepted||0,job.success?1:0,job.expiresAt??null,job.lease?.until??null,JSON.stringify(data),checkpoint?new Uint8Array(checkpoint).buffer:null);
 }
 async take(tx,owner,charges){
  const ids=['global',...(owner?[owner]:[])],rows=[];
  for(const id of ids){const row=await tx.one('SELECT data FROM verifier_usage WHERE id=?',id);rows.push(row?JSON.parse(row.data):{});}
  chargeUsage(rows,charges,this.now(),this.limits).forEach((row,i)=>tx.write('INSERT INTO verifier_usage (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',ids[i],JSON.stringify(row)));
 }
 owned(job,owner){insist(job&&job.owner===owner,404,'Attempt not found');if(job.state==='deleting')throw new HttpError(503,'Expired upload cleanup is in progress. Your saved work will retry.',1);return job;}
 async world(){this.worldPromise??=Promise.resolve().then(this.loadWorld).catch(error=>{this.worldPromise=null;throw error;});return this.worldPromise;}
 async course(id,tx=this.read()){
  if(this.catalog.has(id))return this.catalog.get(id);insist(uuid(id),404,'Course not found');
  const row=await tx.one('SELECT data FROM verifier_courses WHERE id=?',id),c=row&&JSON.parse(row.data).current;
  insist(c&&c.layout===this.layout&&c.physics===BROWSER_PHYSICS&&c.scoring==='waypoint-v4',404,'Course not found');return c;
 }
 async current(job,tx=this.read()){
  let c;
  if(job.publication){
   const p=job.publication,row=await tx.one('SELECT owner,revision FROM verifier_courses WHERE id=?',p.course.id);
   insist(row?.owner===job.owner&&row.revision===(job.state==='published'?p.course.revision:p.baseRevision),409,'The course changed; this publication is retired');c=p.course;
   insist(c.layout===this.layout&&c.physics===BROWSER_PHYSICS&&c.scoring==='waypoint-v4',409,'The publication uses a retired station or simulation');
  }else c=await this.course(job.header.courseId,tx);
  insist(verificationCourseKey(c)===job.courseKey,409,'The course changed; this attempt is retired');return c;
 }
 async listCourses(after){
  insist(after===undefined||uuid(after),400,'Invalid course cursor');
  const rows=await this.read().all('SELECT id,data FROM verifier_courses WHERE published=1 AND layout=? AND physics=? AND id>? ORDER BY id LIMIT 101',this.layout,BROWSER_PHYSICS,after||'');
  return {courses:[...(after?[]:this.catalog.values()),...rows.slice(0,100).map(r=>JSON.parse(r.data).current)],next:rows.length>100?rows[99].id:null};
 }
 async identity(credential,name){
  const result=await this.transaction(async tx=>{
   const prior=await tx.one('SELECT * FROM verifier_players WHERE id=?',credential.id);insist(!prior||sameHash(prior.credentialHash,credential.hash),401,'Invalid credential');
   if(!prior)await this.take(tx,null,{identities:1});
   tx.write('INSERT INTO verifier_players (id,credentialHash,name,created) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',credential.id,credential.hash,name,prior?.created??this.now());return {id:credential.id,name};
  });await this.cleanup();return result;
 }
 async authenticate(credential){const p=await this.read().one('SELECT * FROM verifier_players WHERE id=?',credential.id);insist(p&&sameHash(p.credentialHash,credential.hash),401,'Invalid credential');return {id:p.id,name:p.name};}
 job(player,id,course,header,extra={}){return {id,owner:player.id,playerName:player.name,header,inputHash:digest(JSON.stringify(header)),courseKey:verificationCourseKey(course),courseId:course.id,state:'uploading',inputChunks:0,inputSteps:0,inputBytes:0,created:this.now(),expiresAt:this.now()+this.limits.idleMs,lease:null,checkpoint:null,cursor:{chunk:0,run:0},...extra};}
 header(submitted,course){try{return validateInputHeader(submitted,course,{layoutSha256:this.layout});}catch(error){throw new HttpError(400,error.message);}}
 async create(player,id,submitted){
  insist(uuid(id),400,'Invalid attempt ID');await this.cleanup();
  return this.transaction(async tx=>{
   const course=await this.course(submitted?.courseId,tx),header=this.header(submitted,course),prior=await this.get(id,tx);
   if(prior){this.owned(prior,player.id);insist(!prior.publication&&prior.inputHash===digest(JSON.stringify(header)),409,'Attempt inputs cannot be replaced');await this.current(prior,tx);return view(prior);}
   insist(header.walkSteps<=this.limits.walkSteps,413,'The walking route is too long for online verification. Start a new route for your next shot.');
   const job=this.job(player,id,course,header);await this.take(tx,player.id,{jobs:1});this.save(tx,job);return view(job);
  });
 }
 async publish(player,id,submitted,baseRevision,submittedHeader){
  insist(uuid(id),400,'Invalid publication ID');await this.cleanup();await this.transaction(tx=>this.take(tx,player.id,{compute:1}));
  const world=await this.world();insist(world.layoutSha256===this.layout,500,'The verifier collision pack does not match its catalog');
  const course=publicationCourse(world,submitted,player.id,baseRevision);insist(!this.catalog.has(course.id),409,'Campaign courses cannot be replaced');const header=this.header(submittedHeader,course),a=header.aim;
  course.hint={yaw:a.yaw,pitch:a.pitch,top:a.top,kick:a.kick,powerRange:a.powerRange,holdMs:a.power*2800,note:'Verified solution controls. Walking and moving escalators may require matching the original route and timing.'};
  const hash=digest(JSON.stringify(course));
  return this.transaction(async tx=>{
   const prior=await this.get(id,tx),row=await tx.one('SELECT * FROM verifier_courses WHERE id=?',course.id);
   if(prior){this.owned(prior,player.id);insist(prior.publication?.hash===hash&&prior.inputHash===digest(JSON.stringify(header))&&prior.publication.baseRevision===baseRevision,409,'Publication inputs cannot be replaced');await this.current(prior,tx);return view(prior);}
   insist(!row||row.owner===player.id,403,'Only the creator can revise a course');insist((row?.revision||0)===baseRevision,409,'The course revision changed');
   insist(header.walkSteps<=this.limits.walkSteps,413,'The walking route is too long for online verification. Start a new route for your next shot.');
   const job=this.job(player,id,course,header,{publication:{course,baseRevision,hash}});await this.take(tx,player.id,{jobs:1});
   if(!row)tx.write('INSERT INTO verifier_courses (id,owner,revision,published,layout,physics,data) VALUES (?,?,0,0,?,?,?)',course.id,player.id,this.layout,BROWSER_PHYSICS,JSON.stringify({current:null}));
   this.save(tx,job);return view(job);
  });
 }
 async upload(owner,id,sequence,submitted){
  insist(Number.isSafeInteger(sequence)&&sequence>=0,400,'Invalid input sequence');insist(Array.isArray(submitted)&&submitted.length>0&&submitted.length<=INPUT_CHUNK_RUNS,400,'Invalid input chunk size');
  return this.transaction(async tx=>{
   const job=this.owned(await this.get(id,tx),owner);await this.current(job,tx);let runs;
   try{runs=submitted.map(r=>validateWalkRun(r,job.header.walkSteps));}catch(error){throw new HttpError(400,error.message);}
   const json=JSON.stringify(runs),hash=digest(json);
   if(sequence<job.inputChunks){const prior=await tx.one('SELECT hash FROM verifier_inputs WHERE attempt=? AND sequence=?',id,sequence);insist(prior?.hash===hash,409,'Uploaded controls cannot be replaced');return view(job);}
   insist(job.state==='uploading'&&sequence===job.inputChunks,409,'Input chunks must arrive in order before sealing');
   const steps=job.inputSteps+runs.reduce((n,r)=>n+r.steps,0);insist(steps<=job.header.walkSteps,400,'Too many walking steps');
   const bytes=Buffer.byteLength(json),inputBytes=job.inputBytes+bytes;insist(sequence<this.limits.jobInputChunks&&inputBytes<=this.limits.jobInputBytes,413,'This control recording exceeds online storage limits. Your score remains saved locally.');
   await this.take(tx,null,{inputBytes:bytes});tx.write('INSERT INTO verifier_inputs (attempt,sequence,hash,runs,bytes) VALUES (?,?,?,?,?)',id,sequence,hash,json,bytes);
   Object.assign(job,{inputChunks:sequence+1,inputSteps:steps,inputBytes,expiresAt:this.now()+this.limits.idleMs});this.save(tx,job);return view(job);
  });
 }
 seal(owner,id){return this.transaction(async tx=>{const job=this.owned(await this.get(id,tx),owner);await this.current(job,tx);insist(job.inputSteps===job.header.walkSteps,409,'Upload the complete walking route before verification');if(job.state==='uploading'){Object.assign(job,{state:'pending',expiresAt:this.now()+this.limits.idleMs});this.save(tx,job);}return view(job);});}
 status(owner,id){return this.transaction(async tx=>{const job=this.owned(await this.get(id,tx),owner);await this.current(job,tx);return view(job);});}
 cancel(owner,id){return this.transaction(async tx=>{
  const job=this.owned(await this.get(id,tx),owner);insist(job.state!=='published',409,'A published course cannot be recalled');if(job.state==='cancelled')return view(job);
  Object.assign(job,{state:'cancelled',score:0,success:false,result:null,checkpoint:null,lease:null,expiresAt:this.now()+this.limits.discardMs});this.save(tx,job);return view(job);
 });}
 claim(owner,id){return this.transaction(async tx=>{
  const job=this.owned(await this.get(id,tx),owner);await this.current(job,tx);insist(job.state!=='uploading',409,'Seal inputs before verification');
  if(terminal.has(job.state)||job.lease?.until>this.now())return {job};
  const lease={token:randomUUID(),until:this.now()+30000};await this.take(tx,owner,{compute:1});Object.assign(job,{state:'verifying',lease,expiresAt:Math.max(this.now()+this.limits.idleMs,lease.until+1)});this.save(tx,job);return {job,lease};
 });}
 async advance(owner,id,signal){
  const {job,lease}=await this.claim(owner,id);if(!lease)return view(job);
  const reader=new InputReader(this,job),options={attempt:id,subject:owner};
  try{
   const course=await this.current(job),world=await this.world();insist(world.layoutSha256===this.layout,500,'The verifier collision pack does not match its catalog');
   const verification=job.checkpoint?restoreVerification(world,course,job.checkpoint,reader,options):new ShotVerification(world,course,job.header,reader,options);
   insist(digest(JSON.stringify(verification.header))===job.inputHash,500,'Stored verification inputs changed');let reply;
   // Workers clocks can stay frozen during CPU work. A fixed step/batch budget
   // is the hard bound; the solver's time slice is only an additional yield.
   for(let i=0;i<this.batchesPerRequest;i++){reply=await verification.advance(this.stepsPerBatch);if(reply.status==='verified'||signal?.aborted)break;}
   const checkpoint=reply.status==='verified'?null:saveVerification(verification);insist(!checkpoint||checkpoint.length<=this.limits.checkpointBytes,413,'Verification checkpoint exceeds storage limits');
   return await this.transaction(async tx=>{
    const latest=this.owned(await this.get(id,tx),owner);if(latest.lease?.token!==lease.token||latest.state!=='verifying')return view(latest);await this.current(latest,tx);
    const patch={state:'pending',lease:null,checkpoint,cursor:reader.cursor,walkingSteps:reply.walkingSteps,shotSteps:reply.shotSteps,expiresAt:this.now()+this.limits.idleMs};
    if(reply.status==='verified'){
     const result=clean({...reply.result,id:owner,playerName:job.playerName,verified:true,local:false});insist(Buffer.byteLength(JSON.stringify(result))<=this.limits.resultBytes,413,'Verification result exceeds storage limits');insist(Number.isSafeInteger(result.score)&&result.score>=0,500,'The verified score is invalid');
     const state=job.publication?(solvedPublication(course,result)?'published':'failed'):result.score>0&&result.breakdown.outcome!=='forfeit'?'verified':'forfeited';
     Object.assign(patch,{state,result,score:state==='verified'?result.score:0,duration:result.duration,success:result.success,accepted:this.now(),expiresAt:['verified','published'].includes(state)?null:this.now()+this.limits.discardMs});
     if(job.publication){
      if(state==='published')tx.write('UPDATE verifier_courses SET revision=?,published=1,data=? WHERE id=?',course.revision,JSON.stringify({current:course,solution:id,updated:this.now()}),course.id);
      else patch.message='The solution must hit every waypoint, reach the finish if present, and come to full rest inside the station';
     }
     if(state==='verified')tx.write('INSERT INTO verifier_progress (owner,courseKey,courseId,revision) VALUES (?,?,?,?) ON CONFLICT(owner,courseKey) DO NOTHING',owner,job.courseKey,course.id,course.revision);
    }
    Object.assign(latest,patch);this.save(tx,latest);return view(latest);
   });
  }catch(error){
   if(error instanceof HttpError&&(error.status>=500||error.status===429))throw error;
   if(!(error instanceof HttpError)&&!/Invalid shot inputs|Cannot verify|checkpoint/.test(error.message))throw error;
   return this.transaction(async tx=>{const latest=this.owned(await this.get(id,tx),owner);if(latest.lease?.token!==lease.token)return view(latest);
    Object.assign(latest,{state:'failed',lease:null,checkpoint:null,expiresAt:this.now()+this.limits.discardMs,message:error.status===413?'Verification exceeded its storage budget. Your local result remains available.':'This control recording could not be verified'});this.save(tx,latest);return view(latest);
   });
  }
 }
 entry(job){return {attempt:job.id,guest:job.owner,name:job.playerName,score:job.score,duration:job.duration,surfaces:job.result.surfaces,accepted:job.accepted};}
 async rank(tx,key,job){return (await tx.one('SELECT COUNT(*) AS n FROM verifier_attempts WHERE courseKey=? AND '+ranked+' AND '+ahead,key,job.score,job.score,job.duration,job.duration,job.accepted,job.accepted,job.id)).n+1;}
 board(courseId,owner){return this.transaction(async tx=>{
  const course=await this.course(courseId,tx),key=verificationCourseKey(course),rows=(await tx.all('SELECT data FROM verifier_attempts WHERE courseKey=? AND '+ranked+' ORDER BY '+order+' LIMIT 10',key)).map(decode);
  const personal=owner?decode(await tx.one('SELECT data FROM verifier_attempts WHERE courseKey=? AND owner=? AND '+ranked+' ORDER BY '+order+' LIMIT 1',key,owner)):null;
  const names=new Map();for(const id of new Set([...rows.map(r=>r.owner),...(personal?[personal.owner]:[])])){const p=await tx.one('SELECT name FROM verifier_players WHERE id=?',id);names.set(id,p?.name);}
  const entry=j=>({...this.entry(j),name:names.get(j.owner)||j.playerName});return {challenge:course,entries:rows.map(entry),personal:personal?{...entry(personal),rank:await this.rank(tx,key,personal)}:null};
 });}
 async progress(owner,after){
  insist(after===undefined||typeof after==='string'&&/^[a-zA-Z0-9_.:-]{1,512}$/.test(after),400,'Invalid progress cursor');
  return this.transaction(async tx=>{
   // Rank a whole progress page in SQL: bounded query count even for hundreds
   // of published courses, rather than three D1 round trips per entry.
   const page=await tx.all(`WITH page AS (
    SELECT * FROM verifier_progress WHERE owner=? AND courseKey>? ORDER BY courseKey LIMIT 101
   ), best AS (
    SELECT p.*,(SELECT id FROM verifier_attempts WHERE owner=p.owner AND courseKey=p.courseKey AND ${ranked} ORDER BY ${order} LIMIT 1) AS bestId,
    EXISTS(SELECT 1 FROM verifier_attempts WHERE owner=p.owner AND courseKey=p.courseKey AND state='verified' AND success=1) AS completed FROM page p
   ), picked AS (
    SELECT b.*,a.score,a.duration,a.accepted FROM best b LEFT JOIN verifier_attempts a ON a.id=b.bestId
   ) SELECT p.*,CASE WHEN bestId IS NOT NULL THEN (SELECT COUNT(*)+1 FROM verifier_attempts r WHERE r.courseKey=p.courseKey AND r.state='verified' AND r.score>0 AND
    (r.score>p.score OR (r.score=p.score AND (r.duration<p.duration OR (r.duration=p.duration AND (r.accepted<p.accepted OR (r.accepted=p.accepted AND r.id<p.bestId))))))) END AS rank
    FROM picked p ORDER BY p.courseKey`,owner,after||'');
   const visible=page.slice(0,100),ids=[...new Set(visible.map(p=>p.courseId).filter(id=>!this.catalog.has(id)))],courses=new Map(this.catalog),entries=[];
   if(ids.length)for(const row of await tx.all('SELECT id,data FROM verifier_courses WHERE published=1 AND id IN ('+ids.map(()=>'?').join(',')+')',...ids))courses.set(row.id,JSON.parse(row.data).current);
   for(const p of visible){
    const c=courses.get(p.courseId);if(!c||c.layout!==this.layout||c.physics!==BROWSER_PHYSICS||c.scoring!=='waypoint-v4'||verificationCourseKey(c)!==p.courseKey)continue;
    entries.push({challengeId:p.courseId,revision:p.revision,completed:!!p.completed,bestScore:p.score||0,rank:p.rank??null});
   }
   return {entries,next:page.length>100?page[99].courseKey:null};
  });
 }
 replay(id){return this.transaction(async tx=>{const job=await this.get(id,tx);insist(job?.state==='verified'||job?.state==='published',404,'Replay not found');await this.current(job,tx);return {format:'kyoto-verified-replay-1',result:job.result,header:job.header,inputChunks:job.inputChunks};});}
 replayInputs(id,sequence){return this.transaction(async tx=>{const job=await this.get(id,tx);insist(job?.state==='verified'||job?.state==='published',404,'Replay not found');await this.current(job,tx);const row=await tx.one('SELECT runs FROM verifier_inputs WHERE attempt=? AND sequence=?',id,sequence);insist(row,404,'Input chunk not found');return {sequence,runs:JSON.parse(row.runs)};});}
 cleanup(){this.cleanupPromise??=this.cleanOne().finally(()=>{this.cleanupPromise=null;});return this.cleanupPromise;}
 cleanOne(){return this.transaction(async tx=>{
  const now=this.now();let candidate=await tx.one('SELECT id,data,checkpoint FROM verifier_attempts WHERE expiresAt<=? ORDER BY expiresAt LIMIT 1',now),scanned=false;
  if(!candidate){const cursor=(await tx.one('SELECT cleanup_cursor FROM verifier_meta WHERE id=1'))?.cleanup_cursor;candidate=await tx.one('SELECT id,data,checkpoint FROM verifier_attempts WHERE id>? ORDER BY id LIMIT 1',cursor||'');scanned=true;}
  if(!candidate){tx.write('INSERT INTO verifier_meta (id,revision,cleanup_cursor) VALUES (1,0,NULL) ON CONFLICT(id) DO UPDATE SET cleanup_cursor=NULL');return;}
  const job=decode(candidate);let retired=false;
  try{await this.current(job,tx);}catch(error){if(![404,409].includes(error.status))throw error;retired=true;}
  const accepted=['verified','published'].includes(job.state),expired=!accepted&&job.expiresAt!==null&&job.expiresAt<=now;
  if(!(job.lease?.until>now)&& (retired||expired||job.state==='deleting')){
   const chunks=await tx.all('SELECT sequence,bytes FROM verifier_inputs WHERE attempt=? ORDER BY sequence LIMIT ?',job.id,this.limits.cleanupChunks),bytes=chunks.reduce((n,r)=>n+r.bytes,0);
   await this.take(tx,null,{jobs:chunks.length?0:-1,inputBytes:-bytes});
   for(const row of chunks)tx.write('DELETE FROM verifier_inputs WHERE attempt=? AND sequence=?',job.id,row.sequence);
   if(!chunks.length){
    tx.write('DELETE FROM verifier_attempts WHERE id=?',job.id);
    if(retired){
     // A superseded publication job can have the winning revision's geometry
     // key. Its ownership/revision conflict does not retire accepted play.
     let current;try{current=await this.course(job.courseId,tx);}catch(error){if(error.status!==404)throw error;}
     if(!current||verificationCourseKey(current)!==job.courseKey)tx.write('DELETE FROM verifier_progress WHERE owner=? AND courseKey=?',job.owner,job.courseKey);
    }
    if(!this.catalog.has(job.courseId)){
     const row=await tx.one('SELECT published,layout,physics,data FROM verifier_courses WHERE id=?',job.courseId);
     if(row&&(!row.published||row.layout!==this.layout||row.physics!==BROWSER_PHYSICS||JSON.parse(row.data).current?.scoring!=='waypoint-v4'))tx.write('DELETE FROM verifier_courses WHERE id=? AND NOT EXISTS (SELECT 1 FROM verifier_attempts WHERE courseId=?)',job.courseId,job.courseId);
    }
   }else{Object.assign(job,{state:'deleting',expiresAt:0,lease:null,checkpoint:null,result:null,inputBytes:Math.max(0,job.inputBytes-bytes)});this.save(tx,job);}
  }
  if(scanned)tx.write('INSERT INTO verifier_meta (id,revision,cleanup_cursor) VALUES (1,0,?) ON CONFLICT(id) DO UPDATE SET cleanup_cursor=excluded.cleanup_cursor',job.id);
 });}
}
