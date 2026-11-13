import assert from 'node:assert/strict';
import {sitesHarness} from './sites-harness.mjs';
import {verificationEndpoint} from '../public/online-scores.js';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {INPUT_FORMAT} from '../verification.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {simulate} from './verification-fixture.mjs';
assert.equal(verificationEndpoint('same-origin','https://kyotobounce.com'),'https://kyotobounce.com');
assert.equal(verificationEndpoint('same-origin','http://127.0.0.1:1234'),'http://127.0.0.1:1234');
for(const origin of ['null','http://untrusted.example','https://name:secret@example.com','https://example.com/path'])assert.throws(()=>verificationEndpoint('same-origin',origin));
const h=await sitesHarness();
await writeFile('.local/verification/sites-runtime.json',JSON.stringify({passed:false})+'\n');
try{
 // Exercise asset-first hosting: no static homepage may bypass host routing.
 for(const path of ['dist/client/index.html','dist/client/_redirects'])await assert.rejects(readFile(path),{code:'ENOENT'});
 for(const path of ['/','/index.html','/level/atrium-welcome?from=bookmark','/replay/'+randomUUID()]){
  const r=await h.fetch(path,{redirect:'manual'},'https://www.kyotobounce.com');
  assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://kyotobounce.com'+path);
 }
 assert.equal((await h.fetch('/',undefined,'https://kyotobounce.com')).status,200);
 const head=await h.fetch('/',{method:'HEAD'});assert.equal(head.status,200);assert.match(head.headers.get('content-type'),/text\/html/);assert.equal(await head.text(),'');
 for(const path of ['/','/level/atrium-welcome','/replay/'+randomUUID()]){const r=await h.fetch(path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);assert.match(await r.text(),/name="kyoto-verifier" content="same-origin"/);}
 assert.equal((await h.fetch('/not-a-game-route')).status,404);assert.equal((await h.fetch('/v1/identity',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await h.fetch('/game.js',{method:'HEAD'})).status,200);
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_players').first()).n,0,'Reads do not create players');
 const catalog=await(await h.fetch('/v1/courses')).json();assert.equal(catalog.courses.length,30);const c=catalog.courses.find(c=>c.id==='atrium-welcome'),a=c.hint;
 const player=randomUUID(),token=player+'.'+randomBytes(32).toString('base64url'),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 async function request(path,method,body){const r=await h.fetch(path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}),value=await r.json();assert([200,201,202].includes(r.status),JSON.stringify(value));return value;}
 await request('/v1/identity','POST',{name:'Packaged runtime acceptance'});
 const header={format:INPUT_FORMAT,courseId:c.id,revision:c.revision,layout:c.layout,physics:c.physics,scoring:c.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}},id=randomUUID(),path='/v1/attempts/'+id;
 await request(path,'POST',{header});await request(path+'/seal','POST',{});
 const began=performance.now(),first=await request(path+'/advance','POST',{}),coldMs=performance.now()-began;assert.equal(first.state,'pending');assert(!first.result);await h.restart();
 let accepted;for(let i=0;i<500;i++){accepted=await request(path+'/advance','POST',{});if(accepted.state==='verified')break;assert.equal(accepted.state,'pending');}
 assert.equal(accepted.state,'verified');assert(accepted.result.success);
 const original=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 try{
  const reference=await simulate(original,c,header,[],{attempt:id,subject:player});
  assert.deepEqual(accepted.result,{...JSON.parse(JSON.stringify(reference.result)),id:player,playerName:'Packaged runtime acceptance',verified:true,local:false});
 }finally{original.free();}
 assert.equal((await request('/v1/courses/'+c.id+'/leaderboard','GET')).personal.attempt,id);
 assert.deepEqual((await request('/v1/replays/'+id,'GET')).header,header);
 await writeFile('.local/verification/sites-runtime.json',JSON.stringify({passed:true,layout:c.layout,physics:c.physics,coldMs,result:accepted.result},null,2)+'\n');
 console.log('PASS packaged Site: static assets, deep links, same-origin API, D1 migration, cold collision loading, restart and exact verified station score');
}finally{await h.close();}
