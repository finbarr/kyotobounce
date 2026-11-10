import {Vector3,Box3} from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';

// Native convex MeshColliders use the same authored corners as these meshes.
// Keep the exterior triangle casts; this volume supplies the missing interior
// classification and outward penetration correction. Centering the hull avoids
// subtracting large plane constants for small casings far from the origin.
export function convexVolume(shape,index){
 const points=[];for(let i=0;i<shape.vertices.length;i+=3)points.push(new Vector3().fromArray(shape.vertices,i));
 const bounds=new Box3().setFromPoints(points),origin=bounds.getCenter(new Vector3());
 const hull=new ConvexHull().setFromPoints(points.map(p=>p.clone().sub(origin)));
 const planes=hull.faces.map(f=>({normal:f.normal.clone(),constant:f.constant}));
 const volume=hull.faces.reduce((sum,f)=>sum+f.area*f.constant/3,0);
 if(!(volume>0)||planes.length<4||planes.some(p=>![p.normal.x,p.normal.y,p.normal.z,p.constant].every(Number.isFinite)))throw Error('Invalid convex station volume: '+shape.id);
 return {index,mask:shape.mask,bounds,origin,planes};
}

export function interiorOverlap(volume,position,radius){
 const local=position.clone().sub(volume.origin);let nearest=null,distance=-Infinity;
 for(const plane of volume.planes){
  const d=plane.normal.dot(local)-plane.constant;
  if(d>0)return null;
  if(d>distance){distance=d;nearest=plane;}
 }
 return {depth:radius-distance,normal:nearest.normal,point:position.clone().addScaledVector(nearest.normal,-distance)};
}
