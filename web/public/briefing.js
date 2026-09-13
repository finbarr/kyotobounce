import * as THREE from 'three';
import {routeBounds,routeTargets} from './waypoint-targets.js';
const $=id=>document.getElementById(id),v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function challengeBriefing({renderer,onStart,onOpen,isReady}){
 const host=document.createElement('section');host.id='briefing';host.hidden=true;host.setAttribute('aria-label','Challenge overview');
 host.innerHTML=`<svg id="briefing-route" aria-hidden="true"></svg><div class="briefing-heading"><span class="eyebrow">STAGE PREVIEW / コース</span><h2 id="briefing-name"></h2><p id="briefing-description">Find your line through Kyoto Station.</p><button id="briefing-back">← STAGE SELECT <kbd>ESC</kbd></button></div><div class="map-label start-label" id="map-start"><b>01</b><span>THROW FROM HERE<small id="map-start-radius"></small></span></div><div class="map-label goal-label" id="map-goal"><b>◎</b><span><strong id="map-goal-name">LAND HERE</strong><small id="map-goal-radius"></small></span></div><div class="briefing-bottom"><div class="briefing-facts"><span id="briefing-distance"></span><p id="briefing-rule"></p><p class="map-key"><i></i> Stay inside the blue start circle.<br><i></i> Settle the ball inside the gold target.</p></div><div class="briefing-points"><span>BASE SCORE <b>10,000 × COMBO</b></span><span>EACH NEW BANK <b>×1.75</b></span><span>BULLSEYE LANDING <b>KEEP 100%</b></span><small>Link distinct banks. Outer rings keep 75 / 50 / 25%. Add 100 PTS / SEC while moving.</small></div><button id="briefing-play" class="primary">LET’S BOUNCE <span>▶</span><small>SPACE TO START</small></button></div><div class="cutaway-note">STATION CUTAWAY · TARGET GUIDE</div>`;
 document.body.append(host);
 let active=false,transition=0,challenge,eye=new THREE.Vector3(),target=new THREE.Vector3(),lastEye=new THREE.Vector3(),lastQ=new THREE.Quaternion();
 const routeGuide=$('briefing-route'),svgNS='http://www.w3.org/2000/svg';let guidePoints=[],guideLine;
 const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),5);
 function open(c){
  if(!c)return;onOpen();challenge=c;active=true;transition=0;host.hidden=false;document.body.classList.add('is-briefing');
  routeGuide.replaceChildren();guidePoints=[];guideLine=null;
  if(c.waypoints?.length){
   guideLine=document.createElementNS(svgNS,'polyline');guideLine.setAttribute('class','route-guide-line');routeGuide.append(guideLine);
   for(const [i,w]of c.waypoints.entries()){const group=document.createElementNS(svgNS,'g'),leader=document.createElementNS(svgNS,'line'),circle=document.createElementNS(svgNS,'circle'),label=document.createElementNS(svgNS,'text');circle.setAttribute('r','10');label.textContent=String(i+1);group.append(leader,circle,label);routeGuide.append(group);guidePoints.push({point:v(w.center),circle,label,leader});}
  }
  $('briefing-name').textContent=c.campaign?`${String(c.order+1).padStart(2,'0')} / ${c.name}`:c.name;
  $('briefing-description').textContent=c.campaign?`${c.campaign.chapterTitle} · ${c.campaign.difficulty}. ${c.campaign.brief}`:'Find your line through Kyoto Station.';
  $('map-start-radius').textContent=`${c.start.radius.toFixed(2)} m movement radius`;
  $('map-goal').hidden=!c.goal;$('map-goal-name').textContent=c.scoring==='waypoint-v3'?'OPTIONAL BONUS':'LAND HERE';$('map-goal-radius').textContent=c.goal?`${c.goal.radius.toFixed(2)} m ${c.scoring==='waypoint-v3'?'bonus':'target'} radius`:'';
  const end=c.goal||[...(c.waypoints||[])].sort((a,b)=>v(b.center).distanceTo(v(c.start.center))-v(a.center).distanceTo(v(c.start.center)))[0]||c.start,length=v(c.start.center).distanceTo(v(end.center)),rise=end.center.y-c.start.center.y;
  $('briefing-distance').textContent=(c.campaign?`${c.campaign.distance} m SUGGESTED ROUTE / `:'')+`${length.toFixed(1)} m TO ${c.goal?'DESTINATION':'FARTHEST WAYPOINT'}${Math.abs(rise)>.1?` / ${rise>0?'+':''}${rise.toFixed(1)} m ELEVATION`:''}`;
  $('briefing-rule').textContent=c.requiredSurface?'SPECIAL ROUTE · Touch the moving escalator before scoring.':'ONE BALL. FIND YOUR ANGLE.';
  const waypoint=c.scoring==='waypoint-v3';host.classList.toggle('waypoint-briefing',waypoint);
  if(waypoint){$('briefing-rule').textContent=`${c.waypoints?.length||0} OPTIONAL WAYPOINTS · ANY ORDER · ONCE PER SHOT${c.requiredSurface?' · REQUIRED ROUTE CONTACT':''}`;host.querySelector('.map-key').innerHTML='<i></i> Throw from the blue start.<br><i></i> Purple numbered patches collect on contact.<br><i></i> Gold is an optional bonus. A miss keeps waypoint points.';host.querySelector('.briefing-points').innerHTML='<span>FIRST WAYPOINT <b>10,000 PTS</b></span><span>EACH NEXT AWARD <b>DOUBLES</b></span><span>DESTINATION <b>OPTIONAL BONUS</b></span><small>Banks multiply target points. Movement adds 100 PTS / SEC separately. Full rest locks the score.</small>';}
  else{host.querySelector('.map-key').innerHTML='<i></i> Stay inside the blue start circle.<br><i></i> Settle inside the gold target.';host.querySelector('.briefing-points').innerHTML='<span>BASE SCORE <b>10,000 × COMBO</b></span><span>EACH NEW BANK <b>×1.75</b></span><span>BULLSEYE LANDING <b>KEEP 100%</b></span><small>Link distinct banks. Outer rings keep 75 / 50 / 25%. Add 100 PTS / SEC while moving.</small>';}
  $('briefing-play').disabled=!isReady();$('briefing-play').focus({preventScroll:true});
 }
 function start(capture=true){if(!active||!isReady())return;active=false;transition=1;host.hidden=true;document.body.classList.remove('is-briefing');renderer.clippingPlanes=[];onStart(capture);}
 $('briefing-play').onclick=()=>start();$('briefing-back').onclick=()=>start(false);
 function placeLabel(id,point,camera){
  const projected=point.clone().project(camera),el=$(id),x=(projected.x*.5+.5)*innerWidth;
  // Put labels on the outside of their circles so short custom courses remain
  // legible too, rather than placing two centered labels over each other.
  const left=THREE.MathUtils.clamp(id==='map-start'?x-el.offsetWidth-8:x+8,12,innerWidth-el.offsetWidth-12);
  el.style.left=`${left}px`;el.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;el.style.setProperty('--anchor-x',`${x-left}px`);
 }
 return {open,start,get target(){return target;},get active(){return active;},get blocked(){return active||transition>0;},get challenge(){return challenge;},
  update(camera,dt){
   if(active){
    $('briefing-play').disabled=!isReady();
    const a=v(challenge.start.center),b=v((challenge.goal||challenge.waypoints?.at(-1)||challenge.start).center),bounds=routeBounds(challenge);target.copy(bounds.center);
    // Lay the start-to-goal vector across the screen, with an elevated oblique
    // camera. This keeps both radii legible even for vertical challenges.
    const span=b.clone().sub(a),side=new THREE.Vector3(-span.z,0,span.x).normalize();if(side.lengthSq()<.1)side.set(0,0,1);
    const classic=['combo-v7'].includes(challenge.scoring);
    const halfWidth=bounds.size.length()*.5+(classic?THREE.MathUtils.clamp(span.length()*.35,3,12):0)+2;
    const range=Math.max(14,halfWidth/Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/Math.min(camera.aspect*.67,.85));
    eye.copy(target).addScaledVector(side,range*.47).add(new THREE.Vector3(0,range*.88,0));
    camera.position.copy(eye);camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld();
    // Cut just above the patches so indoor wall targets are not hidden by the roof.
    clip.constant=Math.max(...routeTargets(challenge).map(d=>d.center.y+d.radius*Math.sqrt(Math.max(0,1-(d.normal?.y??1)**2))))+.08;renderer.clippingPlanes=[clip];
    if(guideLine){
     routeGuide.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
     const project=p=>{const q=p.clone().project(camera);return {x:(q.x*.5+.5)*innerWidth,y:(-q.y*.5+.5)*innerHeight};};
     const route=[project(a),...guidePoints.map(g=>project(g.point)),...(challenge.goal?[project(v(challenge.goal.center))]:[])];
     guideLine.setAttribute('points',route.map(p=>`${p.x},${p.y}`).join(' '));
     const placed=[];for(const [i,g]of guidePoints.entries()){const p=route[i+1],x=p.x;let y=p.y-20;while(placed.some(q=>Math.hypot(q.x-x,q.y-y)<23))y-=24;placed.push({x,y});g.circle.setAttribute('cx',x);g.circle.setAttribute('cy',y);g.label.setAttribute('x',x);g.label.setAttribute('y',y);g.leader.setAttribute('x1',p.x);g.leader.setAttribute('y1',p.y);g.leader.setAttribute('x2',x);g.leader.setAttribute('y2',y);}
    }
    placeLabel('map-start',a,camera);if(challenge.goal)placeLabel('map-goal',v(challenge.goal.center),camera);lastEye.copy(camera.position);lastQ.copy(camera.quaternion);return true;
   }
   if(transition>0){
    transition=Math.max(0,transition-dt/(matchMedia('(prefers-reduced-motion: reduce)').matches?.01:.7));const blend=transition*transition*(3-2*transition);
    camera.position.lerp(lastEye,blend);camera.quaternion.slerp(lastQ,blend);camera.updateMatrixWorld();return true;
   }
   return false;
  }
 };
}
