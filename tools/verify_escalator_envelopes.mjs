// Full path envelope and renderer motion checks; complements native contacts.
import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import*as THREE from'three';import{createEscalators}from'../web/public/escalators.js';
const [dir]=process.argv.slice(2);const layout=JSON.parse(await readFile(dir+'/station-layout.json')),envelopes=JSON.parse(await readFile(dir+'/envelopes.json'));
const scene=new THREE.Scene(),update=createEscalators(scene,layout.escalators),checks=[];
for(const [i,s]of layout.escalators.entries()){
 const e=envelopes.find(e=>e.id===s.id),p=s.path,n=s.publicPointCount,dist=[0];for(let j=1;j<p.length;j++)dist.push(dist.at(-1)+Math.fround(Math.hypot(p[j].x-p[j-1].x,p[j].y-p[j-1].y,p[j].z-p[j-1].z)));
 const length=dist.at(-1),pitch=length/s.stepCount;let minimumClearance=Infinity,corners=0;
 const height=z=>{z=Math.max(p[0].z,Math.min(p[n-1].z,z));let a=0,b=n-1;while(a+1<b){const mid=(a+b)>>1;if(p[mid].z<=z)a=mid;else b=mid;}return p[a].y+(p[b].y-p[a].y)*(z-p[a].z)/(p[b].z-p[a].z);};
 function check(q){for(const side of [-1,1]){
  const z=q.z+side*pitch/2,bottom=q.y-s.stepHeight;assert(z>=e.zBounds[0]-.0001&&z<=e.zBounds[1]+.0001);
  const clearance=bottom-(height(z)-e.depth);minimumClearance=Math.min(minimumClearance,clearance);assert(clearance>=-.0002,`${s.id} tread protrudes below housing at ${z}: ${clearance}`);corners+=2;
 }}
 // Extremes of two piecewise linear functions occur at a path vertex or when
 // either longitudinal corner crosses a housing profile breakpoint. Include
 // those positions explicitly, so the check covers the entire continuous loop.
 for(let j=0;j<p.length-1;j++){
  const a=p[j],b=p[j+1],parameters=[0,1];
  if(Math.abs(b.z-a.z)>1e-12)for(const edge of p.slice(0,n))for(const sign of [-1,1]){const t=(edge.z-sign*pitch/2-a.z)/(b.z-a.z);if(t>0&&t<1)parameters.push(t);}
  for(const t of parameters)check({y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 }
 // Inspect actual InstancedMesh transforms over a whole pitch period: all
 // step indices together cover a whole chain cycle at every sampled phase.
 const tread=scene.children[i].children[0],matrix=new THREE.Matrix4(),pos=new THREE.Vector3();let poses=0;
 for(let phase=0;phase<=16;phase++){
  const time=phase*pitch/Math.abs(s.speed)/16;update(time);
  for(let step=0;step<s.stepCount;step++){
   let at=((step*pitch+s.phase*pitch+s.speed*time)%length+length)%length;let low=0,high=dist.length-1;while(low+1<high){const mid=(low+high)>>1;if(dist[mid]<=at)low=mid;else high=mid;}
   const f=(at-dist[low])/(dist[low+1]-dist[low]),a=p[low],b=p[low+1];tread.getMatrixAt(step,matrix);pos.setFromMatrixPosition(matrix);
   assert(Math.abs(pos.y-(a.y+(b.y-a.y)*f-s.stepHeight/2))<1e-4&&Math.abs(-pos.z-(a.z+(b.z-a.z)*f))<1e-4,`${s.id} renderer drift`);poses++;
  }
 }
 checks.push({id:s.id,minimumBottomClearance:minimumClearance,cornerChecks:corners,rendererPoses:poses,unchangedMotion:e.motionChanged===false});
}
await writeFile(dir+'/cycle-verification.json',JSON.stringify({status:'pass',scope:'Continuous piecewise path corner envelope; actual renderer matrices across a pitch period for all step indices',checks},null,2));console.log('PASS',checks.length,'lanes',checks.reduce((n,c)=>n+c.cornerChecks,0),'corner checks',checks.reduce((n,c)=>n+c.rendererPoses,0),'renderer poses');
