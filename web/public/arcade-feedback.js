const $=id=>document.getElementById(id);
const format=n=>Math.round(n).toLocaleString();
export function arcadeFeedback(sound){
 const hud=document.createElement('section');hud.id='combo-hud';hud.hidden=true;hud.setAttribute('aria-label','Live shot score');
 hud.innerHTML=`<div class="combo-heading"><span>LIVE COMBO / コンボ</span><b id="combo-status">BUILD YOUR LINE</b></div><div id="combo-total">10,000</div><div id="combo-factors"><span>10,000 BASE</span><b id="combo-banks">×1.00 BANKS</b><b id="combo-time">×1.00 TIME</b></div><div class="combo-landing"><span id="combo-accuracy">0% LANDING</span><strong id="combo-cash">0 PTS IF IT STOPS HERE</strong></div><div id="combo-trick" aria-live="polite"></div>`;
 document.body.append(hud);
 // Self-contained presentation: no game, CSS or scoring contract changes.
 const style=document.createElement('style');style.textContent=`
 #combo-spectacle{position:fixed;inset:0;pointer-events:none;z-index:12;color:#ffe277;contain:layout style}
 #combo-spectacle[hidden]{display:none}
 #combo-burst{position:absolute;top:16%;right:4%;width:min(480px,51vw);text-align:center;filter:drop-shadow(0 5px 0 #14233c)}
 #combo-burst strong{display:block;font:1000 clamp(64px,10vw,144px)/.95 Impact,'Arial Black',sans-serif;letter-spacing:-.055em;-webkit-text-stroke:2px #17213c;text-shadow:3px 3px 0 #17213c,0 0 28px #ffc84199}
 #combo-burst small{display:block;margin:12px 0;font:900 clamp(10px,1.4vw,18px)/1.2 system-ui;letter-spacing:.18em;color:#fff4ca;text-shadow:0 2px 4px #000}
 #combo-spectacle[data-tier="3"],#combo-spectacle[data-tier="4"],#combo-spectacle[data-tier="5"],#combo-spectacle[data-tier="6"]{color:#a7fff1}
 #combo-spectacle[data-kind="goal"]{color:#fff5b0}
 .combo-led{position:absolute;width:9px;height:28px;background:currentColor;border-radius:4px;box-shadow:0 0 15px currentColor;opacity:.18}
 #combo-spectacle[data-kind="goal"] #combo-burst{background:linear-gradient(100deg,transparent,#17213cbb,transparent);border-block:2px solid #ffe277;padding:16px 0}
 @media(max-width:650px){#combo-burst{top:19%;right:3%;width:65vw}#combo-burst strong{font-size:clamp(60px,15vw,96px)}.combo-led{width:5px;height:18px}}
 @media(prefers-reduced-motion:reduce){#combo-burst{filter:none}.combo-led{box-shadow:none}}
 `;document.head.append(style);
 const spectacle=document.createElement('div');spectacle.id='combo-spectacle';spectacle.hidden=true;spectacle.setAttribute('aria-hidden','true');
 spectacle.innerHTML='<div id="combo-burst"><small id="combo-call"></small><strong id="combo-mult"></strong><small id="combo-sub"></small></div>';
 const leds=Array.from({length:24},(_,i)=>{const led=document.createElement('i');led.className='combo-led';led.style.cssText=`${i<12?'left':'right'}:5px;top:${8+(i%12)*7.2}%`;spectacle.append(led);return led;});document.body.append(spectacle);
 let waypointCount=0,seenWaypoints=new Set();
 let pending=null,cooldown=0,spectacleTime=0,shownMultiplier=1,animations=[],lastUpdate=performance.now();
 function setNumber(text){
  const number=$('combo-mult');number.textContent=text;const size=Math.min(144,760/Math.max(5,text.length));number.style.fontSize=`clamp(${Math.min(64,size*.55)}px,${size/10}vw,${size}px)`;
 }
 function clearAnimations(){for(const a of animations)a.cancel();animations=[];}
 function celebrate(mult,kind,label,audible=true){
  clearAnimations();const waypoint=kind==='waypoint',goal=kind==='goal'||kind==='destination',tier=Math.min(6,Math.max(0,Math.floor(Math.log2(Math.max(1,mult))))+(waypoint?1:0));
  spectacle.dataset.tier=tier;spectacle.dataset.kind=goal?'goal':kind;spectacle.hidden=false;spectacleTime=goal?2.5:waypoint?1.8:1.45;cooldown=goal?1.6:waypoint?1.2:.85;
  $('combo-call').textContent=goal?'TARGET HIT / 大当たり':tier>=4?'UNSTOPPABLE':tier>=2?'MULTIPLIER FEVER':'CHAIN RISING';
  setNumber(`×${mult.toFixed(2)}`);
  $('combo-sub').textContent=goal?'25% BANKED · NOW LAND IT':`${label} · BANKS × TIME`;
  $('combo-burst').style.scale=String(1+Math.min(tier,4)*.045);
  if(!reduced()){
   animations.push($('combo-burst').animate([{transform:'translateY(-20px) scale(.82)',opacity:1},{transform:`translateY(12px) scale(${1.15+tier*.035})`,opacity:1,offset:.23},{transform:'translateY(-7px) scale(.96)',offset:.42},{transform:'translateY(0) scale(1)',opacity:1,offset:.65},{transform:'translateY(0) scale(1)',opacity:1}],{duration:goal?1100:740,easing:'ease-out',fill:'both'}));
   leds.forEach((led,i)=>animations.push(led.animate([{opacity:.12,transform:'scaleY(.6)'},{opacity:.95,transform:'scaleY(1.3)'},{opacity:.12,transform:'scaleY(.6)'}],{duration:Math.max(320,650-tier*45),delay:(i%12)*28,iterations:goal?4:2,fill:'none'})));
  }
  if(waypoint){$('combo-call').textContent='WAYPOINT CHAIN / 連鎖';setNumber(`×${format(mult)}`);$('combo-sub').textContent=`${label} · MULTIPLIER EARNED`;}
  if(audible)sound.cue(kind==='destination'?'destination':waypoint?'waypoint':goal?'goal':'bank',{multiplier:mult});
 }

 let current=null,display=10000,bankCount=0,tagged=false,lastAttempt='',flash=0,trickTime=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function pop(text,kind='bank'){
  $('combo-trick').textContent=text;hud.dataset.cue=kind;flash=.65;trickTime=2.4;
  if(!reduced()){$('combo-total').getAnimations().forEach(a=>a.cancel());$('combo-total').animate([{transform:'scale(1.16) rotate(-2deg)'},{transform:'scale(1) rotate(-2deg)'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});}
 }
 return {
  reset(){waypointCount=0;seenWaypoints.clear();lastUpdate=performance.now();pending=null;cooldown=0;spectacleTime=0;shownMultiplier=1;clearAnimations();spectacle.hidden=true;current=null;bankCount=0;tagged=false;display=10000;flash=0;trickTime=0;hud.hidden=true;hud.dataset.cue='';},
  accept(score,attempt){
   if(!score||!['combo-v4','combo-v5','waypoint-v1'].includes(score.version))return;
   if(attempt!==lastAttempt){this.reset();lastAttempt=attempt;}
   const waypoint=score.version==='waypoint-v1',rewound=waypoint&&score.waypointCount<waypointCount;
   if(waypoint&&(!current||rewound))display=score.total;
   if(rewound){flash=0;trickTime=0;hud.dataset.cue='';pending=null;clearAnimations();spectacleTime=0;cooldown=0;spectacle.hidden=true;shownMultiplier=score.bankMultiplier*score.timeMultiplier;bankCount=score.styleBanks;tagged=score.destinationReached;}
   current=score;const newBank=score.styleBanks>bankCount;
   if(score.styleBanks>bankCount){bankCount=score.styleBanks;pop(`${score.lastBank||'CLEAN BANK'}  ×${score.bankMultiplier.toFixed(2)}`);}
   const mult=score.bankMultiplier*score.timeMultiplier;
   // Authoritative factors only; coalesce streaming time updates into readable jumps.
   if(Number.isFinite(mult)&&mult>shownMultiplier&&((mult-shownMultiplier)>=Math.max(.25,shownMultiplier*.12)||newBank)){
    if(pending?.kind!=='waypoint'&&!rewound)pending={mult,label:newBank?(score.lastBank||'CLEAN BANK'):'AIR TIME',banks:score.styleBanks};
   }
   if(waypoint){
    const ids=score.waypointIds||score.waypointHits?.map(hit=>hit.waypointId)||[],fresh=ids.some(id=>!seenWaypoints.has(id));
    for(const id of ids)seenWaypoints.add(id);
    if(!rewound&&fresh&&score.waypointCount>waypointCount){
     // Native multiplier describes the NEXT award; the hit just earned half of it.
     const earned=score.waypointMultiplier/2;
     if(Number.isFinite(earned)&&earned>=1)pending={kind:'waypoint',mult:earned,label:`TARGET ${score.waypointCount}`,combined:mult};
     pop(`WAYPOINT ${score.waypointCount} · ×${format(earned)} EARNED`);
    }
    waypointCount=score.waypointCount;
    if(score.destinationReached&&!tagged){tagged=true;pop(`DESTINATION +${format(score.destinationBonus)}`,'goal');pending=null;celebrate(Math.max(1,score.waypointMultiplier/2),'destination','');setNumber(`+${format(score.destinationBonus)}`);$('combo-call').textContent='DESTINATION BONUS';$('combo-sub').textContent='EXTRA POINTS · WAYPOINTS KEPT';}
   }
   if(!waypoint&&score.goalVisited&&!tagged){tagged=true;pop('TARGET HIT!  25% BANKED', 'goal');pending=null;shownMultiplier=mult;celebrate(mult,'goal','TARGET HIT');}

  },
  result(result){if(result.breakdown)this.accept(result.breakdown,result.attempt);
   if(current?.version==='waypoint-v1'){
    pending=null;
    if(['forfeit','route-missed'].includes(result.breakdown?.outcome)||!(current.total>0)){clearAnimations();spectacleTime=0;spectacle.hidden=true;return;}
    if(current.waypointCount||current.destinationReached){celebrate(Math.max(1,current.waypointMultiplier/2),'goal','',false);$('combo-call').textContent=current.destinationReached?'CHAIN + DESTINATION':'WAYPOINT POINTS BANKED';setNumber(format(current.total));$('combo-sub').textContent=current.destinationReached?`INCLUDES +${format(current.destinationBonus)} DESTINATION BONUS`:'POINTS KEPT · DESTINATION IS EXTRA';}
    return;
   }
   if(current&&['perfect','tagged'].includes(result.breakdown?.outcome)){
    celebrate(current.bankMultiplier*current.timeMultiplier,'goal','',false);
    $('combo-call').textContent=result.breakdown.outcome==='perfect'?'JACKPOT / 大当たり':'COMBO BANKED';setNumber(format(current.total));$('combo-sub').textContent='POINTS · LINE COMPLETE';
   }
  },
  update(dt,phase,mode){
   // Match WebAudio/WAAPI wall time even when the game clamps its simulation dt.
   const now=performance.now(),elapsed=Math.max(0,(now-lastUpdate)/1000);lastUpdate=now;
   hud.hidden=!current||!['play','replay'].includes(mode)||phase!=='Flight';
   cooldown=Math.max(0,cooldown-elapsed);spectacleTime=Math.max(0,spectacleTime-elapsed);
   const visible=['play','replay'].includes(mode)&&!!current;
   if(pending&&!cooldown&&visible&&phase==='Flight'){const event=pending;pending=null;shownMultiplier=event.combined??event.mult;celebrate(event.mult,event.kind||'bank',event.label);}
   spectacle.hidden=!visible||spectacleTime===0;
   if(spectacle.hidden&&animations.length)clearAnimations();
   if(!current)return;
   const waypoint=current.version==='waypoint-v1',value=waypoint?current.total:current.potential;
   hud.querySelector('.combo-heading span').textContent=waypoint?'WAYPOINT CHAIN / 連鎖':'LIVE COMBO / コンボ';
   display=reduced()?value:display+(value-display)*(1-Math.exp(-dt*18));
   $('combo-total').textContent=format(display);
   $('combo-banks').textContent=`×${current.bankMultiplier.toFixed(2)} BANKS · ${current.styleBanks}`;
   $('combo-time').textContent=`×${current.timeMultiplier.toFixed(2)} TIME`;
   $('combo-accuracy').textContent=`${Math.round((current.landingMultiplier||0)*100)}% LANDING`;
   $('combo-cash').textContent=`${format(current.total)} PTS IF IT STOPS HERE`;
   $('combo-status').textContent=tagged?'TARGET TAGGED · LAND IT':current.landingMultiplier>=.99?'IN THE BULLSEYE':current.styleBanks>=5?'MONSTER LINE':current.styleBanks>=2?'KEEP IT GOING':'BUILD YOUR LINE';
   if(waypoint){
    $('combo-banks').textContent=`${current.waypointCount} TARGETS · NEXT ×${format(current.waypointMultiplier)}`;
    $('combo-time').textContent=`×${current.bankMultiplier.toFixed(2)} BANK · ×${current.timeMultiplier.toFixed(2)} TIME`;
    $('combo-accuracy').textContent=current.destinationReached?`+${format(current.destinationBonus)} DESTINATION`:'DESTINATION OPTIONAL';
    $('combo-cash').textContent=`${format(current.total)} PTS BANKED`;
    $('combo-status').textContent=current.destinationReached?'BONUS BANKED':current.waypointCount?'POINTS ARE YOURS':'HIT A WAYPOINT';
   }
   hud.classList.toggle('on-target',waypoint?current.destinationReached:current.landingMultiplier>=.99);
   flash=Math.max(0,flash-elapsed);trickTime=Math.max(0,trickTime-elapsed);if(!flash)hud.dataset.cue='';$('combo-trick').style.opacity=trickTime?1:0;
  },
  get score(){return current;},get goalFlash(){return tagged?flash:0;}
 };
}
