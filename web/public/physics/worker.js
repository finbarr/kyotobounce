import {decodeCollisionPack} from './collision-pack.js';
import {StaticWorld} from './static-world.js';
import {Shot,BROWSER_PHYSICS} from './shot.js';
import {GameSession} from './session.js';
import {VerifiedReplay} from './verified-replay.js';
import {loadAsset} from '../asset-download.js';

// Only this worker owns collision buffers and the spatial index. Batches yield
// so recall and shutdown stay responsive even for a shot that never settles.
let world,shot,session,replay,generation=0;
const post=message=>self.postMessage(message);
async function handle(message){
 if(message.type==='init'){
  replay?.cancel();replay=null;
  const began=performance.now();
  const bytes=await loadAsset(message.collisionURL,undefined,{asset:message.collisionAsset});
  const pack=decodeCollisionPack(bytes);world?.free();world=new StaticWorld(pack);
  post({type:'ready',physics:BROWSER_PHYSICS,layout:world.layoutSha256,fallLimitY:world.fallLimitY,stats:world.stats,buildMs:performance.now()-began});
  if(message.catalog){session?.close();session=new GameSession(world,message.catalog,message.id,post);}return;
 }
 if(!world)throw Error('Station collision is not ready');
 if(message.type==='replay-import'){replay?.cancel();replay=new VerifiedReplay(world,message.seed,message.endpoint,message.request,post);replay.run();return;}
 if(message.type==='replay-ack'){if(replay?.request===message.request)replay.ack(message.sequence);return;}
 if(message.type==='replay-cancel'){replay?.cancel();replay=null;return;}
 if(session){session.handle(message);return;}
 if(message.type==='recall'){
  // Computation can finish long before playback. Recall still forfeits that
  // provisional shot; only the presentation layer may bank a displayed result.
  generation++;if(shot){shot.cancel();post({type:'result',result:shot.result()});}return;
 }
 if(message.type==='throw'){
  if(shot&&!shot.done)throw Error('Recall the current shot first');
  shot=new Shot(world,message.challenge,message.launch,message.options);const current=++generation,began=performance.now();let maxBatchMs=0;
  function compute(){
   if(current!==generation)return;
   try{
    const start=performance.now(),frames=[],events=[];
    do{
     shot.step();events.push(...shot.events.splice(0));
     if(shot.steps%6===0||shot.done){const b=shot.ball;frames.push({t:b.clock,p:b.position,q:b.rotation,velocity:b.velocity,spin:b.spin,sleeping:b.sleeping,supported:b.supported,score:shot.breakdown});}
    }while(!shot.done&&performance.now()-start<8);
    const elapsed=performance.now()-start;maxBatchMs=Math.max(maxBatchMs,elapsed);
    post({type:'frames',attempt:shot.attempt,frames,events,complete:shot.done});
    if(shot.done)post({type:'result',result:shot.result(),computeMs:performance.now()-began,maxBatchMs});
    else setTimeout(compute,0);
   }catch(error){post({type:'error',message:String(error)});}
  }
  setTimeout(compute,0);
 }
}
self.onmessage=event=>{handle(event.data).catch(error=>post({type:'error',message:String(error)}));};
