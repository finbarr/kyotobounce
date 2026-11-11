import {ShotVerification} from '../../verification.mjs';
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
export class VerifiedReplay{
 constructor(world,seed,endpoint,request,post){this.world=world;this.seed=seed;this.endpoint=endpoint;this.request=request;this.post=post;this.sequence=0;this.controller=new AbortController();}
 ack(sequence){if(sequence===this.sequence-1){this.release?.();this.release=null;}}
 cancel(){this.cancelled=true;this.controller.abort();this.release?.();}
 async chunk(sequence){
  let delay=1000;
  while(!this.cancelled){
   const response=await fetch(`${this.endpoint}/v1/replays/${this.seed.result.attempt}/inputs/${sequence}`,{signal:this.controller.signal});
   if(response.ok)return response.json();
   if(![429,503].includes(response.status))throw Error('Could not load replay controls');
   const body=await response.json().catch(()=>({})),wait=Number.isFinite(body.retryAfter)&&body.retryAfter>0?Math.min(86400000,body.retryAfter*1000):delay;
   await new Promise(resolve=>{
    const done=()=>{clearTimeout(timer);this.controller.signal.removeEventListener('abort',done);resolve();},timer=setTimeout(done,wait);
    this.controller.signal.addEventListener('abort',done,{once:true});if(this.cancelled)done();
   });delay=Math.min(60000,delay*2);
  }
  throw Error('Replay loading cancelled');
 }
 async *inputs(){
  for(let sequence=0;sequence<this.seed.inputChunks;sequence++){
   const chunk=await this.chunk(sequence);if(chunk.sequence!==sequence)throw Error('Replay input sequence changed');yield*chunk.runs;
  }
 }
 async run(){
  try{
   const {result,header,format,inputChunks}=this.seed;
   if(format!=='kyoto-verified-replay-1'||!Number.isSafeInteger(inputChunks)||inputChunks<0)throw Error('Unsupported verified replay');
   const job=new ShotVerification(this.world,result.challenge,header,this.inputs(),{attempt:result.attempt,subject:result.id});let reply;
   do{
    if(this.cancelled)return;reply=await job.advance();
    if(reply.recording){
     const sequence=this.sequence++,cacheBytes=new TextEncoder().encode(JSON.stringify(reply.recording)).byteLength;
     await new Promise(resolve=>{this.release=resolve;this.post({type:'replay-recording',request:this.request,sequence,recording:reply.recording,cacheBytes});});
    }
    await new Promise(resolve=>setTimeout(resolve,0));
   }while(reply.status!=='verified');
   if(this.cancelled)return;
   // The server is authoritative; reconstruction must still match that seed
   // before displaying a replay under its score or another player's name.
   for(const key of Object.keys(reply.result))if(JSON.stringify(ordered(reply.result[key]))!==JSON.stringify(ordered(result[key])))throw Error('This replay does not reproduce its verified result');
   this.post({type:'replay-complete',request:this.request,result:{...result,remote:true,local:false,verified:true,recordingChunks:this.sequence}});
  }catch(error){if(!this.cancelled)this.post({type:'replay-error',request:this.request,message:error.message||String(error)});}
 }
}
