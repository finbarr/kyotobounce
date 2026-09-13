import * as THREE from 'three';
import {heatTier,HEAT_STAGES,actionCount} from './waypoint-score.js';
export function ballHeat({scene,ball,trail}){
 const capacity=128,positions=new Float32Array(capacity*3),ages=new Float32Array(capacity),lifetimes=new Float32Array(capacity),velocities=new Float32Array(capacity*3);
 const rendered=new Float32Array(capacity*3),colors=new Float32Array(capacity*3),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(rendered,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const material=new THREE.PointsMaterial({vertexColors:true,size:.03,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
 const embers=new THREE.Points(geometry,material);embers.frustumCulled=false;
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.034,16,10),new THREE.MeshBasicMaterial({transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending}));
 const flameMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
 uniforms:{time:{value:0},tint:{value:new THREE.Color()},energy:{value:0}},
 vertexShader:'varying vec2 uvFire; void main(){uvFire=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec2 uvFire; uniform float time; uniform vec3 tint; uniform float energy;
 void main(){float y=uvFire.y;float wave=sin(uvFire.x*31.0-time*12.0+y*14.0)*.16+sin(uvFire.x*57.0+time*8.0)*.1;
 float alpha=smoothstep(0.0,.12,y)*(1.0-smoothstep(.42+wave,1.0,y))*(.22+energy*.22);
 gl_FragColor=vec4(mix(vec3(1.0,.9,.65),tint,y),alpha);}`});
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.05,.25,16,4,true),flameMaterial);
 const orbitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending});
 const orbitGeometry=new THREE.TorusGeometry(.065,.002,4,40),rings=[new THREE.Mesh(orbitGeometry,orbitMaterial),new THREE.Mesh(orbitGeometry,orbitMaterial)];
 const shock=new THREE.Mesh(new THREE.RingGeometry(.06,.068,40),orbitMaterial.clone());shock.material.side=THREE.DoubleSide;
 const objects=[embers,halo,flame,...rings,shock];scene.add(...objects);
 const baseColor=ball.material.color.clone(),baseEmission=ball.material.emissive.clone(),baseIntensity=ball.material.emissiveIntensity;
 const tint=new THREE.Color(),particleTint=new THREE.Color(),previousPosition=new THREE.Vector3(),direction=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0);
 let key='',lastTime=null,tier=0,cursor=0,budget=0,serial=0,active=0,actions=0,pulse=0,quiet=0;
 function reset(){ages.fill(0);geometry.setDrawRange(0,0);objects.forEach(o=>o.visible=false);cursor=0;budget=0;tier=0;active=0;actions=0;pulse=0;quiet=0;previousPosition.copy(ball.position);ball.material.color.copy(baseColor);ball.material.emissive.copy(baseEmission);ball.material.emissiveIntensity=baseIntensity;trail.material.color.setHex(0xf49368);trail.material.opacity=.35;}
 function emit(count,burst=false){
  for(let n=0;n<count;n++){
   const i=cursor++%capacity,j=i*3,angle=serial++*2.39996;ages[i]=lifetimes[i]=.35+(serial%7)*.055;
   positions[j]=ball.position.x;positions[j+1]=ball.position.y;positions[j+2]=ball.position.z;
   const spread=burst?.5+tier*.12:.07+tier*.025;
   velocities[j]=Math.cos(angle)*spread;velocities[j+1]=Math.sin(serial*1.73)*spread+(burst?.25:.15);velocities[j+2]=Math.sin(angle)*spread;
  }
 }
 reset();
 return {
  reset(){reset();key='';lastTime=null;},
  update({score,attempt,time,mode,epoch=0},dt,phase,reduced=false,frameMs=16){
   const nextKey=`${mode}:${attempt||''}:${epoch}`;
   if(nextKey!==key||(lastTime!==null&&time<lastTime-.0001)){reset();key=nextKey;}
   lastTime=time;dt=Math.min(.05,Math.max(0,dt));
   if(!ball.visible||!['Flight','Result'].includes(phase)||mode==='editor'){reset();return;}
   const nextTier=heatTier(score),nextActions=actionCount(score),fresh=nextActions>actions;
   const animate=!reduced&&frameMs<34&&phase==='Flight';
   if(fresh){quiet=0;pulse=1;}else{quiet+=dt;pulse=Math.max(0,pulse-dt*1.8);}
   actions=nextActions;tier=Math.max(0,nextTier);
   if(!tier){reset();actions=nextActions;return;}
   tint.setHex(HEAT_STAGES[tier].color);if(tier===6&&!reduced)tint.setHSL((time*.22)%1,.88,.64);
   ball.material.color.copy(tint);ball.material.emissive.copy(tint);ball.material.emissiveIntensity=.12+tier*.06;
   trail.material.color.copy(tint);trail.material.opacity=reduced?.3:.5;
   const energy=Math.max(.2,1-quiet/3),size=1+pulse*.7;
   halo.position.copy(ball.position);halo.visible=true;halo.material.color.copy(tint);halo.material.opacity=.1+tier*.012;halo.scale.setScalar(reduced?1:size);
   direction.copy(previousPosition).sub(ball.position);if(direction.lengthSq()<1e-10)direction.set(0,1,0);else direction.normalize();previousPosition.copy(ball.position);
   flame.visible=tier>=3&&animate;flame.position.copy(ball.position).addScaledVector(direction,.08);flame.quaternion.setFromUnitVectors(axis,direction);flame.scale.set(1,energy*(1+tier*.1),1);flameMaterial.uniforms.tint.value.copy(tint);flameMaterial.uniforms.time.value=time;flameMaterial.uniforms.energy.value=energy;
   orbitMaterial.color.copy(tint);orbitMaterial.opacity=.3+energy*.4;
   rings.forEach((ring,i)=>{ring.visible=tier>=4&&animate;ring.position.copy(ball.position);ring.rotation.set(time*(i?3:-2),time*2+i*1.6,i*Math.PI/2);ring.scale.setScalar((1+i*.3)*(1+pulse*.4));});
   shock.visible=animate&&pulse>0;shock.position.copy(ball.position);shock.rotation.set(Math.PI/2,time*2,0);shock.scale.setScalar(1+(1-pulse)*(3+tier));shock.material.color.copy(tint);shock.material.opacity=pulse*.7;
   embers.visible=animate;
   if(!animate){ages.fill(0);geometry.setDrawRange(0,0);active=0;return;}
   if(fresh)emit(12+tier*7,true);
   budget+=dt*(8+tier*10)*energy;const count=Math.floor(budget);budget-=count;emit(count);
   active=0;
   for(let i=0;i<capacity;i++)if(ages[i]>0){
    const j=i*3;ages[i]-=dt;positions[j]+=velocities[j]*dt;positions[j+1]+=velocities[j+1]*dt;positions[j+2]+=velocities[j+2]*dt;velocities[j+1]-=dt*.3;
    const k=active++*3;rendered[k]=positions[j];rendered[k+1]=positions[j+1];rendered[k+2]=positions[j+2];
    particleTint.copy(tint);if(tier>=5)particleTint.setHSL((i*.13+time*.2)%1,.9,.6);particleTint.multiplyScalar(Math.max(0,ages[i]/lifetimes[i]));colors[k]=particleTint.r;colors[k+1]=particleTint.g;colors[k+2]=particleTint.b;
   }
   geometry.setDrawRange(0,active);geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
  },
  get state(){return {tier,stage:HEAT_STAGES[tier].name,activeParticles:active,capacity,drawCalls:objects.filter(o=>o.visible).length,attempt:key};},
  dispose(){reset();scene.remove(...objects);geometry.dispose();material.dispose();halo.geometry.dispose();halo.material.dispose();flame.geometry.dispose();flame.material.dispose();orbitGeometry.dispose();orbitMaterial.dispose();shock.geometry.dispose();shock.material.dispose();}
 };
}
