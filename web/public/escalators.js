import * as THREE from 'three';
// Unity (x,y,z) maps to browser (x,y,-z). Steps stay level along the
// authored closed rail; their timing matches MovingEscalator.Pose.
const v = p=>new THREE.Vector3(p.x,p.y,-p.z);
const matrix=new THREE.Matrix4(), position=new THREE.Vector3(), identity=new THREE.Quaternion(), scale=new THREE.Vector3(1,1,1);
export function createEscalators(scene,specs) {
  const metal=new THREE.MeshStandardMaterial({color:0x788183,roughness:.38,metalness:.78});
  metal.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTread;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTread=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTread;').replace('#include <color_fragment>',`#include <color_fragment>
      float phase=abs(fract(vTread.x/.012+.5)-.5)*.012;
      float aa=max(fwidth(vTread.x),.0002);
      float groove=1.0-smoothstep(.002,.002+aa,phase);
      float fade=1.0-smoothstep(.004,.02,aa);
      diffuseColor.rgb*=1.0-groove*.6*fade;
      if(abs(vTread.x)>.475&&vTread.y>0.0)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.64,.41,.025),.8);
    `);
  };
  metal.customProgramCacheKey=()=> 'kyoto-tread-grooves-1';
  const yellow=new THREE.MeshStandardMaterial({color:0xe6b734,roughness:.65,metalness:.2});
  const lanes=specs.map(s=>{
    const points=s.path.map(v), distances=[0];
    for(let i=1;i<points.length;i++) distances.push(distances[i-1]+Math.fround(points[i].distanceTo(points[i-1])));
    const length=distances.at(-1),pitch=length/s.stepCount;
    const group=new THREE.Group();group.position.copy(v(s.lowerCenter));group.rotation.y=-Math.atan2(s.uphill.x,s.uphill.z);scene.add(group);
    const treads=new THREE.InstancedMesh(new THREE.BoxGeometry(s.width,s.stepHeight,pitch),metal,s.stepCount);
    treads.receiveShadow=true;
    const edges=new THREE.InstancedMesh(new THREE.BoxGeometry(s.width,.016,.022),yellow,s.stepCount);
    treads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Bounds must span the whole rail, including when the browser clock starts late.
    const bounds=new THREE.Box3().setFromPoints(points).expandByScalar(Math.max(s.width,s.stepHeight,pitch));
    treads.boundingBox=bounds.clone();edges.boundingBox=bounds.clone();treads.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());edges.boundingSphere=treads.boundingSphere.clone();
    group.add(treads,edges);
    return {s,points,distances,length,pitch,treads,edges};
  });
  return time=>{
    for(const l of lanes){
      const {s,points,distances,length,pitch,treads,edges}=l;
      for(let i=0;i<s.stepCount;i++){
        let at=((i*pitch+s.phase*pitch+s.speed*time)%length+length)%length;
        let low=0,high=distances.length-1;
        while(low+1<high){const mid=(low+high)>>1;if(distances[mid]<=at)low=mid;else high=mid;}
        if(s.speed<0&&Math.abs(at-distances[low])<1e-10){if(low===0){at=length;low=points.length-2;}else low--;}
        const segment=distances[low+1]-distances[low];
        position.copy(points[low]).lerp(points[low+1],(at-distances[low])/segment);position.y-=s.stepHeight/2;
        matrix.compose(position,identity,scale);treads.setMatrixAt(i,matrix);
        position.y+=s.stepHeight/2+.001;position.z+=pitch/2-.010;
        matrix.compose(position,identity,scale);edges.setMatrixAt(i,matrix);
      }
      treads.instanceMatrix.needsUpdate=true;edges.instanceMatrix.needsUpdate=true;
    }
  };
}
