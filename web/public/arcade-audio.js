// Original 112 BPM arcade score: eight-bar phrases, arranged across a 32-phrase suite.
export function arcadeAudio(){
 let ctx,master,musicBus,sfxBus,compressor,timer,next=0,step=0,charge=null,lastImpact=0,white,travel,travelGain,travelFilter;
 const cues={};let waypointRun=false,chainVoice=0,rate=1,audioOrigin=0,scoreOrigin=0;
 const voices=new Set();
 const scoreTime=()=>scoreOrigin+(ctx?ctx.currentTime-audioOrigin:0)*rate;
 const audioTime=t=>ctx.currentTime+(t-scoreTime())/rate;
 // Keep scheduled notes in musical time. Retiming preserves the current phrase
 // and shortens both future cues and the tails already sounding.
 function voice(t,duration,create){
  const entry={nodes:null,render(){
   const old=this.nodes;
   if(old){old.g.gain.cancelScheduledValues(ctx.currentTime);old.g.gain.setTargetAtTime(.0001,ctx.currentTime,.002);old.source.stop(ctx.currentTime+.008);}
   const offset=Math.max(0,scoreTime()-t);if(offset>=duration){voices.delete(this);return;}
   const nodes=create(Math.max(ctx.currentTime,audioTime(t)),(duration-offset)/rate,offset);this.nodes=nodes;
   nodes.source.onended=()=>{nodes.dispose();if(this.nodes===nodes)voices.delete(this);};
  }};
  voices.add(entry);entry.render();
 }
 function envelope(g,t,duration,volume,offset,total){
  const level=Math.max(.0002,volume)*Math.pow(.0001/Math.max(.0002,volume),offset/total);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,level),t+Math.min(.006/rate,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 }
 function setPlaybackRate(value){
  const nextRate=value===2?2:1;if(rate===nextRate)return;
  scoreOrigin=scoreTime();audioOrigin=ctx?.currentTime||0;rate=nextRate;
  if(ctx){for(const v of [...voices])v.render();travel?.playbackRate.setValueAtTime(rate,ctx.currentTime);schedule();}
 }

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
  voice(t,duration,(at,remaining,offset)=>{
   const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
   o.frequency.setValueAtTime((endFreq?freq*Math.pow(endFreq/freq,Math.min(1,offset/(duration*.8))):freq)*rate,at);
   if(endFreq&&offset<duration*.8)o.frequency.exponentialRampToValueAtTime(endFreq*rate,at+(duration*.8-offset)/rate);
   envelope(g,at,remaining,volume,offset,duration);o.connect(g).connect(bus);o.start(at);o.stop(at+remaining+.02/rate);
   return {source:o,g,dispose(){o.disconnect();g.disconnect();}};
  });
 }
 function noise(t,duration,level){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=739;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741824-1)*(1-i/data.length);}
  voice(t,duration,(at,remaining,offset)=>{
   const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();n.buffer=buffer;n.playbackRate.value=rate;f.type='highpass';f.frequency.value=Math.min(ctx.sampleRate*.45,6500*rate);
   envelope(g,at,remaining,level,offset,duration);n.connect(f).connect(g).connect(musicBus);n.start(at,offset);n.stop(at+remaining);
   return {source:n,g,dispose(){n.disconnect();f.disconnect();g.disconnect();}};
  });
 }

 function schedule(){
  if(!ctx||ctx.state!=='running'||document.hidden)return;
  if(next<scoreTime())next=scoreTime()+.04*rate;
  while(next<scoreTime()+.15*rate){
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
   if(!ctx){ctx=new AudioContext();audioOrigin=ctx.currentTime;scoreOrigin=0;master=ctx.createGain();musicBus=ctx.createGain();sfxBus=ctx.createGain();compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=5;master.connect(compressor).connect(ctx.destination);musicBus.connect(master);sfxBus.connect(master);update();timer=setInterval(schedule,60);}
   if(ctx.state==='suspended'&&!document.hidden){await ctx.resume();next=scoreTime()+.04*rate;}
  }catch{/* Audio must never block gameplay when unavailable. */}
 }
 function stopCharge(){if(!charge||!ctx)return;const {o,g}=charge;charge=null;g.gain.cancelScheduledValues(ctx.currentTime);g.gain.setTargetAtTime(.0001,ctx.currentTime,.015);o.stop(ctx.currentTime+.1);}
 function startCharge(seconds=2.8){
  stopCharge();if(!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(880,t+seconds);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.075,t+.1);o.connect(g).connect(sfxBus);o.start();o.onended=()=>{o.disconnect();g.disconnect();};charge={o,g};
  tone(220,scoreTime(),.055,.065,'square');
 }
 function burst(t,duration,volume=.08,frequency=1800,type='bandpass'){
  if(!white){white=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=white.getChannelData(0);let seed=491;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1;}}
  voice(t,duration,(at,remaining,offset)=>{
   const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();n.buffer=white;n.playbackRate.value=rate;f.type=type;f.frequency.value=Math.min(ctx.sampleRate*.45,frequency*rate);f.Q.value=.8;
   envelope(g,at,remaining,volume,offset,duration);n.connect(f).connect(g).connect(sfxBus);n.start(at,offset);n.stop(at+remaining+.02/rate);
   return {source:n,g,dispose(){n.disconnect();f.disconnect();g.disconnect();}};
  });
 }

 function duck(){const t=ctx.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setTargetAtTime(prefs.music?.22:0,t,.025);musicBus.gain.setTargetAtTime(prefs.music?.65:0,t+.5/rate,.25/rate);}
 function motion(speed,supported,active){
  if(!ctx||ctx.state!=='running')return;
  if(!travel){
   // Low-level rolling grit and air rush connect the discrete impacts.
   if(!white)burst(scoreTime(),.001,.0001);
   travel=ctx.createBufferSource();travel.buffer=white;travel.loop=true;travel.playbackRate.value=rate;travelGain=ctx.createGain();travelGain.gain.value=0;travelFilter=ctx.createBiquadFilter();travelFilter.type='lowpass';travel.connect(travelFilter).connect(travelGain).connect(sfxBus);travel.start();
  }
  const strength=active?Math.min(supported?.085:.045,speed*(supported?.006:.0008)):0;
  travelGain.gain.setTargetAtTime(strength,ctx.currentTime,.1);travelFilter.frequency.setTargetAtTime((supported?180+Math.min(speed,20)*65:550+Math.min(speed,100)*20)*rate,ctx.currentTime,.1/rate);
 }
 function cue(name,value=0){
  if(!ctx||ctx.state!=='running')return;const t=scoreTime();cues[name]=(cues[name]||0)+1;
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
   duck();const tier=Math.min(6,typeof value==='object'?value.tier||0:0),voice=chainVoice++%4;
   // Escalate rhythm and instrumentation, not an endless climb in pitch/volume.
   const motifs=[[0,7,12],[12,7,3,0],[0,3,10,7],[7,12,15,12]],line=motifs[voice];
   const base=57+Math.min(12,tier*2),spacing=name==='waypoint'?.047:.065;
   tone(76,t,.17,.14,'sine',sfxBus,38);burst(t,.075,.08,1800+voice*650);
   line.forEach((n,i)=>{tone(notes(base+n),t+i*spacing,.2,.065,voice%2?'triangle':'square');if(name==='waypoint')tone(notes(base+n+12),t+i*spacing+.025,.13,.015,'sine');});
   if(tier>=3)[0,1,2].forEach(i=>burst(t+.18+i*.055,.025,.035,4200));
  }
  if(name==='special'){
   duck();const tier=Math.min(6,Math.max(1,value.tier||1));
   tone(115,t,.35,.2,'sine',sfxBus,32);burst(t,.25,.11,2200);
   tone(220,t,.28,.045,'sawtooth',sfxBus,880);
   const fanfare=[0,7,12,10,7,15,12,19];
   fanfare.forEach((n,i)=>{tone(notes(60+n),t+.08+i*.065,.27,.06,'triangle');tone(notes(48+n),t+.08+i*.065,.2,.035,'square');});
   // A short medal cascade for earned stage changes; never loop while settling.
   for(let i=0;i<8+tier*2;i++){const at=t+.22+i*.038; tone(notes(78+[0,7,3,10][i%4]),at,.07,.018,'sine');if(i%3===0)burst(at,.022,.025,3600);}
   [48,55,60,63].forEach(n=>tone(notes(n),t+.6,.7,.04,'triangle'));
  }
  if(name==='clear'){
   waypointRun=true;duck();
   // A complete route gets a full taiko roll, octave fanfare and medal payout.
   // It is a single earned cue, and uses the same bounded mix and playback clock.
   [0,.12,.24,.42].forEach((offset,i)=>{tone(i===3?66:95,t+offset,.28,i===3?.19:.10,'sine',sfxBus,34);burst(t+offset,.09,.045,2500);});
   [60,67,72,76,79,84,79,88].forEach((n,i)=>{tone(notes(n),t+.12+i*.105,.38,.065,'triangle');tone(notes(n-12),t+.12+i*.105,.28,.035,'square');});
   [48,55,60,64,72].forEach(n=>tone(notes(n),t+1,.95,.045,'triangle'));
   for(let i=0;i<24;i++)tone(notes(84+[0,7,12,4,9,16][i%6]),t+.55+i*.045,.13,.018,'sine');
   burst(t+1,.18,.07,4500,'highpass');
  }
  if(name==='goal'||name==='destination'){
   if(name==='destination')waypointRun=true;
   duck();burst(t,.28,.14,4800,'highpass');tone(82,t,.24,.24,'sine',sfxBus,38);
   [72,76,79,84,88,91,96].forEach((n,i)=>{tone(notes(n),t+i*.055,.42,.11,'triangle');tone(notes(n+12),t+i*.055+.02,.22,.025,'sine');});
   tone(1200,t+.22,.33,.035,'sine',sfxBus,3000);
   [60,67,72,76].forEach(n=>tone(notes(n),t+.48,.8,.055,'triangle'));
   [0,1,2].forEach(i=>burst(t+.48+i*.12,.07,.045,4800));
  }
  if(name==='ranking'){
   duck();tone(92,t,.3,.16,'sine',sfxBus,35);burst(t,.16,.08,2600);
   const line=value===1?[60,67,72,76,79,84]:value<=3?[60,64,67,72]:[60,67,72];
   line.forEach((n,i)=>{tone(notes(n),t+i*.055,.25,.045,'square');tone(notes(n+12),t+i*.055,.4,.03,'triangle');});
  }
  if(name==='result'){
   // A missed optional destination does not negate an earned waypoint chain.
   if(value==='chain'||(waypointRun&&!['perfect','forfeit','route-missed'].includes(value)))value='tagged';waypointRun=false;
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
 return {unlock,cue,motion,startCharge,stopCharge,setPlaybackRate,get state(){return {initialized:!!ctx,status:ctx?.state||'locked',...prefs,step,playbackRate:rate,bpm:112*rate,voices:voices.size,cues:{...cues}};}};
}
