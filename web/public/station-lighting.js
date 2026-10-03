import * as THREE from 'three';
import {yieldLoadingUI} from './loading.js';

// Coordinates are renderer world space (native Z is negated). The blend weights
// are attached to architecture, never to the camera or a per-frame probe selector.
export const STATION_PROBES=Object.freeze([
  {name:'hall',position:[0,8,1]},
  {name:'west-gallery',position:[-57,10,18]},
  {name:'garden',position:[-156,57,20.4]}
]);
const CANOPY_PROBE=Object.freeze({name:'north-exterior',position:[-5,30,-45]});
const RESTAURANT_PROBE=Object.freeze({name:'restaurant-entry',position:[-133.3,46.3,24]});
const DINING_PROBE=Object.freeze({name:'daruma-dining',position:[-90.45,46.73,17.12]});
const COURT_PROBE=Object.freeze({name:'east-court',position:[110,32,1],resolution:512});

// Fixed authored sources illuminate the dining capture independently of the
// camera-selected live pool. These lights exist only during its six cube faces.
export function createDiningCaptureLighting(authoredLights){
  const group=new THREE.Group();group.name='Temporary Daruma capture lighting';
  for(const fixture of authoredLights.filter(l=>l.id.startsWith('restaurant-practical-daruma-pendant-lens-')||l.id==='restaurant-practical-daruma-kitchen-strip')){
    const light=new THREE.SpotLight();light.name=fixture.id;
    light.color.setRGB(fixture.linearColor.r,fixture.linearColor.g,fixture.linearColor.b);
    light.intensity=Math.min(180,fixture.intensity*8);light.distance=fixture.range;
    light.angle=THREE.MathUtils.degToRad(fixture.spotAngle/2);light.penumbra=1-fixture.innerSpotAngle/fixture.spotAngle;
    light.position.set(fixture.position.x,fixture.position.y-.08,-fixture.position.z);
    light.target.position.copy(light.position).add(new THREE.Vector3(fixture.direction.x,fixture.direction.y,-fixture.direction.z));
    group.add(light,light.target);
  }
  return group;
}

export function configureStationDaylight(renderer,scene,sun){
  renderer.toneMappingExposure=1.0;
  scene.fog=new THREE.Fog(0xc1d0d7,195,440);
  scene.background=scene.fog.color.clone();
  for(const light of scene.children)if(light.isHemisphereLight){light.color.set(0xcbddeb);light.groundColor.set(0x8b8b7e);light.intensity=.78;}
  // Keep the accepted fixed sun direction/footprint; deepen shelter by reducing
  // uniform fill, while localized station irradiance restores its readable bounce.
  sun.color.set(0xfff1df);sun.intensity=2.15;sun.position.set(-55,110,-65);sun.target.position.set(-20,0,0);scene.add(sun.target);
}

