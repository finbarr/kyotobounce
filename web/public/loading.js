// The splash has a minimum duration; station readiness never interrupts name entry.
export class LoadingGate{
 constructor({started=0,splashMs=2400,replay=false}={}){Object.assign(this,{started,splashMs,replay,world:false,player:replay,connected:replay,failed:false});}
 phase(now){if(this.failed)return 'error';if(now-this.started<this.splashMs)return 'splash';return this.world&&this.player&&this.connected?'ready':this.replay?'loading':'setup';}
}
// Fetch streams report decoded bytes, while a compressed Content-Length counts
// bytes on the wire. Use sizes from this release's build manifest for both GLBs
// and JSON. Include every asset from the outset so late downloads don't jump back.
export class DownloadProgress{
 constructor(paths){this.files=new Map(paths.map(path=>[path,{loaded:0,total:0,done:false}]));}
 expect(files){for(const [path,file]of this.files){const size=files?.[`web/public${path}`]?.bytes;if(Number.isFinite(size)&&size>0&&!file.done)file.total=size;}}
 update(path,loaded,done=false){const f=this.files.get(path);if(!f)return;f.loaded=Math.max(f.loaded,Number.isFinite(loaded)?loaded:0);if(done){f.done=true;f.total=f.loaded;}}
 get value(){
  const files=[...this.files.values()],bytes=files.reduce((n,f)=>n+f.loaded,0),done=files.every(f=>f.done);
  const known=files.every(f=>f.total>0||f.done),total=files.reduce((n,f)=>n+f.total,0);
  return {bytes,total,fraction:done?1:known&&total?Math.min(.99,files.reduce((n,f)=>n+Math.min(f.loaded,f.total),0)/total):null};
 }
}
export async function loadAsset(path,onProgress,{fetcher=fetch}={}){
 const response=await fetcher(path);if(!response.ok)throw new Error(`Asset unavailable: ${path}`);
 if(!response.body?.getReader){const buffer=await response.arrayBuffer();onProgress(buffer.byteLength,true);return buffer;}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.byteLength;onProgress(size,false);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 onProgress(size,true);return bytes.buffer;
}
export function progressiveLoading({replay=false,onDone=()=>{}}={}){
 const host=document.getElementById('loading'),setup=document.getElementById('loading-setup'),message=document.getElementById('loading-message'),bar=document.getElementById('load-progress'),meter=document.getElementById('loading-meter');
 const gate=new LoadingGate({started:0,replay}),inert=new Map();let resolve,finished=false,percent=0,downloads;
 const ready=new Promise(done=>resolve=done);
 document.body.classList.add('is-loading');
 for(const el of document.body.children)if(el!==host&&el.tagName!=='SCRIPT'){inert.set(el,el.inert);el.inert=true;}
 function render(){
  if(finished)return;
  const phase=gate.phase(performance.now());if(host.dataset.phase!==phase)host.dataset.phase=phase;
  setup.hidden=phase!=='setup';
  if(gate.world&&!gate.failed){message.textContent=gate.connected?gate.player?'Ready. Let’s bounce.':'Station ready · Choose your robot and continue.':'Station ready · Connecting to the arcade…';}
  if(phase==='ready'&&!finished){finished=true;clearInterval(timer);host.hidden=true;document.body.classList.remove('is-loading');for(const [el,value]of inert)el.inert=value;onDone();resolve();}
 }
 function progress(value,text){if(gate.failed||finished)return;meter.classList.remove('indeterminate');percent=Math.max(percent,Math.min(100,value));bar.style.width=`${percent}%`;meter.setAttribute('aria-valuenow',String(Math.round(percent)));message.textContent=text;render();}
 function downloadProgress(){
  if(gate.failed||finished||percent>=78)return;
  const {bytes,total,fraction}=downloads.value,mb=n=>(n/1048576).toFixed(1);
  const text=`Downloading the station · ${mb(bytes)}${total&&fraction!==null?' / '+mb(total):''} MB`;
  if(fraction===null){meter.classList.add('indeterminate');meter.removeAttribute('aria-valuenow');message.textContent=text;}
  else progress(fraction*75,text);
 }
 const timer=setInterval(render,100);render();
 document.getElementById('loading-retry').onclick=()=>location.reload();
 return {ready,get active(){return !finished;},
  player(value){gate.player=value;render();},network(value){gate.connected=replay||value;render();},
  progress,
  downloads(paths){downloads=new DownloadProgress(paths);downloadProgress();},
  expect(files){downloads.expect(files);downloadProgress();},
  download(path,bytes,done){downloads.update(path,bytes,done);downloadProgress();},
  complete(){gate.world=true;progress(100,'Station ready');},
  fail(){gate.failed=true;message.textContent='The station couldn’t finish loading. Please try again.';document.getElementById('loading-retry').hidden=false;clearInterval(timer);render();}
 };
}
// Give typing and painting a turn between expensive scene preparation steps.
export const yieldLoadingUI=()=>new Promise(resolve=>setTimeout(resolve,0));
