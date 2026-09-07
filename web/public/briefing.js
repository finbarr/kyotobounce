import * as THREE from 'three';
const $=id=>document.getElementById(id),v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function challengeBriefing({renderer,onStart,onOpen,isReady}){
 const host=document.createElement('section');host.id='briefing';host.hidden=true;host.setAttribute('aria-label','Challenge overview');
 host.innerHTML=`<div class="briefing-heading"><span class="eyebrow">STAGE PREVIEW / コース</span><h2 id="briefing-name"></h2><p>Find your line through Kyoto Station.</p><button id="briefing-back">← STAGE SELECT <kbd>ESC</kbd></button></div><div class="map-label start-label" id="map-start"><b>01</b><span>THROW FROM HERE<small id="map-start-radius"></small></span></div><div class="map-label goal-label" id="map-goal"><b>◎</b><span>LAND HERE<small id="map-goal-radius"></small></span></div><div class="briefing-bottom"><div class="briefing-facts"><span id="briefing-distance"></span><p id="briefing-rule"></p><p class="map-key"><i></i> Stay inside the blue start circle.<br><i></i> Settle the ball inside the gold target.</p></div><div class="legacy-points">LEGACY RULES<br><b>1,000</b> for settling inside<br>+100 per distinct surface</div><div class="briefing-points"><span>BASE SCORE <b>10,000 × COMBO</b></span><span>EACH NEW BANK <b>×1.75</b></span><span>BULLSEYE LANDING <b>KEEP 100%</b></span><small>Build banks × time. Outer rings keep 75 / 50 / 25%.</small></div><button id="briefing-play" class="primary">LET’S BOUNCE <span>▶</span><small>SPACE TO START</small></button></div><div class="cutaway-note">STATION CUTAWAY · START & TARGET TO SCALE</div>`;
 document.body.append(host);
 let active=false,transition=0,challenge,eye=new THREE.Vector3(),target=new THREE.Vector3(),lastEye=new THREE.Vector3(),lastQ=new THREE.Quaternion();
 const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),5);
 function open(c){
  if(!c)return;onOpen();challenge=c;active=true;transition=0;host.hidden=false;document.body.classList.add('is-briefing');
  $('briefing-name').textContent=c.name;
  $('map-start-radius').textContent=`${c.start.radius.toFixed(2)} m movement radius`;
  $('map-goal-radius').textContent=`${c.goal.radius.toFixed(2)} m target radius`;
  const length=v(c.start.center).distanceTo(v(c.goal.center)),rise=c.goal.center.y-c.start.center.y;
  $('briefing-distance').textContent=`${length.toFixed(1)} m TO TARGET${Math.abs(rise)>.1?` / ${rise>0?'+':''}${rise.toFixed(1)} m ELEVATION`:''}`;
  $('briefing-rule').textContent=c.requiredSurface?'SPECIAL ROUTE · Touch the moving escalator before scoring.':'ONE BALL. FIND YOUR ANGLE.';
  const legacy=c.scoring==='distinct-v1';host.classList.toggle('legacy-scoring',legacy);
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
 return {open,start,get active(){return active;},get blocked(){return active||transition>0;},get challenge(){return challenge;},
  update(camera,dt){
   if(active){
    $('briefing-play').disabled=!isReady();
    const a=v(challenge.start.center),b=v(challenge.goal.center);target.copy(a).lerp(b,.5);
    // Lay the start-to-goal vector across the screen, with an elevated oblique
    // camera. This keeps both radii legible even for vertical challenges.
    const span=b.clone().sub(a),side=new THREE.Vector3(-span.z,0,span.x).normalize();if(side.lengthSq()<.1)side.set(0,0,1);
    const halfWidth=span.length()*.5+Math.max(challenge.start.radius,challenge.goal.radius+THREE.MathUtils.clamp(span.length()*.35,3,12))+2;
    const range=Math.max(14,halfWidth/Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/Math.min(camera.aspect*.67,.85));
    eye.copy(target).addScaledVector(side,range*.47).add(new THREE.Vector3(0,range*.88,0));
    camera.position.copy(eye);camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld();
    clip.constant=Math.max(a.y,b.y)+2.6;renderer.clippingPlanes=[clip];
    placeLabel('map-start',a,camera);placeLabel('map-goal',b,camera);lastEye.copy(camera.position);lastQ.copy(camera.quaternion);return true;
   }
   if(transition>0){
    transition=Math.max(0,transition-dt/(matchMedia('(prefers-reduced-motion: reduce)').matches?.01:.7));const blend=transition*transition*(3-2*transition);
    camera.position.lerp(lastEye,blend);camera.quaternion.slerp(lastQ,blend);camera.updateMatrixWorld();return true;
   }
   return false;
  }
 };
}
