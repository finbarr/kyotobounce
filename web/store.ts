import { DatabaseSync } from 'node:sqlite';
import {ReplayCache,type ReplayCacheOptions} from './replay-cache.ts';
import { randomUUID } from 'node:crypto';
import type { Challenge,Guest,NativeResult,LeaderboardEntry } from './types.ts';
import { withChallengeRules,SCORING_VERSION,ACTIVE_SCORING,THROW_MODEL,PHYSICS_VERSION } from './types.ts';
export class Store {
 db:DatabaseSync;
 replayCache:ReplayCache;
 constructor(path:string,cacheOptions:ReplayCacheOptions={}){
  this.replayCache=new ReplayCache(cacheOptions);
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY,token TEXT UNIQUE NOT NULL,name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS challenges (id TEXT NOT NULL,revision INTEGER NOT NULL,creator TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(id,revision));
  CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,guest TEXT NOT NULL,challenge TEXT,revision INTEGER,success INTEGER NOT NULL,score INTEGER NOT NULL,surfaces INTEGER NOT NULL,duration REAL NOT NULL,accepted INTEGER NOT NULL,replay TEXT);
  CREATE INDEX IF NOT EXISTS attempts_course_player ON attempts(challenge,revision,guest,score DESC,duration,accepted,id);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);

 }
 guest(token?:string):Guest{
  let guest=token?this.db.prepare('SELECT * FROM guests WHERE token=?').get(token) as Guest|undefined:undefined;
  if(!guest){const count=this.db.prepare('SELECT count(*) AS n FROM guests').get()!.n as number;guest={id:randomUUID(),token:randomUUID(),name:`Guest ${count+1}`};this.db.prepare('INSERT INTO guests VALUES (?,?,?)').run(guest.id,guest.token,guest.name);}
  return guest;
 }
 rename(id:string,name:string){this.db.prepare('UPDATE guests SET name=? WHERE id=?').run(name,id);}
 list():Challenge[]{return this.db.prepare('SELECT body FROM challenges c WHERE revision=(SELECT max(revision) FROM challenges WHERE id=c.id) ORDER BY created,id').all().map(r=>withChallengeRules(JSON.parse(r.body as string)));}
 challenge(id:string,revision?:number):Challenge|null{
  const r=revision?this.db.prepare('SELECT body FROM challenges WHERE id=? AND revision=?').get(id,revision):this.db.prepare('SELECT body FROM challenges WHERE id=? ORDER BY revision DESC LIMIT 1').get(id);
  return r?withChallengeRules(JSON.parse(r.body as string)):null;
 }
 // Pre-launch builds keep only current courses and their scores. A changed
 // level replaces its prior definition; it does not create an archive.
 saveChallenge(c:Challenge){
  this.db.exec('BEGIN IMMEDIATE');try{
   this.db.prepare('DELETE FROM attempts WHERE challenge=? AND revision<>?').run(c.id,c.revision);
   this.db.prepare('DELETE FROM challenges WHERE id=? AND revision<>?').run(c.id,c.revision);
   this.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(c.id,c.revision,c.creator,JSON.stringify(withChallengeRules(c)),Date.now());
   this.db.exec('COMMIT');this.replayCache.invalidateChallenge(c.id);
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 // The checked-in campaign is the complete set of station-authored courses.
 // Replace changed development courses and remove their scores atomically;
 // player-created courses and unchanged campaign scores remain available.
 syncCampaign(courses:Challenge[]){
  if(!courses.length||new Set(courses.map(c=>c.id)).size!==courses.length||courses.some(c=>c.creator!=='station'))throw new Error('Invalid station campaign');
  const invalidated=new Set<string>();
  this.db.exec('BEGIN IMMEDIATE');try{
   const desired=new Map(courses.map(c=>[c.id,withChallengeRules(c)]));
   for(const row of this.db.prepare('SELECT id,revision,body FROM challenges WHERE creator=?').all('station')){
    const c=desired.get(String(row.id));
    if(!c||JSON.stringify(c)!==String(row.body)){
     invalidated.add(String(row.id));
     this.db.prepare('DELETE FROM attempts WHERE challenge=? AND revision=?').run(String(row.id),Number(row.revision));
     this.db.prepare('DELETE FROM challenges WHERE id=? AND revision=?').run(String(row.id),Number(row.revision));
    }
   }
   for(const c of desired.values()){
    const existing=this.challenge(c.id);
    if(existing&&existing.creator!=='station')throw new Error('Campaign ID belongs to a player');
    if(!this.challenge(c.id,c.revision))this.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(c.id,c.revision,c.creator,JSON.stringify(c),Date.now());
   }
   this.db.exec('COMMIT');for(const id of invalidated)this.replayCache.invalidateChallenge(id);
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 discardRetired(layout:string,physics:string){
  if(physics!==PHYSICS_VERSION)throw new Error('Unsupported physics worker');
  const invalidated=new Set<string>();
  this.db.exec('BEGIN IMMEDIATE');try{
   const rows=this.db.prepare('SELECT id,revision,body FROM challenges').all();
   const latest=new Map<string,number>();for(const row of rows)latest.set(String(row.id),Math.max(latest.get(String(row.id))||0,Number(row.revision)));
   for(const row of rows){const c=JSON.parse(String(row.body));
    if(c.layout!==layout||c.physics!==physics||c.throwModel!==THROW_MODEL||!ACTIVE_SCORING.includes(c.scoring)||c.revision!==latest.get(c.id)){invalidated.add(String(row.id));this.db.prepare('DELETE FROM challenges WHERE id=? AND revision=?').run(String(row.id),Number(row.revision));}
   }
   this.db.exec('DELETE FROM attempts WHERE NOT EXISTS (SELECT 1 FROM challenges c WHERE c.id=attempts.challenge AND c.revision=attempts.revision); DROP TABLE IF EXISTS layout_migrations; COMMIT;');for(const id of invalidated)this.replayCache.invalidateChallenge(id);
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 setting(key:string){const r=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);return r?JSON.parse(r.value as string):null;}
 setSetting(key:string,value:unknown){this.db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key,JSON.stringify(value));}
 saveResult(result:NativeResult,animation:string):boolean{
  const c=result.challenge;
  if(!c||!this.challenge(c.id,c.revision))return false;
  // The replay and ranking row are one SQLite commit; a leaderboard entry can
  // never point to a half-written replay. Attempt IDs make delivery idempotent.
  let replayJson:string|undefined,inserted=false;
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const before=this.leaderboard(c);
   const insert=this.db.prepare('INSERT OR IGNORE INTO attempts VALUES (?,?,?,?,?,?,?,?,?,?)').run(result.attempt,result.id,c.id,c.revision,result.success?1:0,result.score,result.surfaces,result.duration,Date.now(),null);
   if(insert.changes===1){
    const after=this.leaderboard(c),rank=after.findIndex(row=>row.attempt===result.attempt),previousRank=before.findIndex(row=>row.guest===result.id);
    result.standings={before:before.slice(0,10),after:after.slice(0,10),rank:rank<0?null:rank+1,previousRank:previousRank<0?null:previousRank+1,improved:rank>=0};
    if(result.score>0){replayJson=JSON.stringify({...result,challenge:withChallengeRules(c),animation,scoring:c.scoring||SCORING_VERSION});this.db.prepare('UPDATE attempts SET replay=? WHERE id=?').run(replayJson,result.attempt);}
   }
   this.db.exec('COMMIT');inserted=insert.changes===1;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
  // Publish to the cache only after the replay and score commit succeeds.
  if(replayJson)this.replayCache.put(result.attempt,replayJson,{playerName:result.playerName,score:result.score,challenge:c});
  return inserted;
 }
 leaderboard(c:Challenge):LeaderboardEntry[]{
  return this.db.prepare(`SELECT id AS attempt,guest,name,score,surfaces,duration,accepted FROM (
    SELECT a.id,a.guest,a.score,a.surfaces,a.duration,a.accepted,g.name,ROW_NUMBER() OVER(PARTITION BY a.guest ORDER BY a.score DESC,a.duration ASC,a.accepted ASC,a.id ASC) AS rank
    FROM attempts a JOIN guests g ON a.guest=g.id WHERE a.challenge=? AND a.revision=? AND a.score>0
  ) WHERE rank=1 ORDER BY score DESC,duration ASC,accepted ASC,id ASC`).all(c.id,c.revision) as LeaderboardEntry[];
 }
 replayResponse(id:string){
  const cached=this.replayCache.get(id);if(cached)return {entry:cached,status:'HIT'};
  const r=this.db.prepare('SELECT replay FROM attempts WHERE id=? AND score>0').get(id);
  if(!r?.replay)return {entry:undefined,status:'MISS'};
  const entry=this.replayCache.put(id,r.replay as string);return {entry,status:entry.cached?'MISS':'BYPASS'};
 }
 replay(id:string){const {entry}=this.replayResponse(id);return entry?JSON.parse(entry.body.toString()).replay:null;}
 close(){this.replayCache.close();this.db.close();}
}
