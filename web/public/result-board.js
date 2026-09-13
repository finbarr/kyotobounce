// Each attempt owns a row, including repeated scores from the same player.
// The server supplies both snapshots, including deterministic tie breakers.
export function resultBoard({host,watch,sound}){
 const panel=document.createElement('section');panel.id='result-leaderboard';panel.hidden=true;
 panel.innerHTML='<div class="board-heading"><span class="eyebrow">LEVEL TOP 10 / ランキング</span><b id="ranking-announcement" role="status"></b></div><ol aria-label="Level high scores"></ol><p class="board-footnote">Every shot can rank · select a score to watch</p>';
 host.append(panel);const list=panel.querySelector('ol'),announcement=panel.querySelector('[role=status]');let timers=[],animations=[],generation=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function clear(){generation++;timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];panel.hidden=true;list.replaceChildren();}
 function later(fn,ms){timers.push(setTimeout(fn,ms));}
 function animate(element,frames,options){if(!reduced())animations.push(element.animate(frames,{fill:'both',...options}));}
 function row(entry,rank,own){
  const li=document.createElement('li');li.dataset.attempt=entry.attempt;li.dataset.guest=entry.guest;li.dataset.rank=rank;li.classList.toggle('own-score',own);
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`${rank}. ${entry.name}, ${entry.score.toLocaleString()} points. Watch replay`);button.onclick=()=>watch(entry.attempt);
  const place=document.createElement('span');place.className='rank-place';place.textContent=rank<4?['','★ 1','◆ 2','✦ 3'][rank]:String(rank).padStart(2,'0');
  const name=document.createElement('span');name.className='rank-name';name.textContent=entry.name;
  const score=document.createElement('strong');score.textContent=entry.score.toLocaleString();button.append(place,name,score);li.append(button);return li;
 }
 function show(result){
  clear();const standings=result.standings;if(!standings)return;const {before,after,rank}=standings;
  const winner=rank&&rank<=10,own=after.find(e=>e.attempt===result.attempt)?.guest;
  const initial=winner?before:after;const token=generation;
  later(()=>{
   if(token!==generation)return;panel.hidden=false;panel.dataset.phase='reveal';
   announcement.textContent=winner?'MAKE ROOM.':after.length?'THE SCORES TO BEAT':'BE THE FIRST';
   initial.forEach((entry,i)=>{const li=row(entry,i+1,entry.guest===own);list.append(li);animate(li,[{opacity:0,transform:'translateY(-14px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,delay:i*35,easing:'ease-out'});});
   if(!winner)return;
   later(()=>{
    if(token!==generation)return;
    // Finish the reveal before measuring row positions for the insertion.
    animations.forEach(a=>a.finish());
    const old=new Map([...list.children].map(li=>[li.dataset.attempt,{li,top:li.getBoundingClientRect().top}]));
    const origin=list.getBoundingClientRect().top,removed=[...old].filter(([attempt])=>!after.some(e=>e.attempt===attempt));
    list.replaceChildren();panel.dataset.phase='insert';
    const newRows=after.map((entry,i)=>{const li=row(entry,i+1,entry.guest===own);list.append(li);return {entry,li};});
    // Measure only after all rows establish the final height of this bottom-aligned panel.
    for(const {entry,li}of newRows){
     const previous=old.get(entry.attempt),top=li.getBoundingClientRect().top;
     if(entry.attempt===result.attempt){li.classList.add('new-rank');animate(li,[{opacity:.2,transform:'translate(-70px,-30px) scale(1.1)'},{opacity:1,transform:'translate(0,0) scale(1.04)',offset:.72},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:620,easing:'cubic-bezier(.18,.8,.23,1)'});}
     else if(previous)animate(li,[{transform:`translateY(${previous.top-top}px)`},{transform:'translateY(6px)',offset:.75},{transform:'translateY(0)'}],{duration:600,easing:'cubic-bezier(.2,.75,.2,1)'});
     else animate(li,[{opacity:0},{opacity:1}],{duration:250});
    }
    if(!reduced())for(const [,oldRow]of removed){const ghost=oldRow.li;ghost.classList.add('rank-ejected');ghost.style.top=`${oldRow.top-origin}px`;ghost.setAttribute('aria-hidden','true');ghost.inert=true;list.append(ghost);animate(ghost,[{opacity:1,transform:'translate(0,0)'},{opacity:0,transform:'translate(90px,55px) rotate(8deg)'}],{duration:450,easing:'ease-in'});later(()=>ghost.remove(),500);}
    announcement.textContent=rank===1?'NEW NUMBER ONE!':rank<=3?`PODIUM! #${rank}`:result.records?.personalBest?`YOUR BEST · #${rank}`:`TOP TEN! #${rank}`;
    sound.cue('ranking',rank);later(()=>panel.dataset.phase='settled',650);
   },reduced()?0:Math.max(220,initial.length*35+220));
  },reduced()?0:900);
 }
 return {show,clear};
}
