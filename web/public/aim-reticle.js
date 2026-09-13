import * as THREE from 'three';

// Same yaw/pitch convention as the native launch, reflected into Three's Z.
export function launchDirection(yaw,pitch){
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180;
  return new THREE.Vector3(Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p));
}

export function aimOrigin(player,yaw){
  const eye=new THREE.Vector3(player.feet.x,player.feet.y+1.65,-player.feet.z);
  const offset=new THREE.Vector3(player.release.x,player.release.y,-player.release.z).sub(eye);
  // Turn the hand offset with local aim immediately, instead of waiting for the
  // buffered avatar heading. Keep the native wall-clearance adjustment.
  offset.applyAxisAngle(new THREE.Vector3(0,1,0),-(yaw-player.yaw)*Math.PI/180);
  return eye.add(offset);
}

const raycaster=new THREE.Raycaster();raycaster.firstHitOnly=true;
export function projectAimReticle(origin,direction,camera,station){
  raycaster.set(origin,direction);raycaster.far=300;
  const hit=raycaster.intersectObject(station,true)[0];
  const target=hit?.point||origin.clone().addScaledVector(direction,300);
  const projected=target.clone().project(camera);
  const visible=projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1;
  return {target,origin,direction,distance:hit?.distance??300,visible,x:(projected.x+1)/2,y:(1-projected.y)/2};
}
