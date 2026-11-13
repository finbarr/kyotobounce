import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {HttpError} from '../online/protocol.mjs';

// Test setup only. Both implementations expose real HTTP and durable storage;
// assertions below inspect records without emulating a Firestore API on D1.
export async function onlineBackend({d1,origin,catalog}){
 if(d1){
  const {d1Harness}=await import('./d1-harness.mjs'),h=await d1Harness({station:true,origins:[origin],retryReplay:true,now:Date.now()});
  return {kind:'d1',endpoint:await h.url(),records:async()=>(await h.db.prepare('SELECT data FROM verifier_attempts').all()).results.map(r=>JSON.parse(r.data)),playerCount:async()=>(await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_players').first()).n,close:()=>h.close()};
 }
 if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'')||process.env.GOOGLE_CLOUD_PROJECT!=='demo-kyoto-verification')throw Error('Reference browser checks require the isolated Firestore emulator');
 const {Firestore}=await import('@google-cloud/firestore'),{VerificationService}=await import('../online/service.mjs'),{verificationHttp}=await import('../online/http.mjs'),{StaticWorld}=await import('../public/physics/static-world.js'),{decodeCollisionPack}=await import('../public/physics/collision-pack.js');
 const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT}),service=new VerificationService({db,catalog,world:()=>world,namespace:'browser-'+randomUUID(),batchLimit:3});
 let delay=true;const read=service.replayInputs.bind(service);service.replayInputs=(...args)=>{if(delay){delay=false;throw new HttpError(429,'Replay controls are busy',1);}return read(...args);};
 const server=verificationHttp(service,{origins:[origin]});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {kind:'firestore',endpoint:'http://127.0.0.1:'+server.address().port,records:async()=>(await service.attempts.get()).docs.map(d=>d.data()),playerCount:async()=>(await service.players.get()).size,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.recursiveDelete(service.root);await db.terminate();world.free();}};
}
