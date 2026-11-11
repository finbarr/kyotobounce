// Request-driven verifier entry point. No Unity launch, simulation tick, task
// poller or background warm-up. Cloud Run must use request billing and min=0.
import {Firestore} from '@google-cloud/firestore';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {VerificationService} from './online/service.mjs';
import {verificationHttp} from './online/http.mjs';
import {BROWSER_PHYSICS} from './public/physics/shot.js';
import {StaticWorld} from './public/physics/static-world.js';
import {decodeCollisionPack} from './public/physics/collision-pack.js';
import {verifierConfig} from './online/config.mjs';
const config=verifierConfig(),file=resolve(config.collision),info=await stat(file),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalogBytes=await readFile('web/starter-challenges.json'),catalog=JSON.parse(catalogBytes).map(c=>({...c,physics:BROWSER_PHYSICS}));
const receipt=config.release?JSON.parse(await readFile(config.release,'utf8')):null;
if(receipt&&(receipt.kind!=='kyoto-verifier-v1'||receipt.physics!==BROWSER_PHYSICS||receipt.layout!==catalog[0]?.layout||receipt.campaignSha256!==hash(catalogBytes)||receipt.collision.bytes!==info.size))throw Error('Verifier release does not match its campaign and collision pack');
const db=new Firestore({projectId:config.projectId}),service=new VerificationService({db,catalog,limits:config.limits,sliceMs:config.sliceMs,world:async()=>{
 const bytes=await readFile(file);if(receipt&&hash(bytes)!==receipt.collision.sha256)throw Error('Verifier collision checksum mismatch');
 return new StaticWorld(decodeCollisionPack(bytes));
}});
const server=verificationHttp(service,{origins:config.origins});server.listen(config.port,config.host,()=>console.log(JSON.stringify({event:'verifier-ready',port:config.port,layout:service.layout,physics:BROWSER_PHYSICS})));
let stopping=false;
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{
 if(stopping)return;stopping=true;
 // Cloud Run gives a terminating instance ten seconds. Ask active simulations
 // to persist a continuation, then drain requests; a hard stop leaves the last
 // durable checkpoint and lease recoverable, never an invented result.
 const deadline=setTimeout(()=>{console.error(JSON.stringify({event:'verifier-shutdown-deadline'}));server.closeAllConnections();process.exit(1);},8000);deadline.unref();
 try{await server.drain();await db.terminate();(await service.worldPromise)?.free();console.log(JSON.stringify({event:'verifier-stopped'}));}
 catch{process.exitCode=1;console.error(JSON.stringify({event:'verifier-shutdown-error'}));}
 finally{clearTimeout(deadline);}
});
