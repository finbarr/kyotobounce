import {localStore} from './local-store.js';
const order=(a,b)=>b.score-a.score||a.accepted-b.accepted||a.attempt.localeCompare(b.attempt);
export function browserConnection({onMessage,onStatus,WorkerImpl=Worker}){
 let worker,store,profile,catalog,selected,currentAttempt,provisional,stopped=false,presentation,ready=false;
 const emit=m=>{if(!stopped)onMessage(m);},error=e=>emit({type:'error',message:e.message||String(e)});
 async function board(c=selected){const entries=(await store.records(c)).sort(order);return {type:'leaderboard',local:true,challenge:c,entries:entries.slice(0,10),personal:entries[0]?{entry:entries[0],rank:1}:null};}
 async function progress(){const entries=await Promise.all(catalog.map(async c=>{const rows=(await store.records(c)).sort(order);return {challengeId:c.id,revision:c.revision,completed:rows.some(r=>r.completed),bestScore:rows[0]?.score||0,rank:rows.length?1:null};}));emit({type:'course-progress',full:true,entries});}
 async function result(m){
  if(m.result.attempt!==currentAttempt)return;
  const replay={...m.result,playerName:presentation.name,character:presentation.character,local:true,verified:false,accepted:Date.now()},previous=(await store.records(replay.challenge)).sort(order);
  if(replay.attempt!==currentAttempt)return;
  const entry={attempt:replay.attempt,guest:profile.id,name:replay.playerName,score:replay.score,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted},after=[...previous,entry].sort(order),rank=after.findIndex(e=>e.attempt===entry.attempt)+1;
  replay.standings={before:previous.slice(0,10),after:after.slice(0,10),rank};replay.rank=rank;replay.records={personalBest:replay.score>(previous[0]?.score||0),courseBest:replay.score>(previous[0]?.score||0)};
  provisional=replay;const {poses,contacts,scoreFrames,...summary}=replay;
  emit({...summary,type:'result',saved:replay.score>0});
 }
 async function initialize(){
  onStatus('connecting',{});store=await localStore();
  profile=await store.setting('profile')||{id:crypto.randomUUID(),name:'Player',named:false};await store.setting('profile',profile);
  const response=await fetch('/campaign.json');if(!response.ok)throw Error('Could not load the campaign');catalog=await response.json();await store.retainCurrent(catalog);
  if(stopped){store.close();return;}
  const remembered=await store.setting('selected');selected=catalog.find(c=>c.id===remembered)||catalog[0];
  worker=new WorkerImpl('/physics-worker.js',{type:'module'});
  worker.onmessage=event=>{
   const m=event.data;
   if(m.type==='ready'){
    ready=true;onStatus('connected',{});emit({type:'worker-status',status:'ready',capabilities:['shot-skip-v1'],local:true});emit(m);progress().catch(error);return;
   }
   if(m.type==='local-result'){result(m).catch(error);return;}
   if(m.type==='session'){
    currentAttempt=m.attempt;if(!currentAttempt)provisional=null;selected=m.challenge;emit(m);return;
   }
   if(m.type==='selected'){store.setting('selected',m.challenge.id).catch(error);board(m.challenge).then(emit).catch(error);}
   emit(m);
  };
  worker.onerror=e=>{ready=false;onStatus('failed',{});error(e);};
  emit({type:'welcome',id:profile.id,sessionId:profile.id,name:profile.name,nameChosen:profile.named,local:true});emit({type:'catalog',challenges:catalog});
  worker.postMessage({type:'init',collisionURL:'/station.collision.bin',catalog:[selected,...catalog.filter(c=>c!==selected)],id:profile.id});
  board(selected).then(emit).catch(error);
 }
 const send=(type,extra={})=>{
  if(!worker||!ready||stopped)return false;
  if(type==='name'){
   const name=String(extra.name||'').trim();if(!name||name.length>32||/[\u0000-\u001f\u007f]/.test(name)){error(Error('Use 1–32 characters for your name'));return true;}
   profile={...profile,name,named:true};store.setting('profile',profile).then(()=>emit({type:'named',name})).catch(error);return true;
  }
  if(type==='course-progress'){progress().catch(error);return true;}
  if(['design-start','design-cancel','save-challenge','place'].includes(type)){error(Error('Course creation is not available in this preview yet'));return true;}
  if(type==='charge'){presentation={name:profile.name,character:extra.character||'ori'};provisional=null;}
  if(type==='recall'||type==='home'||type==='select-challenge'){provisional=null;currentAttempt=null;}
  if(type==='client-performance'||type==='playback-rate')return true;
  worker.postMessage({type,...extra});return true;
 };
 function stop(){stopped=true;ready=false;worker?.terminate();store?.close();globalThis.removeEventListener('pagehide',stop);}
 globalThis.addEventListener('pagehide',stop,{once:true});
 setTimeout(()=>initialize().catch(e=>{if(!stopped){onStatus('failed',{});error(e);}}),0);
 return {send,local:true,
  async presented(attempt){
   if(provisional?.attempt!==attempt||attempt!==currentAttempt)return;
   const replay=provisional;provisional=null;
   worker.postMessage({type:'bank-result',attempt});
   if(replay.score>0){await store.save(replay);await progress();emit(await board(replay.challenge));}
  },
  async replay(attempt){return provisional?.attempt===attempt?provisional:store.replay(attempt);},
  async level(id){const course=catalog.find(c=>c.id===id);if(!course)throw Error('Level not found');return board(course);},
  stop,
 };
}
