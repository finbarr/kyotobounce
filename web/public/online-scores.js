import {courseKey} from './local-store.js';

export function verificationEndpoint(value){
 if(!value)return null;const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid score service URL');
 return url.origin;
}
export function onlineScores({endpoint,store,getProfile,getCatalog,getSelected,changed,status,fetchImpl=fetch}){
 let stopped=false,timer,running=false,again=false,delay=1000,token,registeredName,connected=false;
 const controllers=new Set(),refreshes=new Map(),key=name=>'online:'+endpoint+':'+name;
 const state=(phase,message,detail)=>{
  if(['connected','verifying'].includes(phase)&&navigator.onLine===false){phase='offline';message='Saved locally. Waiting for a connection.';}
  connected=phase==='connected'||phase==='verifying';status({type:'online-status',configured:true,phase,message,detail});
 };
 async function credential(){
  if(token)return token;
  await navigator.locks.request(key('identity'),async()=>{
   token=await store.setting(key('credential'));if(token)return;
   const bytes=crypto.getRandomValues(new Uint8Array(32)),secret=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   token=getProfile().id+'.'+secret;await store.setting(key('credential'),token);
  });return token;
 }
 async function api(path,{method='GET',body,auth=true}={}){
  if(stopped)throw Error('Score synchronization stopped');
  const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetchImpl(endpoint+path,{method,signal:controller.signal,headers:{...(auth?{Authorization:'Bearer '+await credential()}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
   const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'Score verification unavailable'),{status:response.status});return value;
  }finally{clearTimeout(timeout);controllers.delete(controller);}
 }
 async function identity(){const profile=await store.setting('profile')||getProfile();if(!profile.named)return false;if(registeredName!==profile.name){await api('/v1/identity',{method:'POST',body:{name:profile.name}});registeredName=profile.name;state('connected');}return true;}
 async function board(c){const cached=await store.setting(key('board:'+courseKey(c)));return cached?{...cached,type:'leaderboard',local:false,cached:!connected||navigator.onLine===false}:null;}
 async function progress(){const cached=await store.setting(key('progress'));return (cached?.entries||[]).filter(p=>{const c=getCatalog().find(c=>c.id===p.challengeId&&c.revision===p.revision);return c&&cached.courses?.includes(courseKey(c));});}
 async function refresh(c=getSelected()){
  if(stopped||!c||c.local)return;
  const id=courseKey(c);if(refreshes.has(id))return refreshes.get(id);
  const pending=(async()=>{
   try{
    const authenticated=await identity();
    const [board,progress]=await Promise.all([api('/v1/courses/'+encodeURIComponent(c.id)+'/leaderboard',{auth:authenticated}),authenticated?api('/v1/progress'):{entries:[]}]);
    if(courseKey(board.challenge)!==id)throw Object.assign(Error('The online course changed. Reload for the current course.'),{status:409});
    await store.setting(key('board:'+id),board);await store.setting(key('progress'),{courses:getCatalog().filter(c=>!c.local).map(courseKey),entries:progress.entries});state('connected');changed(c);
   }catch(error){if(!stopped)state(error.status===401?'error':'offline',error.status===401?'Online identity could not be authenticated.':'Saved locally. Online scores will reconnect.',error.message);}
   finally{refreshes.delete(id);}
  })();refreshes.set(id,pending);return pending;
 }
 async function submit(item){
  const proof=await store.inputProof(item.attempt),path='/v1/attempts/'+item.attempt;
  let job=await api(path,{method:'POST',body:{header:proof.header}});
  if(job.state==='uploading'){
   for await(const chunk of store.inputChunks(item.attempt,job.uploadedChunks))await api(path+'/inputs/'+chunk.sequence,{method:'PUT',body:{runs:chunk.runs}});
   job=await api(path+'/seal',{method:'POST',body:{}});
  }
  while(['pending','verifying'].includes(job.state)&&!stopped){
   state('verifying');job=await api(path+'/advance',{method:'POST',body:{}});
   if(job.state==='verifying')await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(stopped)return;
  if(!['verified','forfeited','failed','cancelled'].includes(job.state))throw Error('Unknown verification response');
  await store.syncResult(endpoint,item.attempt,{state:job.state,...(job.result?{result:job.result}:{}),message:job.message||''});
  const c=getCatalog().find(c=>courseKey(c)===item.course);if(c)await refresh(c);
  changed(c,{attempt:item.attempt,state:job.state,result:job.result});
 }
 async function pump(){
  clearTimeout(timer);if(stopped)return;if(running){again=true;return;}running=true;again=false;
  try{
   await navigator.locks.request(key('sync'),{ifAvailable:true},async lock=>{
    if(!lock){again=true;return;}if(navigator.onLine===false){state('offline','Saved locally. Waiting for a connection.');return;}
    if(!await identity())return;
    await store.queueSaved(endpoint,getCatalog());await refresh();if(!connected)throw Error('Score service unavailable');
    while(!stopped){
     const pending=await store.pendingSync(endpoint);if(!pending.length)break;
     for(const item of pending){
      try{await submit(item);}catch(error){
       if([400,404,409,413].includes(error.status)){
        await store.syncResult(endpoint,item.attempt,{state:'failed',message:error.message});changed(null,{attempt:item.attempt,state:'failed',message:error.message});
       }else throw error;
      }
      if(stopped)return;
     }
    }delay=1000;if(!stopped)state('connected');
   });
  }catch(error){if(!stopped){registeredName=undefined;state(error.status===401?'error':'offline','Saved locally. Online verification will retry.',error.message);timer=setTimeout(pump,delay);delay=Math.min(60000,delay*2);}}
  finally{running=false;if(again&&!stopped)timer=setTimeout(pump,1000);}
 }
 const wake=()=>{delay=1000;pump();},visible=()=>{if(document.visibilityState==='visible')wake();};
 const offline=()=>state('offline','Saved locally. Waiting for a connection.');
 globalThis.addEventListener('online',wake);globalThis.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);
 return {endpoint,board,progress,refresh,wake,api,get connected(){return connected;},stop(){stopped=true;clearTimeout(timer);for(const c of controllers)c.abort();globalThis.removeEventListener('online',wake);globalThis.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible);}};
}
