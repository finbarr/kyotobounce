import {createHash} from 'node:crypto';
import {gzip} from 'node:zlib';

export const REPLAY_TTL_MS=24*60*60*1000;
export type ReplayCacheOptions={ttlMs?:number;maxBytes?:number;maxEntries?:number;maxEntryBytes?:number;clock?:()=>number};
type ReplayInfo={playerName?:string;score:number;challenge:{id:string;name:string}};
export type CachedReplay={body:Buffer;challengeId:string;etag:string;title:string;description:string;gzip?:Buffer;ready:Promise<void>;cached:boolean;bytes:number;expiresAt:number;finish?:()=>void};

// Full public playback, already serialized. Hits do not parse JSON, read SQLite,
// or touch the native worker. Map order is least to most recently read.
export class ReplayCache{
 private entries=new Map<string,CachedReplay>();
 private queue=new Map<string,CachedReplay>();
 private active=0;
 private bytes=0;
 private counters={hits:0,misses:0,fills:0,evictions:0,expirations:0,bypasses:0,compressions:0,compressionErrors:0};
 private clock:()=>number;
 private timer:ReturnType<typeof setInterval>;
 readonly ttlMs:number;readonly maxBytes:number;readonly maxEntries:number;readonly maxEntryBytes:number;
 constructor(options:ReplayCacheOptions={}){
  this.ttlMs=options.ttlMs??REPLAY_TTL_MS;this.maxBytes=options.maxBytes??128*1024*1024;this.maxEntries=options.maxEntries??512;this.maxEntryBytes=options.maxEntryBytes??Math.min(this.maxBytes,16*1024*1024);this.clock=options.clock??(()=>performance.now());
  for(const value of [this.ttlMs,this.maxBytes,this.maxEntries,this.maxEntryBytes])if(!Number.isSafeInteger(value)||value<=0)throw new Error('Replay cache limits must be positive integers');
  this.timer=setInterval(()=>this.prune(),60_000);this.timer.unref();
 }
 get(id:string):CachedReplay|undefined{
  this.prune();const entry=this.entries.get(id);
  if(!entry){this.counters.misses++;return;}
  this.counters.hits++;entry.expiresAt=this.clock()+this.ttlMs;
  this.entries.delete(id);this.entries.set(id,entry);return entry;
 }
 put(id:string,json:string,info?:ReplayInfo):CachedReplay{
  this.prune();this.remove(id);const replay=info??JSON.parse(json) as ReplayInfo;
  const body=Buffer.from('{"replay":'+json+'}');
  const title=`${replay.playerName||'Player'} · ${replay.score.toLocaleString('en-US')} PTS — Kyoto Bounce`;
  const description=`Watch this shot on ${replay.challenge.name}. Orbit the station, slow it down, then try to beat it.`;
  const etag=`W/"${createHash('sha256').update(body).digest('hex')}"`;
  const entry:CachedReplay={body,challengeId:replay.challenge.id,etag,title,description,bytes:body.byteLength+2*(title.length+description.length+etag.length+id.length+replay.challenge.id.length),expiresAt:this.clock()+this.ttlMs,ready:Promise.resolve(),cached:false};
  if(entry.bytes>this.maxBytes||entry.bytes>this.maxEntryBytes){this.counters.bypasses++;return entry;}
  entry.cached=true;entry.ready=new Promise(resolve=>{entry.finish=resolve;});this.entries.set(id,entry);this.bytes+=entry.bytes;this.counters.fills++;this.trim();
  if(entry.cached){this.queue.set(id,entry);this.pump();}
  return entry;
 }
 private pump(){
  // Two bounded background jobs; queued entries are owned by the LRU and are
  // cancelled on eviction. A cold burst shares the same entry and promise.
  while(this.active<2&&this.queue.size){
   const [id,entry]=this.queue.entries().next().value!;this.queue.delete(id);this.active++;this.counters.compressions++;
   gzip(entry.body,{level:3},(error,compressed)=>{
    this.active--;if(error)this.counters.compressionErrors++;
    if(!error&&this.entries.get(id)===entry&&entry.expiresAt>this.clock()&&entry.bytes+compressed.byteLength<=this.maxEntryBytes){
     entry.gzip=compressed;entry.bytes+=compressed.byteLength;this.bytes+=compressed.byteLength;this.trim();
    }
    entry.finish?.();delete entry.finish;this.pump();
   });
  }
 }
 private remove(id:string){
  const entry=this.entries.get(id);if(!entry)return;
  this.entries.delete(id);this.queue.delete(id);this.bytes-=entry.bytes;entry.cached=false;entry.finish?.();delete entry.finish;
 }
 private prune(){
  const now=this.clock();for(const [id,entry]of this.entries){if(entry.expiresAt>now)break;this.remove(id);this.counters.expirations++;}
 }
 private trim(){
  this.prune();while(this.bytes>this.maxBytes||this.entries.size>this.maxEntries){this.remove(this.entries.keys().next().value!);this.counters.evictions++;}
 }
 invalidateChallenge(id:string){for(const [key,entry]of this.entries)if(entry.challengeId===id)this.remove(key);}
 clear(){for(const id of this.entries.keys())this.remove(id);}
 stats(){this.prune();return {...this.counters,entries:this.entries.size,bytes:this.bytes,maxBytes:this.maxBytes,ttlSeconds:this.ttlMs/1000,compressing:this.active,queued:this.queue.size};}
 close(){clearInterval(this.timer);this.clear();}
}
