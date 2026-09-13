import {collectedIds} from './waypoint-score.js';

// One slot per actual target. Repeated score frames do not rebuild the card.
export function waypointCard(host,{document=globalThis.document,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 const heading=document.createElement('div');heading.className='waypoint-card-heading';
 const title=document.createElement('span');title.textContent='WAYPOINT CARD';
 const count=document.createElement('b');heading.append(title,count);
 const slots=document.createElement('ol');slots.className='waypoint-punches';slots.setAttribute('aria-label','Waypoints');
 host.append(heading,slots);
 let key='',nodes=[],previous=new Set();
 return {
  update(score,course,silent=false){
   const targets=course?.scoring==='waypoint-v3'?course.waypoints||[]:[];
   host.hidden=!targets.length;
   const nextKey=JSON.stringify(targets.map(w=>[w.id,w.label]));
   if(key!==nextKey){
    key=nextKey;previous=new Set();
    nodes=targets.map((target,i)=>{
     const slot=document.createElement('li');slot.className='waypoint-punch';slot.dataset.waypoint=target.id;
     const paper=document.createElement('span');paper.textContent=String(i+1).padStart(2,'0');paper.setAttribute('aria-hidden','true');slot.append(paper);
     slot.setAttribute('aria-label',`Waypoint ${i+1}${target.label?': '+target.label:''}, remaining`);
     return slot;
    });slots.replaceChildren(...nodes);
   }
   const ids=collectedIds(score);let hitCount=0;
   targets.forEach((target,i)=>{
    const hit=ids.has(target.id),slot=nodes[i];if(hit)hitCount++;
    if(slot.classList.contains('punched')===hit)return;
    slot.classList.toggle('punched',hit);
    slot.setAttribute('aria-label',`Waypoint ${i+1}${target.label?': '+target.label:''}, ${hit?'collected':'remaining'}`);
    const paper=slot.children[0];paper.getAnimations().forEach(a=>a.cancel());
    if(hit&&!previous.has(target.id)&&!silent&&!reduced())paper.animate([
     {transform:'scale(1)',opacity:1},{transform:'scale(.78)',opacity:1,offset:.18},
     {transform:`translate(${i%2?12:-12}px,-26px) rotate(${i%2?35:-35}deg) scale(1.15)`,opacity:0}
    ],{duration:440,easing:'ease-out'});
   });
   const label=`${hitCount} / ${targets.length}`;if(count.textContent!==label)count.textContent=label;
   host.classList.toggle('complete',targets.length>0&&hitCount===targets.length);previous=ids;
  },
  reset(){previous=new Set();key='';nodes.forEach(slot=>slot.children[0].getAnimations().forEach(a=>a.cancel()));nodes=[];slots.replaceChildren();host.hidden=true;}
 };
}
