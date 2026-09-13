import {Box3,Line3,Matrix4,Ray,Vector3} from 'three';
import {ExtendedTriangle} from 'three-mesh-bvh';

// Static station geometry only. Queries use both triangle sides without changing
// rendering materials, and test a camera volume rather than just its centre ray.
export class CameraObstacles {
  constructor(root){
    this.meshes=[];
    root.updateMatrixWorld(true);
    root.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.geometry.boundsTree)return;
      const geometry=mesh.geometry;
      if(!geometry.boundingBox)geometry.computeBoundingBox();
      this.meshes.push({tree:geometry.boundsTree,world:mesh.matrixWorld.clone(),
        inverse:new Matrix4().copy(mesh.matrixWorld).invert(),
        bounds:geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)});
    });
    this.ray=new Ray();this.segment=new Line3();this.triangle=new ExtendedTriangle();
    this.sweepBounds=new Box3();this.localBounds=new Box3();
    this.hit=new Vector3();this.closest=new Vector3();this.onSegment=new Vector3();this.point=new Vector3();
  }

  clearance(origin,desired,radius=.16,padding=.01){
    const {ray,segment,triangle,sweepBounds,localBounds,hit,closest,onSegment,point}=this;
    const length=origin.distanceTo(desired);
    if(length<1e-8)return 0;
    ray.origin.copy(origin);ray.direction.subVectors(desired,origin).divideScalar(length);
    segment.start.copy(origin);segment.end.copy(desired);
    sweepBounds.setFromPoints([origin,desired]).expandByScalar(radius);
    let nearest=length,blocked=false;
    for(const mesh of this.meshes){
      if(!sweepBounds.intersectsBox(mesh.bounds))continue;
      localBounds.copy(sweepBounds).applyMatrix4(mesh.inverse);
      mesh.tree.shapecast({
        intersectsBounds:bounds=>bounds.intersectsBox(localBounds),
        intersectsTriangle:localTriangle=>{
          triangle.a.copy(localTriangle.a).applyMatrix4(mesh.world);
          triangle.b.copy(localTriangle.b).applyMatrix4(mesh.world);
          triangle.c.copy(localTriangle.c).applyMatrix4(mesh.world);
          // The segment-distance helper checks edges and endpoints, so include
          // crossings through a triangle's interior explicitly.
          const crossing=ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit);
          const hitDistance=crossing?hit.distanceTo(origin):Infinity;
          if(radius===0){
            if(hitDistance<=nearest){nearest=hitDistance;blocked=true;}
            return nearest===0;
          }
          segment.end.copy(origin).addScaledVector(ray.direction,nearest);
          const separation=hitDistance<=nearest?(onSegment.copy(hit),0):triangle.closestPointToSegment(segment,closest,onSegment);
          if(separation>radius)return false;
          const startDistance=triangle.closestPointToPoint(origin,closest).distanceTo(origin);
          if(startDistance<=radius){
            // An anchor already near a surface can move away from it. Moving
            // deeper into it must never push the camera through the obstacle.
            if(separation<startDistance-1e-7){nearest=0;blocked=true;return true;}
            return false;
          }
          let low=0,high=Math.min(nearest,onSegment.distanceTo(origin));
          // Distance to a triangle is convex along the boom. Bisect the first
          // contact before its closest point (including rounded edge contacts).
          for(let i=0;i<16;i++){
            const mid=(low+high)/2;
            point.copy(origin).addScaledVector(ray.direction,mid);
            if(triangle.closestPointToPoint(point,closest).distanceToSquared(point)<=radius*radius)high=mid;
            else low=mid;
          }
          nearest=low;blocked=true;
          return nearest===0;
        }
      });
      if(nearest===0)break;
    }
    // A minimum zoom distance must not override a closer collision.
    return blocked?Math.max(0,nearest-padding):length;
  }
}

export function easeCameraClearance(current,safe,dt){
  return safe<current?safe:current+(safe-current)*(1-Math.exp(-dt*10));
}
