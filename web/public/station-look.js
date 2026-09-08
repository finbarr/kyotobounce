import * as THREE from 'three';
import { createStationTextures, stationMaterialFamily, applyStationMaterial, prepareGraniteMaps, isAuthoredStationFixture } from './station-materials.js';
import { configureStationDaylight, createStationReflections } from './station-lighting.js';

// Four fixed hardware-PCF taps soften texel stair steps without the default
// per-screen-pixel random rotation. The kernel lives in shadow-map coordinates,
// so moving the camera does not rotate the architectural shadow pattern.
// Keep the footprint tight: wider offsets self-shadow steep receiver planes.
const architecturalShadow=THREE.ShaderChunk.shadowmap_pars_fragment.replace(
  /shadow = \(\s*texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample[\s\S]*?\) \* 0\.2;/,
  `vec2 offset = texelSize * shadowRadius * .25;
  shadow = (
    texture( shadowMap, vec3( shadowCoord.xy + vec2(-offset.x,-offset.y), shadowCoord.z ) ) +
    texture( shadowMap, vec3( shadowCoord.xy + vec2( offset.x,-offset.y), shadowCoord.z ) ) +
    texture( shadowMap, vec3( shadowCoord.xy + vec2(-offset.x, offset.y), shadowCoord.z ) ) +
    texture( shadowMap, vec3( shadowCoord.xy + vec2( offset.x, offset.y), shadowCoord.z ) )
  ) * .25;`
);
THREE.ShaderChunk.shadowmap_pars_fragment=architecturalShadow;

// Fit once to the complete retained architecture, with a margin for actors.
// This stays fixed while walking: no camera-following shadow projection, no
// sacrificed rooftop coverage, and no increase to the existing 4096 map.
export function fitStationShadowCamera(sun,station){
  const camera=sun.shadow.camera,world=new THREE.Box3().setFromObject(station);
  camera.position.copy(sun.position);camera.lookAt(sun.target.position);camera.updateMatrixWorld(true);
  const lightBounds=new THREE.Box3();
  for(const x of [world.min.x,world.max.x])for(const y of [world.min.y,world.max.y])for(const z of [world.min.z,world.max.z]){
    lightBounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  }
  Object.assign(camera,{left:Math.floor(lightBounds.min.x-4),right:Math.ceil(lightBounds.max.x+4),
    bottom:Math.floor(lightBounds.min.y-4),top:Math.ceil(lightBounds.max.y+4),
    near:Math.max(.1,Math.floor(-lightBounds.max.z-4)),far:Math.ceil(-lightBounds.min.z+4)});
  camera.updateProjectionMatrix();
  return {width:camera.right-camera.left,height:camera.top-camera.bottom,near:camera.near,far:camera.far,
    texelMeters:[(camera.right-camera.left)/sun.shadow.mapSize.x,(camera.top-camera.bottom)/sun.shadow.mapSize.y]};
}

// Keep fixture identities through rank swaps. A slot fades fully out before it
// moves to a different fixture, then fades in; two shadowless shader lights stay
// allocated throughout. Time rollback cannot leave the selector waiting forever.
export function createStationLightPool(scene,authoredLights){
  const fixtures=authoredLights.filter(l=>l.position.y<15);
  const slots=Array.from({length:2},()=>{
    const light=new THREE.SpotLight(0xffdab0,0,15,Math.PI/3,.8,2);scene.add(light,light.target);
    return {light,fixture:null,desired:null,level:0};
  });
  let previousTime=null,nextSelection=0;
  const stats={selections:0,reassignments:0,clockResets:0,activeFixtures:[]};
  function assign(slot,fixture){
    slot.fixture=fixture;
    if(!fixture)return;
    const l=slot.light;stats.reassignments++;
    l.position.set(fixture.position.x,fixture.position.y-.08,-fixture.position.z);
    l.target.position.copy(l.position).add(new THREE.Vector3(fixture.direction.x,fixture.direction.y,-fixture.direction.z));
    l.distance=Math.min(19,fixture.range+5);
  }
  function update(position,time){
    const reset=previousTime!==null&&time<previousTime;
    if(reset){stats.clockResets++;nextSelection=time;}
    const dt=previousTime===null||reset?0:Math.max(0,Math.min(.1,time-previousTime));previousTime=time;
    if(time>=nextSelection){
      nextSelection=time+.25;stats.selections++;
      const retained=new Set(slots.map(s=>s.fixture));
      // A fixed squared-distance margin avoids excessive retention under tall
      // ceilings, where multiplying the vertical distance can hide new fixtures.
      const ranked=fixtures.map(f=>({f,d:(f.position.x-position.x)**2+(f.position.y-position.y)**2+(-f.position.z-position.z)**2}))
        .filter(r=>r.d<Math.min(19,r.f.range+5)**2)
        .sort((a,b)=>(a.d-(retained.has(a.f)?4:0))-(b.d-(retained.has(b.f)?4:0)));
      const selected=ranked.slice(0,slots.length).map(r=>r.f);
      // Preserve slot identity when the first and second nearest trade places.
      const remaining=selected.filter(f=>!slots.some(s=>s.fixture===f));
      for(const slot of slots)slot.desired=selected.includes(slot.fixture)?slot.fixture:(remaining.shift()||null);
    }
    for(const slot of slots){
      if(slot.fixture!==slot.desired){
        slot.level=Math.max(0,slot.level-dt/.35);
        if(slot.level===0)assign(slot,slot.desired);
      }else slot.level=slot.fixture?Math.min(1,slot.level+dt/.5):0;
      slot.light.intensity=slot.fixture?Math.min(180,slot.fixture.intensity*8)*slot.level:0;
    }
    stats.activeFixtures=slots.map(s=>({id:s.fixture?.id||null,desired:s.desired?.id||null,level:s.level,intensity:s.light.intensity}));
  }
  return {update,lights:slots.map(s=>s.light),stats};
}

