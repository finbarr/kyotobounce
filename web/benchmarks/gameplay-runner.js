const delay=ms=>new Promise(done=>setTimeout(done,ms));
const until=async(f,timeout=15000)=>{const end=performance.now()+timeout;while(!f()){if(performance.now()>end)throw Error('Timed out: '+String(f));await delay(20);}};
export function install(g){
 const host=document.createElement('aside');host.id='gameplay-benchmark';host.style='position:fixed;top:8px;left:36%;width:28%;z-index:10000;background:#111d;color:white;padding:8px;font:12px monospace;max-height:35vh;overflow:auto';
 host.innerHTML='<button id="bench-run">Run 100-throw benchmark</button><button id="bench-state">Inspect gameplay</button><button id="bench-shot">Play suggested shot</button><select id="bench-completion" aria-label="Local completion fixture"><option value="rank">Rank 250 success</option><option value="final">Final campaign success</option><option value="custom">Custom course success</option></select><button id="bench-fixture">Preview local completion fixture</button><input id="bench-replay-id" aria-label="Replay to benchmark" placeholder="Replay ID (optional)"><button id="bench-replays">Cycle replay 10 times</button><select id="bench-station" aria-label="Station seam"><option value="ticket">Ticket wall</option><option value="tactile">Tactile pad</option><option value="gate">Paid-gate floor</option><option value="upper">Upper landing</option><option value="skyway">Skyway trim</option></select><button id="bench-seam">Inspect seam</button><button id="bench-sweep">Sweep view</button><button id="bench-hide">Hide review panel</button><pre id="bench-output" style="white-space:pre-wrap"></pre>';document.body.append(host);
 const seamViews={ticket:[[23,1.75,22.5],[25,1.7,21.68]],tactile:[[-13.5,.7,-4.5],[-14.46,.01,-6.5]],gate:[[5,1.8,38],[10,0,35]],upper:[[-74,20.2,16],[-74.9,19.586,17.5]],skyway:[[-66,46.5,-3],[-67.88,45.28,-1.08]]};
 let sweeping=false,seamStart=0;
 const seam=()=>{const [p,t]=seamViews[host.querySelector('#bench-station').value];g.reviewCamera(p,t);};
 host.querySelector('#bench-seam').onclick=()=>{sweeping=false;seam();};
 host.querySelector('#bench-sweep').onclick=()=>{sweeping=!sweeping;seamStart=performance.now();if(sweeping)seam();};
 host.querySelector('#bench-hide').onclick=()=>{host.hidden=true;};
 function sweep(now){if(sweeping){const [p,t]=seamViews[host.querySelector('#bench-station').value],offset=Math.sin((now-seamStart)/1200)*.16;g.reviewCamera([p[0]+offset,p[1],p[2]-offset],[t[0],t[1],t[2]]);}requestAnimationFrame(sweep);}requestAnimationFrame(sweep);
 const output=host.querySelector('pre'),samples=[],frames=[],resources=[];let running=false,last=0,hiddenFrames=0;
 const state=()=>({view:g.getView(),phase:g.getSnapshot()?.phase,challenge:g.ui.state.selected?.id,charging:g.chargeMeter.charging,session:{busy:g.ui.state.session?.busy,attempt:g.ui.state.session?.attempt},result:g.ui.state.lastResult?{attempt:g.ui.state.lastResult.attempt,success:g.ui.state.lastResult.success,score:g.ui.state.lastResult.score,challenge:g.ui.state.lastResult.challenge?.id}:null,render:g.renderer.info.memory,programs:g.renderer.info.programs.length,pixelRatio:g.renderer.getPixelRatio(),camera:window.kyotoState?.camera});
 host.querySelector('#bench-state').onclick=()=>output.textContent=JSON.stringify(state(),null,2);
 function frame(now){if(running&&last){if(document.hidden)hiddenFrames++;else frames.push(now-last);}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
 async function report(stage){const sorted=frames.toSorted((a,b)=>a-b),quantile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;
  const value={stage,throws:samples.length,hiddenFrames,frames:frames.length,median:quantile(.5),p95:quantile(.95),p99:quantile(.99),over50:frames.filter(x=>x>50).length,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,render:{...g.renderer.info.memory},programs:g.renderer.info.programs.length,sceneObjects:(()=>{let count=0;g.scene.traverse(()=>count++);return count;})(),pixelRatio:g.renderer.getPixelRatio(),samples:samples.slice(-10),resources:[...resources]};
  output.textContent=JSON.stringify(value,null,2);await fetch('/__gameplay/report',{method:'POST',body:JSON.stringify(value)});return value;
 }
 let lastAttempt,liveResult;
 host.querySelector('#bench-fixture').onclick=()=>{
  try{
   liveResult??=g.ui.state.lastResult;if(!liveResult?.success)throw Error('Complete a real shot first');
   const mode=host.querySelector('#bench-completion').value;
   const challenge=mode==='final'?g.ui.state.challenges.filter(c=>c.campaign).toSorted((a,b)=>a.order-b.order).at(-1):mode==='custom'?{...liveResult.challenge,id:'local-completion-fixture',campaign:undefined}:liveResult.challenge;
   g.ui.closeLevels();g.ui.message({...g.ui.state.session,type:'session',challenge});
   g.ui.message({...liveResult,type:'result',challenge,saved:false,records:{personalBest:false},standings:{before:[],after:[],rank:250}});
   // A held fast-forward key reaches completion as repeated keydowns. It must
   // neither advance nor charge; a later fresh key press uses the normal UI.
   const before=g.ui.state.selected;document.getElementById('game').focus();
   for(let i=0;i<8;i++)document.getElementById('game').dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',repeat:true,bubbles:true}));
   document.getElementById('game').dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}));
   if(g.ui.state.selected!==before||g.chargeMeter.charging)throw Error('Held Space changed level or charged');
   output.textContent='LOCAL PRESENTATION FIXTURE — no score submitted.\n'+mode+'; held Space guard PASS';
  }catch(e){output.textContent='FAIL '+e.stack;}
 };

 host.querySelector('#bench-shot').onclick=async()=>{
  try{
   g.briefing.dismiss();g.ui.closeLevels();if(g.getSnapshot()?.phase!=='Aim'){g.recall();await until(()=>g.getSnapshot()?.phase==='Aim'&&!g.ui.state.session.busy&&!g.getView().recallPending);}
   g.hint();await delay(150);g.startCharge();await until(()=>g.chargeMeter.charging);await delay(g.ui.state.selected.hint.holdMs);g.release();await until(()=>g.shotPlayback.active);g.setFastForward(true);
   await until(()=>g.ui.state.lastResult,120000);lastAttempt=g.ui.state.lastResult.attempt;await report('completed-shot');output.textContent=JSON.stringify(state(),null,2);
  }catch(e){output.textContent='FAIL '+e.stack+'\n'+JSON.stringify(state());}
 };
 host.querySelector('#bench-replays').onclick=async()=>{
  try{
   lastAttempt=host.querySelector('#bench-replay-id').value||lastAttempt||g.ui.state.lastResult?.attempt;if(!lastAttempt)throw Error('Complete a shot first');
   const cycles=[];await report('replay-before');
   for(let i=0;i<10;i++){
    await g.ui.openReplay(lastAttempt);await until(()=>g.ui.state.mode==='replay');await delay(400);
    document.getElementById('close-replay').click();await until(()=>g.ui.state.mode==='play');g.briefing.dismiss();g.ui.closeLevels();await delay(400);
    cycles.push({i,render:{...g.renderer.info.memory},programs:g.renderer.info.programs.length,heap:performance.memory?.usedJSHeapSize});output.textContent=JSON.stringify(cycles,null,2);
   }
   const value=await report('replay-after');value.cycles=cycles;await fetch('/__gameplay/report',{method:'POST',body:JSON.stringify(value)});output.textContent=JSON.stringify(value,null,2);
  }catch(e){output.textContent='FAIL '+e.stack;}
 };
 host.querySelector('#bench-run').onclick=async()=>{
  if(running)return;running=true;host.querySelector('#bench-run').disabled=true;
  try{
   await until(()=>window.kyotoState?.ready&&!g.startup.active,120000);g.briefing.dismiss();g.ui.closeLevels();
   const ids=['kyoto-platform','kyoto-ticket'];
   for(let i=-10;i<100;i++){
    output.textContent=`${i<0?'Warmup':'Measured throw'} ${i<0?i+11:i+1} / ${i<0?10:100}`;
    const course=g.ui.state.challenges.find(c=>c.id===ids[Math.floor(Math.max(0,i)/10)%ids.length]);
    if(g.ui.state.selected?.id!==course.id){
     const buttons=[...document.querySelectorAll('button.course')],button=buttons.find(b=>b.dataset.challenge===course.id);
     // Use the same menu action as a player, selecting its chapter first.
     if(!button){const picker=document.getElementById('campaign-chapter');picker.value=String(course.campaign.chapter);picker.dispatchEvent(new Event('change'));}
     document.querySelector(`button.course[data-challenge="${course.id}"]`).click();
     await until(()=>g.ui.state.selected?.id===course.id&&g.getSnapshot()?.challenge?.id===course.id);
     g.briefing.dismiss();g.ui.closeLevels();await delay(250);
    }
    g.hint();await until(()=>g.getSnapshot()?.phase==='Aim'&&!g.ui.state.session?.busy&&!g.ui.state.session?.restoring);
    g.startCharge();await until(()=>g.chargeMeter.charging);await delay(90);g.release();
    const began=performance.now();await until(()=>g.getSnapshot()?.phase==='Flight');await delay(i%3===0?450:100);
    g.recall();g.recall();g.recall();await until(()=>g.getSnapshot()?.phase==='Aim'&&!g.ui.state.session?.busy&&!g.getView().recallPending);
    await delay(80);
    if(i>=0)samples.push({n:i+1,flightDelay:performance.now()-began,heap:performance.memory?.usedJSHeapSize,render:{...g.renderer.info.memory},programs:g.renderer.info.programs.length});
    if(i===-1){frames.length=0;resources.push(await report('warmup'));}
    if(i>=0&&(i+1)%25===0){await report('throws-'+(i+1));frames.length=0;}
   }
   running=false;await delay(3000);await report('complete');output.textContent='PASS — 100 throws after 10 warmup throws.\n'+output.textContent;
  }catch(error){running=false;output.textContent='FAIL '+error.stack+'\n'+JSON.stringify(state(),null,2);await fetch('/__gameplay/report',{method:'POST',body:JSON.stringify({stage:'failed',error:error.stack,state:state(),samples})});}
  finally{host.querySelector('#bench-run').disabled=false;}
 };
}
