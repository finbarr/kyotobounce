// Local records are explicitly unverified. The online verifier must reproduce
// the launch against its own course/layout before accepting any leaderboard score.
export const courseKey=c=>[c.layout,c.physics,c.scoring,c.id,c.revision].join(':');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local save failed'));});
export async function localStore(){
 const opening=indexedDB.open('kyoto-browser',1);
 opening.onupgradeneeded=()=>{
  const db=opening.result;db.createObjectStore('settings');db.createObjectStore('replays',{keyPath:'attempt'});
  const records=db.createObjectStore('records',{keyPath:'attempt'});records.createIndex('course','course');
 };
 const db=await request(opening);
 return {
  async setting(key,value){const tx=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=tx.objectStore('settings'),done=complete(tx);const result=await request(value===undefined?store.get(key):store.put(value,key));await done;return result;},
  async records(c){return request(db.transaction('records').objectStore('records').index('course').getAll(courseKey(c)));},
  async replay(id){const replay=await request(db.transaction('replays').objectStore('replays').get(id));if(!replay)throw Error('This replay is not saved on this device');return replay;},
  async save(replay){
   if(replay.score<=0||replay.breakdown.outcome==='forfeit')throw Error('A forfeited shot cannot be saved');
   const tx=db.transaction(['records','replays'],'readwrite'),done=complete(tx);
   tx.objectStore('records').put({attempt:replay.attempt,course:courseKey(replay.challenge),challengeId:replay.challenge.id,score:replay.score,completed:replay.success,guest:replay.id,name:replay.playerName,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted,verified:false});
   tx.objectStore('replays').put(replay);await done;
  },
  async retainCurrent(catalog){
   const valid=new Set(catalog.map(courseKey)),tx=db.transaction(['records','replays'],'readwrite'),done=complete(tx);
   tx.objectStore('records').openCursor().onsuccess=e=>{const cursor=e.target.result;if(!cursor)return;if(!valid.has(cursor.value.course)){tx.objectStore('replays').delete(cursor.key);cursor.delete();}cursor.continue();};await done;
  },
  close(){db.close();}
 };
}
