import {localStore} from './local-store.js';
import {onlineScores,verificationEndpoint} from './online-scores.js';
import {onlineCourses} from './online-courses.js';
import {assetManifest} from './asset-download.js';
const order=(a,b)=>b.score-a.score||a.accepted-b.accepted||a.attempt.localeCompare(b.attempt);
export function browserConnection({onMessage,onStatus,WorkerImpl=Worker,verifier=document.querySelector('meta[name=kyoto-verifier]')?.content}){
 let worker,store,profile,catalog,campaign,selected,currentAttempt,provisional,stopped=false,presentation,ready=false,sessionBusy=false,skipping=false,lastProgress=-Infinity,inputWrites=Promise.resolve(),online,sharing,scope='local',importing,catalogWrites=Promise.resolve(),selection=0;
 let onlineStatus={configured:false,phase:'disabled'};
 let resolveReady,rejectReady;const physicsReady=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});physicsReady.catch(()=>{});
 const emit=m=>{if(!stopped&&m)onMessage(m);},error=e=>emit({type:'error',message:e.message||String(e)});
 async function board(c=selected){
  if(!c)return null;const available=!!online&&!c.local;
  if(available&&scope==='online'){const cached=await online.board(c);if(cached)return {...cached,onlineAvailable:true};}
  const entries=(await store.records(c)).sort(order);return {type:'leaderboard',local:true,onlineAvailable:available,challenge:c,entries:entries.slice(0,10),personal:entries[0]?{...entries[0],rank:1}:null};
 }
 async function progress(){
  const remote=online&&scope==='online'?await online.progress():[];
  const entries=await Promise.all(catalog.map(async c=>{const rows=(await store.records(c)).sort(order),verified=remote.find(p=>p.challengeId===c.id&&p.revision===c.revision);
   return {challengeId:c.id,revision:c.revision,completed:rows.some(r=>r.completed)||!!verified?.completed,bestScore:verified?.bestScore||rows[0]?.score||0,rank:verified?.rank??(online&&scope==='online'&&!c.local?null:rows.length?1:null),local:!verified};
  }));emit({type:'course-progress',full:true,entries});
 }
 function refresh(c=selected){if(c)board(c).then(m=>{if(m)emit(m);}).catch(error);online?.refresh(c);}
 function updateCatalog(){
  catalogWrites=catalogWrites.catch(()=>{}).then(async()=>{
   if(stopped)return;
   const remote=online?await store.publicCourses(online.endpoint,campaign[0]):[],local=await store.courses(campaign[0]);
   const map=new Map(campaign.map(c=>[c.id,c]));for(const c of remote)if(!map.has(c.id))map.set(c.id,{...c,local:false});for(const c of local)if(!campaign.some(b=>b.id===c.id))map.set(c.id,c);
   catalog=[...map.values()];
   // An in-flight attempt retains the course it started on. Selecting/home
   // adopts a newer revision; background synchronization never moves the robot.
   await store.retainCurrent(selected?[...catalog,selected]:catalog);
   if(ready)worker.postMessage({type:'catalog-update',catalog});
   emit({type:'catalog',challenges:catalog});if(ready)await progress();
   await sharing?.describe(selected);
  });return catalogWrites;
 }
 async function selectCourse(id){
  const request=++selection;
  if(!catalog.some(c=>c.id===id)){
   if(!sharing)throw Error('This course is not saved on this device.');
   try{await sharing.load(id);}catch(e){throw Error(navigator.onLine===false?'This shared course is not saved on this device. Reconnect to load it.':e.message);}
  }
  if(request!==selection||stopped)return;
  if(sessionBusy){emit({type:'notice',selectionDeferred:true,message:'The course is ready. Choose it from Levels after finishing or recalling this shot.'});return;}
  cancelReplay();forget();worker.postMessage({type:'select-challenge',challengeId:id});
 }
 function cancelReplay(){if(!importing)return;const old=importing;importing=null;worker?.postMessage({type:'replay-cancel'});store.discard(old.request).catch(()=>{});old.reject(Error('Replay loading cancelled'));}
 async function imported(m){
  const active=importing;if(!active||m.request!==active.request)return;
  try{
   if(m.type==='replay-error')throw Error(m.message);
   if(m.type==='replay-recording'){
    await store.append(active.request,m.sequence,m.recording,{cacheBytes:m.cacheBytes});
    if(importing!==active){await store.discard(active.request);return;}
    worker.postMessage({type:'replay-ack',request:active.request,sequence:m.sequence});return;
   }
   const replay=await store.imported(m.result,active.request);
   if(importing===active){importing=null;active.resolve(replay);}
  }catch(e){if(importing===active){importing=null;worker.postMessage({type:'replay-cancel'});await store.discard(active.request);active.reject(e);}}
 }
 async function result(m){
  if(m.result.attempt!==currentAttempt)return;
  const replay={...m.result,playerName:presentation.name,character:presentation.character,local:true,verified:false,accepted:Date.now()};
  if(replay.design){
   await store.finish(replay);if(replay.attempt!==currentAttempt){await store.discard(replay.attempt);return;}
   provisional=replay;emit({...replay,type:'result',saved:false});return;
  }
  const previous=(await store.records(replay.challenge)).sort(order);
  if(replay.attempt!==currentAttempt)return;
  const entry={attempt:replay.attempt,guest:profile.id,name:replay.playerName,score:replay.score,duration:replay.duration,surfaces:replay.surfaces,accepted:replay.accepted},after=[...previous,entry].sort(order),rank=after.findIndex(e=>e.attempt===entry.attempt)+1;
  replay.standings={before:previous.slice(0,10),after:after.slice(0,10),rank};replay.rank=rank;replay.records={personalBest:replay.score>(previous[0]?.score||0),courseBest:replay.score>(previous[0]?.score||0)};
  await store.finish(replay);if(replay.attempt!==currentAttempt){await store.discard(replay.attempt);return;}
  provisional=replay;const {poses,contacts,scoreFrames,...summary}=replay;
  emit({...summary,type:'result',saved:replay.score>0});
 }
 async function recording(m){
  if(m.attempt!==currentAttempt)return;
  try{
   await store.append(m.attempt,m.sequence,m.recording);
   if(m.attempt!==currentAttempt||stopped){await store.discard(m.attempt);return;}
   if(m.playback.frames.length&&(!skipping||m.playback.complete))emit(m.playback);
   worker.postMessage({type:'recording-ack',attempt:m.attempt,sequence:m.sequence});
  }catch(e){if(m.attempt===currentAttempt){send('recall');error(Error('Could not record this shot: '+e.message));}}
 }
 function forget(){const previous=currentAttempt;provisional=null;currentAttempt=null;skipping=false;lastProgress=-Infinity;if(previous)store.discard(previous).catch(error);}
 async function initialize(){
  onStatus('connecting',{});store=await localStore();await store.cleanInterrupted();
  await navigator.locks.request('kyoto-browser-profile',async()=>{profile=await store.setting('profile')||{id:crypto.randomUUID(),name:'Player',named:false};await store.setting('profile',profile);});
  const response=await fetch('/campaign.json');if(!response.ok)throw Error('Could not load the campaign');campaign=await response.json();catalog=[...campaign,...await store.courses(campaign[0])];
  if(stopped){store.close();return;}
  const remembered=await store.setting('selected');selected=catalog.find(c=>c.id===remembered)||catalog[0];
  let endpoint;try{endpoint=verificationEndpoint(verifier);}catch{onlineStatus={configured:false,phase:'error',message:'Online score configuration is unavailable. Scores are saved locally.'};emit({type:'online-status',...onlineStatus});}
  if(endpoint){
   scope='online';online=onlineScores({endpoint,store,getProfile:()=>profile,getCatalog:()=>catalog,getSelected:()=>selected,
    synchronize:()=>sharing.sync(),
    status:m=>{onlineStatus=m;emit(m);if(selected)board().then(emit).catch(error);},
    changed:(c,result)=>{if(c?.id===selected?.id)board().then(emit).catch(error);progress().catch(error);if(result)emit({type:'score-sync',...result});}
   });
   sharing=onlineCourses({online,store,getProfile:()=>profile,getCatalog:()=>catalog,updated:updateCatalog,status:m=>emit({type:'course-publication',...m})});
   await updateCatalog();selected=catalog.find(c=>c.id===remembered)||catalog[0];
  }
  await store.retainCurrent(catalog);
  worker=new WorkerImpl('/physics-worker.js',{type:'module'});
  worker.onmessage=event=>{
   const m=event.data;
   if(['replay-recording','replay-complete','replay-error'].includes(m.type)){imported(m);return;}
   if(['input-start','input-chunk','input-close'].includes(m.type)){
    inputWrites=inputWrites.then(async()=>{
     if(stopped)return;
     if(m.type==='input-close'){await store.closeRoute(m.route);return;}
     if(m.type==='input-start')await store.startRoute(m.route,m.course);else await store.appendInputs(m.route,m.sequence,m.runs);
     if(!stopped)worker.postMessage({type:'input-ack',route:m.route,sequence:m.type==='input-start'?-1:m.sequence});
    }).catch(()=>{if(!stopped)worker.postMessage({type:'input-error',route:m.route});});return;
   }
   if(m.type==='ready'){
    ready=true;resolveReady();onStatus('connected',{});emit({type:'worker-status',status:'ready',capabilities:['shot-skip-v1','design-ball-v1'],local:true});emit(m);updateCatalog().catch(error);online?.wake();return;
   }
   if(m.type==='save-course'){
    (async()=>{
     await store.saveCourse(m.challenge);await updateCatalog();worker.postMessage({type:'course-saved',id:m.challenge.id,revision:m.challenge.revision});await progress();
    })().catch(e=>{worker.postMessage({type:'course-save-failed'});error(e);});return;
   }
   if(m.type==='recording-chunk'){recording(m);return;}
   if(m.type==='recording-error'){if(m.attempt===currentAttempt){send('recall');error(m);}return;}
   if(m.type==='local-result'){result(m).catch(e=>{if(m.result.attempt===currentAttempt){send('recall');error(e);}});return;}
   if(m.type==='session'){
    if(currentAttempt!==m.attempt)forget();currentAttempt=m.attempt;selected=m.challenge;sessionBusy=!!m.busy;emit(m);sharing?.describe(selected).catch(error);return;
   }
   if(m.type==='selected'){store.setting('selected',m.challenge.id).catch(error);store.retainCurrent([...catalog,m.challenge]).catch(error);refresh(m.challenge);}
   if(m.type==='error'&&!ready){rejectReady(Error(m.message));onStatus('failed',{});}
   emit(m);
  };
  worker.onerror=e=>{ready=false;rejectReady(Error(e.message));onStatus('failed',{});error(e);};
  emit({type:'welcome',id:profile.id,sessionId:profile.id,name:profile.name,nameChosen:profile.named,local:true});emit({type:'catalog',challenges:catalog});
  const manifest=await assetManifest();
  worker.postMessage({type:'init',collisionURL:'/station.collision.bin',collisionAsset:manifest?.delivery==='chunks-v1'?manifest.files['web/public/station.collision.bin']:undefined,catalog:[selected,...catalog.filter(c=>c!==selected)],id:profile.id});
  board(selected).then(emit).catch(error);
 }
 const send=(type,extra={})=>{
  if(!worker||!ready||stopped)return false;
  if(type==='name'){
   const name=String(extra.name||'').trim();if(!name||name.length>32||/[\u0000-\u001f\u007f]/.test(name)){error(Error('Use 1–32 characters for your name'));return true;}
   profile={...profile,name,named:true};store.setting('profile',profile).then(()=>{emit({type:'named',name});online?.wake();}).catch(error);return true;
  }
  if(type==='score-scope'){scope=extra.scope==='online'?'online':'local';refresh(catalog.find(c=>c.id===extra.challengeId)||selected);progress().catch(error);return true;}
  if(type==='publish-course'){sharing?.queue(catalog.find(c=>c.id===extra.challengeId)||selected).catch(error);return true;}
  if(type==='refresh-courses'){online?.wake();return true;}
  if(type==='course-progress'){progress().catch(error);return true;}
  if(type==='charge'){sessionBusy=true;cancelReplay();presentation={name:profile.name,character:extra.character||'ori'};provisional=null;skipping=false;lastProgress=-Infinity;}
  if(type==='select-challenge'){selectCourse(extra.challengeId).catch(error);return true;}
  if(type==='home')cancelReplay();
  if(type==='recall'||type==='home'||type==='select-challenge')forget();
  if(type==='skip-shot'&&extra.attempt===currentAttempt)skipping=true;
  if(type==='client-performance'||type==='playback-rate')return true;
  worker.postMessage({type,...extra});return true;
 };
 function stop(){stopped=true;ready=false;rejectReady(Error('Game closed'));cancelReplay();online?.stop();worker?.terminate();store?.close();globalThis.removeEventListener('pagehide',stop);}
 globalThis.addEventListener('pagehide',stop,{once:true});
 setTimeout(()=>initialize().catch(e=>{rejectReady(e);if(!stopped){onStatus('failed',{});error(e);}}),0);
 return {send,local:true,get onlineStatus(){return onlineStatus;},
  playback(attempt,time){
   const now=performance.now();if(attempt!==currentAttempt||now-lastProgress<100)return;
   lastProgress=now;worker.postMessage({type:'playback-progress',attempt,time});
  },
  async presented(attempt){
   if(provisional?.attempt!==attempt||attempt!==currentAttempt)return;
   const replay=provisional;provisional=null;
   worker.postMessage({type:'bank-result',attempt});
   if(replay.score>0){await store.save(replay,{endpoint:online?.endpoint});await progress();emit(await board(replay.challenge));await sharing?.describe(replay.challenge);online?.wake();}else await store.discard(replay.attempt);
  },
  async replay(attempt){
   await physicsReady;
   let cached;try{cached=await store.replay(attempt);}catch{}
   if(cached&&(!online||scope==='local'||cached.remote))return cached;
   if(!online){if(cached)return cached;throw Error('This replay is not saved on this device');}
   let seed;try{seed=await online.api('/v1/replays/'+encodeURIComponent(attempt),{auth:false});}catch(e){if(cached)return cached;throw e;}
   cancelReplay();const request=crypto.randomUUID();return new Promise((resolve,reject)=>{importing={request,resolve,reject};worker.postMessage({type:'replay-import',request,seed,endpoint:online.endpoint});});
  },
  async level(id){if(!catalog.some(c=>c.id===id)&&sharing)await sharing.load(id);const course=catalog.find(c=>c.id===id);if(!course)throw Error('Level not found');if(scope==='online')await online?.refresh(course);return board(course);},
  stop,
 };
}
