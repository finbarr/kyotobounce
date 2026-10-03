import * as THREE from 'three';
const v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function routeTargets(c){return [c?.start,...(c?.waypoints||[]),c?.goal].filter(Boolean);}
export function routeBounds(c){
 const box=new THREE.Box3();
 for(const d of routeTargets(c)){const p=v(d.center),r=new THREE.Vector3(d.radius,d.radius,d.radius);box.expandByPoint(p.clone().sub(r));box.expandByPoint(p.clone().add(r));}
 if(box.isEmpty())box.set(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
 return {center:box.getCenter(new THREE.Vector3()),size:box.getSize(new THREE.Vector3()),box};
}
// Fit the complete target disks inside an unobstructed rectangle in NDC.
// Keep the view angle and projection; move the eye sideways/up and back only.
export function fitRouteCamera(camera,course,{left,right,bottom,top}){
 const tanX=1/camera.projectionMatrix.elements[0],tanY=1/camera.projectionMatrix.elements[5];
 const xAxis=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),yAxis=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),back=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,2);
 let lowX=-Infinity,highX=Infinity,lowY=-Infinity,highY=Infinity,near=0;
 for(const d of routeTargets(course))for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
  const p=v(d.center).add(new THREE.Vector3(x,y,z).multiplyScalar(d.radius)).sub(camera.position);
  const px=p.dot(xAxis),py=p.dot(yAxis),pz=p.dot(back);near=Math.max(near,pz+camera.near+.01);
  lowX=Math.max(lowX,px+right*tanX*pz);highX=Math.min(highX,px+left*tanX*pz);
  lowY=Math.max(lowY,py+top*tanY*pz);highY=Math.min(highY,py+bottom*tanY*pz);
 }
 const distance=Math.max(near,(lowX-highX)/((right-left)*tanX),(lowY-highY)/((top-bottom)*tanY));
 const x=(lowX+highX-(right+left)*tanX*distance)*.5,y=(lowY+highY-(top+bottom)*tanY*distance)*.5;
 camera.position.addScaledVector(back,distance).addScaledVector(xAxis,x).addScaledVector(yAxis,y);camera.updateMatrixWorld();
}
// The painted border belongs inside the native contact disk. An outward
// outline makes near misses look like hits, especially at target intersections.
export function waypointGeometry(radius){
 return {ring:new THREE.RingGeometry(Math.max(.01,radius-.05),radius,48),fill:new THREE.CircleGeometry(radius,48)};
}
export function waypointTargets(scene){
 const group=new THREE.Group();group.name='waypoint-targets';scene.add(group);let nodes=[];
 function clear(){
  group.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});group.clear();nodes=[];
 }
 return {
  draw(waypoints=[],selected=null){
   clear();
   waypoints.forEach((d,i)=>{
    const patch=new THREE.Group(),normal=v(d.normal).normalize();patch.position.copy(v(d.center)).addScaledVector(normal,.025);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    const material=(opacity)=>new THREE.MeshBasicMaterial({color:0xa58aff,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false});
    const geometry=waypointGeometry(d.radius);
    const ring=new THREE.Mesh(geometry.ring,material(.95));
    const fill=new THREE.Mesh(geometry.fill,material(.13));patch.add(fill,ring);
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.font='bold 76px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1).padStart(2,'0'),64,66);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(d.radius*1.1,d.radius*1.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide,depthWrite:false}));label.position.z=.006;patch.add(label);group.add(patch);
    nodes.push({id:d.id,ring,fill,label,selected:d.id===selected});
   });
  },
  update(ids=new Set()){
   for(const n of nodes){const got=ids.has(n.id),color=got?0x63ffc5:n.selected?0xffffff:0xa58aff;n.ring.material.color.setHex(color);n.fill.material.color.setHex(color);n.fill.material.opacity=got?.37:n.selected?.24:.13;n.label.material.opacity=got?.62:1;}
  },
  get count(){return nodes.length;},dispose(){clear();scene.remove(group);}
 };
}
