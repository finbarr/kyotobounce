import assert from 'node:assert/strict';
import {createServer,get} from 'node:http';
import {once} from 'node:events';
import {gunzipSync} from 'node:zlib';
import {ReplayCache,REPLAY_TTL_MS} from '../replay-cache.ts';
import {Store} from '../store.ts';
import {serveReplay} from '../replay-http.ts';

const json=(id='course',extra={})=>JSON.stringify({challenge:{id,name:'Test'},playerName:'Player',score:100,poses:[],...extra});
let clock=0;
const cache=new ReplayCache({clock:()=>clock,maxEntries:2});
try{
 const a=cache.put('a',json());await a.ready;
 clock=REPLAY_TTL_MS-1;assert.equal(cache.get('a'),a);
 clock+=REPLAY_TTL_MS-1;assert.equal(cache.get('a'),a,'Each hit grants another full 24 hours');
 clock+=REPLAY_TTL_MS;assert.equal(cache.get('a'),undefined,'Idle entries expire precisely at 24 hours');
 cache.put('a',json());cache.put('b',json());cache.get('a');cache.put('c',json());assert.equal(cache.get('b'),undefined);assert.ok(cache.get('a')&&cache.get('c'),'Recently read entries survive eviction');
 const old=cache.put('race',json('course',{score:1}));cache.clear();const fresh=cache.put('race',json('course',{score:2}));await Promise.all([old.ready,fresh.ready]);assert.equal(cache.get('race'),fresh,'An old compression job cannot resurrect or overwrite an entry after invalidation');assert.equal(JSON.parse(gunzipSync(fresh.gzip)).replay.score,2);
 cache.invalidateChallenge('course');assert.equal(cache.stats().entries,0);assert.equal(cache.stats().bytes,0);
}finally{cache.close();}
const small=new ReplayCache({maxBytes:2400,maxEntryBytes:2400});
try{
 const entries=Array.from({length:6},(_,i)=>small.put(String(i),json('course',{padding:'abcdef'.repeat(100)})));await Promise.all(entries.map(e=>e.ready));assert.ok(small.stats().bytes<=2400&&small.stats().entries<6,'Serialized and compressed bytes both obey the memory bound');
 const huge=small.put('large',json('course',{padding:'x'.repeat(4000)}));assert.equal(huge.cached,false);assert.equal(small.get('large'),undefined,'Oversized replays do not evict the entire cache');assert.equal(JSON.parse(huge.body).replay.padding.length,4000);
}finally{small.close();}
for(const options of [{maxBytes:NaN},{ttlMs:0},{maxEntries:-1}])assert.throws(()=>new ReplayCache(options));

