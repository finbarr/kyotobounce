import {randomUUID} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {FieldPath} from '@google-cloud/firestore';
import {ShotVerification,validateInputHeader,validateWalkRun} from '../verification.mjs';
import {saveVerification,restoreVerification,verificationCourseKey} from '../verification-checkpoint.mjs';
import {INPUT_CHUNK_RUNS} from '../public/physics/input-recorder.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {HttpError,insist,uuid,digest,sameHash,ranked,view} from './protocol.mjs';

const terminal=new Set(['verified','forfeited','cancelled','failed']);
const clean=value=>JSON.parse(JSON.stringify(value));
const inputId=sequence=>String(sequence).padStart(10,'0');
class InputReader{
 constructor(service,job,cursor={chunk:0,run:0}){this.service=service;this.job=job;this.cursor={...cursor};}
 [Symbol.asyncIterator](){return this;}
 async next(){
  const cursor=this.cursor;if(cursor.chunk===this.job.inputChunks)return {done:true};
  if(this.loaded!==cursor.chunk){const row=await this.service.inputRef(this.job.id,cursor.chunk).get();insist(row.exists,409,'A saved input chunk is missing');this.runs=row.data().runs;this.loaded=cursor.chunk;}
  const value=this.runs[cursor.run];insist(value,409,'The saved input cursor is invalid');
  if(++cursor.run===this.runs.length){cursor.chunk++;cursor.run=0;}return {done:false,value};
 }
}

