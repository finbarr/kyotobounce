// Original 112 BPM arcade score: eight-bar phrases, arranged across a 32-phrase suite.
export function arcadeAudio(){
 let ctx,master,musicBus,sfxBus,compressor,timer,next=0,step=0,charge=null,lastImpact=0,white,travel,travelGain,travelFilter;
 const cues={};let waypointRun=false;
 let prefs;try{prefs=JSON.parse(localStorage.getItem('kyoto-audio')||'null');}catch{}
 prefs={muted:false,music:true,...prefs};
 const tones=[0,3,5,7,10],root=57,beat=60/112/2;
 // Related call/response motifs; rests leave room for the physical game cues.
 const phrases=[
  [0,-1,2,3,-1,2,1,-1,0,2,-1,5,4,-1,2,-1],
  [3,4,-1,6,5,-1,3,-1,2,-1,1,3,-1,2,0,-1],
  [5,-1,3,-1,2,3,-1,4,6,-1,5,3,-1,2,1,-1],
  [0,1,2,-1,4,-1,3,2,1,-1,3,-1,2,1,0,-1],
  [7,-1,5,4,-1,3,5,-1,6,5,-1,3,2,-1,0,-1],
  [2,-1,-1,3,5,-1,4,-1,3,-1,1,-1,0,-1,-1,-1]
 ];
 const arrangement=[0,1,2,3,5,2,4,1,3,0,5,4,2,1,4,3,5,0,2,4,1,3,0,5,4,2,3,1,0,4,5,2];
 const notes=n=>440*2**((n-69)/12),pent=n=>root+tones[n%5]+12*Math.floor(n/5);
 function save(){try{localStorage.setItem('kyoto-audio',JSON.stringify(prefs));}catch{}update();}
 function tone(freq,t,duration,volume=.06,type='triangle',bus=sfxBus,endFreq){
  if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration*.8);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g).connect(bus);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 function noise(t,duration,level){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  // Seeded percussion makes this original loop reproducible.
  let seed=739;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741824-1)*(1-i/data.length);}
  const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();n.buffer=buffer;f.type='highpass';f.frequency.value=6500;g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f).connect(g).connect(musicBus);n.start(t);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
 }
 function schedule(){
  if(!ctx||ctx.state!=='running'||document.hidden)return;
  if(next<ctx.currentTime)next=ctx.currentTime+.04;
  while(next<ctx.currentTime+.15){
   if(prefs.music&&!prefs.muted){
    const phrase=Math.floor(step/64),section=Math.floor(phrase/2)%4,part=Math.floor(step/16)%4;
    const motif=phrases[arrangement[phrase%arrangement.length]],index=step%16;
    // Responses vary contour and register at musical boundaries, never random notes.
    let m=motif[index];if(m>=0&&part===1)m=Math.max(0,m-1);if(m>=0&&part===3)m=index>11?[2,-1,1,0][index-12]:m+1;
    const bar=Math.floor(step/8)%8,bass=[45,45,41,41,48,48,43,43][bar],space=section===2;
    if(m>=0&&(!space||step%2===0)){
     const register=section===3?5:0;
     tone(notes(pent(m+register)),next,space?.38:.17,section===3?.024:.031,section===0?'triangle':'sine',musicBus);
     if(section===1||section===3)tone(notes(pent(m)),next+.12,.24,.009,'triangle',musicBus);
    }
    if(step%(space?4:2)===0)tone(notes(bass+(step%8===6?12:0)),next,.25,.105,'triangle',musicBus);
    if(step%8===0)for(const semitone of [0,7,12])tone(notes(bass+12+semitone),next,1.35,.015,'sine',musicBus);
    if(step%4===0&&(!space||step%8===0))tone(105,next,.14,.14,'sine',musicBus,36);
    if(!space||step%4===2)noise(next,step%4===2?.075:.025,step%4===2?.044:.018);
    if(section===3&&step%8===7)tone(notes(bass+24),next,.1,.018,'triangle',musicBus);

   }
   step++;next+=beat;
  }
 }
 function update(){
  if(ctx){musicBus.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(prefs.muted?0:.52,ctx.currentTime,.035);musicBus.gain.setTargetAtTime(prefs.music?.65:0,ctx.currentTime,.035);}
  const mute=document.getElementById('sound-toggle'),music=document.getElementById('music-toggle');
  if(mute){mute.textContent=prefs.muted?'SOUND OFF':'SOUND ON';mute.setAttribute('aria-pressed',String(!prefs.muted));}
  if(music){music.textContent=prefs.music?'♫ MUSIC ON':'♫ MUSIC OFF';music.setAttribute('aria-pressed',String(prefs.music));}
 }
 async function unlock(){
  try{
   if(!ctx){ctx=new AudioContext();master=ctx.createGain();musicBus=ctx.createGain();sfxBus=ctx.createGain();compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=5;master.connect(compressor).connect(ctx.destination);musicBus.connect(master);sfxBus.connect(master);update();timer=setInterval(schedule,60);}
   if(ctx.state==='suspended'&&!document.hidden){await ctx.resume();next=ctx.currentTime+.04;}
  }catch{/* Audio must never block gameplay when unavailable. */}
 }
 function stopCharge(){if(!charge||!ctx)return;const {o,g}=charge;charge=null;g.gain.cancelScheduledValues(ctx.currentTime);g.gain.setTargetAtTime(.0001,ctx.currentTime,.015);o.stop(ctx.currentTime+.1);}
 function startCharge(seconds=2.8){
  stopCharge();if(!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(880,t+seconds);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.075,t+.1);o.connect(g).connect(sfxBus);o.start();o.onended=()=>{o.disconnect();g.disconnect();};charge={o,g};
  tone(220,t,.055,.065,'square');
 }
 function burst(t,duration,volume=.08,frequency=1800,type='bandpass'){
  if(!white){white=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=white.getChannelData(0);let seed=491;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1;}}
  const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();n.buffer=white;f.type=type;f.frequency.value=frequency;f.Q.value=.8;
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f).connect(g).connect(sfxBus);n.start(t);n.stop(t+duration+.02);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
 }
 function duck(){const t=ctx.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setTargetAtTime(prefs.music?.22:0,t,.025);musicBus.gain.setTargetAtTime(prefs.music?.65:0,t+.5,.25);}
 function motion(speed,supported,active){
  if(!ctx||ctx.state!=='running')return;
  if(!travel){
   // Low-level rolling grit and air rush connect the discrete impacts.
   if(!white)burst(ctx.currentTime,.001,.0001);
   travel=ctx.createBufferSource();travel.buffer=white;travel.loop=true;travelGain=ctx.createGain();travelGain.gain.value=0;travelFilter=ctx.createBiquadFilter();travelFilter.type='lowpass';travel.connect(travelFilter).connect(travelGain).connect(sfxBus);travel.start();
  }
  const strength=active?Math.min(supported?.085:.045,speed*(supported?.006:.0008)):0;
  travelGain.gain.setTargetAtTime(strength,ctx.currentTime,.1);travelFilter.frequency.setTargetAtTime(supported?180+Math.min(speed,20)*65:550+Math.min(speed,100)*20,ctx.currentTime,.1);
 }
 function cue(name,value=0){
  if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime;cues[name]=(cues[name]||0)+1;
  if(name==='menu')tone(660,t,.055,.035,'square');
  if(name==='start'){[0,7,12].forEach((n,i)=>tone(notes(69+n),t+i*.055,.16,.07));}
  if(name==='throw'){waypointRun=false;burst(t,.19,.14,2400,'highpass');tone(520,t,.21,.1,'sawtooth',sfxBus,65);tone(70,t,.14,.18,'sine',sfxBus,36);}
  if(name==='impact'){
   if(t-lastImpact<.065)return;lastImpact=t;
   const speed=typeof value==='number'?value:value.speed,label=typeof value==='object'?`${value.surface} ${value.label}`.toLowerCase():'';
   const volume=Math.min(.23,.045+speed*.005),metal=/steel|metal|escalator|rail|truss/.test(label),glass=/glass|window/.test(label);
   tone(100+Math.min(speed,30)*8,t,.12,volume,'sine',sfxBus,45);burst(t,.045,volume*.75,metal?4000:glass?7000:1500);
   if(metal||glass){for(const [i,ratio]of [1,1.48,2.12].entries())tone((glass?1850:680)*ratio,t,.14+i*.08,volume*.22/(i+1),'sine');}
   else tone(480,t,.035,volume*.2,'triangle',sfxBus,150);
  }
  if(name==='bank'||name==='waypoint'){
   if(name==='waypoint')waypointRun=true;
   duck();const mult=typeof value==='object'?value.multiplier:1+value*.75;
   const level=Math.min(6,Math.max(0,Math.floor(Math.log2(Math.max(1,mult))))),climb=Math.min(30,Math.round(9*Math.log2(Math.max(1,mult))));
   const count=Math.min(9,(name==='waypoint'?5:3)+level),spacing=(name==='waypoint'?.055:.065)-level*.005;
   burst(t,.06,.065,3200);tone(92,t,.14,.12,'sine',sfxBus,45);
   for(let i=0;i<count;i++){
    const f=notes((name==='waypoint'?65:60)+climb+[0,3,5,7,10,12,15,17,19][i]);
    tone(f,t+i*spacing,.24,.065,'triangle');tone(f*2.12,t+i*spacing,.13,.012,'sine');
   }
  }
  if(name==='goal'||name==='destination'){
   if(name==='destination')waypointRun=true;
   duck();burst(t,.28,.14,4800,'highpass');tone(82,t,.24,.24,'sine',sfxBus,38);
   [72,76,79,84,88,91,96].forEach((n,i)=>{tone(notes(n),t+i*.055,.42,.11,'triangle');tone(notes(n+12),t+i*.055+.02,.22,.025,'sine');});
   tone(1200,t+.22,.33,.035,'sine',sfxBus,3000);
   [60,67,72,76].forEach(n=>tone(notes(n),t+.48,.8,.055,'triangle'));
   [0,1,2].forEach(i=>burst(t+.48+i*.12,.07,.045,4800));
  }
  if(name==='result'){
   // A missed optional destination does not negate an earned waypoint chain.
   if(waypointRun&&!['perfect','forfeit'].includes(value))value='tagged';waypointRun=false;
   duck();if(value==='perfect'||value==='tagged'){burst(t,.2,.1,3000);tone(90,t,.2,.18,'sine',sfxBus,38);}
   const line=value==='perfect'?[69,73,76,81,85]:value==='tagged'?[69,76,81,80]:value==='near'?[69,73,76]:[64,61,57];
   line.forEach((n,i)=>tone(notes(n),t+i*.095,i===line.length-1?.6:.18,.07,'triangle'));
  }
 }
 document.addEventListener('pointerdown',()=>unlock(),{capture:true});
 document.addEventListener('keydown',()=>unlock(),{capture:true});
 document.addEventListener('click',e=>{if(e.target.closest('button'))cue('menu');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCharge();ctx?.suspend();}else if(ctx){unlock();}});
 window.addEventListener('pagehide',()=>{clearInterval(timer);ctx?.close();});
 document.getElementById('sound-toggle').onclick=()=>{prefs.muted=!prefs.muted;save();};
 document.getElementById('music-toggle').onclick=()=>{prefs.music=!prefs.music;save();};update();
 return {unlock,cue,motion,startCharge,stopCharge,get state(){return {initialized:!!ctx,status:ctx?.state||'locked',...prefs,step,cues:{...cues}};}};
}
