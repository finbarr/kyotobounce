// Local records are explicitly unverified. The online verifier must reproduce
// the launch against its own course/layout before accepting any leaderboard score.
import {INPUT_CHUNK_RUNS} from './physics/input-recorder.js';
export const courseKey=c=>[c.layout,c.physics,c.scoring,c.id,c.revision].join(':');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local save failed'));});
export async function localStore(){
 const opening=indexedDB.open('kyoto-browser',3);
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
  db.createObjectStore('routes',{keyPath:'id'});
  db.createObjectStore('inputs',{keyPath:['route','sequence']}).createIndex('route','route');
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
  async *inputChunks(id){
   const proof=await inputProof(id);
   for(let sequence=0;sequence<proof.chunks;sequence++){
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
   const tx=db.transaction('settings','readwrite'),done=complete(tx),store=tx.objectStore('settings'),all=await request(store.get('courses'))||[];
   const next=all.filter(c=>c.id!==course.id);next.push(course);store.put(next,'courses');await done;return next;
  },
  async setting(key,value){const tx=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=tx.objectStore('settings'),done=complete(tx);const result=await request(value===undefined?store.get(key):store.put(value,key));await done;return result;},
  async records(c){return request(db.transaction('records').objectStore('records').index('course').getAll(courseKey(c)));},
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
  async save(replay){
   if(replay.score<=0||replay.breakdown.outcome==='forfeit')throw Error('A forfeited shot cannot be saved');
   const tx=db.transaction(['records','replays'],'readwrite'),done=complete(tx);
   tx.objectStore('records').put({attempt:replay.attempt,course:courseKey(replay.challenge),challengeId:replay.challenge.id,score:replay.score,completed:replay.success,guest:replay.id,name:replay.playerName,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted,verified:false});
   tx.objectStore('replays').put(replay);await done;release(replay.attempt);
  },
  async retainCurrent(catalog){
   const valid=new Set(catalog.map(courseKey)),tx=db.transaction(['records','replays','chunks'],'readwrite'),done=complete(tx),routes=new Set();
   tx.objectStore('records').openCursor().onsuccess=e=>{const cursor=e.target.result;if(!cursor)return;if(!valid.has(cursor.value.course)){const read=tx.objectStore('replays').get(cursor.key);read.onsuccess=()=>{if(read.result?.inputs)routes.add(read.result.inputs.route);};tx.objectStore('replays').delete(cursor.key);deleteChunks(tx,cursor.key);cursor.delete();}cursor.continue();};await done;
   for(const id of routes)await pruneRoute(id);
  },
  close(){for(const id of leases.keys())release(id);db.close();}
 };
}
