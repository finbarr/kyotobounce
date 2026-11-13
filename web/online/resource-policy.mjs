import {HttpError,insist} from './protocol.mjs';

export const RESOURCE_LIMITS=Object.freeze({
 identities:50000,identitiesDay:1000,jobs:100000,inputBytes:512*1024*1024,
 jobsDay:2000,playerJobsDay:200,computeMinute:2400,playerComputeMinute:600,
 computeDay:20000,playerComputeDay:5000,
 walkSteps:30*60*180,jobInputChunks:2048,jobInputBytes:8*1024*1024,
 checkpointBytes:512*1024,resultBytes:256*1024,
 idleMs:7*86400000,discardMs:86400000,cleanupChunks:32,
});

export function resourceLimits(limits={}){
 const result={...RESOURCE_LIMITS,...limits};
 insist(Object.keys(limits).every(k=>k in RESOURCE_LIMITS)&&Object.values(result).every(n=>Number.isSafeInteger(n)&&n>0),500,'Invalid verifier resource limits');
 insist(result.cleanupChunks<=100,500,'Cleanup pages must contain at most 100 input documents');return result;
}
// Both database implementations apply the same counters inside an atomic write.
export function chargeUsage(rows,charges,now,l){
 const next=rows.map(row=>structuredClone(row||{})),global=next[0],player=next[1];
 function total(row,key,amount,limit){
  if(!amount)return;const value=(row[key]||0)+amount;
  if(amount>0&&value>limit)throw new HttpError(503,'Online verification storage is at capacity. Your shot remains saved locally.',300);
  row[key]=Math.max(0,value);
 }
 function window(row,key,amount,limit,period){
  if(!row||!amount)return;const prior=row[key],start=Math.max(Math.floor(now/period)*period,prior?.start||0),used=(prior?.start===start?prior.used:0)+amount;
  if(used>limit)throw new HttpError(429,'Online verification limit reached. Your saved work will retry.',Math.max(1,Math.ceil((start+period-now)/1000)));
  row[key]={start,used};
 }
 total(global,'identities',charges.identities,l.identities);total(global,'jobs',charges.jobs,l.jobs);total(global,'inputBytes',charges.inputBytes,l.inputBytes);
 window(global,'identityDay',charges.identities,l.identitiesDay,86400000);
 window(global,'jobDay',Math.max(0,charges.jobs||0),l.jobsDay,86400000);window(player,'jobDay',Math.max(0,charges.jobs||0),l.playerJobsDay,86400000);
 window(global,'computeMinute',charges.compute,l.computeMinute,60000);window(player,'computeMinute',charges.compute,l.playerComputeMinute,60000);
 window(global,'computeDay',charges.compute,l.computeDay,86400000);window(player,'computeDay',charges.compute,l.playerComputeDay,86400000);
 return next;
}
export class ResourcePolicy{
 constructor(root,now,limits={}){this.usage=root.collection('usage');this.now=now;this.limits=resourceLimits(limits);}
 async take(tx,owner,charges){
  const refs=[this.usage.doc('global'),...(owner?[this.usage.doc(owner)]:[])],rows=await tx.getAll(...refs);
  const next=chargeUsage(rows.map(row=>row.data()),charges,this.now(),this.limits);
  for(let i=0;i<refs.length;i++)tx.set(refs[i],next[i]);
 }
}

// A bounded per-process gate protects request buffers and database fan-out.
// Durable quotas above protect expensive work across process replacement.
export function requestGate({concurrency=32,burst=120,perSecond=40,now=Date.now}={}){
 let active=0,tokens=burst,last=now();
 return ()=>{
  const time=now();tokens=Math.min(burst,tokens+Math.max(0,time-last)*perSecond/1000);last=time;
  if(active>=concurrency||tokens<1)throw new HttpError(429,'Online verification is busy. Retry shortly.',1);
  tokens--;active++;let ended=false;return ()=>{if(!ended){ended=true;active--;}};
 };
}
