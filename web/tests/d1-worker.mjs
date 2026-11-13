// Test-only Worker: isolated fixture and controls, never a production entry.
import {D1VerificationService} from '../online/d1-service.mjs';
import {verificationFetch} from '../online/fetch.mjs';
import {course,fixtureWorld} from './verification-fixture.mjs';
import {loadVerificationWorld} from '../verification-world.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import catalog from '../starter-challenges.json' with {type:'json'};
import {HttpError} from '../online/protocol.mjs';
let handle;
export default{fetch(request,env){
 const world=env.CONFIG.station?async()=>{
  const manifest=await(await env.ASSETS.fetch('https://assets.invalid/manifest.json')).json();
  return loadVerificationWorld(manifest,async name=>new Uint8Array(await(await env.ASSETS.fetch('https://assets.invalid/'+name)).arrayBuffer()));
 }:fixtureWorld;
 if(!handle){
  const service=new D1VerificationService({db:env.DB,catalog:env.CONFIG.station?catalog.map(c=>({...c,physics:BROWSER_PHYSICS})):[{...course,...env.CONFIG.course}],world,now:()=>env.CONFIG.now,batchesPerRequest:env.CONFIG.batches||4,stepsPerBatch:env.CONFIG.steps||180,limits:env.CONFIG.limits});
  if(env.CONFIG.retryReplay){let delay=true;const read=service.replayInputs.bind(service);service.replayInputs=(...args)=>{if(delay){delay=false;throw new HttpError(429,'Replay controls are busy',1);}return read(...args);};}
  handle=verificationFetch(service,{origins:['https://game.example',...(env.CONFIG.origins||[])],gate:()=>()=>{}});
 }
 return handle(request);
}};
