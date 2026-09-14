// The splash has a minimum duration; station readiness never interrupts name entry.
export class LoadingGate{
 constructor({started=0,splashMs=2400,replay=false}={}){Object.assign(this,{started,splashMs,replay,world:false,player:replay,connected:replay,failed:false});}
 phase(now){if(this.failed)return 'error';if(now-this.started<this.splashMs)return 'splash';return this.world&&this.player&&this.connected?'ready':this.replay?'loading':'setup';}
}
export function progressiveLoading({replay=false,onDone=()=>{}}={}){
 const host=document.getElementById('loading'),setup=document.getElementById('loading-setup'),message=document.getElementById('loading-message'),bar=document.getElementById('load-progress'),meter=document.getElementById('loading-meter');
 const gate=new LoadingGate({started:0,replay}),downloads=new Map(),inert=new Map();let resolve,finished=false,percent=0;
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
 function progress(value,text){if(gate.failed||finished)return;percent=Math.max(percent,Math.min(100,value));bar.style.width=`${percent}%`;meter.setAttribute('aria-valuenow',String(Math.round(percent)));message.textContent=text;render();}
 const timer=setInterval(render,100);render();
 document.getElementById('loading-retry').onclick=()=>location.reload();
 return {ready,get active(){return !finished;},
  player(value){gate.player=value;render();},network(value){gate.connected=replay||value;render();},
  progress,
  download(key,event){downloads.set(key,{loaded:event.loaded,total:event.total});const values=[...downloads.values()],bytes=values.reduce((n,d)=>n+d.loaded,0),fraction=values.reduce((n,d)=>n+(d.total?Math.min(1,d.loaded/d.total):0),0)/3;progress(fraction*75,`Loading the station · ${Math.round(bytes/1048576)} MB received`);},
  complete(){gate.world=true;progress(100,'Station ready');},
  fail(){gate.failed=true;message.textContent='The station couldn’t finish loading. Please try again.';document.getElementById('loading-retry').hidden=false;clearInterval(timer);render();}
 };
}
// Give typing and painting a turn between expensive scene preparation steps.
export const yieldLoadingUI=()=>new Promise(resolve=>setTimeout(resolve,0));
