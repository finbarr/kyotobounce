// Local records are explicitly unverified. The online verifier must reproduce
// the launch against its own course/layout before accepting any leaderboard score.
export const courseKey=c=>[c.layout,c.physics,c.scoring,c.id,c.revision].join(':');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local save failed'));});
export async function localStore(){
 const opening=indexedDB.open('kyoto-browser',2);
 opening.onupgradeneeded=()=>{
  const db=opening.result;
  if(!db.objectStoreNames.contains('settings')){
   db.createObjectStore('settings');db.createObjectStore('replays',{keyPath:'attempt'});
   const records=db.createObjectStore('records',{keyPath:'attempt'});records.createIndex('course','course');
  }
  opening.transaction.objectStore('replays').createIndex('draft','draft');
  db.createObjectStore('chunks',{keyPath:['attempt','sequence']}).createIndex('attempt','attempt');
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
 async function discard(id){
  const tx=db.transaction(['replays','chunks'],'readwrite'),done=complete(tx),header=await request(tx.objectStore('replays').get(id));
  if(header?.draft){tx.objectStore('replays').delete(id);deleteChunks(tx,id);}await done;release(id);
 }
 return {
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
   const tx=db.transaction('replays','readwrite'),done=complete(tx),store=tx.objectStore('replays'),header=await request(store.get(replay.attempt));
   if(!header?.draft||header.sequence+1!==replay.recordingChunks){tx.abort();await done;}
   store.put({...replay,draft:1,sequence:header.sequence});await done;
  },
  discard,
  async cleanInterrupted(){
   const ids=await request(db.transaction('replays').objectStore('replays').index('draft').getAllKeys(1));
   // Locks survive across active tabs and are released automatically on crash.
   // Never remove another live game's recording when a second tab opens.
   for(const id of ids)await navigator.locks.request(lockName(id),{ifAvailable:true},async lock=>{if(lock)await discard(id);});
  },
  async save(replay){
   if(replay.score<=0||replay.breakdown.outcome==='forfeit')throw Error('A forfeited shot cannot be saved');
   const tx=db.transaction(['records','replays'],'readwrite'),done=complete(tx);
   tx.objectStore('records').put({attempt:replay.attempt,course:courseKey(replay.challenge),challengeId:replay.challenge.id,score:replay.score,completed:replay.success,guest:replay.id,name:replay.playerName,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted,verified:false});
   tx.objectStore('replays').put(replay);await done;release(replay.attempt);
  },
  async retainCurrent(catalog){
   const valid=new Set(catalog.map(courseKey)),tx=db.transaction(['records','replays','chunks'],'readwrite'),done=complete(tx);
   tx.objectStore('records').openCursor().onsuccess=e=>{const cursor=e.target.result;if(!cursor)return;if(!valid.has(cursor.value.course)){tx.objectStore('replays').delete(cursor.key);deleteChunks(tx,cursor.key);cursor.delete();}cursor.continue();};await done;
  },
  close(){for(const id of leases.keys())release(id);db.close();}
 };
}
