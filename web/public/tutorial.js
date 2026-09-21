export const isTutorial=course=>course?.creator==='station'&&course.id==='kyoto-tutorial';

// Coaching observes ordinary gameplay. It never awards points, forces a throw,
// blocks a control, or treats a recalled shot as a completed tutorial.
export class TutorialGuide{
 course=null;step='move';dismissed=false;origin=null;
 enter(course,completed=false){
  const key=isTutorial(course)?`${course.id}:${course.revision}`:null;
  if(key===this.course)return;
  this.course=key;this.step='move';this.origin=null;this.dismissed=completed;
 }
 action(action){if(action==='restart'){this.dismissed=false;this.step='move';this.origin=null;}else if(action==='dismiss')this.dismissed=true;else if(action==='next'&&this.step==='move')this.step='aim';else if(action==='aim'&&['move','aim','retry'].includes(this.step))this.step='charge';}
 update({feet,phase,charging,result}){
  if(!this.course||this.dismissed)return;
  if(feet&&!this.origin)this.origin={...feet};
  if(this.step==='move'&&feet&&this.origin&&Math.hypot(feet.x-this.origin.x,feet.z-this.origin.z)>.4)this.step='aim';
  if(result&&phase==='Result'){this.step=result.success?'complete':'retry';return;}
  if(phase==='Flight'||phase==='Release')this.step='flight';
  else if(charging||phase==='Charging')this.step='charge';
  else if(phase==='Aim'&&['flight','retry','complete'].includes(this.step))this.step='charge';
 }
}

export function tutorialUI({onAim,onContinue}){
 const guide=new TutorialGuide(),host=document.createElement('aside');host.id='tutorial';host.hidden=true;host.setAttribute('aria-label','Level 0 tutorial');
 host.innerHTML='<div class="tutorial-top"><span>LEVEL 0 · TUTORIAL <b id="tutorial-step"></b></span><button id="tutorial-hide" aria-label="Hide tutorial tips">×</button></div><div role="status" aria-live="polite" aria-atomic="true"><h2 id="tutorial-title"></h2><p id="tutorial-copy"></p></div><button id="tutorial-action"></button>';
 document.body.append(host);
 const $=id=>document.getElementById(id);let last='',mobile=false;
 $('tutorial-hide').onclick=()=>{guide.action('dismiss');onContinue();};
 $('tutorial-action').onclick=()=>{if(guide.step==='move')guide.action('next');else{guide.action('aim');onAim();}onContinue();};
 const replay=document.createElement('button');replay.id='tutorial-restart';replay.textContent='Show tutorial tips';replay.hidden=true;document.getElementById('show-overview').after(replay);
 replay.onclick=()=>{guide.action('restart');onContinue();};
 return {
  guide,aim:()=>guide.action('aim'),
  update({course,completed,feet,phase,charging,result,blocked,mobile:touch}){
   guide.enter(course,completed);guide.update({feet,phase,charging,result});mobile=touch;
   replay.hidden=!isTutorial(course);
   const visible=!!guide.course&&!guide.dismissed&&!blocked&&phase!=='Result';host.hidden=!visible;document.body.classList.toggle('tutorial-active',visible);
   if(!visible)return;
   const step=guide.step,key=`${step}:${mobile}:${charging}`;if(key===last)return;last=key;host.dataset.step=step;host.scrollTop=0;
   const copy={
    move:['1 / 4','Find your line.',mobile?'Drag MOVE to walk. The checkered pad marks your start; you can throw anywhere.':'W A S D to walk. The checkered pad is a starting suggestion — you can throw from anywhere.','Next: aim →'],
    aim:['2 / 4','Aim for purple.',mobile?'Hit the purple patch. Drag the scene to aim, or use the hint below.':'Click the scene, then move the mouse to aim. Your ball must touch the purple waypoint. H sets the suggested aim.','Use suggested aim'],
    charge:['3 / 4',charging?'Release at white!':'A gentle throw.',mobile?'Hold THROW, then release at the white 2.8 m/s mark. More charge = more speed.':'Hold Space or the mouse button. Release near the white 2.8 m/s mark. More charge means more speed.','Reset suggested aim'],
    flight:['4 / 4','Watch your score grow.',mobile?'Purple targets double your multiplier. Let the ball settle to score. Tap 2× to speed up; Recall forfeits.':'Each purple waypoint doubles your target multiplier. Let the ball settle to bank your score. Hold Space for 2×; R recalls and forfeits this shot.',''],
   }[step];
   if(!copy)return;
   $('tutorial-step').textContent=copy[0];$('tutorial-title').textContent=copy[1];$('tutorial-copy').textContent=copy[2];$('tutorial-action').textContent=copy[3];$('tutorial-action').hidden=!copy[3]||charging;
  }
 };
}
