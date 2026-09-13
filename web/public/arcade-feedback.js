import {currentScore,scoreEvents,pendingScoreEvent,heatTier,HEAT_STAGES} from './waypoint-score.js';
import {arcadeParticles} from './arcade-particles.js';
const $=id=>document.getElementById(id),format=n=>Math.round(n).toLocaleString();
export function arcadeFeedback(sound){
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hud=document.createElement('section');hud.id='combo-hud';hud.hidden=true;hud.setAttribute('aria-label','Live shot score');
 hud.innerHTML=`<div class="combo-heading"><span>LIVE COMBO / コンボ</span><b id="combo-status">BUILD YOUR LINE</b></div><div class="special-label"><b id="special-name">SPECIAL</b><span id="special-next">25,000 PTS</span></div><div id="special-track"><i id="special-fill"></i></div><div id="combo-total">0</div><div id="combo-factors"><b id="combo-banks">×1.00 BANKS</b><b id="combo-targets">HIT A TARGET</b></div><div class="combo-landing"><span id="combo-accuracy"></span><strong id="combo-cash"></strong></div><div id="combo-motion"></div><div id="combo-trick" aria-live="polite"></div>`;
 document.body.append(hud);
 const spectacle=document.createElement('div');spectacle.id='combo-spectacle';spectacle.hidden=true;spectacle.setAttribute('aria-hidden','true');
 spectacle.innerHTML='<div id="combo-burst"><small id="combo-call"></small><strong id="combo-mult"></strong><small id="combo-sub"></small></div><div id="combo-line"></div>';
 const leds=Array.from({length:20},(_,i)=>{const led=document.createElement('i');led.className='combo-led';led.style.cssText=`${i<10?'left':'right'}:5px;top:${9+(i%10)*8}%`;spectacle.append(led);return led;});document.body.append(spectacle);
 const particles=arcadeParticles(spectacle);
 let current=null,lastAttempt='',display=0,bankCount=0,waypointCount=0,tagged=false,flash=0,trickTime=0,burstTime=0,cooldown=0,pending=null,animations=[],tricks=[],highestTier=0,lastUpdate=performance.now();
 function cancelAnimations(){animations.forEach(a=>a.cancel());animations=[];}
 function pop(text,kind){
  $('combo-trick').textContent=text;hud.dataset.cue=kind;flash=.5;trickTime=2.4;
  if(!reduced()){$('combo-total').getAnimations().forEach(a=>a.cancel());$('combo-total').animate([{transform:'scale(1.14) rotate(-3deg)'},{transform:'scale(1) rotate(-2deg)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});}
 }
 function celebrate(event,audible=true){
  cancelAnimations();const tier=Math.max(heatTier(current),event.tier||0),big=['special','result','destination','goal'].includes(event.kind);
  spectacle.hidden=false;spectacle.dataset.tier=tier;spectacle.dataset.kind=event.kind;burstTime=big?2.1:1.15;cooldown=big?.45:.22;
  const color='#'+HEAT_STAGES[tier].color.toString(16).padStart(6,'0');spectacle.style.setProperty('--combo-tint',color);
  $('combo-call').textContent=event.kind==='special'?event.label:event.kind==='result'?'LINE COMPLETE / 大当たり':event.kind==='waypoint'?(event.count>1?`${event.label} / 同時ヒット`:'WAYPOINT LINK / 連鎖'):event.kind==='destination'?'DESTINATION BONUS':event.kind==='goal'?'TARGET TAGGED':'CLEAN BANK';
  $('combo-mult').textContent=event.kind==='special'?event.label:event.kind==='result'?format(current.total):event.kind==='destination'?`+${format(current.destinationBonus)}`:event.kind==='waypoint'&&event.count>1?`${event.count} HITS`:`×${Number(event.multiplier).toLocaleString(undefined,{maximumFractionDigits:2})}`;
  $('combo-mult').classList.toggle('word-burst',event.kind==='special');
  const digits=$('combo-mult').textContent.length;$('combo-mult').style.fontSize=event.kind==='special'?'':`clamp(30px,${Math.min(6,60/digits)}vw,${Math.min(100,700/digits)}px)`;
  $('combo-sub').textContent=event.kind==='special'?`${format(current.total)} POINTS · LEVEL ${tier}`:event.kind==='result'?'POINTS BANKED':event.kind==='goal'?'25% SECURED · LAND THE FINISH':event.kind==='waypoint'?`${event.label} · ${format(current.total)} PTS` :event.label;
  if(!reduced()){
   particles.burst(tier,big&&tier>=3);
   animations.push($('combo-burst').animate([{transform:'translate(40px,-12px) scale(.6) rotate(12deg)',opacity:0},{transform:'translate(-6px,4px) scale(1.15) rotate(-5deg)',opacity:1,offset:.2},{transform:'translate(0,0) scale(1) rotate(-3deg)',opacity:1,offset:.4},{transform:'translate(0,0) scale(1) rotate(-3deg)',opacity:1,offset:.8},{transform:'translate(0,-20px) scale(.95) rotate(-3deg)',opacity:0}],{duration:burstTime*1000,easing:'ease-out',fill:'both'}));
   leds.forEach((led,i)=>animations.push(led.animate([{opacity:.05},{opacity:.85},{opacity:.05}],{duration:800,delay:(i%10)*45,iterations:big?2:1})));
  }
  if(audible)sound.cue(event.kind,{multiplier:event.multiplier,tier});
 }
 const api={
  reset(){current=null;lastAttempt='';display=0;bankCount=0;waypointCount=0;tagged=false;flash=0;trickTime=0;burstTime=0;cooldown=0;pending=null;tricks=[];highestTier=0;lastUpdate=performance.now();cancelAnimations();particles.reset();hud.hidden=true;spectacle.hidden=true;hud.dataset.cue='';$('combo-line').textContent='';},
  accept(score,attempt){
   if(!currentScore(score))return;
   const rewind=current&&(score.styleBanks<bankCount||(score.waypointCount||0)<waypointCount);
   if(attempt!==lastAttempt||rewind){api.reset();lastAttempt=attempt;}
   const events=rewind?[]:scoreEvents(current,score);if(rewind)display=score.version==='waypoint-v3'?score.total:score.potential;current=score;bankCount=score.styleBanks;waypointCount=score.waypointCount||0;tagged=score.version==='waypoint-v3'?score.destinationReached:score.goalVisited;
   for(const event of events){
    if(event.kind==='special'){if(event.tier<=highestTier)continue;highestTier=event.tier;}
    else {
     const label=event.label.toUpperCase();
     tricks.push(label);if(tricks.length>5)tricks.shift();$('combo-line').textContent=tricks.join(' + ');pop(label,event.kind==='goal'||event.kind==='destination'?'goal':'bank');
    }
    // Events arriving within one beat share one stinger, keeping a fast chain punchy.
    pending=pendingScoreEvent(pending,event);
   }
  },
  result(result){
   if(result.breakdown)api.accept(result.breakdown,result.attempt);pending=null;
   if(!current||!(current.total>0)||['forfeit','route-missed'].includes(current.outcome)){burstTime=0;cancelAnimations();particles.reset();spectacle.hidden=true;return;}
   celebrate({kind:'result',multiplier:current.bankMultiplier},false);
  },
  update(dt,phase,mode){
   const now=performance.now(),elapsed=Math.max(0,(now-lastUpdate)/1000);lastUpdate=now;
   const visible=['play','replay'].includes(mode)&&!!current;
   hud.hidden=!visible||phase!=='Flight';cooldown=Math.max(0,cooldown-elapsed);burstTime=Math.max(0,burstTime-elapsed);
   if(pending&&!cooldown&&visible&&phase==='Flight'){const event=pending;pending=null;celebrate(event);}
   particles.update(elapsed,visible&&!reduced());spectacle.hidden=!visible||(!burstTime&&!particles.active);
   $('combo-burst').hidden=!burstTime;$('combo-line').hidden=phase!=='Flight'||!burstTime;
   if(!burstTime&&animations.length)cancelAnimations();
   if(!current)return;
   const waypoint=current.version==='waypoint-v3',value=waypoint?current.total:current.potential,tier=heatTier(current),next=HEAT_STAGES[tier+1];
   display=reduced()?value:display+(value-display)*(1-Math.exp(-dt*18));$('combo-total').textContent=format(display);
   hud.style.setProperty('--combo-tint','#'+HEAT_STAGES[tier].color.toString(16).padStart(6,'0'));hud.dataset.tier=tier;
   $('special-name').textContent=tier?HEAT_STAGES[tier].name:'SPECIAL';$('special-next').textContent=next?`${format(next.at)} PTS`:'MAXIMUM OVERDRIVE';
   const progress=next?Math.max(0,Math.min(1,((current.total||0)-HEAT_STAGES[tier].at)/(next.at-HEAT_STAGES[tier].at))):1;
   $('special-fill').style.transform=`scaleX(${progress})`;
   $('combo-banks').textContent=`×${current.bankMultiplier.toFixed(2)} BANKS · ${current.styleBanks}`;
   $('combo-targets').textContent=waypoint?`${waypointCount} TARGETS · NEXT ×${format(current.waypointMultiplier)}`:'DISTINCT SURFACES';
   $('combo-accuracy').textContent=waypoint?(tagged?'DESTINATION BONUS':'DESTINATION OPTIONAL'):`${Math.round((current.landingMultiplier||0)*100)}% LANDING`;
   $('combo-motion').textContent=`+${format(current.movementPoints||0)} MOVEMENT · 100 PTS / SEC${current.total>0?'':' · HIT A TARGET TO BANK'}`;
   $('combo-cash').textContent=`${format(current.total)} ${waypoint?'PTS BANKED':'PTS IF IT STOPS HERE'}`;
   $('combo-status').textContent=tagged?'LAND THE FINISH':waypointCount?'CHAIN EARNED':bankCount>=3?'KEEP LINKING':'FIND YOUR LINE';
   hud.classList.toggle('on-target',!!tagged);flash=Math.max(0,flash-elapsed);trickTime=Math.max(0,trickTime-elapsed);if(!flash)hud.dataset.cue='';$('combo-trick').style.opacity=trickTime?1:0;
   // DOM diagnostics make cue/particle behavior inspectable without private state.
   hud.dataset.events=String(bankCount+waypointCount);hud.dataset.particles=String(particles.active);
  },
  get score(){return current;},get goalFlash(){return tagged?flash:0;}
 };
 return api;
}
