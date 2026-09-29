import * as THREE from 'three';

export function interpolateLiftPoses(before=[],after=[],alpha=1){
 return after.map(b=>{const a=before.find(p=>p.id===b.id)||b;return{...b,...Object.fromEntries(['height','carDoor','lowerDoor','upperDoor'].map(k=>[k,THREE.MathUtils.lerp(a[k],b[k],alpha)]))};});
}
export function replayLiftPoses(frames=[],time=0){
 if(!frames.length)return[];
 let a=frames[0],b=a;for(const frame of frames){b=frame;if(frame.t>=time)break;a=frame;}
 return interpolateLiftPoses(a.poses,b.poses,THREE.MathUtils.clamp((time-a.t)/(b.t-a.t||1),0,1));
}
export function liftPartCenter(spec,part,pose){
 const y=part.motion==='car'?pose.height:part.motion==='upper'?spec.height:0;
 const door=part.motion==='car'?pose.carDoor:part.motion==='upper'?pose.upperDoor:pose.lowerDoor;
 return{x:spec.origin.x+part.center.x+part.doorSide*spec.doorTravel*door,y:spec.origin.y+part.center.y+y,z:spec.origin.z+part.center.z};
}
export function liftButton(spec,pose,feet){
 if(!feet)return null;
 const x=feet.x-spec.origin.x,y=feet.y-spec.origin.y,z=feet.z-spec.origin.z;
 const inside=Math.abs(x)<spec.width/2-.25&&Math.abs(z)<spec.depth/2-.25&&Math.abs(y-pose.height)<.15;
 const floor=Math.abs(y)<.15?0:Math.abs(y-spec.height)<.15?1:-1;
 const outside=floor>=0&&Math.abs(x)<spec.doorWidth/2+1&&z<spec.doorZ&&z>spec.doorZ-2;
 return inside||outside?{id:spec.id,text:pose.blocked?'Clear the lift doorway':pose.moving?'Lift moving…':inside?'E · Ride lift':'E · Call lift'}:null;
}
// A throw freezes walking input, but its rider still follows the car. Saved
// replays keep the release stance and reconstruct that same vertical movement.
export function liftRiderFeet(specs=[],release=[],current=[],feet){
 if(!feet)return feet;
 for(const spec of specs){
  const a=release.find(p=>p.id===spec.id),b=current.find(p=>p.id===spec.id);if(!a||!b)continue;
  if(Math.abs(feet.x-spec.origin.x)<spec.width/2-.25&&Math.abs(feet.z-spec.origin.z)<spec.depth/2-.25&&Math.abs(feet.y-spec.origin.y-a.height)<.15)
   return{...feet,y:feet.y+b.height-a.height};
 }
 return feet;
}
export function createLifts(scene,specs=[],authoredMaterials=[]){
 const cube=new THREE.BoxGeometry(1,1,1),materials=new Map(),parts=[];
 function material(id){
  if(materials.has(id))return materials.get(id);
  const r=authoredMaterials.find(m=>m.id===id),c=r?.linearColor||{r:.45,g:.48,b:.50,a:1};
  const m=new THREE.MeshStandardMaterial({color:new THREE.Color(c.r,c.g,c.b),roughness:r?.roughness??.4,metalness:r?.metallic??.7,transparent:c.a<1,opacity:c.a,depthWrite:c.a>=1});materials.set(id,m);return m;
 }
 for(const spec of specs){
  const root=new THREE.Group();root.name=spec.id;scene.add(root);
  for(const part of spec.parts){const mesh=new THREE.Mesh(cube,material(part.appearance));mesh.name=part.id;mesh.scale.set(part.size.x,part.size.y,part.size.z);root.add(mesh);parts.push({spec,part,mesh});}
 }
 const initial=specs.map(s=>({id:s.id,height:0,carDoor:1,lowerDoor:1,upperDoor:0,moving:false,blocked:false}));
 function update(before=initial,after=before,alpha=1){
  const poses=interpolateLiftPoses(before,after,alpha);
  for(const {spec,part,mesh}of parts){const p=poses.find(p=>p.id===spec.id)||initial.find(p=>p.id===spec.id),q=liftPartCenter(spec,part,p);mesh.position.set(q.x,q.y,-q.z);}
  return poses;
 }
 update();return{update,parts,specs,button(poses,feet){for(const s of specs){const p=poses?.find(p=>p.id===s.id);if(p){const button=liftButton(s,p,feet);if(button)return button;}}return null;}};
}
