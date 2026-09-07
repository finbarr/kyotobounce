import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Challenge,Guest,NativeResult } from './types.ts';
import { withChallengeRules,SCORING_VERSION,THROW_MODEL,CHARGE_SECONDS } from './types.ts';
export class Store {
 db:DatabaseSync;
 constructor(path:string){
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY,token TEXT UNIQUE NOT NULL,name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS challenges (id TEXT NOT NULL,revision INTEGER NOT NULL,creator TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(id,revision));
  CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,guest TEXT NOT NULL,challenge TEXT,revision INTEGER,success INTEGER NOT NULL,score INTEGER NOT NULL,surfaces INTEGER NOT NULL,duration REAL NOT NULL,accepted INTEGER NOT NULL,replay TEXT);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  // Add the existing global rules to legacy challenge metadata. Geometry,
  // revisions, accepted scores and immutable replay records are unchanged.
  const update=this.db.prepare('UPDATE challenges SET body=? WHERE id=? AND revision=?');
  for(const row of this.db.prepare('SELECT id,revision,body FROM challenges').all()){
   const body=JSON.stringify(withChallengeRules(JSON.parse(row.body as string)));if(body!==row.body)update.run(body,row.id,row.revision);
  }
 }
 guest(token?:string):Guest{
  let guest=token?this.db.prepare('SELECT * FROM guests WHERE token=?').get(token) as Guest|undefined:undefined;
  if(!guest){const count=this.db.prepare('SELECT count(*) AS n FROM guests').get()!.n as number;guest={id:randomUUID(),token:randomUUID(),name:`Guest ${count+1}`};this.db.prepare('INSERT INTO guests VALUES (?,?,?)').run(guest.id,guest.token,guest.name);}
  return guest;
 }
 rename(id:string,name:string){this.db.prepare('UPDATE guests SET name=? WHERE id=?').run(name,id);}
 list():Challenge[]{return this.db.prepare('SELECT body FROM challenges c WHERE revision=(SELECT max(revision) FROM challenges WHERE id=c.id) ORDER BY created,id').all().map(r=>JSON.parse(r.body as string));}
 challenge(id:string,revision?:number):Challenge|null{
  const r=revision?this.db.prepare('SELECT body FROM challenges WHERE id=? AND revision=?').get(id,revision):this.db.prepare('SELECT body FROM challenges WHERE id=? ORDER BY revision DESC LIMIT 1').get(id);
  return r?JSON.parse(r.body as string):null;
 }
 saveChallenge(c:Challenge){this.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(c.id,c.revision,c.creator,JSON.stringify(withChallengeRules(c)),Date.now());}
 upgradeThrowModels(){
  // New launch power means a new competition revision, never mixed old scores.
  this.db.exec('BEGIN IMMEDIATE');
  try{
   for(const c of this.list())if(c.throwModel!==THROW_MODEL)this.saveChallenge({...c,revision:c.revision+1,throwModel:THROW_MODEL});
   this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 upgradeScoring(){
  this.db.exec('BEGIN IMMEDIATE');
  try{for(const c of this.list())if(c.scoring!==SCORING_VERSION)this.saveChallenge({...c,revision:c.revision+1,scoring:SCORING_VERSION,allowedInputs:{...withChallengeRules(c).allowedInputs!,chargeSeconds:CHARGE_SECONDS},hint:c.hint?{...c.hint,holdMs:Math.round(c.hint.holdMs*CHARGE_SECONDS/(c.allowedInputs?.chargeSeconds||1.2))}:undefined});this.db.exec('COMMIT');}
  catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 setting(key:string){const r=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);return r?JSON.parse(r.value as string):null;}
 setSetting(key:string,value:unknown){this.db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key,JSON.stringify(value));}
 saveResult(result:NativeResult,animation:string):boolean{
  const c=result.challenge;
  if(!c)return false;
  // The replay and ranking row are one SQLite commit; a leaderboard entry can
  // never point to a half-written replay. Attempt IDs make delivery idempotent.
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const replay=result.score>0?JSON.stringify({...result,challenge:withChallengeRules(c),animation,scoring:c.scoring||'distinct-v1'}):null;
   const insert=this.db.prepare('INSERT OR IGNORE INTO attempts VALUES (?,?,?,?,?,?,?,?,?,?)').run(result.attempt,result.id,c.id,c.revision,result.success?1:0,result.score,result.surfaces,result.duration,Date.now(),replay);
   this.db.exec('COMMIT');return insert.changes===1;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 leaderboard(c:Challenge){
  return this.db.prepare(`SELECT id AS attempt,guest,name,score,surfaces,duration,accepted FROM (
    SELECT a.*,g.name,ROW_NUMBER() OVER(PARTITION BY a.guest ORDER BY a.score DESC,a.duration ASC,a.accepted ASC,a.id ASC) AS rank
    FROM attempts a JOIN guests g ON a.guest=g.id WHERE a.challenge=? AND a.revision=? AND a.score>0
  ) WHERE rank=1 ORDER BY score DESC,duration ASC,accepted ASC,id ASC`).all(c.id,c.revision);
 }
 replay(id:string){const r=this.db.prepare('SELECT replay FROM attempts WHERE id=? AND score>0').get(id);return r?.replay?JSON.parse(r.replay as string):null;}
 close(){this.db.close();}
}
