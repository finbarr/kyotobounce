import { scoreAttempt,ComboTracker } from './scoring.ts';
import { randomUUID } from 'node:crypto';
import { Store } from './store.ts';
import { PhysicsWorker } from './worker.ts';
import type { Guest,Challenge,Disk,Waypoint,NativeResult } from './types.ts';
import { SCORING_VERSION,WAYPOINT_SCORING,ACTIVE_SCORING,SUPPORTED_SCORING,THROW_MODEL,CHARGE_SECONDS } from './types.ts';

export type Member={id:string;guest:Guest;selected:Challenge|null;chargeAt?:number;attempt?:string;snapshot:any;snapshotAt?:number;selecting:boolean;restoring:boolean;combo?:ComboTracker;scoreFrames?:NonNullable<NativeResult['scoreFrames']>;lastResult?:any;attemptPresentation?:{playerName:string;character:NonNullable<NativeResult['character']>}};
export class Competition {
 store:Store;worker:PhysicsWorker;publish:(message:unknown,sessionId?:string)=>void;
 members=new Map<string,Member>();
 pending=new Map<string,{id:string;challenge:Challenge|null}>();
 initializing=false;layout='';physics='';animation='ori-carry-v2';
 constructor(store:Store,worker:PhysicsWorker,publish:(message:unknown,sessionId?:string)=>void){this.store=store;this.worker=worker;this.publish=publish;}
 session(m:Member){return {type:'session',id:m.id,busy:!!m.attempt,restoring:m.restoring,challenge:m.selected};}
 sync(m:Member){this.publish(this.session(m),m.id);}
 playable(c:Challenge){return c.layout===this.layout&&c.physics===this.physics&&c.throwModel===THROW_MODEL&&ACTIVE_SCORING.includes(c.scoring||'')&&this.store.challenge(c.id)?.revision===c.revision;}
 catalog(){return {type:'catalog',challenges:this.store.list().filter(c=>this.playable(c))};}
 board(m:Member){if(m.selected)this.publish({type:'leaderboard',challenge:m.selected,entries:this.store.leaderboard(m.selected)},m.id);}
 remember(m:Member){this.store.setSetting(`selected:${m.guest.id}`,m.selected?{id:m.selected.id,revision:m.selected.revision}:{id:null});}
 async add(guest:Guest,id:string){
  const saved=this.store.setting(`selected:${guest.id}`)??this.store.setting('selected');
  let selected=saved?.id?this.store.challenge(saved.id):null;
  if(selected&&(selected.throwModel!==THROW_MODEL||!ACTIVE_SCORING.includes(selected.scoring||'')))selected=this.store.challenge(selected.id);
  const m:Member={id,guest,selected,snapshot:null,selecting:false,restoring:true};this.members.set(id,m);this.sync(m);this.board(m);
  if(this.worker.ready&&!this.initializing)await this.restore(m);
  return m;
 }
 remove(id:string){const m=this.members.get(id);if(!m)return;this.clearAttempt(m);this.members.delete(id);this.worker.send({type:'leave',id});}
 disconnect(id:string){
  const m=this.members.get(id);if(!m)return;
  // Movement already expires after 300 ms in the native worker. Cancel an
  // unreleased wind-up, but let an authoritative ball in flight finish normally.
  if(m.chargeAt!==undefined){this.clearAttempt(m);this.worker.send({type:'cancel',id});this.sync(m);}
 }
 clearAttempt(m:Member){if(m.attempt)this.pending.delete(m.attempt);m.attempt=undefined;m.chargeAt=undefined;m.combo=undefined;m.scoreFrames=undefined;}
 requireWaypoints(){if(!this.worker.ready||!this.worker.capabilities?.includes(WAYPOINT_SCORING))throw new Error('This physics worker does not support waypoint courses. Rebuild and restart the worker.');}
 async restore(m:Member){
  const latest=m.selected?this.store.challenge(m.selected.id):null;
  if(latest&&this.playable(latest)&&(!m.selected||!this.playable(m.selected))){m.selected=latest;this.remember(m);}
  m.restoring=true;this.sync(m);this.worker.send({type:'join',id:m.id});
  try{
   if(m.selected){if(!this.playable(m.selected))throw new Error('This course is no longer current');if(m.selected.scoring===WAYPOINT_SCORING)this.requireWaypoints();if(!SUPPORTED_SCORING.includes(m.selected.scoring||''))throw new Error('Scoring version changed');await this.worker.request({type:'select',id:m.id,challenge:m.selected});}
  }catch(error){
   if(!this.worker.ready||!this.members.has(m.id))return;
   m.selected=null;this.remember(m);this.publish({type:'notice',message:'This level could not be restored. Choose another level or explore.'},m.id);
  }
  if(!this.members.has(m.id)||!this.worker.ready)return;
  m.restoring=false;this.sync(m);this.board(m);
 }
 async ready(message:any){this.initializing=true;try{this.layout=message.layout;this.physics=message.physics;this.store.discardRetired(this.layout,this.physics);}finally{this.initializing=false;}await Promise.all([...this.members.values()].map(m=>this.restore(m)));this.publish(this.catalog());}
 state(message:any){
  const m=this.members.get(message.id);
  if(m){
   if(m.combo&&message.attempt===m.attempt&&['Flight','Result'].includes(message.phase)){
    m.combo.poses(message.scorePoses||[]);message.liveScore=m.combo.value();
    const last=m.scoreFrames?.at(-1);
    if(!last||message.flightTime-last.t>=.1||last.score.styleBanks!==message.liveScore.styleBanks||last.score.goalVisited!==message.liveScore.goalVisited||last.score.waypointCount!==message.liveScore.waypointCount)m.scoreFrames?.push({t:message.flightTime,score:message.liveScore});
   }
   m.snapshot=message;m.snapshotAt=Date.now();
  }
  // Keep full-rate positions private; orientations need 180 Hz samples to avoid
  // shortest-path interpolation reversing high spin between 30 Hz snapshots.
  message.rotationSamples=(message.scorePoses||[]).slice(-90).map((p:any)=>({t:p.t,q:p.q}));
  delete message.scorePoses;
 }
 waypoint(message:any){const m=this.members.get(message.id);if(m&&m.attempt===message.attempt)m.combo?.waypoint(message);}
 impact(message:any){this.members.get(message.id)?.combo?.contact(message);}
 note(message:any){const m=this.members.get(message.id);if(m){this.clearAttempt(m);this.sync(m);}}
 failed(id?:string){for(const m of this.members.values()){if(id&&m.id!==id)continue;m.snapshot=null;this.clearAttempt(m);this.sync(m);}}
 nameChanged(guest:Guest){for(const m of this.members.values()){if(m.guest.id===guest.id)m.guest.name=guest.name;this.board(m);}}
 result(result:NativeResult){
  const expected=this.pending.get(result.attempt),member=this.members.get(result.id);
  if(!expected||expected.id!==result.id||!member)return;
  const scoreFrames=member.scoreFrames;this.clearAttempt(member);
  const c=expected.challenge;
  if(c&&(!this.playable(c)||!result.challenge||c.id!==result.challenge.id||c.revision!==result.challenge.revision||result.layout!==c.layout||result.physics!==c.physics)){
   this.publish({type:'error',message:'The attempt used an incompatible level version. No score was saved.'},member.id);this.sync(member);return;
  }
  if(c){
   if(!Number.isInteger(result.surfaces)||result.surfaces<0||result.score!==(result.success?1000+100*result.surfaces:0))throw new Error('Invalid native result');
   result.challenge=c;
   // The native worker attests to physical success and records the trajectory.
   // Competition rules are versioned here; no browser-supplied score is accepted.
   if(ACTIVE_SCORING.includes(c.scoring||'')){result.breakdown=scoreAttempt(result);result.score=result.breakdown.total;if(c.scoring===WAYPOINT_SCORING){if(result.destinationReached!==result.success)throw new Error('Invalid native destination attestation');result.success=result.score>0;}result.scoreFrames=[...(scoreFrames||[]),{t:result.duration,score:result.breakdown}];}
   // Session IDs route live physics; persistent guest IDs own scores and levels.
   const previous=this.store.leaderboard(c);
   result.records={personalBest:result.score>this.store.personalBest(c,member.guest.id),courseBest:result.score>(previous[0]?.score||0)};
   Object.assign(result,member.attemptPresentation);
   const stored={...result,id:member.guest.id};this.store.saveResult(stored,this.animation);result.standings=stored.standings;
  }
  const {poses,contacts,scoreFrames:recordedFrames,...summary}=result;member.lastResult={...summary,type:'result',saved:!!c&&result.score>0};this.publish(member.lastResult,member.id);
  if(c)this.publish({type:'leaderboard',challenge:c,entries:this.store.leaderboard(c)});
  this.sync(member);
 }
 async command(member:Member,m:any):Promise<unknown>{
  const id=member.id;
  if(member.restoring)throw new Error('Your attempt is being restored. Try again in a moment.');
  if(m.type==='charge'||m.type==='release'){
   const allowed=m.type==='charge'?['type','challengeId','revision','layout','physics','powerRange','character']:['type'];
   if(Object.keys(m).some(key=>!allowed.includes(key)))throw new Error('Send throw intent only. Launch position, power, timing and results are authoritative.');
  }
  if(m.type==='place'){
   if(!['start','goal','waypoint'].includes(m.slot))throw new Error('Choose start, destination or waypoint');if(m.slot==='waypoint')this.requireWaypoints();validateVector(m.origin);validateVector(m.direction);
   if(typeof m.radius!=='number'||!Number.isFinite(m.radius))throw new Error('Invalid radius');
   const r=await this.worker.request({type:'place',id,slot:m.slot,origin:m.origin,direction:m.direction,radius:m.radius});return {type:'placement',slot:m.slot,disk:r.disk};
  }
  if(m.type==='save-challenge'){
   if(typeof m.name!=='string'||!m.name.trim()||m.name.length>64)throw new Error('Use a level name of 1–64 characters');
   const scoring=m.scoring===WAYPOINT_SCORING?WAYPOINT_SCORING:SCORING_VERSION;
   if(m.scoring!==undefined&&!ACTIVE_SCORING.includes(m.scoring))throw new Error('Unsupported scoring rules');
   const start=disk(m.start),goal=scoring===WAYPOINT_SCORING&&m.goal===null?null:disk(m.goal);
   const waypoints=scoring===WAYPOINT_SCORING?waypointTargets(m.waypoints,goal):undefined;
   if(scoring===WAYPOINT_SCORING)this.requireWaypoints();else if(m.waypoints?.length)throw new Error('Waypoints require waypoint scoring');
   await this.worker.request({type:'validate',id,start,goal,waypoints,scoring});
   const old=m.editId?this.store.challenge(String(m.editId)):null;
   if(m.editId&&(!old||old.creator!==member.guest.id))throw new Error('Only the creator can revise a level');
   const challenge:Challenge={id:old?.id||randomUUID(),revision:(old?.revision||0)+1,name:m.name.trim(),creator:member.guest.id,start,goal,...(old?.requiredSurface?{requiredSurface:old.requiredSurface}:{}),...(waypoints?{waypoints}:{}),layout:this.layout,physics:this.physics,throwModel:THROW_MODEL,scoring};
   this.store.saveChallenge(challenge);this.publish(this.catalog());return {type:'saved-challenge',challenge};
  }
  if(m.type==='select-challenge'){
   if(member.attempt||member.selecting)throw new Error('Finish your throw or level change first');
   const challenge=m.challengeId?this.store.challenge(String(m.challengeId),Number(m.revision)||undefined):null;
   if(m.challengeId&&!challenge)throw new Error('Level not found');
   if(challenge&&!this.playable(challenge))throw new Error('This level has changed. Select its current version.');
   if(challenge?.scoring===WAYPOINT_SCORING)this.requireWaypoints();
   member.selecting=true;try{await this.worker.request({type:'select',id,challenge});}finally{member.selecting=false;}
   member.lastResult=undefined;member.selected=challenge;this.remember(member);this.sync(member);this.board(member);return {type:'selected',challenge};
  }
  if(m.type==='leaderboard'){
   const c=this.store.challenge(String(m.challengeId),Number(m.revision));if(!c)throw new Error('Level not found');return {type:'leaderboard',challenge:c,entries:this.store.leaderboard(c)};
  }
  if(m.type==='replay'){
   const replay=this.store.replay(String(m.attempt));if(!replay)throw new Error('Replay not found');
   if(replay.layout!==this.layout||replay.physics!==this.physics||replay.animation!==this.animation||!SUPPORTED_SCORING.includes(replay.scoring||'')||!this.playable(replay.challenge))throw new Error('This replay belongs to a retired game version');
   return {type:'replay',replay};
  }
  if(m.type==='charge'){
   if(m.character!==undefined&&!['ori','koma','don'].includes(m.character))throw new Error('Unknown robot character');
   if(m.powerRange!==undefined&&!['precision','full'].includes(m.powerRange))throw new Error('Choose precision or full power');
   if(member.attempt||member.selecting)throw new Error('Your attempt or level change is already active');
   if(member.selected?.scoring===WAYPOINT_SCORING)this.requireWaypoints();
   if((m.challengeId||null)!==(member.selected?.id||null)||(m.revision||null)!==(member.selected?.revision||null)||m.layout!==this.layout||m.physics!==this.physics)throw new Error('Refresh the current level: its version changed');
   member.attemptPresentation={playerName:member.guest.name,character:m.character||'ori'};
   member.lastResult=undefined;member.combo=member.selected?new ComboTracker(member.selected):undefined;member.scoreFrames=[];
   member.chargeAt=performance.now();member.attempt=randomUUID();this.pending.set(member.attempt,{id,challenge:member.selected});
   this.worker.send({type:'charge',id,request:member.attempt,powerRange:m.powerRange||'full'});this.sync(member);return;
  }
  if(m.type==='release'){
   if(!member.attempt||member.chargeAt===undefined)return;
   const power=Math.min(1,Math.max(0,(performance.now()-member.chargeAt)/((member.selected?.allowedInputs?.chargeSeconds||CHARGE_SECONDS)*1000)));
   member.chargeAt=undefined;this.worker.send({type:'release',id,power});return;
  }
  if(m.type==='cancel'){
   if(member.attempt&&(['Charging','Release'].includes(member.snapshot?.phase)||member.chargeAt!==undefined)){this.clearAttempt(member);this.sync(member);}
   this.worker.send({type:'cancel',id});return;
  }
  if(m.type==='recall'){
   if(member.chargeAt!==undefined){this.clearAttempt(member);this.sync(member);}
   this.worker.send({type:'recall',id});return;
  }
  if(m.type==='home'){if(member.attempt)throw new Error('Cancel or finish your throw first');this.worker.send({type:'home',id});return;}
  throw new Error('Unsupported command');
 }
}
function validateVector(v:any){if(!v||['x','y','z'].some(k=>typeof v[k]!=='number'||!Number.isFinite(v[k])||Math.abs(v[k])>1000))throw new Error('Invalid position');}
function disk(v:any):Disk{validateVector(v?.center);if(typeof v.radius!=='number'||!Number.isFinite(v.radius)||typeof v.surface!=='string'||v.surface.length>160)throw new Error('Invalid circle');return {center:{x:v.center.x,y:v.center.y,z:v.center.z},radius:v.radius,surface:v.surface};}

function waypointTargets(value:any,goal:Disk|null):Waypoint[]{
 if(value===undefined)value=[];
 if(!Array.isArray(value)||value.length+(goal?1:0)<1||value.length>32)throw new Error('Choose at least one target and at most 32 waypoints');
 const ids=new Set<string>();
 return value.map(v=>{const target=disk(v);validateVector(v.normal);if(typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(v.id)||ids.has(v.id))throw new Error('Waypoint IDs must be unique');ids.add(v.id);if(Math.abs(Math.hypot(v.normal.x,v.normal.y,v.normal.z)-1)>.001)throw new Error('Waypoint normal must be a unit vector');return {...target,id:v.id,normal:{x:v.normal.x,y:v.normal.y,z:v.normal.z}};});
}
