import * as THREE from 'three';
// Unity (x,y,z) maps to browser (x,y,-z). The rail and step tops still
// match MovingEscalator.Pose; only covered portions of the solids are omitted.
const v=p=>new THREE.Vector3(p.x,p.y,-p.z);
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),identity=new THREE.Quaternion(),scale=new THREE.Vector3();
export function createEscalators(scene,specs,combSupports=[]) {
  const metal=new THREE.MeshStandardMaterial({color:0x788183,roughness:.38,metalness:.78});
  metal.onBeforeCompile=shader=>{
    const varyings='varying vec3 vTread; varying vec3 vTreadNormal; varying float vTreadHalfWidth;';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 treadSize;\n'+varyings).replace('#include <begin_vertex>',`#include <begin_vertex>
      vTread=vec3(position.x*treadSize.x,(.5-position.y)*treadSize.y,(.5-position.z)*treadSize.z);
      vTreadNormal=normal;vTreadHalfWidth=treadSize.x*.5;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+varyings).replace('#include <color_fragment>',`#include <color_fragment>
      float phase=abs(fract(vTread.x/.012+.5)-.5)*.012;
      float aa=max(fwidth(vTread.x),.0002);
      float groove=1.0-smoothstep(.002,.002+aa,phase);
      float fade=1.0-smoothstep(.004,.02,aa);
      diffuseColor.rgb*=1.0-groove*.6*fade;
      // Paint the safety nosing onto the actual tread and its front lip. The
      // old 16 mm blocks protruded through the next step as the rail flattened.
      if((vTreadNormal.y>.5&&(vTread.z<.022||abs(vTread.x)>vTreadHalfWidth-.025))||
         (vTreadNormal.z>.5&&vTread.y<.015))diffuseColor.rgb=vec3(.79,.48,.028);
    `);
  };
  metal.customProgramCacheKey=()=> 'kyoto-flush-tread-grooves-2';
  const lanes=specs.map(s=>{
    const points=s.path.map(v),distances=[0];
    for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.fround(points[i].distanceTo(points[i-1])));
    const length=distances.at(-1),pitch=length/s.stepCount;
    const lower=combSupports.find(p=>p.support===s.id+'-lower-comb-transfer'),upper=combSupports.find(p=>p.support===s.id+'-upper-comb-transfer');
    const from=lower?lower.along+lower.length/2:-s.flatLength,to=upper?upper.along-upper.length/2:s.run+s.flatLength;
    const group=new THREE.Group();group.name=s.id;group.position.copy(v(s.lowerCenter));group.rotation.y=-Math.atan2(s.uphill.x,s.uphill.z);scene.add(group);
    const geometry=new THREE.BoxGeometry(1,1,1),sizes=new THREE.InstancedBufferAttribute(new Float32Array(s.stepCount*3),3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('treadSize',sizes);
    const treads=new THREE.InstancedMesh(geometry,metal,s.stepCount);treads.name='exposed treads';treads.receiveShadow=true;treads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const bounds=new THREE.Box3().setFromPoints(points).expandByScalar(Math.max(s.width,s.stepHeight,pitch));
    treads.boundingBox=bounds;treads.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());group.add(treads);
    return {s,points,distances,length,pitch,from,to,treads,sizes,centers:Array.from({length:s.stepCount},()=>new THREE.Vector3()),publicSteps:new Uint8Array(s.stepCount)};
  });
  return time=>{
    for(const l of lanes){
      const {s,points,distances,length,pitch,from,to,treads,sizes,centers,publicSteps}=l;
      for(let i=0;i<s.stepCount;i++){
        let at=((i*pitch+s.phase*pitch+s.speed*time)%length+length)%length;
        publicSteps[i]=at<=distances[s.publicPointCount-1];
        let low=0,high=distances.length-1;
        while(low+1<high){const mid=(low+high)>>1;if(distances[mid]<=at)low=mid;else high=mid;}
        if(s.speed<0&&Math.abs(at-distances[low])<1e-10){if(low===0){at=length;low=points.length-2;}else low--;}
        centers[i].copy(points[low]).lerp(points[low+1],(at-distances[low])/(distances[low+1]-distances[low]));
      }
      let count=0;
      for(let i=0;i<s.stepCount;i++){
        if(!publicSteps[i])continue; // The return chain stays inside the casing.
        const p=centers[i],next=(i+1)%s.stepCount,q=centers[next];
        const start=Math.max(from,-p.z-pitch/2);
        let end=Math.min(to,-p.z+pitch/2);
        // Horizontal spacing decreases on the incline and changes continuously
        // at both eased ends. Clip the lower tread where its uphill neighbor
        // covers it, rather than drawing two nearly coplanar top faces there.
        if(publicSteps[next]&&q.y>=p.y&&q.y-s.stepHeight<=p.y)end=Math.min(end,-q.z-pitch/2);
        const depth=end-start;if(depth<=0)continue;
        position.set(p.x,p.y-s.stepHeight/2,-(start+end)/2);scale.set(s.width,s.stepHeight,depth);
        matrix.compose(position,identity,scale);treads.setMatrixAt(count,matrix);sizes.setXYZ(count,s.width,s.stepHeight,depth);count++;
      }
      treads.count=count;treads.instanceMatrix.needsUpdate=true;sizes.needsUpdate=true;
    }
  };
}
