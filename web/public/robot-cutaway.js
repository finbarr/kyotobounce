import {Vector3} from 'three';

// A small, feathered window through foreground architecture. Export batches
// can contain walls on several floors, so never fade a whole mesh/material.
// Fragment coverage changes only: collision, shadows and reflections stay put.
export class RobotCutaway {
  constructor(){
    this.uniforms={robotCutawayEye:{value:new Vector3()},robotCutawayTarget:{value:new Vector3()},robotCutawayAmount:{value:0}};
    this.materials=new Set();
  }
  apply(root){
    root.traverse(object=>{
      if(!object.isMesh)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!material||this.materials.has(material))continue;
        this.materials.add(material);
        const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
        material.onBeforeCompile=(shader,renderer)=>{
          previous.call(material,shader,renderer);
          Object.assign(shader.uniforms,this.uniforms);
          shader.vertexShader='varying vec3 vRobotCutawayPosition;\n'+shader.vertexShader;
          // Moving steps are instanced; use the same transform as the draw.
          shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
            vec4 cutawayPosition=vec4(transformed,1.0);
            #ifdef USE_BATCHING
              cutawayPosition=batchingMatrix*cutawayPosition;
            #endif
            #ifdef USE_INSTANCING
              cutawayPosition=instanceMatrix*cutawayPosition;
            #endif
            vRobotCutawayPosition=(modelMatrix*cutawayPosition).xyz;`);
          shader.fragmentShader=`varying vec3 vRobotCutawayPosition;
uniform vec3 robotCutawayEye;
uniform vec3 robotCutawayTarget;
uniform float robotCutawayAmount;
`+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
            if(robotCutawayAmount>0.001){
              vec3 axis=robotCutawayTarget-robotCutawayEye;
              float lengthToRobot=length(axis);
              axis/=max(lengthToRobot,0.001);
              vec3 relative=vRobotCutawayPosition-robotCutawayEye;
              float along=dot(relative,axis);
              // Do not erase the target wall or floor beyond the robot.
              float foreground=(1.0-smoothstep(lengthToRobot-0.15,lengthToRobot,along))*step(-0.1,along);
              float radial=length(relative-axis*along);
              float windowCoverage=1.0-smoothstep(1.15,1.55,radial);
              float coverage=foreground*windowCoverage*robotCutawayAmount;
              float noise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
              if(coverage>noise)discard;
            }`);
        };
        material.customProgramCacheKey=()=>key+'|robot-cutaway-v1';material.needsUpdate=true;
      }
    });
  }
  update(eye,target,enabled,dt){
    this.uniforms.robotCutawayEye.value.copy(eye);
    this.uniforms.robotCutawayTarget.value.copy(target);
    const amount=this.uniforms.robotCutawayAmount;
    amount.value+=(Number(enabled)-amount.value)*(1-Math.exp(-dt*18));
    if(amount.value<.001)amount.value=0;
    if(amount.value>.999)amount.value=1;
  }
  clear(){this.uniforms.robotCutawayAmount.value=0;}
}
