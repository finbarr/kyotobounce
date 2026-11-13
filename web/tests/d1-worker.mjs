// Test-only Worker: isolated fixture and controls, never a production entry.
import {D1VerificationService} from '../online/d1-service.mjs';
import {verificationFetch} from '../online/fetch.mjs';
import {course,fixtureWorld} from './verification-fixture.mjs';
import {loadVerificationWorld} from '../verification-world.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import catalog from '../starter-challenges.json' with {type:'json'};
let handle;
export default{fetch(request,env){
 const world=env.CONFIG.station?async()=>{
  const manifest=await(await env.ASSETS.fetch('https://assets.invalid/manifest.json')).json();
  return loadVerificationWorld(manifest,async name=>new Uint8Array(await(await env.ASSETS.fetch('https://assets.invalid/'+name)).arrayBuffer()));
 }:fixtureWorld;
 handle??=verificationFetch(new D1VerificationService({db:env.DB,catalog:env.CONFIG.station?catalog.map(c=>({...c,physics:BROWSER_PHYSICS})):[{...course,...env.CONFIG.course}],world,now:()=>env.CONFIG.now,batchesPerRequest:env.CONFIG.batches||4,stepsPerBatch:env.CONFIG.steps||180,limits:env.CONFIG.limits}),{origins:['https://game.example'],gate:()=>()=>{}});
 return handle(request);
}};
