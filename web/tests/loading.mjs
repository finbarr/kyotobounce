import assert from 'node:assert/strict';
import {LoadingGate} from '../public/loading.js';
const gate=new LoadingGate({started:100});
assert.equal(gate.phase(2499),'splash');assert.equal(gate.phase(2500),'setup');
gate.world=true;gate.connected=true;assert.equal(gate.phase(3000),'setup','A cached station must not dismiss a player who is still typing');
gate.player=true;assert.equal(gate.phase(3000),'ready');gate.player=false;assert.equal(gate.phase(3000),'setup','Editing a saved name withdraws readiness');
gate.player=true;gate.connected=false;assert.equal(gate.phase(3000),'setup','Wait for the authoritative session');gate.connected=true;assert.equal(gate.phase(3000),'ready');
const cached=new LoadingGate();cached.world=cached.player=cached.connected=true;assert.equal(cached.phase(1000),'splash');assert.equal(cached.phase(2400),'ready');
const replay=new LoadingGate({replay:true});assert.equal(replay.phase(3000),'loading');replay.world=true;assert.equal(replay.phase(3000),'ready','Shared replay viewers do not have to create a player');
replay.failed=true;assert.equal(replay.phase(3000),'error','Failed loads cannot enter the game');
console.log('PASS splash duration, early readiness, name editing, connection gating, replay startup and loading failures');

const {DownloadProgress,loadAsset}=await import('../public/loading.js');
const progress=new DownloadProgress(['/large','/small']);
progress.expect({'web/public/large':{bytes:1000},'web/public/small':{bytes:100}});
progress.update('/small',100,true);assert.ok(Math.abs(progress.value.fraction-100/1100)<1e-9,'Small finished files must not count as half the download');
progress.update('/large',250);assert.ok(progress.value.fraction>.3&&progress.value.fraction<.4,'Byte progress advances before the large asset finishes');
progress.update('/large',1000);assert.equal(progress.value.fraction,.99,'Only EOF completes downloading');progress.update('/large',1000,true);assert.equal(progress.value.fraction,1);
const late=new DownloadProgress(['/late']);late.update('/late',10);assert.equal(late.value.fraction,null,'Missing lengths are honestly indeterminate');late.expect({'web/public/late':{bytes:100}});assert.equal(late.value.fraction,.1,'A late manifest immediately makes earlier bytes count');
for(const headers of [{},{'content-encoding':'br','content-length':'1'}]){
 const updates=[];let n=0;
 const buffer=await loadAsset('/stream',(loaded,done)=>updates.push({loaded,done}),{fetcher:async()=>new Response(new ReadableStream({async pull(controller){await new Promise(r=>setTimeout(r,2));if(n===3){controller.close();return;}controller.enqueue(new Uint8Array([++n]));}}),{headers})});
 assert.deepEqual([...new Uint8Array(buffer)],[1,2,3]);assert.deepEqual(updates,[{loaded:1,done:false},{loaded:2,done:false},{loaded:3,done:false},{loaded:3,done:true}],'Progress streams without Content-Length and never compares decoded bytes with compressed length');
}
await assert.rejects(loadAsset('/missing',()=>{}, {fetcher:async()=>new Response('',{status:404})}),/Asset unavailable/);
const failed=[];let first=true;await assert.rejects(loadAsset('/broken',(n,done)=>failed.push(done),{fetcher:async()=>new Response(new ReadableStream({pull(c){if(first){first=false;c.enqueue(new Uint8Array([1]));}else c.error(new Error('Interrupted'));}}))}),/Interrupted/);assert.ok(!failed.includes(true),'Interrupted downloads never report completion');
console.log('PASS weighted decoded-byte progress, late/missing lengths, compressed headers and interrupted streams');
