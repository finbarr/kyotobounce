import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {nativeCredential,initialProfile} from '../public/native-identity.js';
import {onlineScores} from '../public/online-scores.js';

const names=['fetch','localStorage','navigator','document','addEventListener','removeEventListener'],saved=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
const id=randomUUID(),oldToken=randomUUID(),endpoint='https://game.example',key='online:'+endpoint+':credential',credential=await nativeCredential(id,oldToken);
function store(){const data=new Map();return {async setting(key,...values){if(values.length)data.set(key,structuredClone(values[0]));return structuredClone(data.get(key));}};}
try{
 globalThis.localStorage={getItem:key=>({'kyoto-guest-id':id,'kyoto-guest':oldToken})[key]};
 const noop=()=>{};globalThis.document={addEventListener:noop,removeEventListener:noop};globalThis.addEventListener=noop;globalThis.removeEventListener=noop;
 let queue=Promise.resolve();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,locks:{request:(_key,fn)=>{const p=queue.then(fn);queue=p.catch(noop);return p;}}}});
 globalThis.fetch=async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer '+credential);return Response.json({id,name:'Original name',named:true});};
 const s=store(),profile=await initialProfile(s,endpoint);assert.deepEqual(profile,{id,name:'Original name',named:true});assert.equal(await s.setting(key),credential);
 globalThis.fetch=()=>{throw Error('Offline');};assert.deepEqual(await initialProfile(s,endpoint),profile,'An existing browser profile is never replaced');
 const offline=store(),pending=await initialProfile(offline,endpoint);assert.deepEqual(pending,{id,name:'Player',named:false,nativePending:true});assert.equal(await offline.setting(key),credential);
 assert.equal(await nativeCredential(id,'bad'),null);assert.equal(await nativeCredential(null,oldToken),null);
 for(const rename of [false,true]){
  await offline.setting('profile',pending);let release,started;const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r),posts=[],restored=[];
  const scores=onlineScores({endpoint,store:offline,getProfile:()=>pending,getCatalog:()=>[],getSelected:()=>null,status:noop,changed:noop,restored:p=>restored.push(p),fetchImpl:async(_url,options)=>{
   if(options.method==='GET'){started();await gate;return Response.json({id,name:'Original name',named:true});}
   posts.push(JSON.parse(options.body).name);return Response.json({id,name:posts.at(-1)});
  }});
  try{
   const registration=scores.identity();await entered;
   if(rename)await navigator.locks.request('kyoto-browser-profile',()=>offline.setting('profile',{id,name:'New choice',named:true}));
   release();assert.equal(await registration,true);assert.deepEqual(posts,[rename?'New choice':'Original name']);assert.equal(restored.length,rename?0:1);
   assert.deepEqual(await offline.setting('profile'),{id,name:posts[0],named:true});
  }finally{scores.stop();}
 }
 console.log('PASS native identity: hashed credential, existing profile retention, offline startup, reconnect recovery and concurrent name choice');
}finally{for(const [key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
