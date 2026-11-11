export function onlineCourses({online,store,getProfile,getCatalog,updated,status}){
 const endpoint=online.endpoint;
 let refreshPromise;
 const compatible=c=>{const current=getCatalog()[0];return c&&c.layout===current.layout&&c.physics===current.physics&&c.scoring===current.scoring;};
 async function refresh(){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
   const courses=[],seen=new Set();let after;
   do{
    const page=await online.api('/v1/courses'+(after?'?after='+encodeURIComponent(after):''),{auth:false});
    if(!Array.isArray(page.courses))throw Error('Invalid shared course catalog');
    courses.push(...page.courses.filter(c=>!c.campaign&&compatible(c)));
    after=page.next;if(after){if(seen.has(after))throw Error('Shared course catalog did not advance');seen.add(after);}
   }while(after&&!online.stopped);
   if(online.stopped)return;
   await store.cacheCourses(endpoint,courses,true);await updated();
  })().finally(()=>{refreshPromise=null;});return refreshPromise;
 }
 async function load(id){
  const board=await online.api('/v1/courses/'+encodeURIComponent(id)+'/leaderboard',{auth:false});
  if(!compatible(board.challenge))throw Error('This course uses a station version that is no longer available.');
  await store.cacheCourses(endpoint,[board.challenge]);await updated();return board.challenge;
 }
 async function describe(c){
  if(!c||c.campaign||c.creator!==getProfile().id)return;
  status(await store.publicationInfo(endpoint,c,getProfile().id));
 }
 async function queue(c){
  if(!c?.local||c.creator!==getProfile().id)throw Error('Only your saved courses can be published.');
  const info=await store.publicationInfo(endpoint,c,getProfile().id);
  if(!info.proofAttempt)throw Error('Clear every waypoint and finish zone, then publish this saved course.');
  const published=(await store.publicCourses(endpoint,c)).find(p=>p.id===c.id);
  await store.queuePublication(endpoint,c,getProfile().id,published?.revision||0,info.proofAttempt);await describe(c);online.wake();
 }
 async function sync(){
  await refresh();if(online.stopped)return;
  while(!online.stopped){
   const pending=await store.pendingPublications(endpoint);if(!pending.length||!await online.identity())return;
   for(const item of pending){
   try{
    status({courseId:item.courseId,state:'queued',message:'Verifying your solution…'});
    const initial=await online.api('/v1/publications/'+item.job,{method:'POST',body:{course:item.course,baseRevision:item.baseRevision,header:item.header}}),job=await online.verify(initial,item.proofAttempt);
    if(online.stopped)return;
    if(!['published','failed','cancelled','forfeited'].includes(job.state))throw Error('Unknown course publication response');
    await store.publicationResult(item,{state:job.state,...(job.course?{course:job.course}:{}),message:job.message||''});
    if(job.state==='published')await updated();
    status({courseId:item.courseId,state:job.state,published:job.state==='published',message:job.message});
   }catch(error){
    if(![400,403,404,409,413].includes(error.status))throw error;
    await store.publicationResult(item,{state:'failed',message:error.message});status({courseId:item.courseId,state:'failed',message:error.message});
   }
   }
  }
 }
 return {refresh,load,queue,describe,sync};
}
