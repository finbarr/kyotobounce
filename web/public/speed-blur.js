import * as THREE from 'three';
export const BLUR_START_SPEED=45,BLUR_FULL_SPEED=90;
export function speedBlurAmount(speed){
 if(!Number.isFinite(speed))return 0;
 const t=Math.max(0,Math.min(1,(speed-BLUR_START_SPEED)/(BLUR_FULL_SPEED-BLUR_START_SPEED)));
 return t*t*(3-2*t);
}
// Use this frame's authoritative velocity, not apparent camera travel. A bounce
// or a paused/slow replay must reduce blur immediately, without a ghost trail.
export function presentationSpeed(velocity,phase,playbackRate=1){
 if(phase!=='Flight'||!velocity||![velocity.x,velocity.y,velocity.z,playbackRate].every(Number.isFinite))return 0;
 return Math.hypot(velocity.x,velocity.y,velocity.z)*Math.max(0,Math.min(1,playbackRate));
}
export function speedBlur(renderer){
 let texture;
 // Blur the already lit, anti-aliased frame on the GPU. This preserves the
 // existing sky, transparent effects and tone mapping exactly at the threshold.
 const uniforms={image:{value:null},amount:{value:0},focus:{value:new THREE.Vector2(.5,.5)},drift:{value:new THREE.Vector2()},aspect:{value:1}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:`uniform sampler2D image; uniform float amount; uniform vec2 focus; uniform vec2 drift; uniform float aspect; varying vec2 vUv;
  void main(){
   vec2 radial=vUv-focus;
   float radius=length(radial*vec2(aspect,1.0));
   // A clear area around the ball preserves targets and contact readability.
   float mask=smoothstep(.065,.38,radius);
   vec2 smear=(radial*.035+drift*.016)*amount*mask;
   vec3 color=texture2D(image,vUv).rgb*.24;
   for(int i=1;i<=16;i++){float t=float(i)/16.0;vec2 uv=clamp(vUv-smear*t,vec2(.001),vec2(.999));color+=texture2D(image,uv).rgb*(.76/16.0);}
   gl_FragColor=vec4(color,1.0);
  }`});
 const screen=new THREE.Scene(),camera=new THREE.Camera(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);screen.add(quad);
 const size=new THREE.Vector2(),projected=new THREE.Vector3(),localVelocity=new THREE.Vector3(),inverse=new THREE.Quaternion();
 let prepared=false;const state={speed:0,amount:0,active:false};
 function resize(){
  renderer.getDrawingBufferSize(size);
  if(!texture||texture.image.width!==size.x||texture.image.height!==size.y){
   texture?.dispose();texture=new THREE.FramebufferTexture(size.x,size.y);texture.minFilter=texture.magFilter=THREE.LinearFilter;
   uniforms.image.value=texture;renderer.initTexture(texture);
  }
  uniforms.aspect.value=size.x/size.y;
 }
 return {state,
  async prepare(){resize();await renderer.compileAsync(screen,camera);prepared=true;},
  render(scene,view,{velocity,phase,ball,playbackRate=1,reducedMotion=false}={}){
   state.speed=presentationSpeed(velocity,phase,playbackRate);state.amount=reducedMotion?0:speedBlurAmount(state.speed);state.active=prepared&&state.amount>0;
   if(!state.active){renderer.render(scene,view);return;}
   resize();uniforms.amount.value=state.amount;
   projected.copy(ball).project(view);uniforms.focus.value.set(THREE.MathUtils.clamp(projected.x*.5+.5,.05,.95),THREE.MathUtils.clamp(projected.y*.5+.5,.05,.95));
   inverse.copy(view.quaternion).invert();localVelocity.set(velocity.x,velocity.y,-velocity.z).applyQuaternion(inverse);
   uniforms.drift.value.set(localVelocity.x,-localVelocity.y).multiplyScalar(1/Math.max(1,state.speed/playbackRate));
   const autoReset=renderer.info.autoReset;renderer.info.reset();renderer.info.autoReset=false;
   try{renderer.render(scene,view);renderer.copyFramebufferToTexture(texture);renderer.render(screen,camera);}
   finally{renderer.info.autoReset=autoReset;}
  },
  dispose(){texture?.dispose();quad.geometry.dispose();material.dispose();}
 };
}
