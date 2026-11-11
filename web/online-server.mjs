// Request-driven verifier entry point. No Unity launch, simulation tick, task
// poller or background warm-up. Cloud Run must use request billing and min=0.
import {Firestore} from '@google-cloud/firestore';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {VerificationService} from './online/service.mjs';
import {verificationHttp} from './online/http.mjs';
import {BROWSER_PHYSICS} from './public/physics/shot.js';
import {StaticWorld} from './public/physics/static-world.js';
import {decodeCollisionPack} from './public/physics/collision-pack.js';
const port=Number(process.env.PORT||process.env.KYOTO_VERIFY_PORT||4432),projectId=process.env.GOOGLE_CLOUD_PROJECT;
if(!Number.isInteger(port)||port<1||port>65535||!projectId)throw Error('Set GOOGLE_CLOUD_PROJECT and a valid verifier port');
const file=resolve(process.env.KYOTO_COLLISION_PACK||'.local/browser-physics/station.collision.bin');await stat(file);
const catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8')).map(c=>({...c,physics:BROWSER_PHYSICS})),db=new Firestore({projectId});
const service=new VerificationService({db,catalog,world:async()=>new StaticWorld(decodeCollisionPack(await readFile(file)))});
const origins=(process.env.KYOTO_ALLOWED_ORIGINS||'http://127.0.0.1:4430,http://localhost:4430').split(',').filter(Boolean);
const server=verificationHttp(service,{origins});server.listen(port,process.env.PORT?'0.0.0.0':'127.0.0.1',()=>console.log(`Kyoto verifier listening on port ${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(async()=>{await db.terminate();(await service.worldPromise)?.free();}));