export function createStationReflections(renderer,scene,architecture,{canopy=false,courtyardMaterials=[],restaurantMaterials=[],diningMaterials=[],authoredLights=[]}={}){
  const uniforms={stationHall:{value:null},stationGallery:{value:null},stationGarden:{value:null},stationExterior:{value:null}};
  const zones=[...STATION_PROBES,...(canopy?[CANOPY_PROBE]:[]),...(courtyardMaterials.length?[COURT_PROBE]:[]),...(restaurantMaterials.length?[RESTAURANT_PROBE]:[]),...(diningMaterials.length?[DINING_PROBE]:[])];
  const stats={zones,captures:0,resolution:256,courtyardResolution:courtyardMaterials.length?512:0,courtyardMaterials:courtyardMaterials.map(m=>m.name),restaurantMaterials:restaurantMaterials.map(m=>m.name),diningMaterials:diningMaterials.map(m=>m.name),diningCaptureLights:0,pmremBytes:0,captureMilliseconds:0};
  const targets=[];let captured=false,disposed=false;
  function patch(shader,{canopy=false}={}){
    const functions=`
#ifdef ENVMAP_TYPE_CUBE_UV
uniform sampler2D stationHall;
uniform sampler2D stationGallery;
uniform sampler2D stationGarden;
${canopy?'uniform sampler2D stationExterior;':''}
vec4 stationRadiance(vec3 direction,float roughness){
${canopy?`
  // The exterior side sees the forecourt; the inner side keeps the hall probes.
  // Correct source normals to the outward (north/up) hemisphere, independent
  // of double-sided rasterization and triangle winding.
  vec3 outward=normalize(vStationNormal);
  if(dot(outward,vec3(0.0,1.0,-1.0))<0.0)outward=-outward;
  if(dot(cameraPosition-vStationPosition,outward)>0.0)
    return textureCubeUV(stationExterior,direction,roughness);
`:''}
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
  async function capture(){
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
    // A one-time local probe preserves the authored palette and roughness. Its
    // higher resolution serves the broad mirror panels; no frame loop is added.
    const courtCube=courtyardMaterials.length?new THREE.WebGLCubeRenderTarget(512,{type:THREE.HalfFloatType,generateMipmaps:false,minFilter:THREE.LinearFilter}):null;
    const courtProbe=courtCube?new THREE.CubeCamera(.3,180,courtCube):null;
    async function prepareCapture(camera,target){
      const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
      // Cubemaps use linear output without the canvas tone mapping. Compiling
      // against the canvas warms a different program and still stalls here.
      try{renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera.children[0]);}
      finally{renderer.setRenderTarget(previous,face,mip);}
    }
    try{
      // Upload each texture before the first cubemap render. Otherwise the
      // first face performs every decode/upload in one long main-thread task.
      const textures=new Set();
      scene.traverseVisible(o=>{
        for(const material of Array.isArray(o.material)?o.material:[o.material])
          if(material)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      });
      let slice=performance.now();
      for(const texture of textures){
        renderer.initTexture(texture);
        if(performance.now()-slice>12){await yieldLoadingUI();slice=performance.now();}
      }
      // These captures use different lights and no environment. Warm their
      // shader programs before rendering, as well as the final game programs.
      await prepareCapture(probe,cube);
      pmrem.compileCubemapShader();
      await yieldLoadingUI();
      for(const zone of zones){
        const camera=zone===COURT_PROBE?courtProbe:probe,targetCube=zone===COURT_PROBE?courtCube:cube;
        camera.position.fromArray(zone.position);
        if(zone===DINING_PROBE){
          const lighting=createDiningCaptureLighting(authoredLights);scene.add(lighting);
          stats.diningCaptureLights=lighting.children.filter(o=>o.isLight).length;
          try{await prepareCapture(camera,targetCube);camera.update(renderer,scene);}
          finally{scene.remove(lighting);for(const light of lighting.children)if(light.isLight)light.dispose();}
        }else camera.update(renderer,scene);
        const target=pmrem.fromCubemap(targetCube.texture);target.texture.name=`K026 ${zone.name} PMREM`;targets.push(target);stats.captures++;
        stats.pmremBytes+=target.width*target.height*8;
        await yieldLoadingUI();
      }
      uniforms.stationHall.value=targets[0].texture;uniforms.stationGallery.value=targets[1].texture;uniforms.stationGarden.value=targets[2].texture;
      if(canopy)uniforms.stationExterior.value=targets[3].texture;
      if(courtyardMaterials.length){
        const local=targets[zones.indexOf(COURT_PROBE)].texture;
        for(const material of courtyardMaterials){material.envMap=local;material.envMapIntensity=.85;material.needsUpdate=true;}
      }
      // Capture the real doorway frame once for the polished restaurant floor.
      if(restaurantMaterials.length){
        const local=targets[zones.indexOf(RESTAURANT_PROBE)].texture;
        for(const material of restaurantMaterials){material.envMap=local;material.envMapIntensity=.85;material.needsUpdate=true;}
      }
      if(diningMaterials.length){
        const local=targets[zones.indexOf(DINING_PROBE)].texture;
        for(const material of diningMaterials){material.envMap=local;material.envMapIntensity=1;material.needsUpdate=true;}
      }
      scene.environment=targets[0].texture;scene.environmentIntensity=.85;
      old?.dispose();renderer.shadowMap.autoUpdate=false;
    }catch(error){targets.forEach(t=>t.dispose());targets.length=0;scene.environment=old;renderer.shadowMap.autoUpdate=previousShadowUpdate;throw error;}
    finally{hidden.forEach(([o,visible])=>o.visible=visible);cube.dispose();courtCube?.dispose();pmrem.dispose();stats.captureMilliseconds=performance.now()-started;}
  }
  function dispose(){
    if(disposed)return;disposed=true;
    if(targets.some(t=>scene.environment===t.texture))scene.environment=null;
    for(const material of [...courtyardMaterials,...restaurantMaterials,...diningMaterials])if(targets.some(t=>material.envMap===t.texture)){material.envMap=null;material.needsUpdate=true;}
    targets.forEach(t=>t.dispose());targets.length=0;
  }
  return {uniforms,patch,capture,dispose,stats};
}