export class VerificationService{
 constructor({db,catalog,world,namespace='kyoto',sliceMs=1000,batchLimit=10000,now=Date.now}){
  insist(/^[a-zA-Z0-9_-]{1,64}$/.test(namespace),500,'Invalid storage namespace');
  this.db=db;this.root=db.collection('games').doc(namespace);this.players=this.root.collection('players');this.attempts=this.root.collection('attempts');
  this.catalog=new Map(catalog.map(c=>[c.id,structuredClone(c)]));insist(this.catalog.size===catalog.length,500,'Duplicate canonical course');
  insist(catalog.length&&catalog.every(c=>c.layout===catalog[0].layout&&c.physics===BROWSER_PHYSICS&&c.scoring==='waypoint-v4'),500,'Incompatible canonical catalog');
  this.layout=catalog[0].layout;this.loadWorld=world;this.sliceMs=sliceMs;this.batchLimit=batchLimit;this.now=now;
 }
 course(id){const c=this.catalog.get(id);insist(c,404,'Course not found');return c;}
 current(job){const c=this.course(job.header.courseId);insist(verificationCourseKey(c)===job.courseKey,409,'The course changed; this attempt is retired');return c;}
 inputRef(id,sequence){return this.attempts.doc(id).collection('inputs').doc(inputId(sequence));}
 progressRef(owner,key){return this.players.doc(owner).collection('progress').doc(key);}
 owned(job,owner){insist(job&&job.owner===owner,404,'Attempt not found');return job;}
 async world(){this.worldPromise??=Promise.resolve().then(this.loadWorld).catch(error=>{this.worldPromise=null;throw error;});return this.worldPromise;}
 async identity(credential,name){
  const ref=this.players.doc(credential.id);
  return this.db.runTransaction(async tx=>{
   const prior=(await tx.get(ref)).data();insist(!prior||sameHash(prior.credentialHash,credential.hash),401,'Invalid credential');
   tx.set(ref,{credentialHash:credential.hash,name,created:prior?.created??this.now()});return {id:credential.id,name};
  });
 }
 async authenticate(credential){const player=(await this.players.doc(credential.id).get()).data();insist(player&&sameHash(player.credentialHash,credential.hash),401,'Invalid credential');return {id:credential.id,name:player.name};}
 async create(player,id,submitted){
  insist(uuid(id),400,'Invalid attempt ID');const course=this.course(submitted?.courseId);let header;
  try{header=validateInputHeader(submitted,course,{layoutSha256:this.layout});}catch(error){throw new HttpError(400,error.message);}
  const inputHash=digest(JSON.stringify(header)),ref=this.attempts.doc(id);
  return this.db.runTransaction(async tx=>{
   const prior=(await tx.get(ref)).data();
   if(prior){this.owned(prior,player.id);insist(prior.inputHash===inputHash,409,'Attempt inputs cannot be replaced');this.current(prior);return view(prior);}
   const job={id,owner:player.id,playerName:player.name,header,inputHash,courseKey:verificationCourseKey(course),state:'uploading',inputChunks:0,inputSteps:0,created:this.now(),lease:null,checkpoint:null,cursor:{chunk:0,run:0}};
   tx.create(ref,job);return view(job);
  });
 }
 async upload(owner,id,sequence,submitted){
  insist(Number.isSafeInteger(sequence)&&sequence>=0,400,'Invalid input sequence');insist(Array.isArray(submitted)&&submitted.length>0&&submitted.length<=INPUT_CHUNK_RUNS,400,'Invalid input chunk size');
  const ref=this.attempts.doc(id),chunkRef=this.inputRef(id,sequence);
  return this.db.runTransaction(async tx=>{
   const job=this.owned((await tx.get(ref)).data(),owner);this.current(job);let runs;
   try{runs=submitted.map(r=>validateWalkRun(r,job.header.walkSteps));}catch(error){throw new HttpError(400,error.message);}
   const hash=digest(JSON.stringify(runs));
   if(sequence<job.inputChunks){const previous=(await tx.get(chunkRef)).data();insist(previous?.hash===hash,409,'Uploaded controls cannot be replaced');return view(job);}
   insist(job.state==='uploading'&&sequence===job.inputChunks,409,'Input chunks must arrive in order before sealing');
   const steps=job.inputSteps+runs.reduce((sum,r)=>sum+r.steps,0);insist(steps<=job.header.walkSteps,400,'Too many walking steps');
   tx.create(chunkRef,{hash,runs});Object.assign(job,{inputChunks:sequence+1,inputSteps:steps});tx.update(ref,{inputChunks:job.inputChunks,inputSteps:steps});return view(job);
  });
 }
 async seal(owner,id){
  const ref=this.attempts.doc(id);return this.db.runTransaction(async tx=>{
   const job=this.owned((await tx.get(ref)).data(),owner);this.current(job);insist(job.inputSteps===job.header.walkSteps,409,'Upload the complete walking route before verification');
   if(job.state==='uploading'){job.state='pending';tx.update(ref,{state:job.state});}return view(job);
  });
 }
 async status(owner,id){const job=this.owned((await this.attempts.doc(id).get()).data(),owner);this.current(job);return view(job);}
 rankedQuery(key,owner){let q=this.attempts.where('courseKey','==',key).where('state','==','verified').where('score','>',0);if(owner)q=q.where('owner','==',owner);return q.orderBy('score','desc').orderBy('duration').orderBy('accepted').orderBy(FieldPath.documentId());}
 entry(job){return {attempt:job.id,guest:job.owner,name:job.playerName,score:job.score,duration:job.duration,surfaces:job.result.surfaces,accepted:job.accepted};}
 async cancel(owner,id){
  const ref=this.attempts.doc(id);return this.db.runTransaction(async tx=>{
   const job=this.owned((await tx.get(ref)).data(),owner);
   if(job.state==='cancelled')return view(job);
   if(job.state==='verified'){
    const key=job.courseKey,best=await tx.get(this.rankedQuery(key,owner).limit(2)),complete=await tx.get(this.attempts.where('courseKey','==',key).where('owner','==',owner).where('state','==','verified').where('success','==',true).limit(2));
    const other=best.docs.map(d=>d.data()).find(j=>j.id!==id),completed=complete.docs.some(d=>d.id!==id);
    tx.set(this.progressRef(owner,key),{courseId:job.header.courseId,revision:job.header.revision,courseKey:key,completed,best:other?this.entry(other):null});
   }
   tx.update(ref,{state:'cancelled',score:0,success:false,result:null,checkpoint:null,lease:null});return view({...job,state:'cancelled',result:null});
  });
 }
 async claim(owner,id){
  const ref=this.attempts.doc(id);return this.db.runTransaction(async tx=>{
   const job=this.owned((await tx.get(ref)).data(),owner);this.current(job);insist(job.state!=='uploading',409,'Seal inputs before verification');
   if(terminal.has(job.state)||job.lease?.until>this.now())return {job};
   const lease={token:randomUUID(),until:this.now()+Math.max(30000,this.sliceMs+15000)};
   tx.update(ref,{state:'verifying',lease});return {job:{...job,state:'verifying',lease},lease};
  });
 }
 async advance(owner,id,signal){
  const {job,lease}=await this.claim(owner,id);if(!lease)return view(job);
  const course=this.current(job),reader=new InputReader(this,job,job.cursor),options={attempt:id,subject:owner};let verification,reply;
  try{
   const world=await this.world();insist(world.layoutSha256===this.layout,500,'The verifier collision pack does not match its catalog');
   verification=job.checkpoint?restoreVerification(world,course,job.checkpoint,reader,options):new ShotVerification(world,course,job.header,reader,options);
   insist(digest(JSON.stringify(verification.header))===job.inputHash,500,'Stored verification inputs changed');
   const began=performance.now();let batches=0;
   do{reply=await verification.advance();batches++;await setImmediate();}while(reply.status!=='verified'&&!signal?.aborted&&batches<this.batchLimit&&performance.now()-began<this.sliceMs);
   const checkpoint=reply.status==='verified'?null:saveVerification(verification),ref=this.attempts.doc(id);
   return await this.db.runTransaction(async tx=>{
    const latest=this.owned((await tx.get(ref)).data(),owner);if(latest.lease?.token!==lease.token||latest.state!=='verifying')return view(latest);
    this.current(latest);const progressRef=this.progressRef(owner,job.courseKey),progress=reply.status==='verified'?(await tx.get(progressRef)).data():null;
    const patch={state:'pending',lease:null,checkpoint,cursor:reader.cursor,walkingSteps:reply.walkingSteps,shotSteps:reply.shotSteps};
    if(reply.status==='verified'){
     const result=clean({...reply.result,id:owner,playerName:job.playerName,verified:true,local:false});
     insist(Number.isSafeInteger(result.score)&&result.score>=0,500,'The verified score is invalid');
     const state=result.score>0&&result.breakdown.outcome!=='forfeit'?'verified':'forfeited';
     Object.assign(patch,{state,result,score:state==='verified'?result.score:0,duration:result.duration,success:result.success,accepted:this.now()});
     if(state==='verified'){
      const entry=this.entry({...job,...patch}),best=!progress?.best||ranked(entry,progress.best)<0?entry:progress.best;
      tx.set(progressRef,{courseId:course.id,revision:course.revision,courseKey:job.courseKey,completed:!!progress?.completed||result.success,best});
     }
    }
    tx.update(ref,patch);return view({...latest,...patch});
   });
  }catch(error){
   // A lost process/lease cannot overwrite a later cancellation or successor.
   // Retriable storage failures keep the last durable checkpoint, rather than
   // turning an infrastructure outage into a fabricated score or final result.
   if(!(error instanceof HttpError)&&!/Invalid shot inputs|Cannot verify|checkpoint/.test(error.message))throw error;
   const ref=this.attempts.doc(id);return this.db.runTransaction(async tx=>{
    const latest=this.owned((await tx.get(ref)).data(),owner);if(latest.lease?.token!==lease.token)return view(latest);
    const patch={state:'failed',lease:null,checkpoint:null,message:'This control recording could not be verified'};tx.update(ref,patch);return view({...latest,...patch});
   });
  }
 }
 async board(courseId,owner){
  const course=this.course(courseId),key=verificationCourseKey(course),top=await this.rankedQuery(key).limit(10).get(),rows=top.docs.map(d=>d.data());
  const personal=owner?(await this.rankedQuery(key,owner).limit(1).get()).docs[0]?.data():null;
  const ids=[...new Set([...rows.map(j=>j.owner),...(personal?[personal.owner]:[])])],players=ids.length?await this.db.getAll(...ids.map(id=>this.players.doc(id))):[];
  const names=new Map(players.map(p=>[p.id,p.data()?.name]));const entry=j=>({...this.entry(j),name:names.get(j.owner)||j.playerName});
  let placement=null;
  if(personal){const rank=(await this.rankedQuery(key).endBefore(personal.score,personal.duration,personal.accepted,personal.id).count().get()).data().count+1;placement={...entry(personal),rank};}
  return {challenge:course,entries:rows.map(entry),personal:placement};
 }
 async progress(owner){
  const rows=await this.players.doc(owner).collection('progress').get();
  return Promise.all(rows.docs.map(d=>d.data()).filter(p=>{const c=this.catalog.get(p.courseId);return c&&verificationCourseKey(c)===p.courseKey;}).map(async p=>{
   const b=p.best,rank=b?(await this.rankedQuery(p.courseKey).endBefore(b.score,b.duration,b.accepted,b.attempt).count().get()).data().count+1:null;
   return {challengeId:p.courseId,revision:p.revision,completed:p.completed,bestScore:b?.score||0,rank};
  }));
 }
 async replay(id){
  const job=(await this.attempts.doc(id).get()).data();insist(job?.state==='verified',404,'Replay not found');this.current(job);
  return {format:'kyoto-verified-replay-1',result:job.result,header:job.header,inputChunks:job.inputChunks};
 }
 async replayInputs(id,sequence){await this.replay(id);const chunk=(await this.inputRef(id,sequence).get()).data();insist(chunk,404,'Input chunk not found');return {sequence,runs:chunk.runs};}
}