clock=0;const store=new Store(':memory:',{clock:()=>clock});
const course={id:'cached-level',revision:1,creator:'station',name:'Cache & <script>test</script>',layout:'layout',physics:'physics',start:{center:{x:0,y:0,z:0},radius:1,surface:'floor'},goal:{center:{x:2,y:0,z:0},radius:1,surface:'floor'}};
store.saveChallenge(course);const guest=store.guest();
const poses=Array.from({length:3600},(_,i)=>({t:i/180,p:{x:Math.sin(i)*10,y:Math.cos(i)+2,z:i/40},q:{x:0,y:Math.sin(i),z:0,w:Math.cos(i)}}));
const shot={type:'result',attempt:'viral',id:guest.id,challenge:course,playerName:'<script>name</script>',score:1000,success:true,surfaces:1,duration:20,poses,scoreFrames:[],thrower:{feet:{x:0,y:0,z:0},power:1},releaseTime:3,chargeTime:0};
let reads=0;const prepare=store.db.prepare.bind(store.db);store.db.prepare=sql=>{if(sql.startsWith('SELECT replay FROM attempts'))reads++;return prepare(sql);};
const server=createServer(async(req,res)=>{try{if(!await serveReplay(req,res,new URL(req.url,'http://localhost').pathname,store,'<title>Kyoto Bounce — Station Arcade</title><main>Viewer</main>')){res.writeHead(404);res.end();}}catch(error){res.writeHead(500);res.end(error.message);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
const request=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=get({hostname:'127.0.0.1',port,path,headers,method},res=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));});req.on('error',reject);});
try{
 assert.equal(store.saveResult(shot,'animation'),true);
 const warm=await request('/api/replay/viral',{'accept-encoding':'gzip'});assert.equal(warm.status,200);assert.equal(warm.headers['x-replay-cache'],'HIT');assert.equal(reads,0,'Saving a shot prewarms the cache without rereading SQLite');
 const expected=JSON.parse(gunzipSync(warm.body)).replay;assert.equal(expected.poses.length,3600);assert.equal(expected.score,1000);assert.equal(expected.thrower.power,1);assert.equal(warm.headers['content-length'],String(warm.body.length));assert.ok(warm.body.length<JSON.stringify(expected).length/2,'Playback is compressed once for repeated downloads');
 const mutable=store.replay('viral');mutable.poses[0].p.x=999;assert.deepEqual(store.replay('viral'),expected,'Callers cannot mutate cached authoritative data');
 assert.equal(store.saveResult({...shot,score:999999},'animation'),false);assert.deepEqual(store.replay('viral'),expected,'Duplicate result delivery cannot poison the cache');
 store.saveChallenge({...course,id:'unrelated'});assert.equal(store.replayResponse('viral').status,'HIT','New unrelated levels keep popular replays warm');
 store.replayCache.clear();const before=store.replayCache.stats(),start=performance.now();reads=0;
 const burst=await Promise.all(Array.from({length:120},()=>request('/api/replay/viral',{'accept-encoding':'gzip'})));
 assert.ok(burst.every(r=>r.status===200&&r.body.equals(warm.body)));assert.equal(reads,1,'120 concurrent cold reads share a single SQLite load');assert.equal(store.replayCache.stats().compressions-before.compressions,1,'A cold burst shares one compression job');
 console.log(`PASS 120 concurrent cold replay requests in ${Math.round(performance.now()-start)} ms; one database read and compression, ${warm.body.length} compressed bytes`);
 clock=REPLAY_TTL_MS-1;
 const notModified=await request('/api/replay/viral',{'if-none-match':'"unrelated", '+warm.headers.etag});assert.equal(notModified.status,304);assert.equal(notModified.body.length,0);
 clock+=REPLAY_TTL_MS-1;assert.equal((await request('/api/replay/viral',{},'HEAD')).headers['x-replay-cache'],'HIT','Conditional reads extend expiry');
 clock+=REPLAY_TTL_MS-1;assert.equal((await request('/replay/viral')).status,200,'HEAD reads extend expiry');
 clock+=REPLAY_TTL_MS-1;assert.equal((await request('/api/replay/viral')).headers['x-replay-cache'],'HIT','Opening the share page extends expiry');
 clock+=REPLAY_TTL_MS;const expired=await request('/api/replay/viral');assert.equal(expired.headers['x-replay-cache'],'MISS');assert.deepEqual(JSON.parse(expired.body).replay,expected,'Expiry reloads the original durable sequence without physics');
 const noGzip=await request('/api/replay/viral',{'accept-encoding':'gzip;q=0, *;q=1'});assert.equal(noGzip.headers['content-encoding'],undefined);assert.deepEqual(JSON.parse(noGzip.body).replay,expected);
 assert.equal((await request('/api/replay/viral',{'accept-encoding':'gzip;q=0, identity;q=0'})).status,406);
 const head=await request('/api/replay/viral',{'accept-encoding':'gzip'},'HEAD');assert.equal(head.body.length,0);assert.equal(head.headers['content-encoding'],'gzip');assert.equal(head.headers['content-length'],warm.headers['content-length']);
 const page=(await request('/replay/viral')).body.toString();assert.ok(page.includes('&lt;script&gt;name&lt;/script&gt;'));assert.ok(!page.includes('<script>'));
 const missing=await request('/api/replay/missing');assert.equal(missing.status,404);assert.equal(missing.headers['cache-control'],'no-store');assert.equal((await request('/api/replay/a%2Fb')).status,404);
 assert.equal(store.replayCache.stats().ttlSeconds,86400);
 store.saveChallenge({...course,revision:2});assert.equal((await request('/api/replay/viral',{'if-none-match':warm.headers.etag})).status,404,'Revised levels invalidate even previously cached or revalidated replays');
 // A failed transaction must not prefill a replay or invalidate another entry.
 store.db.exec("CREATE TRIGGER reject_replay BEFORE UPDATE OF replay ON attempts BEGIN SELECT RAISE(ABORT, 'test rollback'); END;");
 assert.throws(()=>store.saveResult({...shot,attempt:'rollback',challenge:{...course,revision:2}},'animation'),/test rollback/);assert.equal(store.replayResponse('rollback').entry,undefined);
 console.log('PASS sliding 24-hour TTL, LRU/byte bounds, gzip/ETag/HEAD, durable refill, warm-on-save, immutable results, rollback and revision invalidation; no worker dependency');
}finally{server.closeAllConnections();server.close();await once(server,'close');store.close();}
