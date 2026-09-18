import {TouchInput} from './touch-input.js';
const $=id=>document.getElementById(id);
export function mobileControls({canvas,look,zoom,tap,charge,release,cancel,fly,speed,recall}){
 const host=document.createElement('div');host.id='mobile-ui';host.innerHTML=`<div id="mobile-stage"></div><nav id="mobile-tools" aria-label="Game panels"><button id="mobile-levels" aria-expanded="false" aria-controls="competition">Levels</button><button id="mobile-settings" aria-expanded="false" aria-controls="throw-panel">Shot setup</button><button id="mobile-scout" aria-pressed="false">Scout</button></nav><button id="mobile-close" hidden>Back to game ×</button><div id="mobile-controls" hidden><p id="mobile-hint">Drag to aim · Hold THROW, release to shoot</p><div id="mobile-move" role="group" aria-label="Drag to move"><span>MOVE</span><i id="mobile-stick"></i><b aria-hidden="true">＋</b></div><div id="mobile-actions"><button id="mobile-throw">HOLD<br><strong>THROW</strong></button><button id="mobile-cancel" hidden>Cancel shot</button><button id="mobile-speed" aria-pressed="false" hidden>2× speed</button><button id="mobile-recall" hidden>Recall ball</button><div id="mobile-height" hidden><button id="mobile-up" aria-label="Fly up">↑ Up</button><button id="mobile-down" aria-label="Fly down">↓ Down</button></div><button id="mobile-boost" aria-pressed="false" hidden>Fly faster</button></div></div>`;document.body.append(host);
 const coarse=matchMedia('(pointer:coarse)'),narrow=matchMedia('(max-width:900px)');let active=false,menu='',state={},lastMode='',boost=false,viewport=null,resultTop=Infinity;
 const movement={x:0,z:0,y:0,fast:false};
 const input=new TouchInput({look,zoom,tap,charge,release,cancel,move:value=>{Object.assign(movement,value);movement.fast=boost||Math.hypot(value.x,value.z)>.93&&!state.fly;$('mobile-stick').style.transform=`translate(${value.x*38}px,${-value.z*38}px)`;}});
 const canControl=()=>active&&state.ready&&!state.blocked&&!menu;
 function panel(value){if(value===menu)return;input.reset();cancel();menu=value;document.body.dataset.mobilePanel=menu;$('mobile-close').hidden=!menu;$('mobile-levels').setAttribute('aria-expanded',String(menu==='levels'));$('mobile-settings').setAttribute('aria-expanded',String(menu==='settings'));if(menu)(menu==='levels'?$('competition'):$('throw-panel')).scrollTop=0;else canvas.focus({preventScroll:true});}
 function resize(){const next=coarse.matches||narrow.matches;if(next!==active){input.reset();cancel();active=next;document.body.classList.toggle('mobile-ui',active);if(!active)panel('');}host.hidden=!active;}
 window.addEventListener('orientationchange',()=>{input.reset();cancel();});
 coarse.addEventListener('change',resize);narrow.addEventListener('change',resize);resize();
 const observer=new ResizeObserver(()=>{const r=$('mobile-stage').getBoundingClientRect();viewport=r.width&&r.height?{x:r.x,y:r.y,width:r.width,height:r.height}:null;const result=$('result-card').getBoundingClientRect();resultTop=result.height?result.y:Infinity;});observer.observe($('mobile-stage'));observer.observe($('result-card'));
 function bind(el,area){
  el.addEventListener('pointerdown',e=>{if(!canControl()||e.button!==0||el.disabled)return;e.preventDefault();if(input.down(area,e.pointerId,e.clientX,e.clientY,el.getBoundingClientRect()))el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(input.pointers.has(e.pointerId)){e.preventDefault();input.move(e.pointerId,e.clientX,e.clientY);}});
  el.addEventListener('pointerup',e=>{if(input.pointers.has(e.pointerId)){e.preventDefault();input.up(e.pointerId);}});
  for(const type of ['pointercancel','lostpointercapture'])el.addEventListener(type,e=>input.up(e.pointerId,true));
 }
 bind(canvas,'look');bind($('mobile-move'),'move');bind($('mobile-throw'),'throw');bind($('mobile-up'),'up');bind($('mobile-down'),'down');
 $('mobile-levels').onclick=()=>panel(menu==='levels'?'':'levels');$('mobile-settings').onclick=()=>panel(menu==='settings'?'':'settings');$('mobile-close').onclick=()=>panel('');
 $('mobile-scout').onclick=()=>{panel('');fly();};$('mobile-cancel').onclick=()=>{input.reset();cancel();};$('mobile-speed').onclick=speed;$('mobile-recall').onclick=recall;
 $('mobile-boost').onclick=()=>{boost=!boost;movement.fast=boost;$('mobile-boost').setAttribute('aria-pressed',String(boost));};
 for(const id of ['fly-start','fly-finish','launch-design-ball','design-back','close-editor','show-overview','use-hint'])$(id)?.addEventListener('click',()=>{if(active)panel('');});
 document.addEventListener('keydown',e=>{if(active&&menu&&e.code==='Escape'){e.preventDefault();panel('');}});
 return {
  get active(){return active;},get movement(){return movement;},get menu(){return menu;},viewport:()=>viewport&&state.resultVisible?{...viewport,height:Math.max(40,Math.min(viewport.height,resultTop-viewport.y-12))}:viewport,
  owns:element=>host.contains(element)||$('mobile-controls').contains(element),
  reset(){input.reset();boost=false;movement.fast=false;$('mobile-boost').setAttribute('aria-pressed','false');},close:()=>panel(''),openLevels:()=>panel('levels'),
  update(next){
   state=next;if(!active)return;
   if(state.mode==='replay'){
    const help=state.fly?'Drag to look · Stick to fly · Up / Down for height':'Drag to orbit · Pinch to zoom · Tap 2× for faster playback';
    if($('replay-status').textContent!==help)$('replay-status').textContent=help;
   }
   if(state.mode!==lastMode){if(state.mode==='replay')$('share-replay').textContent='Share ↗';if(state.mode==='editor')panel('levels');else panel('');lastMode=state.mode;}
   if(state.blocked&&menu)panel('');
   document.body.classList.toggle('mobile-blocked',!!state.blocked);document.body.classList.toggle('mobile-flight',['Release','Flight'].includes(state.phase));
   const playing=['play','design'].includes(state.mode),flying=state.fly;
   $('mobile-tools').hidden=state.mode==='replay'||state.blocked;$('mobile-levels').textContent=state.mode==='editor'?'Review':state.mode==='design'?'Design ball':'Levels';$('mobile-settings').disabled=!playing||['Release','Flight'].includes(state.phase)||state.phase==='Result'&&state.resultVisible;$('mobile-scout').disabled=state.mode==='editor'||['Charging','Release','Flight'].includes(state.phase);$('mobile-scout').setAttribute('aria-pressed',String(flying));$('mobile-scout').textContent=state.mode==='editor'?'Flying':flying?'Return':'Scout';
   const controls=$('mobile-controls'),parent=state.mode==='replay'?$('replay-stage'):host;if(controls.parentElement!==parent)parent.append(controls);
   controls.hidden=!!menu||state.blocked||!state.ready||state.mode==='replay'&&!flying||state.phase==='Result'&&state.resultVisible&&!flying;
   $('mobile-move').hidden=!flying&&['Release','Flight','Result'].includes(state.phase);
   $('mobile-throw').hidden=flying||!playing||['Release','Flight'].includes(state.phase)||state.phase==='Result'&&state.resultVisible;$('mobile-throw').disabled=!state.ready;
   const chargeLabel=state.charging?'RELEASE<br><strong>THROW</strong>':'HOLD<br><strong>THROW</strong>';if($('mobile-throw').innerHTML!==chargeLabel)$('mobile-throw').innerHTML=chargeLabel;
   $('mobile-throw').setAttribute('aria-label',state.charging?'Release to throw':'Hold to charge, release to throw');$('mobile-throw').dataset.charging=String(state.charging);$('mobile-cancel').hidden=!state.charging;
   $('mobile-recall').hidden=flying||!['Release','Flight'].includes(state.phase)||!playing;$('mobile-speed').hidden=flying||state.phase!=='Flight'||!playing;$('mobile-speed').setAttribute('aria-pressed',String(state.fastForward));
   $('mobile-height').hidden=!flying;$('mobile-boost').hidden=!flying;
   const hint=flying?'Drag to look · Stick to fly · Up / Down for height':state.phase==='Flight'?(state.mode==='design'?'Recording design ball · Drag to orbit · 2× for faster playback':'Drag to orbit · Pinch to zoom'):state.mode==='editor'?'Review the recorded route, name it and save':'Drag to aim · Hold THROW, release to shoot';if($('mobile-hint').textContent!==hint)$('mobile-hint').textContent=hint;
  }
 };
}
