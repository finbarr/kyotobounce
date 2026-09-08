import * as THREE from 'three';

// Three 0.185's default PCF uses five rotated hardware samples (20 depth
// comparisons) per shaded pixel. One hardware-filtered sample is sufficient
// for this static 4K architectural map and avoids expensive grain on the glass.
// Keep this application-local; the installed Three source is not modified.
const architecturalShadow=THREE.ShaderChunk.shadowmap_pars_fragment.replace(
  /shadow = \(\s*texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample[\s\S]*?\) \* 0\.2;/,
  'shadow = texture( shadowMap, shadowCoord.xyz );'
);
THREE.ShaderChunk.shadowmap_pars_fragment=architecturalShadow;

// Architectural finish layer. It uses the exported station's real coordinates;
// none of these material changes replace walking or ball collision surfaces.
function finish(material,kind) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying vec3 vFinishPosition;
varying vec3 vFinishNormal;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vFinishPosition=(modelMatrix*vec4(transformed,1.0)).xyz;
vFinishNormal=normalize(mat3(modelMatrix)*objectNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vFinishPosition;
varying vec3 vFinishNormal;
float finishHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float finishJoint(vec2 p,vec2 spacing,float width){
  vec2 edge=abs(fract(p/spacing+.5)-.5)*spacing;
  vec2 aa=max(fwidth(p),vec2(.0008));
  vec2 line=(1.0-smoothstep(vec2(width),vec2(width)+aa,edge))*min(vec2(1.0),vec2(width)/aa);
  return max(line.x,line.y);
}`);
    const surface=`
vec3 fn=abs(normalize(vFinishNormal));
vec2 fp=fn.y>.65?vFinishPosition.xz:(fn.x>fn.z?vFinishPosition.zy:vFinishPosition.xy);
`;
    let detail='';
    if(kind==='floor')detail=`
float joint=finishJoint(fp,vec2(.6),.002);
float tile=finishHash(floor(fp/.6+.5));
float inset=finishJoint(fp,vec2(4.8),.065);
diffuseColor.rgb*=mix(.95,1.05,tile)*mix(1.0,.65,joint)*mix(1.0,.84,inset);
// Fine crystalline grain fades before it can shimmer in the distance.
float grain=finishHash(floor(fp*900.0));
float grainFade=1.0-smoothstep(.0007,.006,max(fwidth(fp.x),fwidth(fp.y)));
diffuseColor.rgb*=1.0+(grain-.5)*.24*grainFade;
`;
    if(kind==='panel')detail=`
float joint=finishJoint(fp,vec2(1.44,.72),.005);
float panel=finishHash(floor(fp/vec2(1.44,.72)+.5));
diffuseColor.rgb*=mix(.92,1.04,panel)*mix(1.0,.32,joint);
// A modest darker foot course gives the cladding a grounded, maintained finish.
diffuseColor.rgb*=mix(.87,1.0,smoothstep(0.0,1.2,mod(vFinishPosition.y,7.35)));
`;
    if(kind==='cassette')detail=`
// Photo-guided mineral cassette grid: joints and recessed square vent fields.
// Surface-only shading, kept off glass, signs, columns and the curved canopy.
vec2 module=vec2(1.44,1.44);
vec2 local=fract(fp/module+.5)*module;
float joint=finishJoint(fp,module,.007);
float panel=finishHash(floor(fp/module+.5));
vec2 field=abs(local-vec2(.72));
vec2 aa=max(fwidth(fp),vec2(.001));
float ventField=(1.0-smoothstep(.46,.46+aa.x,field.x))*(1.0-smoothstep(.46,.46+aa.y,field.y));
// Sparse repeating service panels within a restrained mineral-cladding field.
vec2 cell=floor(fp/module+.5);
float service=step(.5,mod(cell.x,5.0))*step(mod(cell.x,5.0),1.5);
service*=step(.5,mod(cell.y,6.0))*step(mod(cell.y,6.0),3.5);
vec2 hole=abs(fract((local-.24)/.16+.5)-.5)*.16;
vec2 aperture=1.0-smoothstep(vec2(.043),vec2(.043)+aa,hole);
// Only vertical upper facade zones carry service grilles. Never stamp the
// pattern onto soffits, caps, floor slabs or small ground-level enclosures.
float facade=step(fn.y,.3)*step(8.0,vFinishPosition.y)*step(18.0,abs(vFinishPosition.x));
float holes=aperture.x*aperture.y*ventField*service*facade;
float fade=1.0-smoothstep(.035,.10,max(aa.x,aa.y));
diffuseColor.rgb*=mix(.94,1.04,panel)*mix(1.0,.38,joint)*mix(1.0,.22,holes*fade);
`;
    if(kind==='stair')detail=`
// Metric joints/grain on the retained treads. The baked UV nosing stays intact.
float joint=finishJoint(fp,vec2(.6),.0015)*step(.65,fn.y);
float grain=finishHash(floor(fp*600.0));
float fade=1.0-smoothstep(.002,.012,max(fwidth(fp.x),fwidth(fp.y)));
diffuseColor.rgb*=mix(1.0,.65,joint)*(1.0+(grain-.5)*.12*fade);
`;
    if(kind==='metal')detail=`
float joint=finishJoint(fp,vec2(2.88,.72),.003);
diffuseColor.rgb*=mix(1.0,.55,joint);
`;
    if(kind==='stone')detail=`
float joint=finishJoint(fp,vec2(.9,.45),.003);
diffuseColor.rgb*=mix(.94,1.06,finishHash(floor(fp/vec2(.9,.45)+.5)))*mix(1.0,.4,joint);
`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${surface}${detail}`);
    if(kind==='floor')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(tile-.5)*.08+joint*.24+inset*.08,.18,.65);`);
  };
  material.customProgramCacheKey=()=>`kyoto-finish-4-${kind}`;
}

function skyTexture(){
  const c=document.createElement('canvas');c.width=16;c.height=256;
  const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#6d95b8');g.addColorStop(.46,'#c7d7de');g.addColorStop(.63,'#eef0e8');g.addColorStop(1,'#899599');
  ctx.fillStyle=g;ctx.fillRect(0,0,16,256);
  const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function dressStation(renderer,scene,sun,station,data){
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene.background=skyTexture();scene.fog=new THREE.Fog(0xcbd6d9,175,420);
  for(const light of scene.children)if(light.isHemisphereLight){light.color.set(0xdde9f3);light.groundColor.set(0x72746b);light.intensity=.72;}
  sun.color.set(0xfff2df);sun.intensity=2.4;sun.position.set(-55,110,-65);sun.target.position.set(-20,0,0);scene.add(sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-165,right:165,top:115,bottom:-115,near:1,far:300});
  sun.shadow.bias=-.00012;sun.shadow.normalBias=.04;sun.shadow.camera.updateProjectionMatrix();
  const done=new Set();
  station.traverse(o=>{
    if(!o.isMesh)return;
    const m=o.material,name=m.name;
    o.receiveShadow=true;o.castShadow=!m.transparent&&!/glaz|Glass|lettering|diffuser|lamp|lens/i.test(name);
    if(done.has(m))return;done.add(m);
    for(const key of ['map','normalMap'])if(m[key])m[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    m.envMapIntensity=.65;
    if(name.includes('honed granite floor')){
      m.map=null;m.normalMap=null;m.color.set(0x343b3c);m.roughness=.29;m.metalness=.04;m.envMapIntensity=.65;finish(m,'floor');
    }else if(/Canopy steel/.test(name)){
      m.color.set(0x555f61);m.metalness=.65;m.roughness=.32;m.envMapIntensity=.85;
    }else if(/^Pale cladding|enclosure mineral|East frontage \| structural mineral/.test(name)){
      m.color.set(0xa8aba5);m.metalness=.08;m.roughness=.53;finish(m,'cassette');
    }else if(/Facade -|pale mineral|structural mineral/.test(name)){
      m.color.set(0xa8aba5);m.metalness=.08;m.roughness=.53;finish(m,'panel');
    }else if(/Silver facade|brushed balcony|satin mullions/.test(name)){
      m.color.set(0x969fa0);m.metalness=.72;m.roughness=.3;finish(m,'metal');
    }else if(/Granite -|Stone -|dark mineral base|recess backing/.test(name)){
      m.color.set(0x454b4b);m.metalness=.02;m.roughness=.4;finish(m,'stone');
    }else if(/Rose facade/.test(name)){
      m.color.set(0x837b73);m.roughness=.58;finish(m,'panel');
    }else if(/Steel -|satin gate stainless/.test(name)){
      m.color.set(0xadb7b7);m.metalness=.86;m.roughness=.24;m.envMapIntensity=1;
    }else if(/Reflective facade glazing|North courtyard coated glazing/.test(name)){
      m.color.set(0x879f9e);m.metalness=.88;m.roughness=.085;m.envMapIntensity=1.25;
    }else if(/Glass -/.test(name)){
      m.color.set(0x9db9b3);m.opacity=.23;m.metalness=.5;m.roughness=.1;m.depthWrite=false;m.envMapIntensity=1.1;
    }else if(/Stair stone|Stair nosing finish|East stair/.test(name)){
      // Honor the original metric granite and 25 mm pale nosing texture. The
      // nosing family previously missed this finish branch on the west stairs.
      m.color.set(0x969f9b);m.roughness=.66;m.metalness=.02;
      m.normalScale.setScalar(.45);finish(m,'stair');
    }else if(/Rubber handrail/.test(name)){
      m.color.set(0x171c1d);m.roughness=.52;
    }
    if(/diffuser|spotlight lens|warm opal downlight/.test(name)){
      m.emissive.set(0xffe0a7);m.emissiveIntensity=2.2;m.color.set(0xe6d8b8);
    }
    if(/closed gate indicator/.test(name)){m.emissive.set(0xf35832);m.emissiveIntensity=.7;}
    m.needsUpdate=true;
  });

  // Select the nearest practical lights at runtime, keeping shader light count
  // fixed. All visible fixtures emit, including those outside this small pool.
  const fixtures=data.authoredLights.filter(l=>l.position.y<15);
  const pool=Array.from({length:2},()=>{const l=new THREE.SpotLight(0xffdab0,0,15,Math.PI/3,.8,2);scene.add(l,l.target);return l;});
  let nextLightUpdate=0;
  function updateLights(position,time){
    if(time<nextLightUpdate)return;nextLightUpdate=time+.4;
    const nearest=fixtures.map(l=>({l,d:(l.position.x-position.x)**2+(l.position.y-position.y)**2+(-l.position.z-position.z)**2})).sort((a,b)=>a.d-b.d).slice(0,pool.length);
    pool.forEach((light,i)=>{const rec=nearest[i];if(!rec){light.intensity=0;return;}const l=rec.l;
      light.position.set(l.position.x,l.position.y-.08,-l.position.z);light.intensity=Math.min(180,l.intensity*8);light.distance=Math.min(19,l.range+5);
      light.target.position.copy(light.position).add(new THREE.Vector3(l.direction.x,l.direction.y,-l.direction.z));
    });
  }

  // A static HDR probe captures this station's trusses, windows and floor.
  // Unlike the old generic room environment, highlights now describe the hall.
  function captureEnvironment(){
    const old=scene.environment;scene.environment=null;
    const rt=new THREE.WebGLCubeRenderTarget(256,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
    const probe=new THREE.CubeCamera(.3,360,rt);probe.position.set(0,8,1);probe.update(renderer,scene);
    const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromCubemap(rt.texture);
    scene.environment=env.texture;scene.environmentIntensity=.8;
    old?.dispose();rt.dispose();pmrem.dispose();
    // Only the fixed architecture casts this map. Ground contact shadows for
    // moving actors are updated separately, so there is no frozen actor shadow.
    renderer.shadowMap.autoUpdate=false;
  }
  return {updateLights,captureEnvironment,stats:{finishedMaterials:done.size,shadowMap:4096,reflectionProbe:256}};
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
