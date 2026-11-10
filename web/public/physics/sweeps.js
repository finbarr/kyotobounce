import {Vector3} from 'three';
// Analytic queries retain sub-millimetre clearance for our 23 mm ball.
export function segmentSweep(p,d,a,b,radius){
 const edge=new Vector3().subVectors(b,a),relative=new Vector3().subVectors(p,a),ll=edge.lengthSq();let best=Infinity;
 function root(aa,bb,cc,accept=()=>true){if(aa<1e-24)return;const disc=bb*bb-4*aa*cc;if(disc<0)return;const t=(-bb-Math.sqrt(disc))/(2*aa);if(t>=0&&t<=1&&t<best&&accept(t))best=t;}
 if(ll>1e-24){const e=relative.dot(edge)/ll,g=d.dot(edge)/ll,radial=relative.clone().addScaledVector(edge,-e),velocity=d.clone().addScaledVector(edge,-g);root(velocity.lengthSq(),2*radial.dot(velocity),radial.lengthSq()-radius*radius,t=>e+g*t>=0&&e+g*t<=1);}
 for(const end of [a,b]){const q=new Vector3().subVectors(p,end);root(d.lengthSq(),2*q.dot(d),q.lengthSq()-radius*radius);}return best;
}
export function triangleSweep(p,d,radius,triangle){
 const normal=triangle.getNormal(new Vector3());if(normal.lengthSq()<.5)return null;
 const signed=new Vector3().subVectors(p,triangle.a).dot(normal),speed=d.dot(normal);let best=Infinity;
 for(const sign of [-1,1]){if(speed*sign>=-1e-14)continue;const t=(sign*radius-signed)/speed;if(t<0||t>1||t>=best)continue;const point=p.clone().addScaledVector(d,t).addScaledVector(normal,-sign*radius);if(triangle.containsPoint(point))best=t;}
 for(const [a,b]of [[triangle.a,triangle.b],[triangle.b,triangle.c],[triangle.c,triangle.a]])best=Math.min(best,segmentSweep(p,d,a,b,radius));
 if(best>1)return null;const center=p.clone().addScaledVector(d,best),point=triangle.closestPointToPoint(center,new Vector3()),n=center.clone().sub(point).normalize();
 return d.dot(n)<-1e-14?{fraction:best,point,normal:n}:null;
}
export function boxSweep(p,d,half,radius){
 let enter=0,leave=1;
 for(const axis of ['x','y','z']){const h=half[axis]+radius;if(Math.abs(d[axis])<1e-14){if(Math.abs(p[axis])>h)return null;continue;}const a=(-h-p[axis])/d[axis],b=(h-p[axis])/d[axis];enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)return null;}
 const closest=q=>new Vector3(Math.max(-half.x,Math.min(half.x,q.x)),Math.max(-half.y,Math.min(half.y,q.y)),Math.max(-half.z,Math.min(half.z,q.z)));let best=Infinity;
 for(const axis of ['x','y','z']){if(Math.abs(d[axis])<1e-14)continue;const others=['x','y','z'].filter(a=>a!==axis);for(const sign of [-1,1]){const t=(sign*(half[axis]+radius)-p[axis])/d[axis];if(t<0||t>1||d[axis]*sign>=0)continue;const q=p.clone().addScaledVector(d,t);if(others.every(a=>Math.abs(q[a])<=half[a]))best=Math.min(best,t);}}
 for(const axis of ['x','y','z']){const [j,k]=['x','y','z'].filter(a=>a!==axis);for(const sj of [-1,1])for(const sk of [-1,1]){const a=new Vector3(),b=new Vector3();a[axis]=-half[axis];b[axis]=half[axis];a[j]=b[j]=sj*half[j];a[k]=b[k]=sk*half[k];best=Math.min(best,segmentSweep(p,d,a,b,radius));}}
 if(best>1)return null;const center=p.clone().addScaledVector(d,best),point=closest(center),normal=center.clone().sub(point).normalize();return d.dot(normal)<-1e-14?{fraction:best,normal,point}:null;
}
