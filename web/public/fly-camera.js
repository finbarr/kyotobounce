import * as THREE from 'three';

export class FlyCamera {
 constructor(camera){this.camera=camera.clone();this.camera.rotation.order='YXZ';this.active=false;this.speed=18;}
 enter(source){this.camera.position.copy(source.position);this.camera.quaternion.copy(source.quaternion);this.camera.rotation.order='YXZ';this.camera.rotation.z=0;this.active=true;}
 leave(){this.active=false;}
 look(dx,dy){this.camera.rotation.y-=dx*.0025;this.camera.rotation.x=THREE.MathUtils.clamp(this.camera.rotation.x-dy*.0025,-Math.PI*.49,Math.PI*.49);}
 move(keys,dt){
  if(!this.active)return;
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
  const direction=forward.multiplyScalar(Number(keys.has('KeyW'))-Number(keys.has('KeyS'))).addScaledVector(right,Number(keys.has('KeyD'))-Number(keys.has('KeyA')));
  direction.y+=Number(keys.has('KeyE')||keys.has('Space'))-Number(keys.has('KeyQ')||keys.has('ControlLeft')||keys.has('ControlRight'));
  this.speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?60:keys.has('AltLeft')||keys.has('AltRight')?4:18;
  this.camera.position.addScaledVector(direction.normalize(),this.speed*Math.min(.1,Math.max(0,dt)));
  this.camera.position.clamp(new THREE.Vector3(-240,-8,-240),new THREE.Vector3(240,150,240));this.camera.updateMatrixWorld();
 }
 focus(target){const p=new THREE.Vector3(target.center.x,target.center.y,-target.center.z),n=target.normal?new THREE.Vector3(target.normal.x,target.normal.y,-target.normal.z):new THREE.Vector3(0,1,0);this.camera.position.copy(p).addScaledVector(n,Math.max(3,target.radius*4));if(n.y>.9)this.camera.position.z+=3;this.camera.lookAt(p);this.camera.rotation.z=0;this.camera.updateMatrixWorld();}
}

export function flyTargets(){
 const host=document.createElement('div');host.id='fly-targets';document.body.append(host);let current='',nodes=[];
 return {update(camera,course,active){
  host.hidden=!active;if(!active)return;
  const targets=[...(course?.start?[{...course.start,label:'START'}]:[]),...(course?.waypoints||[]).map((w,i)=>({...w,label:`${String(i+1).padStart(2,'0')} · WAYPOINT`})),...(course?.goal?[{...course.goal,label:'FINISH'}]:[])];
  const key=JSON.stringify(targets);
  if(key!==current){current=key;host.replaceChildren();nodes=targets.map(t=>{const el=document.createElement('span');el.className='fly-target';host.append(el);return {el,target:t};});}
  for(const {el,target} of nodes){const world=new THREE.Vector3(target.center.x,target.center.y,-target.center.z),p=world.clone().project(camera);el.hidden=p.z>1||p.z< -1||Math.abs(p.x)>.92||Math.abs(p.y)>.8;el.style.left=`${(p.x*.5+.5)*100}%`;el.style.top=`${(-p.y*.5+.5)*100}%`;el.textContent=`${target.label} · ${Math.round(world.distanceTo(camera.position))} m`;}
 }};
}
