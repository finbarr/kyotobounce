// One persistent board during aiming, flight, menus and results. Rows are shots,
// and ownership uses the stable guest ID, never a possibly duplicated name.
export function resultBoard({host,watch,sound,getGuestId=()=>null,share=()=>{}}){
 const panel=document.createElement('section');panel.id='result-leaderboard';panel.hidden=true;panel.setAttribute('aria-label','Level scoreboard');
 panel.innerHTML='<div class="board-heading"><span class="eyebrow">LEVEL TOP 10 / ランキング</span><b class="board-course"></b><button class="share-level">Copy level link ↗</button><b id="ranking-announcement" role="status"></b></div><ol aria-label="Level high scores"></ol><p class="board-empty">NO SCORES YET. Put your name on the board.</p><div class="own-placement" hidden><p>YOUR SHOT</p><ol aria-label="Your placement"></ol></div><p class="board-footnote">Every in-bounds shot can rank · select a score to watch</p>';
 host.append(panel);
 const list=panel.querySelector('ol'),announcement=panel.querySelector('[role=status]'),placement=panel.querySelector('.own-placement'),ownList=placement.querySelector('ol'),empty=panel.querySelector('.board-empty'),title=panel.querySelector('.board-course'),shareButton=panel.querySelector('.share-level');
 let timers=[],animations=[],generation=0,current=null,pending=null,revealing=false,lastShot=null;
 shareButton.onclick=()=>{if(current)share(current.challenge.id,shareButton);};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function cancelAnimation(){generation++;timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];revealing=false;pending=null;}
 function clear(){cancelAnimation();panel.hidden=true;current=null;lastShot=null;list.replaceChildren();placement.hidden=true;ownList.replaceChildren();}
 function later(fn,ms){timers.push(setTimeout(fn,ms));}
 function animate(element,frames,options){if(!reduced())animations.push(element.animate(frames,{fill:'both',...options}));}
 function row(entry,rank){
  const own=entry.guest===getGuestId(),li=document.createElement('li');li.dataset.attempt=entry.attempt;li.dataset.guest=entry.guest;li.dataset.rank=rank;li.classList.toggle('own-score',own);
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`${rank}. ${entry.name}${own?' (you)':''}, ${entry.score.toLocaleString()} points. Watch replay`);button.onclick=()=>watch(entry.attempt);
  const place=document.createElement('span');place.className='rank-place';place.textContent=rank<4?['','★ 1','◆ 2','✦ 3'][rank]:String(rank).padStart(2,'0');
  const name=document.createElement('span');name.className='rank-name';name.textContent=entry.name;
  const score=document.createElement('strong');score.textContent=entry.score.toLocaleString();button.append(place,name,score);li.append(button);return li;
 }
 function ownPlacement(personal){
  ownList.replaceChildren();const entry=lastShot?.rank>10?lastShot:personal?.rank>10?personal:null;
  placement.hidden=!entry;if(!entry)return;
  placement.querySelector('p').textContent=entry===lastShot?'YOUR SHOT':'YOUR BEST';ownList.start=entry.rank;ownList.append(row(entry,entry.rank));
 }
 function update(challenge,entries=[],personal=null){
  if(!challenge){clear();return;}
  const changed=current?.challenge.id!==challenge.id||current?.challenge.revision!==challenge.revision;
  if(revealing&&!changed){pending={challenge,entries,personal};return;}
  cancelAnimation();if(changed)lastShot=null;current={challenge,entries,personal};panel.hidden=false;panel.dataset.phase='settled';title.textContent=challenge.name;
  announcement.textContent='';announcement.hidden=true;list.replaceChildren(...entries.slice(0,10).map((e,i)=>row(e,i+1)));empty.hidden=entries.length>0;ownPlacement(personal);
 }
 function reset(){lastShot=null;if(current)update(current.challenge,current.entries,current.personal);}
 function show(result){
  const standings=result.standings;if(!standings||!result.challenge)return;
  const {before,after,rank}=standings;cancelAnimation();revealing=true;
  current={challenge:result.challenge,entries:after,personal:current?.personal||null};
  lastShot=rank?{attempt:result.attempt,guest:getGuestId(),name:result.playerName||'You',score:result.score,rank}:null;
  panel.hidden=false;panel.dataset.phase='reveal';title.textContent=result.challenge.name;announcement.hidden=false;
  const winner=rank&&rank<=10,initial=winner?before:after,token=generation;
  announcement.textContent=winner?'MAKE ROOM.':rank?`YOUR RANK · #${rank.toLocaleString()}`:after.length?'THE SCORES TO BEAT':'BE THE FIRST';
  list.replaceChildren(...initial.map((entry,i)=>row(entry,i+1)));empty.hidden=initial.length>0;ownPlacement(current.personal);
  function settled(){if(token!==generation)return;revealing=false;panel.dataset.phase='settled';if(pending){const next=pending;pending=null;const text=announcement.textContent;update(next.challenge,next.entries,next.personal);announcement.textContent=text;announcement.hidden=false;}}
  if(!winner){later(settled,300);return;}
  later(()=>{
   if(token!==generation)return;empty.hidden=true;
   const old=new Map([...list.children].map(li=>[li.dataset.attempt,{li,top:li.getBoundingClientRect().top}]));
   const origin=list.getBoundingClientRect().top,removed=[...old].filter(([attempt])=>!after.some(e=>e.attempt===attempt));
   list.replaceChildren();panel.dataset.phase='insert';
   const newRows=after.map((entry,i)=>{const li=row(entry,i+1);list.append(li);return {entry,li};});
   for(const {entry,li}of newRows){
    const previous=old.get(entry.attempt),top=li.getBoundingClientRect().top;
    if(entry.attempt===result.attempt){li.classList.add('new-rank');animate(li,[{opacity:.2,transform:'translate(-70px,-30px) scale(1.1)'},{opacity:1,transform:'translate(0,0) scale(1.04)',offset:.72},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:620,easing:'cubic-bezier(.18,.8,.23,1)'});}
    else if(previous)animate(li,[{transform:`translateY(${previous.top-top}px)`},{transform:'translateY(6px)',offset:.75},{transform:'translateY(0)'}],{duration:600,easing:'cubic-bezier(.2,.75,.2,1)'});
    else animate(li,[{opacity:0},{opacity:1}],{duration:250});
   }
   if(!reduced())for(const [,oldRow]of removed){const ghost=oldRow.li;ghost.classList.add('rank-ejected');ghost.style.top=`${oldRow.top-origin}px`;ghost.setAttribute('aria-hidden','true');ghost.inert=true;list.append(ghost);animate(ghost,[{opacity:1,transform:'translate(0,0)'},{opacity:0,transform:'translate(90px,55px) rotate(8deg)'}],{duration:450,easing:'ease-in'});later(()=>ghost.remove(),500);}
   announcement.textContent=rank===1?'NEW NUMBER ONE!':rank<=3?`PODIUM! #${rank}`:result.records?.personalBest?`YOUR BEST · #${rank}`:`TOP TEN! #${rank}`;
   sound.cue('ranking',rank);later(settled,650);
  },reduced()?0:350);
 }
 return {show,clear,update,reset};
}
