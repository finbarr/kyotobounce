import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Challenge,Guest,NativeResult } from './types.ts';
import { withChallengeRules,SCORING_VERSION,ACTIVE_SCORING,THROW_MODEL,CHARGE_SECONDS,RECORDED_PHYSICS } from './types.ts';
import {throwSpeed,powerForSpeed} from './public/throw-power.js';
export class Store {
 db:DatabaseSync;
 constructor(path:string){
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY,token TEXT UNIQUE NOT NULL,name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS challenges (id TEXT NOT NULL,revision INTEGER NOT NULL,creator TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(id,revision));
  CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,guest TEXT NOT NULL,challenge TEXT,revision INTEGER,success INTEGER NOT NULL,score INTEGER NOT NULL,surfaces INTEGER NOT NULL,duration REAL NOT NULL,accepted INTEGER NOT NULL,replay TEXT);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  // Historical JSON stays byte-for-byte immutable. Defaults are read adapters.
  this.db.exec('CREATE TABLE IF NOT EXISTS layout_migrations (id TEXT NOT NULL,source_revision INTEGER NOT NULL,target_layout TEXT NOT NULL,target_physics TEXT NOT NULL,status TEXT NOT NULL,reason TEXT,target_revision INTEGER,PRIMARY KEY(id,source_revision,target_layout,target_physics))');
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
 revisions():Challenge[]{return this.db.prepare('SELECT body FROM challenges ORDER BY created DESC,id,revision DESC').all().map(r=>withChallengeRules(JSON.parse(r.body as string)));}
 layoutMigration(id:string,revision:number,layout:string,physics:string){return this.db.prepare('SELECT * FROM layout_migrations WHERE id=? AND source_revision=? AND target_layout=? AND target_physics=?').get(id,revision,layout,physics);}
 recordLayoutFailure(c:Challenge,layout:string,physics:string,reason:string){this.db.prepare("INSERT INTO layout_migrations VALUES (?,?,?,?,?,?,NULL) ON CONFLICT(id,source_revision,target_layout,target_physics) DO UPDATE SET status='archived',reason=excluded.reason WHERE status!='migrated'").run(c.id,c.revision,layout,physics,'archived',reason);}
 appendLayoutRevision(source:Challenge,candidate:Challenge):number{
  this.db.exec('BEGIN IMMEDIATE');try{
   const prior=this.layoutMigration(source.id,source.revision,candidate.layout,candidate.physics);if(prior?.status==='migrated'){this.db.exec('COMMIT');return Number(prior.target_revision);}
   const latest=this.challenge(source.id);if(!latest||latest.revision!==source.revision||latest.layout!==source.layout)throw new Error('Challenge changed during layout validation; retry migration');
   const revision=latest.revision+1;this.saveChallenge({...candidate,id:source.id,creator:source.creator,revision});
   this.db.prepare("INSERT INTO layout_migrations VALUES (?,?,?,?,?,'',?) ON CONFLICT(id,source_revision,target_layout,target_physics) DO UPDATE SET status='migrated',reason='',target_revision=excluded.target_revision").run(source.id,source.revision,candidate.layout,candidate.physics,'migrated',revision);this.db.exec('COMMIT');return revision;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 saveChallenge(c:Challenge){this.db.prepare('INSERT INTO challenges VALUES (?,?,?,?,?)').run(c.id,c.revision,c.creator,JSON.stringify(withChallengeRules(c)),Date.now());}
 upgradeThrowModels(){
  // New launch power means a new competition revision, never mixed old scores.
  this.db.exec('BEGIN IMMEDIATE');
  try{
   for(const c of this.list())if(c.throwModel!==THROW_MODEL){
    let hint=c.hint;
    if(hint){
     const seconds=c.allowedInputs?.chargeSeconds||1.2;
     const speed=throwSpeed(hint.holdMs/(seconds*1000),'full',c.throwModel||'precision-v1');
     const powerRange=speed<=12?'precision':'full';
     // Preserve release speed, including when scoring later changes charge time.
     hint={...hint,powerRange,holdMs:powerForSpeed(speed,powerRange)*seconds*1000,note:hint.note.replace(/(?:release|hold) near \d+% power/gi,'release at the suggested speed')};
    }
    this.saveChallenge({...c,revision:c.revision+1,throwModel:THROW_MODEL,hint});
   }
   this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 upgradeScoring(){
  this.db.exec('BEGIN IMMEDIATE');
  try{for(const c of this.list())if(!ACTIVE_SCORING.includes(c.scoring||''))this.saveChallenge({...c,revision:c.revision+1,scoring:SCORING_VERSION,allowedInputs:{...withChallengeRules(c).allowedInputs!,chargeSeconds:CHARGE_SECONDS},hint:c.hint?{...c.hint,holdMs:Math.round(c.hint.holdMs*CHARGE_SECONDS/(c.allowedInputs?.chargeSeconds||1.2))}:undefined});this.db.exec('COMMIT');}
  catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 upgradePhysics(layout:string,physics:string){
  if(!RECORDED_PHYSICS.includes(physics))return;
  this.db.exec('BEGIN IMMEDIATE');
  try{
   for(const c of this.list())if(c.layout===layout&&c.physics!==physics&&RECORDED_PHYSICS.includes(c.physics))
    this.saveChallenge({...c,revision:c.revision+1,physics});
   this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
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
