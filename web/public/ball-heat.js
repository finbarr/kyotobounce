import * as THREE from 'three';
import {heatTier} from './waypoint-score.js';
const COLORS=[0xf1673d,0xffbc3b,0xff583b,0xe6c8ff];
export function ballHeat({scene,ball,trail}){
 const capacity=72,positions=new Float32Array(capacity*3),ages=new Float32Array(capacity),velocities=new Float32Array(capacity*3);
 const rendered=new Float32Array(capacity*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(rendered,3));
 const material=new THREE.PointsMaterial({color:COLORS[1],size:.036,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
 const embers=new THREE.Points(geometry,material);embers.frustumCulled=false;scene.add(embers);
 // Separate world-space halo leaves the physical mesh and its spin markings untouched.
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.031,12,8),new THREE.MeshBasicMaterial({color:COLORS[1],transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(halo);
 const flameMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
 uniforms:{time:{value:0},tint:{value:new THREE.Color(0xffa83b)}},
 vertexShader:'varying vec2 uvFire; void main(){uvFire=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec2 uvFire; uniform float time; uniform vec3 tint;
 void main(){float y=uvFire.y;float wave=sin(uvFire.x*31.0-time*9.0+y*11.0)*.18+sin(uvFire.x*57.0+time*6.0)*.09;
 float alpha=smoothstep(0.0,.16,y)*(1.0-smoothstep(.52+wave,1.0,y))*.36;
 vec3 color=mix(vec3(1.0,.72,.24),tint,y);gl_FragColor=vec4(color,alpha);}`});
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.045,.14,16,4,true),flameMaterial);scene.add(flame);
 let key='',lastTime=null,tier=0,cursor=0,budget=0,serial=0,active=0;
 const baseColor=ball.material.color.clone(),baseEmission=ball.material.emissive.clone(),baseIntensity=ball.material.emissiveIntensity;
 function reset(){ages.fill(0);positions.fill(0);geometry.setDrawRange(0,0);embers.visible=false;halo.visible=false;flame.visible=false;cursor=0;budget=0;tier=0;active=0;ball.material.color.copy(baseColor);ball.material.emissive.copy(baseEmission);ball.material.emissiveIntensity=baseIntensity;trail.material.color.setHex(0xf49368);trail.material.opacity=.35;}
 reset();
 return {
  reset(){reset();key='';lastTime=null;},
  update({score,attempt,time,mode,epoch=0},dt,phase,reduced=false,frameMs=16){
   const nextKey=`${mode}:${attempt||''}:${epoch}`;
   if(nextKey!==key||(lastTime!==null&&time<lastTime-.0001)){reset();key=nextKey;}
   lastTime=time;
   if(!ball.visible||!['Flight','Result'].includes(phase)||mode==='editor'){reset();return;}
   tier=heatTier(score);
   if(!tier){reset();return;}
   const tint=COLORS[tier];ball.material.color.setHex(tint);ball.material.emissive.setHex(tint);ball.material.emissiveIntensity=[0,.2,.4,.6][tier];
   trail.material.color.setHex(tint);trail.material.opacity=reduced?.32:.55;
   halo.position.copy(ball.position);halo.visible=true;halo.material.color.setHex(tint);halo.material.opacity=reduced?.09:.11+tier*.025;
   // Particle budget is hard capped and suspended on reduced motion or slow frames.
   flame.visible=tier>=2&&!reduced&&frameMs<30;flame.position.copy(ball.position);flame.position.y+=.053;flameMaterial.uniforms.tint.value.setHex(tint);flameMaterial.uniforms.time.value=time;flame.scale.set(1,1+Math.sin(time*11)*.12,1);flame.rotation.y=time*2;
   const animate=!reduced&&frameMs<30&&phase==='Flight';embers.visible=animate;material.color.setHex(tint);
   if(!animate){ages.fill(0);geometry.setDrawRange(0,0);active=0;return;}
   budget+=dt*[0,12,30,55][tier];
   while(budget>=1){budget--;const i=cursor++%capacity,j=i*3;ages[i]=.45+(serial%5)*.07;const angle=serial++*2.39996;positions[j]=ball.position.x;positions[j+1]=ball.position.y;positions[j+2]=ball.position.z;velocities[j]=Math.cos(angle)*.11;velocities[j+1]=.16+(serial%4)*.035;velocities[j+2]=Math.sin(angle)*.11;}
   active=0;
   for(let i=0;i<capacity;i++){const j=i*3;if(ages[i]>0){ages[i]-=dt;positions[j]+=velocities[j]*dt;positions[j+1]+=velocities[j+1]*dt;positions[j+2]+=velocities[j+2]*dt;const k=active++*3;rendered[k]=positions[j];rendered[k+1]=positions[j+1];rendered[k+2]=positions[j+2];}}
   geometry.setDrawRange(0,active);geometry.attributes.position.needsUpdate=true;
  },
  get state(){return {tier,activeParticles:active,capacity,drawCalls:3,attempt:key};},
  dispose(){reset();scene.remove(embers,halo,flame);geometry.dispose();material.dispose();halo.geometry.dispose();halo.material.dispose();flame.geometry.dispose();flame.material.dispose();}
 };
}
