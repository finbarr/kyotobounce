import * as THREE from 'three';
const v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function routeTargets(c){return [c?.start,...(c?.waypoints||[]),c?.goal].filter(Boolean);}
export function routeBounds(c){
 const box=new THREE.Box3();
 for(const d of routeTargets(c)){const p=v(d.center),r=new THREE.Vector3(d.radius,d.radius,d.radius);box.expandByPoint(p.clone().sub(r));box.expandByPoint(p.clone().add(r));}
 if(box.isEmpty())box.set(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
 return {center:box.getCenter(new THREE.Vector3()),size:box.getSize(new THREE.Vector3()),box};
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
    const ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(.01,d.radius-.05),d.radius+.025,48),material(.95));
    const fill=new THREE.Mesh(new THREE.CircleGeometry(d.radius,48),material(.13));patch.add(fill,ring);
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
