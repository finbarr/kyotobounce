import {D1VerificationService} from '../../web/online/d1-service.mjs';
import {verificationFetch} from '../../web/online/fetch.mjs';
import {loadVerificationWorld} from '../../web/verification-world.mjs';
import {BROWSER_PHYSICS} from '../../web/public/physics/shot.js';
import courses from '../../web/starter-challenges.json' with {type:'json'};
import manifest from '../../.local/verification/world/manifest.json' with {type:'json'};

let api;
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health'||path==='/v1'||path.startsWith('/v1/')){
  if(!api){
   const world=()=>loadVerificationWorld(manifest,async name=>{
    // Only pinned deployment assets feed the solver. No client URL or geometry
    // can replace the station, and the loader verifies every chunk's checksum.
    const response=await env.ASSETS.fetch('https://assets.invalid/verification-world/'+manifest.sourceSha256+'/'+name);
    if(!response.ok)throw Error('Verifier collision asset unavailable');
    return new Uint8Array(await response.arrayBuffer());
   });
   api=verificationFetch(new D1VerificationService({db:env.DB,catalog:courses.map(c=>({...c,physics:BROWSER_PHYSICS})),world}));
  }
  return api(request);
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 // Deep links open the same shell; the browser resolves the selected course or
 // public replay through the verifier without creating an identity just to view.
 if(/^\/(?:level|replay)\/[^/]+\/?$/.test(path))url.pathname='/';
 return env.ASSETS.fetch(new Request(url,request));
}};
