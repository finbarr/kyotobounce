// Native coordinates, counterclockwise around the station and first forecourt block.
// The north edge sits behind Kyoto Tower (rear Z < 200 m). The wider southern
// half includes the railway and both station entrances.
export const STATION_BOUNDARY = Object.freeze({
  footprint: [[-430,-280],[275,-280],[275,10],[210,212],[-350,212],[-430,0]],
  floor: -18,
  ceiling: 145,
  fogWidth: 16,
});

export class StationBoundary {
  constructor(spec = STATION_BOUNDARY) {
    this.spec = spec;
    this.edges = spec.footprint.map(([x,z],i,points) => {
      const [bx,bz] = points[(i+1)%points.length], dx=bx-x, dz=bz-z, length=Math.hypot(dx,dz);
      return {x,z,dx,dz,length,nx:dz/length,nz:-dx/length};
    });
  }
  contains(position) {
    return position.y>=this.spec.floor && position.y<=this.spec.ceiling &&
      this.edges.every(e=>e.nx*(position.x-e.x)+e.nz*(-position.z-e.z)<=1e-7);
  }
  constrain(position) {
    const x=position.x,z=-position.z;
    position.y=Math.max(this.spec.floor,Math.min(this.spec.ceiling,position.y));
    if(this.edges.every(e=>e.nx*(x-e.x)+e.nz*(z-e.z)<=1e-7))return position;
    let best=Infinity,px=x,pz=z;
    for(const e of this.edges){
      const t=Math.max(0,Math.min(1,((x-e.x)*e.dx+(z-e.z)*e.dz)/(e.length*e.length)));
      const qx=e.x+t*e.dx,qz=e.z+t*e.dz,d=(x-qx)**2+(z-qz)**2;
      if(d<best){best=d;px=qx;pz=qz;}
    }
    return position.set(px,position.y,-pz);
  }
  fogAmount(position) {
    const distance=Math.max(...this.edges.map(e=>e.nx*(position.x-e.x)+e.nz*(-position.z-e.z)));
    const t=Math.max(0,Math.min(1,1+distance/this.spec.fogWidth));
    return t*t*(3-2*t);
  }
  applyFog(root) {
    const seen=new Set(),f=n=>Number(n).toFixed(9),suffix='|station-boundary-v1|'+JSON.stringify(this.spec);
    const distances=this.edges.map(e=>`dot(vec2(${f(e.nx)},${f(-e.nz)}),vBoundaryPosition.xz-vec2(${f(e.x)},${f(-e.z)}))`);
    const distance=distances.reduce((a,b)=>`max(${a},${b})`);
    root.traverse(object=>{
      if(!object.material)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(material.fog===false||seen.has(material)||material.userData.stationBoundaryFog)continue;
        seen.add(material);material.userData.stationBoundaryFog=true;
        const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
        material.onBeforeCompile=(shader,renderer)=>{
          previous.call(material,shader,renderer);
          shader.vertexShader='varying vec3 vBoundaryPosition;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
            vec4 boundaryPosition=${material.isSpriteMaterial?'vec4(0.0,0.0,0.0,1.0)':'vec4(transformed,1.0)'};
            #ifdef USE_BATCHING
              boundaryPosition=batchingMatrix*boundaryPosition;
            #endif
            #ifdef USE_INSTANCING
              boundaryPosition=instanceMatrix*boundaryPosition;
            #endif
            vBoundaryPosition=(modelMatrix*boundaryPosition).xyz;`);
          shader.fragmentShader='varying vec3 vBoundaryPosition;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
            #ifdef USE_FOG
              float boundaryFog=smoothstep(-${f(this.spec.fogWidth)},0.0,${distance});
              gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,boundaryFog);
            #endif`);
        };
        material.customProgramCacheKey=()=>cacheKey+suffix;
        material.needsUpdate=true;
      }
    });
  }
}