export function dressStation(renderer,scene,sun,station,data){
  configureStationDaylight(renderer,scene,sun);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  const shadowCoverage=fitStationShadowCamera(sun,station);
  // Preserve the old world-space depth offset when fitting the near/far planes.
  // The old camera spanned 300 - 1 = 299 m; normalized bias scales with that range.
  sun.shadow.radius=1.2;sun.shadow.bias=-.00012*299/(sun.shadow.camera.far-sun.shadow.camera.near);sun.shadow.normalBias=.04;
  const textures=createStationTextures(renderer);
  // Both GLTF roots and authored sign groups are already attached by load().
  // Recognize hardware by its exported material names, without a game.js hook.
  const architecture=new Set([station]);
  for(const child of scene.children)if(child.isGroup&&child!==station){
    let hardware=false;
    child.traverse(o=>{const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m&&/Brushed stainless hardware|Escalator yellow safety enamel|Daytime stair lens/.test(m.name)))hardware=true;});
    if(hardware||child.name==='Atrium signs and flush floor finishes')architecture.add(child);
  }
  const reflections=createStationReflections(renderer,scene,architecture);
  const done=new Set(),families={},preservedMaps=[],resampledMaps=[];
  for(const root of architecture)root.traverse(o=>{
    if(!o.isMesh)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    if(root===station){o.receiveShadow=true;o.castShadow=materials.every(m=>!m.transparent&&!/glaz|Glass|lettering|diffuser|lamp|lens/i.test(m.name));}
    for(const m of materials){
      if(done.has(m))continue;done.add(m);
      if(isAuthoredStationFixture(m.name))continue;
      resampledMaps.push(...prepareGraniteMaps(m));
      for(const key of ['map','normalMap','roughnessMap'])if(m[key]){
        m[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        preservedMaps.push({material:m.name,slot:key,texture:m[key].uuid});
      }
      const family=stationMaterialFamily(m.name);
      if(family){applyStationMaterial(m,family,textures,reflections);families[family]=(families[family]||0)+1;}
      // Preserve the accepted practical-light emission appearance and pool.
      if(/diffuser|spotlight lens|warm opal downlight/.test(m.name)){
        m.emissive.set(0xffe0a7);m.emissiveIntensity=2.2;m.color.set(0xe6d8b8);
      }
      if(/closed gate indicator/.test(m.name)){m.emissive.set(0xf35832);m.emissiveIntensity=.7;}
    }
  });

  const fixtureLighting=createStationLightPool(scene,data.authoredLights);
  const updateLights=fixtureLighting.update;

  return {updateLights,captureEnvironment:reflections.capture,
    dispose(){textures.dispose();reflections.dispose();scene.background?.dispose();},
    stats:{finishedMaterials:done.size,families,preservedMaps,resampledMaps,generatedTextureBytes:textures.bytesWithMipmaps,
      reflection:reflections.stats,shadowMap:4096,reflectionProbe:256,shadowCoverage,shadowFilterTaps:4,fixtureLighting:fixtureLighting.stats}};
}

export function contactShadow(scene,station){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,2,32,32,32);
  g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.45,'rgba(0,0,0,.24)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const material=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;scene.add(mesh);
  const ray=new THREE.Raycaster();ray.firstHitOnly=true;ray.ray.direction.set(0,-1,0);ray.far=8;
  const up=new THREE.Vector3(0,0,1);
  return (position,radius,visible=true)=>{
    mesh.visible=visible;if(!visible)return;
    ray.ray.origin.copy(position).add(new THREE.Vector3(0,.2,0));
    const hit=ray.intersectObject(station,true).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.45);
    if(!hit){mesh.visible=false;return;}
    const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),height=Math.max(0,position.y-hit.point.y);
    mesh.position.copy(hit.point).addScaledVector(normal,.008);mesh.quaternion.setFromUnitVectors(up,normal);
    mesh.scale.setScalar(radius*(1+height*.25));material.opacity=Math.max(0,1-height/7);
  };
}
