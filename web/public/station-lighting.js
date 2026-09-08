import * as THREE from 'three';

// Coordinates are renderer world space (native Z is negated). The blend weights
// are attached to architecture, never to the camera or a per-frame probe selector.
export const STATION_PROBES=Object.freeze([
  {name:'hall',position:[0,8,1]},
  {name:'west-gallery',position:[-57,10,18]},
  {name:'garden',position:[-156,57,20.4]}
]);

export function stationDaylightTexture(){
  const width=256,height=128,pixels=new Uint16Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const elevation=Math.cos(y/(height-1)*Math.PI),azimuth=x/width*Math.PI*2;
    const up=Math.max(0,elevation),haze=Math.pow(1-up,4);
    // Original low-frequency cloud bands, periodic in azimuth. These provide
    // broad exterior reflection structure, not an invented station/city photo.
    const cloud=Math.max(0,Math.sin(azimuth*3+up*14)+.45*Math.sin(azimuth*7-up*19)-.75)*.22*Math.sin(Math.PI*up);
    const sky=[.24+.8*haze+cloud,.48+.65*haze+cloud,.78+.48*haze+cloud];
    const rgb=elevation>=0?sky:[.21,.24,.23];
    const p=(y*width+x)*4;for(let c=0;c<3;c++)pixels[p+c]=THREE.DataUtils.toHalfFloat(rgb[c]);pixels[p+3]=THREE.DataUtils.toHalfFloat(1);
  }
  const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.HalfFloatType);
  texture.name='K026 original daylight radiance';texture.colorSpace=THREE.LinearSRGBColorSpace;
  // Equirectangular v=1 is zenith; row zero was generated as the upper sky.
  texture.flipY=true;texture.mapping=THREE.EquirectangularReflectionMapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}

export function configureStationDaylight(renderer,scene,sun){
  renderer.toneMappingExposure=1.0;
  scene.background=stationDaylightTexture();scene.fog=new THREE.Fog(0xc1d0d7,195,440);
  for(const light of scene.children)if(light.isHemisphereLight){light.color.set(0xcbddeb);light.groundColor.set(0x6e7065);light.intensity=.58;}
  // Keep the accepted fixed sun direction/footprint; deepen shelter by reducing
  // uniform fill, while localized station irradiance restores its readable bounce.
  sun.color.set(0xfff1df);sun.intensity=2.65;sun.position.set(-55,110,-65);sun.target.position.set(-20,0,0);scene.add(sun.target);
}

export function createStationReflections(renderer,scene,architecture){
  const uniforms={stationHall:{value:null},stationGallery:{value:null},stationGarden:{value:null}};
  const stats={zones:STATION_PROBES,captures:0,resolution:256,pmremBytes:0,captureMilliseconds:0};
  const targets=[];let captured=false,disposed=false;
  function patch(shader){
    const functions=`
#ifdef ENVMAP_TYPE_CUBE_UV
uniform sampler2D stationHall;
uniform sampler2D stationGallery;
uniform sampler2D stationGarden;
vec4 stationRadiance(vec3 direction,float roughness){
  // Smooth fixed boundaries also work on large export batches spanning floors.
  float garden=smoothstep(43.0,53.0,vStationPosition.y)*(1.0-smoothstep(-133.0,-111.0,vStationPosition.x));
  float gallery=(1.0-smoothstep(-43.0,-25.0,vStationPosition.x))*(1.0-smoothstep(31.0,43.0,vStationPosition.y));
  vec4 radiance;
  if(garden>.999)radiance=textureCubeUV(stationGarden,direction,roughness);
  else {
    if(gallery>.999)radiance=textureCubeUV(stationGallery,direction,roughness);
    else {radiance=textureCubeUV(stationHall,direction,roughness);if(gallery>.001)radiance=mix(radiance,textureCubeUV(stationGallery,direction,roughness),gallery);}
    if(garden>.001)radiance=mix(radiance,textureCubeUV(stationGarden,direction,roughness),garden);
  }
  return radiance;
}
#endif
`;
    const chunk=THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll('textureCubeUV( envMap,','stationRadiance(');
    shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',functions+chunk);
  }
  function capture(){
    if(captured||disposed)return;captured=true;
    const started=performance.now(),old=scene.environment,hidden=[];
    // No ball, trail, target, avatar or mutable practical light baked into probes.
    for(const o of scene.children)if(!architecture.has(o)&&!o.isHemisphereLight&&!o.isDirectionalLight){hidden.push([o,o.visible]);o.visible=false;}
    scene.environment=null;
    // Static architecture needs one shadow render, not a repeated 4096 shadow
    // pass for every cubemap face. The first capture consumes needsUpdate.
    const previousShadowUpdate=renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    const pmrem=new THREE.PMREMGenerator(renderer);
    const cube=new THREE.WebGLCubeRenderTarget(256,{type:THREE.HalfFloatType,generateMipmaps:false,minFilter:THREE.LinearFilter});
    const probe=new THREE.CubeCamera(.3,360,cube);
    try{
      for(const zone of STATION_PROBES){
        probe.position.fromArray(zone.position);probe.update(renderer,scene);
        const target=pmrem.fromCubemap(cube.texture);target.texture.name=`K026 ${zone.name} PMREM`;targets.push(target);stats.captures++;
        stats.pmremBytes+=target.width*target.height*8;
      }
      uniforms.stationHall.value=targets[0].texture;uniforms.stationGallery.value=targets[1].texture;uniforms.stationGarden.value=targets[2].texture;
      scene.environment=targets[0].texture;scene.environmentIntensity=.85;
      old?.dispose();renderer.shadowMap.autoUpdate=false;
    }catch(error){targets.forEach(t=>t.dispose());targets.length=0;scene.environment=old;renderer.shadowMap.autoUpdate=previousShadowUpdate;throw error;}
    finally{hidden.forEach(([o,visible])=>o.visible=visible);cube.dispose();pmrem.dispose();stats.captureMilliseconds=performance.now()-started;}
  }
  function dispose(){if(disposed)return;disposed=true;if(targets.some(t=>scene.environment===t.texture))scene.environment=null;targets.forEach(t=>t.dispose());targets.length=0;}
  return {uniforms,patch,capture,dispose,stats};
}
