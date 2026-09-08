const $=id=>document.getElementById(id);
const format=n=>Math.round(n).toLocaleString();
export function arcadeFeedback(sound){
 const hud=document.createElement('section');hud.id='combo-hud';hud.hidden=true;hud.setAttribute('aria-label','Live shot score');
 hud.innerHTML=`<div class="combo-heading"><span>LIVE COMBO / コンボ</span><b id="combo-status">BUILD YOUR LINE</b></div><div id="combo-total">10,000</div><div id="combo-factors"><span>10,000 BASE</span><b id="combo-banks">×1.00 BANKS</b><b id="combo-time">×1.00 TIME</b></div><div class="combo-landing"><span id="combo-accuracy">0% LANDING</span><strong id="combo-cash">0 PTS IF IT STOPS HERE</strong></div><div id="combo-trick" aria-live="polite"></div>`;
 document.body.append(hud);
 let current=null,display=10000,bankCount=0,tagged=false,lastAttempt='',flash=0,trickTime=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function pop(text,kind='bank'){
  $('combo-trick').textContent=text;hud.dataset.cue=kind;flash=.65;trickTime=2.4;
  if(!reduced()){$('combo-total').getAnimations().forEach(a=>a.cancel());$('combo-total').animate([{transform:'scale(1.16) rotate(-2deg)'},{transform:'scale(1) rotate(-2deg)'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});}
 }
 return {
  reset(){current=null;bankCount=0;tagged=false;display=10000;flash=0;trickTime=0;hud.hidden=true;hud.dataset.cue='';},
  accept(score,attempt){
   if(!score||!['combo-v4','combo-v5'].includes(score.version))return;
   if(attempt!==lastAttempt){this.reset();lastAttempt=attempt;}
   current=score;
   if(score.styleBanks>bankCount){bankCount=score.styleBanks;pop(`${score.lastBank||'CLEAN BANK'}  ×${score.bankMultiplier.toFixed(2)}`);sound.cue('bank',bankCount);}
   if(score.goalVisited&&!tagged){tagged=true;pop('TARGET HIT!  25% BANKED', 'goal');sound.cue('goal');}
  },
  result(result){if(result.breakdown)this.accept(result.breakdown,result.attempt);},
  update(dt,phase,mode){
   hud.hidden=!current||!['play','replay'].includes(mode)||phase!=='Flight';
   if(!current)return;
   display=reduced()?current.potential:display+(current.potential-display)*(1-Math.exp(-dt*18));
   $('combo-total').textContent=format(display);
   $('combo-banks').textContent=`×${current.bankMultiplier.toFixed(2)} BANKS · ${current.styleBanks}`;
   $('combo-time').textContent=`×${current.timeMultiplier.toFixed(2)} TIME`;
   $('combo-accuracy').textContent=`${Math.round(current.landingMultiplier*100)}% LANDING`;
   $('combo-cash').textContent=`${format(current.total)} PTS IF IT STOPS HERE`;
   $('combo-status').textContent=tagged?'TARGET TAGGED · LAND IT':current.landingMultiplier>=.99?'IN THE BULLSEYE':current.styleBanks>=5?'MONSTER LINE':current.styleBanks>=2?'KEEP IT GOING':'BUILD YOUR LINE';
   hud.classList.toggle('on-target',current.landingMultiplier>=.99);
   flash=Math.max(0,flash-dt);trickTime=Math.max(0,trickTime-dt);if(!flash)hud.dataset.cue='';$('combo-trick').style.opacity=trickTime?1:0;
  },
  get score(){return current;},get goalFlash(){return tagged?flash:0;}
 };
}
