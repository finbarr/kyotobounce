// Local records are explicitly unverified. The online verifier must reproduce
// the launch against its own course/layout before accepting any leaderboard score.
import {INPUT_CHUNK_RUNS} from './physics/input-recorder.js';
export const courseKey=c=>[c.layout,c.physics,c.scoring,c.id,c.revision].join(':');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local save failed'));});
export async function localStore(){
 const opening=indexedDB.open('kyoto-browser',5);
 opening.onupgradeneeded=()=>{
  const db=opening.result;
  if(!db.objectStoreNames.contains('settings')){
   db.createObjectStore('settings');db.createObjectStore('replays',{keyPath:'attempt'});
   const records=db.createObjectStore('records',{keyPath:'attempt'});records.createIndex('course','course');
  }
  const replays=opening.transaction.objectStore('replays');
  if(!replays.indexNames.contains('draft'))replays.createIndex('draft','draft');
  if(!replays.indexNames.contains('route'))replays.createIndex('route','inputs.route');
  if(!db.objectStoreNames.contains('chunks'))db.createObjectStore('chunks',{keyPath:['attempt','sequence']}).createIndex('attempt','attempt');
  if(!db.objectStoreNames.contains('routes'))db.createObjectStore('routes',{keyPath:'id'});
  if(!db.objectStoreNames.contains('inputs'))db.createObjectStore('inputs',{keyPath:['route','sequence']}).createIndex('route','route');
  if(!db.objectStoreNames.contains('sync'))db.createObjectStore('sync',{keyPath:['endpoint','attempt']}).createIndex('pending',['endpoint','state']);
  if(!db.objectStoreNames.contains('publications')){const s=db.createObjectStore('publications',{keyPath:['endpoint','courseId']});s.createIndex('pending',['endpoint','state']);s.createIndex('courseId','courseId');}
 };
 const db=await new Promise((resolve,reject)=>{
  let blocked=false;
  opening.onblocked=()=>{blocked=true;reject(Error('Close other Kyoto Bounce tabs and reload to update local replay storage'));};
  opening.onerror=()=>reject(opening.error);
  opening.onsuccess=()=>{if(blocked)opening.result.close();else resolve(opening.result);};
 }),leases=new Map();
 db.onversionchange=()=>db.close();
 const lockName=id=>'kyoto-recording:'+id;
 async function lease(id){
  if(leases.has(id))return leases.get(id).ready;
  let release,resolve,reject;const ready=new Promise((yes,no)=>{resolve=yes;reject=no;}),held=new Promise(done=>{release=done;});
  leases.set(id,{ready,release});navigator.locks.request(lockName(id),async()=>{resolve();await held;}).catch(reject);return ready;
 }
 function release(id){leases.get(id)?.release();leases.delete(id);}
 function deleteChunks(tx,id){tx.objectStore('chunks').index('attempt').openKeyCursor(IDBKeyRange.only(id)).onsuccess=e=>{const cursor=e.target.result;if(cursor){tx.objectStore('chunks').delete(cursor.primaryKey);cursor.continue();}};}
 async function pruneRoute(id,close=false){
  if(!id)return;
  const tx=db.transaction(['routes','inputs','replays'],'readwrite'),done=complete(tx),routes=tx.objectStore('routes'),route=await request(routes.get(id));
  if(!route||route.open&&!close){await done;return;}
  let refs=0,keep=0;
  await new Promise((resolve,reject)=>{const req=tx.objectStore('replays').index('route').openCursor(IDBKeyRange.only(id));req.onerror=()=>reject(req.error);req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve();return;}refs++;keep=Math.max(keep,cursor.value.inputs.chunks);cursor.continue();};});
  if(refs){const tail=keep?await request(tx.objectStore('inputs').get([id,keep-1])):null;routes.put({...route,open:false,sequence:keep-1,steps:tail?.endStep||0});}else routes.delete(id);
  tx.objectStore('inputs').index('route').openKeyCursor(IDBKeyRange.only(id)).onsuccess=e=>{const cursor=e.target.result;if(cursor){if(cursor.primaryKey[1]>=keep)tx.objectStore('inputs').delete(cursor.primaryKey);cursor.continue();}};
  await done;
 }
 async function discard(id){
  const tx=db.transaction(['replays','chunks'],'readwrite'),done=complete(tx),header=await request(tx.objectStore('replays').get(id));
  if(header?.draft){tx.objectStore('replays').delete(id);deleteChunks(tx,id);}await done;release(id);if(header?.draft)await pruneRoute(header.inputs?.route);
 }
 async function inputProof(id){
  const replay=await request(db.transaction('replays').objectStore('replays').get(id));
  if(!replay||replay.draft||!replay.inputs)throw Error('This shot has no saved control recording');
  return replay.inputs;
 }
 return {
  async startRoute(id,course){
   await lease('route:'+id);const tx=db.transaction('routes','readwrite'),done=complete(tx);
   tx.objectStore('routes').add({id,course:courseKey(course),open:true,sequence:-1,steps:0});await done;
  },
  async appendInputs(id,sequence,runs){
   if(!Array.isArray(runs)||!runs.length||runs.length>INPUT_CHUNK_RUNS||runs.some(r=>!Number.isSafeInteger(r.steps)||r.steps<1))throw Error('Invalid walking control chunk');
   const tx=db.transaction(['routes','inputs'],'readwrite'),done=complete(tx),store=tx.objectStore('routes'),route=await request(store.get(id));
   if(!route?.open||route.sequence+1!==sequence){tx.abort();await done;}
   const steps=route.steps+runs.reduce((sum,r)=>sum+r.steps,0);if(!Number.isSafeInteger(steps)){tx.abort();await done;}
   store.put({...route,sequence,steps});tx.objectStore('inputs').add({route:id,sequence,runs,endStep:steps});await done;
  },
  async closeRoute(id){try{await pruneRoute(id,true);}finally{release('route:'+id);}},
  inputProof,
  async *inputChunks(id,from=0){
   const proof=await inputProof(id);
   for(let sequence=from;sequence<proof.chunks;sequence++){
    const chunk=await request(db.transaction('inputs').objectStore('inputs').get([proof.route,sequence]));
    if(!chunk)throw Error('The walking control recording is incomplete');
    yield {sequence,runs:chunk.runs};
   }
  },
  async courses(current){
   const tx=db.transaction('settings','readwrite'),done=complete(tx),store=tx.objectStore('settings'),all=await request(store.get('courses'))||[];
   const valid=all.filter(c=>c.layout===current.layout&&c.physics===current.physics&&c.scoring===current.scoring);store.put(valid,'courses');await done;return valid;
  },
  async saveCourse(course){
   const tx=db.transaction(['settings','publications'],'readwrite'),done=complete(tx),store=tx.objectStore('settings'),all=await request(store.get('courses'))||[];
   const jobs=await request(tx.objectStore('publications').index('courseId').getAll(course.id));
   if(jobs.some(p=>p.state==='queued')){await done;throw Error('Wait for this course to finish publishing before revising it.');}
   const next=all.filter(c=>c.id!==course.id);next.push(course);store.put(next,'courses');await done;return next;
  },
  async publicCourses(endpoint,current){const rows=await request(db.transaction('settings').objectStore('settings').get('online:'+endpoint+':catalog'))||[];return rows.filter(c=>c.layout===current.layout&&c.physics===current.physics&&c.scoring===current.scoring);},
  async cacheCourses(endpoint,courses,replace=false){
   const tx=db.transaction('settings','readwrite'),done=complete(tx),s=tx.objectStore('settings'),key='online:'+endpoint+':catalog',prior=replace?[]:await request(s.get(key))||[],map=new Map(prior.map(c=>[c.id,c]));
   for(const c of courses)map.set(c.id,c);s.put([...map.values()],key);await done;
  },
  async publicationInfo(endpoint,c,owner){
   const tx=db.transaction(['publications','records','replays']),done=complete(tx),job=await request(tx.objectStore('publications').get([endpoint,c.id]));let proofAttempt=null;
   if(c.local&&c.creator===owner){
    const records=await request(tx.objectStore('records').index('course').getAll(courseKey(c)));
    for(const r of records.filter(r=>r.completed).sort((a,b)=>b.accepted-a.accepted)){
     const replay=await request(tx.objectStore('replays').get(r.attempt));
     if(replay?.inputs&&!replay.draft&&replay.success&&(!c.goal||replay.destinationReached)&&c.waypoints.every(w=>replay.waypointHits?.some(hit=>hit.waypointId===w.id))){proofAttempt=r.attempt;break;}
    }
   }await done;return {courseId:c.id,revision:c.revision,proofAttempt,...(job?.draftKey===courseKey(c)?{state:job.state,message:job.message}:{}),published:!c.local||job?.state==='published'&&job.draftKey===courseKey(c)};
  },
  async queuePublication(endpoint,c,owner,baseRevision,proofAttempt){
   const tx=db.transaction(['publications','settings','replays'],'readwrite'),done=complete(tx),jobs=tx.objectStore('publications'),prior=await request(jobs.get([endpoint,c.id]));
   if(prior?.state==='queued'){await done;return prior;}
   const current=(await request(tx.objectStore('settings').get('courses'))||[]).find(d=>d.id===c.id),replay=await request(tx.objectStore('replays').get(proofAttempt));
   if(!current?.local||current.creator!==owner||courseKey(current)!==courseKey(c)||!replay?.inputs||replay.draft||courseKey(replay.challenge)!==courseKey(c)||!replay.success||(c.goal&&!replay.destinationReached)||!c.waypoints.every(w=>replay.waypointHits?.some(hit=>hit.waypointId===w.id))){await done;throw Error('Clear every waypoint and finish zone, then publish this saved course.');}
   const course=Object.fromEntries(['id','revision','name','layout','physics','scoring','throwModel','start','goal','waypoints'].map(k=>[k,current[k]]));course.revision=baseRevision+1;
   const job={endpoint,courseId:c.id,job:crypto.randomUUID(),proofAttempt,draftKey:courseKey(c),course,baseRevision,header:{...replay.inputs.header,revision:course.revision},state:'queued'};
   jobs.put(job);await done;return job;
  },
  async pendingPublications(endpoint){return request(db.transaction('publications').objectStore('publications').index('pending').getAll(IDBKeyRange.only([endpoint,'queued']),20));},
  async publicationResult(item,value){
   const tx=db.transaction(['publications','settings'],'readwrite'),done=complete(tx),jobs=tx.objectStore('publications'),prior=await request(jobs.get([item.endpoint,item.courseId]));
   if(prior?.job!==item.job){await done;return;}
   jobs.put({...prior,...value});
   if(value.state==='published'){
    const settings=tx.objectStore('settings'),key='online:'+item.endpoint+':catalog',remote=await request(settings.get(key))||[],local=await request(settings.get('courses'))||[];
    settings.put([...remote.filter(c=>c.id!==item.courseId),value.course],key);
    settings.put(local.filter(c=>c.id!==item.courseId||courseKey(c)!==item.draftKey),'courses');
   }await done;
  },
  async setting(key,value){const tx=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=tx.objectStore('settings'),done=complete(tx);const result=await request(value===undefined?store.get(key):store.put(value,key));await done;return result;},
  async records(c){return request(db.transaction('records').objectStore('records').index('course').getAll(courseKey(c)));},
  async queueSaved(endpoint,catalog){
   const valid=new Set(catalog.filter(c=>!c.local).map(courseKey)),tx=db.transaction(['records','replays','sync'],'readwrite'),done=complete(tx),sync=tx.objectStore('sync');
   tx.objectStore('records').openCursor().onsuccess=e=>{
    const cursor=e.target.result;if(!cursor)return;const row=cursor.value;
    if(valid.has(row.course)){
     const proof=tx.objectStore('replays').get(row.attempt);proof.onsuccess=()=>{if(!proof.result?.inputs)return;
      const prior=sync.get([endpoint,row.attempt]);prior.onsuccess=()=>{if(!prior.result)sync.put({endpoint,attempt:row.attempt,course:row.course,state:'queued'});};
     };
    }cursor.continue();
   };await done;
  },
  async pendingSync(endpoint){return request(db.transaction('sync').objectStore('sync').index('pending').getAll(IDBKeyRange.only([endpoint,'queued']),20));},
  async syncResult(endpoint,attempt,value){const tx=db.transaction('sync','readwrite'),done=complete(tx),s=tx.objectStore('sync'),prior=await request(s.get([endpoint,attempt]));if(prior)s.put({...prior,...value});await done;},
  async imported(replay,temporary){
   const tx=db.transaction(['replays','chunks'],'readwrite'),done=complete(tx),s=tx.objectStore('replays'),header=await request(s.get(temporary)),previous=await request(s.get(replay.attempt));
   if(!header?.draft||header.sequence+1!==replay.recordingChunks){tx.abort();await done;}
   if(previous?.draft){tx.abort();await done;}
   // Finish deleting the old stream before inserting its replacement. Two
   // interleaved cursors could otherwise delete newly inserted chunks.
   await new Promise((resolve,reject)=>{const req=tx.objectStore('chunks').index('attempt').openKeyCursor(IDBKeyRange.only(replay.attempt));req.onerror=()=>reject(req.error);req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve();return;}tx.objectStore('chunks').delete(cursor.primaryKey);cursor.continue();};});s.delete(temporary);
   tx.objectStore('chunks').index('attempt').openCursor(IDBKeyRange.only(temporary)).onsuccess=e=>{const cursor=e.target.result;if(cursor){tx.objectStore('chunks').put({...cursor.value,attempt:replay.attempt});cursor.delete();cursor.continue();}};
   s.put({...replay,...(previous?.inputs?{inputs:previous.inputs}:{})});await done;release(temporary);
  },
  async replay(id){
   const tx=db.transaction(['replays','chunks']),replay=await request(tx.objectStore('replays').get(id));
   if(!replay||replay.draft)throw Error('This replay is not saved on this device');
   const poses=replay.poses||[],contacts=replay.contacts||[],scoreFrames=replay.scoreFrames||[];
   await new Promise((resolve,reject)=>{const cursor=tx.objectStore('chunks').index('attempt').openCursor(IDBKeyRange.only(id));cursor.onerror=()=>reject(cursor.error);cursor.onsuccess=()=>{const c=cursor.result;if(!c){resolve();return;}poses.push(...c.value.poses);contacts.push(...c.value.contacts);scoreFrames.push(...c.value.scoreFrames);c.continue();};});
   return {...replay,poses,contacts,scoreFrames};
  },
  async append(id,sequence,recording){
   await lease(id);const tx=db.transaction(['replays','chunks'],'readwrite'),done=complete(tx),store=tx.objectStore('replays'),header=await request(store.get(id));
   if((header?.sequence??-1)+1!==sequence||header&&!header.draft){tx.abort();await done;}
   store.put({...header,attempt:id,draft:1,sequence});tx.objectStore('chunks').put({attempt:id,sequence,...recording});await done;
  },
  async finish(replay){
   const tx=db.transaction(['replays','routes','inputs'],'readwrite'),done=complete(tx),store=tx.objectStore('replays'),header=await request(store.get(replay.attempt));
   if(!header?.draft||header.sequence+1!==replay.recordingChunks){tx.abort();await done;}
   if(replay.challenge&&!replay.design){
    const proof=replay.inputs,route=proof&&await request(tx.objectStore('routes').get(proof.route));
    const tail=proof?.chunks?await request(tx.objectStore('inputs').get([proof.route,proof.chunks-1])):null;
    if(!route||route.course!==courseKey(replay.challenge)||route.sequence+1<proof.chunks||(tail?.endStep??0)!==proof.header.walkSteps){tx.abort();await done;}
   }
   store.put({...replay,draft:1,sequence:header.sequence});await done;
  },
  discard,
  async cleanInterrupted(){
   const ids=await request(db.transaction('replays').objectStore('replays').index('draft').getAllKeys(1));
   // Locks survive across active tabs and are released automatically on crash.
   // Never remove another live game's recording when a second tab opens.
   for(const id of ids)await navigator.locks.request(lockName(id),{ifAvailable:true},async lock=>{if(lock)await discard(id);});
   const routes=await request(db.transaction('routes').objectStore('routes').getAllKeys());
   for(const id of routes)await navigator.locks.request(lockName('route:'+id),{ifAvailable:true},async lock=>{if(lock)await pruneRoute(id,true);});
  },
  async save(replay,{endpoint}={}){
   if(replay.score<=0||replay.breakdown.outcome==='forfeit')throw Error('A forfeited shot cannot be saved');
   const tx=db.transaction(['records','replays','sync'],'readwrite'),done=complete(tx);
   tx.objectStore('records').put({attempt:replay.attempt,course:courseKey(replay.challenge),challengeId:replay.challenge.id,score:replay.score,completed:replay.success,guest:replay.id,name:replay.playerName,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted,verified:false});
   tx.objectStore('replays').put(replay);
   if(endpoint&&!replay.challenge.local)tx.objectStore('sync').put({endpoint,attempt:replay.attempt,course:courseKey(replay.challenge),state:'queued'});
   await done;release(replay.attempt);
  },
  async retainCurrent(catalog){
   const valid=new Set(catalog.map(courseKey)),tx=db.transaction(['records','replays','chunks','sync','settings','publications'],'readwrite'),done=complete(tx),routes=new Set();
   tx.objectStore('publications').openCursor().onsuccess=e=>{const cursor=e.target.result;if(cursor){if(!valid.has(cursor.value.draftKey)&&!valid.has(courseKey(cursor.value.course)))cursor.delete();cursor.continue();}};
   tx.objectStore('settings').openCursor().onsuccess=e=>{const cursor=e.target.result;if(cursor){if(typeof cursor.key==='string'&&cursor.key.startsWith('online:')&&cursor.key.includes(':board:')&&cursor.value?.challenge&&!valid.has(courseKey(cursor.value.challenge)))cursor.delete();cursor.continue();}};
   tx.objectStore('sync').openCursor().onsuccess=e=>{const cursor=e.target.result;if(cursor){if(!valid.has(cursor.value.course))cursor.delete();cursor.continue();}};
   tx.objectStore('replays').openCursor().onsuccess=e=>{const cursor=e.target.result;if(cursor){if(cursor.value.remote&&!valid.has(courseKey(cursor.value.challenge))){deleteChunks(tx,cursor.key);cursor.delete();}cursor.continue();}};
   tx.objectStore('records').openCursor().onsuccess=e=>{const cursor=e.target.result;if(!cursor)return;if(!valid.has(cursor.value.course)){const read=tx.objectStore('replays').get(cursor.key);read.onsuccess=()=>{if(read.result?.inputs)routes.add(read.result.inputs.route);};tx.objectStore('replays').delete(cursor.key);deleteChunks(tx,cursor.key);cursor.delete();}cursor.continue();};await done;
   for(const id of routes)await pruneRoute(id);
  },
  close(){for(const id of leases.keys())release(id);db.close();}
 };
}
