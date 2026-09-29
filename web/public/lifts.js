import * as THREE from 'three';

export function interpolateLiftPoses(before=[],after=[],alpha=1){
 return after.map(b=>{const a=before.find(p=>p.id===b.id)||b;return{...b,...Object.fromEntries(['height','carDoor','lowerDoor','upperDoor'].map(k=>[k,THREE.MathUtils.lerp(a[k],b[k],alpha)])),...(b.landingDoors?{landingDoors:b.landingDoors.map((v,i)=>THREE.MathUtils.lerp(a.landingDoors?.[i]??v,v,alpha))}:{})};});
}
export function replayLiftPoses(frames=[],time=0){
 if(!frames.length)return[];
 let a=frames[0],b=a;for(const frame of frames){b=frame;if(frame.t>=time)break;a=frame;}
 return interpolateLiftPoses(a.poses,b.poses,THREE.MathUtils.clamp((time-a.t)/(b.t-a.t||1),0,1));
}
function liftLocalFeet(spec,feet){
 const a=(spec.yaw||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=feet.x-spec.origin.x,z=feet.z-spec.origin.z;
 return{x:c*x-s*z,y:feet.y-spec.origin.y,z:s*x+c*z};
}
export function liftPartCenter(spec,part,pose){
 const floor=part.motion==='upper'?(spec.stops?.length??2)-1:part.motion==='landing'?part.floor:0;
 const y=part.motion==='car'?pose.height:spec.stops?.[floor]?.height??(floor===0?0:spec.height);
 const door=part.motion==='car'?pose.carDoor:pose.landingDoors?.[floor]??(floor===0?pose.lowerDoor:pose.upperDoor);
 const a=(spec.yaw||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=part.center.x+part.doorSide*spec.doorTravel*door,z=part.center.z;
 return{x:spec.origin.x+c*x+s*z,y:spec.origin.y+part.center.y+y,z:spec.origin.z-s*x+c*z};
}
export function liftButton(spec,pose,feet){
 if(!feet)return null;
 const {x,y,z}=liftLocalFeet(spec,feet);
 const inside=Math.abs(x)<spec.width/2-.25&&Math.abs(z)<spec.depth/2-.25&&Math.abs(y-pose.height)<.15;
 const floors=spec.stops??[{height:0},{height:spec.height}];
 const floor=floors.findIndex(f=>Math.abs(y-f.height)<.15);
 const outside=floor>=0&&Math.abs(x)<spec.doorWidth/2+1&&z<spec.doorZ&&z>spec.doorZ-2;
 const busy=pose.busy||pose.moving;
 return inside||outside?{id:spec.id,text:pose.blocked?'Clear the lift doorway':busy?'Lift moving…':inside&&floors.length>2?'E · Choose floor':inside?'E · Ride lift':'E · Call lift',disabled:!!busy,...(inside&&floors.length>2?{stops:floors.map(s=>({...s,current:Math.abs(s.height-pose.height)<.15}))}:{})}:null;
}
// A throw freezes walking input, but its rider still follows the car. Saved
// replays keep the release stance and reconstruct that same vertical movement.
export function liftRiderFeet(specs=[],release=[],current=[],feet){
 if(!feet)return feet;
 for(const spec of specs){
  const a=release.find(p=>p.id===spec.id),b=current.find(p=>p.id===spec.id);if(!a||!b)continue;
  const p=liftLocalFeet(spec,feet);
  if(Math.abs(p.x)<spec.width/2-.25&&Math.abs(p.z)<spec.depth/2-.25&&Math.abs(p.y-a.height)<.15)
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
  for(const part of spec.parts){const mesh=new THREE.Mesh(cube,material(part.appearance));mesh.name=part.id;mesh.rotation.y=-(spec.yaw||0)*Math.PI/180;mesh.scale.set(part.size.x,part.size.y,part.size.z);root.add(mesh);parts.push({spec,part,mesh});}
 }
 const initial=specs.map(s=>({id:s.id,height:0,carDoor:1,lowerDoor:1,upperDoor:0,moving:false,blocked:false,busy:false,...(s.stops?{landingDoors:s.stops.map((_,i)=>i===0?1:0)}:{})}));
 function update(before=initial,after=before,alpha=1){
  const poses=interpolateLiftPoses(before,after,alpha);
  for(const {spec,part,mesh}of parts){const p=poses.find(p=>p.id===spec.id)||initial.find(p=>p.id===spec.id),q=liftPartCenter(spec,part,p);mesh.position.set(q.x,q.y,-q.z);}
  return poses;
 }
 update();return{update,parts,specs,button(poses,feet){for(const s of specs){const p=poses?.find(p=>p.id===s.id);if(p){const button=liftButton(s,p,feet);if(button)return button;}}return null;}};
}
